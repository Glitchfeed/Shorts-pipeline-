const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

function mergeClipsWithAudio(clipPaths, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (clipPaths.length === 0) return reject(new Error('No clips to merge'));

    const listPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const listContent = clipPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .input(audioPath)
      .outputOptions([
        '-c:v libx264',
        '-crf 18',
        '-preset fast',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
        '-movflags +faststart',
        '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        '-r 30'
      ])
      .output(outputPath)
      .on('end', () => {
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        reject(err);
      })
      .run();
  });
}

function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

module.exports = { mergeClipsWithAudio, getAudioDuration };
