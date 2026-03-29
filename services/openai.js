const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = `Pixar 3D animated movie scene, ${scenePrompt}, 9:16 vertical aspect ratio, cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality animation style, sharp details, no text, no watermarks`;

  const response = await axios.post(
    'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    { inputs: fullPrompt },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.HF_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'image/jpeg'
      },
      responseType: 'arraybuffer',
      timeout: 120000
    }
  );

  fs.writeFileSync(outputPath, response.data);
  return outputPath;
}

module.exports = { generateSceneImage };
