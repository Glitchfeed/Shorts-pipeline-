const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

// Transcribe video using Claude Vision
async function transcribeVideo(videoPath) {
  const videoData = fs.readFileSync(videoPath);
  const base64Video = videoData.toString('base64');
  const ext = path.extname(videoPath).slice(1).toLowerCase();
  const mediaType = ext === 'mp4' ? 'video/mp4' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: mediaType, data: base64Video }
        },
        {
          type: 'text',
          text: 'Transcribe ALL spoken words from this video exactly as said. Return ONLY the transcription text, nothing else. No timestamps, no speaker labels, just the raw spoken content.'
        }
      ]
    }]
  });

  return response.content[0].text.trim();
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
  return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
}

// Voiceover using Google TTS (keep this — it's free and separate from Gemini)
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
