const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const gemini = require('../services/gemini');
const openaiService = require('../services/openai');
const pixverse = require('../services/pixverse');
const ffmpegService = require('../services/ffmpeg');
const claudeService = require('../services/claude');
const { createJob, updateJob } = require('../services/jobTracker');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `upload_${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/start', upload.single('video'), async (req, res) => {
  const jobId = uuidv4();
  const tempDir = path.join(__dirname, '../temp', jobId);
  fs.mkdirSync(tempDir, { recursive: true });
  if (!req.file) return res.status(400).json({ error: 'Video file is required' });
  res.json({ jobId, message: 'Pipeline started' });
  runPipeline(jobId, req.file, tempDir).catch(err => {
    updateJob(jobId, { status: 'failed', error: err.message, step: `❌ Failed: ${err.message}` });
  });
});

async function runPipeline(jobId, videoFile, tempDir) {
  createJob(jobId);

  updateJob(jobId, { step: '🎙️ Transcribing script from video...', progress: 5, status: 'running' });
  const transcript = await gemini.transcribeVideo(videoFile.path);
  updateJob(jobId, { step: '✅ Transcription complete', progress: 12 });

  updateJob(jobId, { step: '📝 Formatting into scenes...', progress: 15 });
  const scriptData = await gemini.formatIntoScenes(transcript);
  updateJob(jobId, { step: `✅ ${scriptData.scenes.length} scenes ready`, progress: 22, scriptData });

  updateJob(jobId, { step: '🎞️ Extracting characters from video...', progress: 25 });
  const characters = await claudeService.extractCharactersFromVideo(videoFile.path, tempDir);
  updateJob(jobId, { step: `✅ Found ${characters.length} character(s)`, progress: 33 });

  updateJob(jobId, { step: '🎨 Building visual prompts...', progress: 35 });
  const visualPrompts = await claudeService.buildVisualPrompts(scriptData.scenes, characters);
  updateJob(jobId, { step: `✅ ${visualPrompts.length} prompts ready`, progress: 40 });

  updateJob(jobId, { step: '🖼️ Generating Pixar 3D scenes...', progress: 42 });
  const sceneImagePaths = [];
  for (let i = 0; i < visualPrompts.length; i++) {
    const imagePath = path.join(tempDir, `scene_${String(i+1).padStart(2,'0')}.png`);
    updateJob(jobId, { step: `🖼️ Generating scene ${i+1} of ${visualPrompts.length}...`, progress: 42 + Math.round((i/visualPrompts.length)*18) });
    await openaiService.generateSceneImage(visualPrompts[i].prompt, imagePath);
    sceneImagePaths.push(imagePath);
  }
  updateJob(jobId, { step: '✅ All scenes generated', progress: 60 });

  updateJob(jobId, { step: '🎬 Animating scenes...', progress: 62 });
  const clipPaths = [];
  for (let i = 0; i < sceneImagePaths.length; i++) {
    const clipPath = path.join(tempDir, `clip_${String(i+1).padStart(2,'0')}.mp4`);
    const scene = scriptData.scenes[i];
    updateJob(jobId, { step: `🎬 Animating clip ${i+1} of ${sceneImagePaths.length}...`, progress: 62 + Math.round((i/sceneImagePaths.length)*18) });
    await pixverse.imageToVideo(sceneImagePaths[i], `${scene.emotion} mood, ${scene.location}`, clipPath);
    clipPaths.push(clipPath);
  }
  updateJob(jobId, { step: '✅ All clips animated', progress: 80 });

  updateJob(jobId, { step: '🎙️ Generating voiceover...', progress: 83 });
  const fullNarration = scriptData.scenes.map(s => s.narration).join(' ');
  const audioPath = path.join(tempDir, 'voiceover.mp3');
  await gemini.generateVoiceover(fullNarration, audioPath);
  updateJob(jobId, { step: '✅ Voiceover ready', progress: 88 });

  updateJob(jobId, { step: '🔧 Merging everything...', progress: 90 });
  const outputFilename = `short_${jobId}.mp4`;
  const outputPath = path.join(__dirname, '../temp', outputFilename);
  await ffmpegService.mergeClipsWithAudio(clipPaths, audioPath, outputPath);

  updateJob(jobId, { status: 'done', step: '🎉 Your Short is ready!', progress: 100, outputFile: outputFilename, title: scriptData.title, scenes: scriptData.scenes.length });
}

module.exports = router;
