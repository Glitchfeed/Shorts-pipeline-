const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const gemini = require('./gemini');
const openaiService = require('./openai');
const pixverse = require('./pixverse');
const ffmpegService = require('./ffmpeg');
const claudeService = require('./claude');
const { updateJob } = require('./jobTracker');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

const CHANNEL_CONFIG = {
  glitchfeed: { name: 'GlitchFeed Drama', voiceName: 'en-US-Journey-D', pixarStyle: 'dramatic cinematic Pixar 3D' },
  glitchmind: { name: 'GlitchMind AI', voiceName: 'en-US-Journey-D', pixarStyle: 'futuristic tech Pixar 3D' },
  kids:        { name: 'WowFacts Kids', voiceName: 'en-US-Neural2-F', pixarStyle: 'bright colorful fun Pixar 3D' },
  warmtales:   { name: 'WarmTales', voiceName: 'en-US-Journey-F', pixarStyle: 'warm heartwarming Pixar 3D' }
};

async function runScriptPipeline(jobId, script, channel, tempDir) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.glitchfeed;

  updateJob(jobId, { step: 'Formatting script into scenes...', progress: 12 });
  const scriptData = await gemini.formatIntoScenes(script);
  updateJob(jobId, { step: scriptData.scenes.length + ' scenes ready', progress: 20, scriptData });

  updateJob(jobId, { step: 'Creating characters...', progress: 22 });
  const characters = await generateChannelCharacters(channel, scriptData.scenes);
  updateJob(jobId, { step: 'Characters created', progress: 28 });

  updateJob(jobId, { step: 'Building visual prompts...', progress: 30 });
  const visualPrompts = await claudeService.buildVisualPrompts(scriptData.scenes, characters);
  updateJob(jobId, { step: visualPrompts.length + ' prompts ready', progress: 35 });

  updateJob(jobId, { step: 'Generating Pixar 3D scenes...', progress: 37 });
  const sceneImagePaths = [];
  for (let i = 0; i < visualPrompts.length; i++) {
    const imagePath = path.join(tempDir, 'scene_' + String(i+1).padStart(2,'0') + '.png');
    updateJob(jobId, { step: 'Generating scene ' + (i+1) + ' of ' + visualPrompts.length + '...', progress: 37 + Math.round((i/visualPrompts.length)*18) });
    await openaiService.generateSceneImage(config.pixarStyle + ', ' + visualPrompts[i].prompt, imagePath);
    sceneImagePaths.push(imagePath);
  }
  updateJob(jobId, { step: 'All scenes generated', progress: 55 });

  updateJob(jobId, { step: 'Animating scenes...', progress: 57 });
  const clipPaths = [];
  for (let i = 0; i < sceneImagePaths.length; i++) {
    const clipPath = path.join(tempDir, 'clip_' + String(i+1).padStart(2,'0') + '.mp4');
    const scene = scriptData.scenes[i];
    updateJob(jobId, { step: 'Animating clip ' + (i+1) + ' of ' + sceneImagePaths.length + '...', progress: 57 + Math.round((i/sceneImagePaths.length)*18) });
    await pixverse.imageToVideo(sceneImagePaths[i], scene.emotion + ' mood, ' + scene.location, clipPath);
    clipPaths.push(clipPath);
  }
  updateJob(jobId, { step: 'All clips animated', progress: 75 });

  updateJob(jobId, { step: 'Generating voiceover...', progress: 77 });
  const fullNarration = scriptData.scenes.map(s => s.narration).join(' ');
  const audioPath = path.join(tempDir, 'voiceover.mp3');
  await gemini.generateVoiceover(fullNarration, audioPath, config.voiceName);
  updateJob(jobId, { step: 'Voiceover ready', progress: 82 });

  updateJob(jobId, { step: 'Merging clips + voiceover...', progress: 84 });
  const outputFilename = 'short_' + jobId + '.mp4';
  const outputPath = path.join(__dirname, '../temp', outputFilename);
  await ffmpegService.mergeClipsWithAudio(clipPaths, audioPath, outputPath);
  updateJob(jobId, { step: 'Video assembled', progress: 90 });

  const uploaded = await tryYouTubeUpload(jobId, outputPath, scriptData.title, channel);

  updateJob(jobId, {
    status: 'done',
    step: uploaded ? 'Uploaded to YouTube!' : 'Video ready for download!',
    progress: 100,
    outputFile: outputFilename,
    title: scriptData.title,
    scenes: scriptData.scenes.length,
    channel,
    youtubeUploaded: uploaded
  });
}

async function generateChannelCharacters(channel, scenes) {
  const styles = {
    glitchfeed: 'relatable everyday people in dramatic situations, diverse mix',
    glitchmind: 'tech-savvy scientists and AI researchers, futuristic looking',
    kids: 'friendly cute children and animals, bright cheerful characters',
    warmtales: 'warm wholesome families and elderly people, heartwarming faces'
  };
  const style = styles[channel] || styles.glitchfeed;
  const uniqueChars = [...new Set(scenes.flatMap(s => s.characters))].slice(0, 3);
  return uniqueChars.map((name, i) => ({
    name,
    pixarDescription: style + ', ' + (i === 0 ? 'main character' : 'supporting character') + ', expressive face, Pixar 3D animated style'
  }));
}

async function tryYouTubeUpload(jobId, videoPath, title, channel) {
  try {
    const { uploadToYouTube, isConnected } = require('./youtube');
    if (!isConnected(channel)) return false;
    updateJob(jobId, { step: 'Uploading to YouTube...', progress: 93 });
    const result = await uploadToYouTube(videoPath, title, channel);
    updateJob(jobId, { youtubeUrl: result.url, youtubeVideoId: result.videoId });
    return true;
  } catch(err) {
    console.log('YouTube upload failed:', err.message);
    return false;
  }
}

module.exports = { runScriptPipeline };
