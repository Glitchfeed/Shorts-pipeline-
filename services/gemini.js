const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const FormData = require('form-data');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

// Transcribe video using OpenAI Whisper
async function transcribeVideo(videoPath) {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_audio.mp3';
  
  try {
    // Extract audio from video
    execSync(`ffmpeg -i "${videoPath}" -vn -acodec mp3 -q:a 2 "${audioPath}" -y`, { stdio: 'pipe' });
    
    // Send to OpenAI Whisper
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath), { filename: 'audio.mp3', contentType: 'audio/mp3' });
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
          ...form.getHeaders()
        }
      }
    );
    
    return response.data.text.trim();
  } finally {
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}

// Format transcript into scenes using Claude
async function formatIntoScenes(transcript) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a YouTube Shorts script formatter.
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
}`
    }]
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// Voiceover using Google TTS
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
