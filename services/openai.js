const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = encodeURIComponent(
    'Pixar 3D animated movie scene, ' + scenePrompt + ', cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality, sharp details, no text, no watermarks'
  );

  const url = 'https://image.pollinations.ai/prompt/' + fullPrompt + '?width=576&height=1024&model=flux&nologo=true&seed=' + Math.floor(Math.random() * 999999);

  // Retry up to 4 times with increasing wait
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log('Image generation attempt ' + attempt + '...');
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: { 'User-Agent': 'ShortsPipeline/1.0' }
      });

      if (response.data && response.data.length > 5000) {
        fs.writeFileSync(outputPath, response.data);
        console.log('Image generated successfully on attempt ' + attempt);
        return outputPath;
      }
    } catch (err) {
      console.log('Attempt ' + attempt + ' failed: ' + err.message);
      if (attempt < 4) {
        const wait = attempt * 15000;
        console.log('Waiting ' + (wait/1000) + 's before retry...');
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  throw new Error('Image generation failed after 4 attempts');
}

module.exports = { generateSceneImage };
