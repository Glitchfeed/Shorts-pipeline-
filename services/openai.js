const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = encodeURIComponent(
    'Pixar 3D animated movie scene, ' + scenePrompt + ', cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality animation style, sharp details, no text, no watermarks'
  );

  // Pollinations.ai — completely free, no API key needed
  const url = 'https://image.pollinations.ai/prompt/' + fullPrompt + '?width=576&height=1024&model=flux&nologo=true&enhance=true';

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: { 'User-Agent': 'ShortsPipeline/1.0' }
  });

  fs.writeFileSync(outputPath, response.data);
  return outputPath;
}

module.exports = { generateSceneImage };
