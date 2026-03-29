const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = `Pixar 3D animated movie scene, ${scenePrompt}, cinematic composition, vibrant colors, professional 3D render, dramatic lighting, high quality`;

  // Try multiple models in order
  const models = [
    'stabilityai/stable-diffusion-2-1',
    'runwayml/stable-diffusion-v1-5',
    'CompVis/stable-diffusion-v1-4'
  ];

  for (const model of models) {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/' + model,
        { inputs: fullPrompt },
        {
          headers: {
            'Authorization': 'Bearer ' + process.env.HF_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 120000
        }
      );

      if (response.data && response.data.length > 1000) {
        fs.writeFileSync(outputPath, response.data);
        console.log('Generated image with model: ' + model);
        return outputPath;
      }
    } catch (err) {
      console.log(model + ' failed: ' + err.message + ', trying next...');
    }
  }

  throw new Error('All image generation models failed');
}

module.exports = { generateSceneImage };
