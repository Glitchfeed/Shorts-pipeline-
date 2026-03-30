const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = encodeURIComponent(
    'Pixar 3D animated movie scene, ' + scenePrompt + ', cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality, sharp details, no text, no watermarks'
  );

  const url = 'https://image.pollinations.ai/prompt/' + fullPrompt + '?width=576&height=1024&model=flux&nologo=true&seed=' + Math.floor(Math.random() * 999999);

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

  // Fallback to fal.ai
  console.log('Pollinations failed, trying fal.ai...');
  const submitResponse = await axios.post(
    'https://queue.fal.run/fal-ai/flux/schnell',
    {
      prompt: decodeURIComponent(fullPrompt),
      image_size: 'portrait_4_3',
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false
    },
    {
      headers: {
        'Authorization': 'Key ' + process.env.FAL_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const requestId = submitResponse.data.request_id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusResponse = await axios.get(
      'https://queue.fal.run/fal-ai/flux/schnell/requests/' + requestId,
      { headers: { 'Authorization': 'Key ' + process.env.FAL_API_KEY } }
    );
    if (statusResponse.data.status === 'COMPLETED') {
      const imageUrl = statusResponse.data.output.images[0].url;
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(outputPath, imageResponse.data);
      return outputPath;
    }
    if (statusResponse.data.status === 'FAILED') throw new Error('fal.ai generation failed');
  }

  throw new Error('All image generation failed');
}

module.exports = { generateSceneImage };
