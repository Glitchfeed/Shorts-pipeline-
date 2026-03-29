const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

// Extract audio from video then transcribe using Claude
async function transcribeVideo(videoPath) {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_audio.mp3';
  
  try {
    // Extract audio from video using ffmpeg
    execSync(`ffmpeg -i "${videoPath}" -vn -acodec mp3 -q:a 2 "${audioPath}" -y`, { stdio: 'pipe' });
    
    // Read audio and send to Claude as base64
    const audioData = fs.readFileSync(audioPath);
    const base64Audio = audioData.toString('base64');
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Audio
            }
          },
          { type: 'text', text: 'Transcribe all spoken words from this audio.' }
        ]
      }]
    });
    
    return response.content[0].text.trim();
  } catch (err) {
    // Fallback — use Google Speech if ffmpeg extraction fails
    return await transcribeWithGoogle(videoPath);
  } finally {
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}

// Fallback transcription using Google Speech-to-Text
async function transcribeWithGoogle(videoPath) {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_audio.wav';
  execSync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'pipe' });
  
  const audioData = fs.readFileSync(audioPath);
  const base64Audio = audioData.toString('base64');
  
  const response = await axios.post(
    `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_AI_KEY}`,
    {
      config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
      audio: { content: base64Audio }
    }
  );
  
  if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  
  const results = response.data.results || [];
  return results.map(r => r.alternatives[0].transcript).join(' ');
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
