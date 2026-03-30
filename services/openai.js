const axios = require('axios');
const fs = require('fs');

async function generateSceneImage(scenePrompt, outputPath) {
  const fullPrompt = 'Pixar 3D animated movie scene, ' + scenePrompt + ', cinematic composition, vibrant Pixar color grading, professional 3D render, dramatic lighting, high quality, sharp details, no text, no watermarks';

  // Submit request to fal.ai
  const submitResponse = await axios.post(
    'https://queue.fal.run/fal-ai/flux/schnell',
    {
      prompt: fullPrompt,
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
  console.log('fal.ai request submitted: ' + requestId);

  // Poll for result
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const statusResponse = await axios.get(
      'https://queue.fal.run/fal-ai/flux/schnell/requests/' + requestId,
      {
        headers: { 'Authorization': 'Key ' + process.env.FAL_API_KEY }
      }
    );

    const status = statusResponse.data.status;
    console.log('fal.ai status: ' + status);

    if (status === 'COMPLETED') {
      const imageUrl = statusResponse.data.output.images[0].url;
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(outputPath, imageResponse.data);
      console.log('Image generated successfully');
      return outputPath;
    }

    if (status === 'FAILED') {
      throw new Error('fal.ai generation failed');
    }
  }

  throw new Error('fal.ai timed out');
}

module.exports = { generateSceneImage };
