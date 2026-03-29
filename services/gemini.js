const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

async function transcribeVideo(videoPath) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const videoData = fs.readFileSync(videoPath);
  const base64Video = videoData.toString('base64');
  const ext = path.extname(videoPath).slice(1).toLowerCase();
  const mimeType = ext === 'mp4' ? 'video/mp4' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Video } },
    { text: 'Transcribe ALL spoken words from this video exactly as said. Return ONLY the transcription text, nothing else.' }
  ]);
  return result.response.text().trim();
}

async function formatIntoScenes(transcript) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(`
You are a YouTube Shorts script formatter.
Take this transcript and format it into 6-8 dramatic scenes.
TRANSCRIPT: ${transcript}
Return ONLY valid JSON, nothing else:
{
  "title": "Short punchy title",
  "scenes": [
    {
      "id": 1,
      "location": "Brief location description",
      "narration": "The narration text for this scene",
      "characters": ["Character1"],
      "emotion": "dominant emotion"
    }
  ]
}`);
  const text = result.response.text().trim();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function generateVoiceover(text, outputPath, voiceName = 'en-US-Journey-D') {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_AI_KEY}`;
  const response = await axios.post(url, {
    input: { text },
    voice: { languageCode: 'en-US', name: voiceName, ssmlGender: 'MALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05, pitch: -1.0 }
  });
  const buffer = Buffer.from(response.data.audioContent, 'base64');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { transcribeVideo, formatIntoScenes, generateVoiceover };
