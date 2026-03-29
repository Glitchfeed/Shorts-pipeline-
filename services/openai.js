const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = `Pixar 3D animated movie scene, ${scenePrompt}, 9:16 vertical aspect ratio, cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality animation style, sharp details, no text, no watermarks`;
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1792',
    quality: 'high'
  });
  const imageUrl = response.data[0].url;
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, imageResponse.data);
  return outputPath;
}

module.exports = { generateSceneImage };
