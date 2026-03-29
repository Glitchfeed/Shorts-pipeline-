const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const PIXVERSE_BASE = 'https://app-api.pixverse.ai/openapi/v2';

function getHeaders(extra = {}) {
  return { 'API-KEY': process.env.PIXVERSE_API_KEY, 'Ai-trace-Id': `trace-${Date.now()}`, ...extra };
}

async function uploadImage(imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  const response = await axios.post(`${PIXVERSE_BASE}/image/upload`, form, { headers: { ...getHeaders(), ...form.getHeaders() } });
  if (response.data.ErrCode !== 0) throw new Error(`PixVerse upload error: ${response.data.ErrMsg}`);
  return response.data.Resp.img_id;
}

async function submitImageToVideo(imgId, prompt) {
  const payload = {
    img_id: imgId,
    prompt: `${prompt}, subtle cinematic movement, Pixar 3D animation style, characters breathing naturally`,
    negative_prompt: 'blurry, distorted, low quality, text, watermark',
    duration: 5,
    quality: 'high',
    motion_mode: 'normal',
    aspect_ratio: '9:16',
    model: 'v4'
  };
  const response = await axios.post(`${PIXVERSE_BASE}/video/img/generate`, payload, { headers: getHeaders({ 'Content-Type': 'application/json' }) });
  if (response.data.ErrCode !== 0) throw new Error(`PixVerse error: ${response.data.ErrMsg}`);
  return response.data.Resp.video_id;
}

async function pollVideoStatus(videoId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);
    const response = await axios.get(`${PIXVERSE_BASE}/video/result/${videoId}`, { headers: getHeaders() });
    const resp = response.data.Resp;
    if (resp.status === 1) return resp.url;
    if (resp.status === -1) throw new Error(`PixVerse failed for video ${videoId}`);
    console.log(`PixVerse video ${videoId}: processing... (${i + 1})`);
  }
  throw new Error('PixVerse timed out');
}

async function downloadVideo(videoUrl, outputPath) {
  const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, response.data);
  return outputPath;
}

async function imageToVideo(imagePath, prompt, outputPath) {
  const imgId = await uploadImage(imagePath);
  const videoId = await submitImageToVideo(imgId, prompt);
  const videoUrl = await pollVideoStatus(videoId);
  await downloadVideo(videoUrl, outputPath);
  return outputPath;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = { imageToVideo };
