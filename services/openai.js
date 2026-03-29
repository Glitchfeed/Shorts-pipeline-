const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = `Pixar 3D animated movie scene, ${scenePrompt}, 9:16 vertical aspect ratio, cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality animation style, sharp details, no text, no watermarks`;

  const response = await axios.post(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    { inputs: fullPrompt },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.HF_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'image/jpeg'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    }
  );

  fs.writeFileSync(outputPath, response.data);
  return outputPath;
}

module.exports = { generateSceneImage };
