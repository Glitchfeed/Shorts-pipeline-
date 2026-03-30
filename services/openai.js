const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const FormData = require('form-data');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

async function transcribeVideo(videoPath) {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_audio.mp3';
  try {
    execSync(`ffmpeg -i "${videoPath}" -vn -acodec mp3 -q:a 2 "${audioPath}" -y`, { stdio: 'pipe' });
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath), { filename: 'audio.mp3', contentType: 'audio/mp3' });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'en');
    form.append('response_format', 'text');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      form,
      { headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, ...form.getHeaders() } }
    );
    return (typeof response.data === 'string' ? response.data : response.data.text).trim();
  } finally {
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}

async function formatIntoScenes(transcript) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: 'You are a YouTube Shorts script formatter.\nTake this transcript and format it into 6-8 dramatic scenes.\nTRANSCRIPT: ' + transcript + '\nReturn ONLY valid JSON, nothing else:\n{\n  "title": "Short punchy title",\n  "scenes": [\n    {\n      "id": 1,\n      "location": "Brief location description",\n      "narration": "The narration text for this scene",\n      "characters": ["Character1"],\n      "emotion": "dominant emotion"\n    }\n  ]\n}'
    }]
  });
  const text = response.content[0].text.trim();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function generateVoiceover(text, outputPath, voiceName) {
  voiceName = voiceName || 'en-US-Journey-D';
  const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + process.env.GOOGLE_AI_KEY;
  const response = await axios.post(url, {
    input: { text: text },
    voice: { languageCode: 'en-US', name: voiceName, ssmlGender: 'MALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05, pitch: -1.0 }
  });
  const buffer = Buffer.from(response.data.audioContent, 'base64');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { transcribeVideo, formatIntoScenes, generateVoiceover };
