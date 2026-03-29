const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

async function extractCharactersFromVideo(videoPath, tempDir) {
  const framesDir = path.join(tempDir, 'frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
  execSync(`ffmpeg -i "${videoPath}" -vf "fps=1/3,scale=640:-1" -q:v 2 "${framesDir}/frame_%04d.jpg" -y`, { stdio: 'pipe' });
  const frames = fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort().slice(0, 12);
  if (frames.length === 0) throw new Error('Could not extract frames from video');

  const imageContents = frames.map(frame => {
    const imgData = fs.readFileSync(path.join(framesDir, frame));
    return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgData.toString('base64') } };
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        ...imageContents,
        { type: 'text', text: `Identify all unique people in these frames. Return ONLY valid JSON:
{
  "characters": [
    {
      "name": "fitting name",
      "gender": "male/female",
      "age": "age range",
      "ethnicity": "description",
      "hair": "hair description",
      "face": "facial features",
      "clothing": "what they wear",
      "expression": "typical expression",
      "pixarDescription": "full one-sentence Pixar 3D character description"
    }
  ]
}` }
      ]
    }]
  });

  const text = response.content[0].text.trim();
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  frames.forEach(f => { try { fs.unlinkSync(path.join(framesDir, f)); } catch(e) {} });
  try { fs.rmdirSync(framesDir); } catch(e) {}
  return parsed.characters;
}

async function buildVisualPrompts(scenes, characters) {
  const characterSummary = characters.map(c => `${c.name}: ${c.pixarDescription}`).join('\n');
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `You are a Pixar art director.
Characters: ${characterSummary}
Scenes: ${JSON.stringify(scenes)}
Return ONLY valid JSON array:
[
  {
    "sceneId": 1,
    "prompt": "Pixar 3D animated scene, [character details], [location], [action], [lighting], [camera angle], 9:16 vertical composition",
    "charactersInScene": ["name1"]
  }
]`
    }]
  });
  const text = response.content[0].text.trim();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

module.exports = { extractCharactersFromVideo, buildVisualPrompts };
