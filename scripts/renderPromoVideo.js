const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\user\\node_modules\\ffmpeg-static\\ffmpeg.exe';

async function renderVideo() {
  console.log('🚀 Starting GoPrep 9:16 Video Rendering...');

  const templatePath = path.resolve(__dirname, 'promo_template.html');
  const audioPath = path.resolve(__dirname, '../temp_promo/full_audio.mp3');
  const outputPath = path.resolve(__dirname, '../public/reklama_goprep_9_16.mp4');
  const desktopPath = path.resolve(__dirname, '../reklama_goprep_9_16.mp4');

  if (!fs.existsSync(audioPath)) {
    throw new Error('Audio file not found: ' + audioPath);
  }

  const fps = 25;
  const duration = 22.7; // seconds
  const totalFrames = Math.ceil(duration * fps); // ~568 frames
  const width = 720;
  const height = 1280;

  console.log(`⏱️ Duration: ${duration}s | FPS: ${fps} | Total Frames: ${totalFrames} | Resolution: ${width}x${height}`);

  // Spawn FFmpeg process
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', fps.toString(),
    '-i', 'pipe:0',
    '-i', audioPath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath
  ];

  console.log('🎬 Spawning FFmpeg...');
  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'pipe']
  });

  let ffmpegErr = '';
  ffmpeg.stderr.on('data', (data) => {
    ffmpegErr += data.toString();
  });

  // Launch Puppeteer with Chrome
  console.log('🌐 Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const fileUrl = 'file:///' + templatePath.replace(/\\/g, '/');
  console.log('📄 Loading template:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  console.log('⏳ Rendering frames to FFmpeg pipe...');
  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;

    // Call window.renderFrame(t)
    await page.evaluate((currentTime) => {
      window.renderFrame(currentTime);
    }, t);

    // Capture JPEG buffer
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 92
    });

    // Write to FFmpeg stdin with backpressure handling
    const canWrite = ffmpeg.stdin.write(screenshotBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    if (frame % 50 === 0 || frame === totalFrames - 1) {
      const progress = (((frame + 1) / totalFrames) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ▶ Frame ${frame + 1}/${totalFrames} (${progress}%) - Elapsed: ${elapsed}s (t = ${t.toFixed(2)}s)`);
    }
  }

  console.log('✅ Finished generating all frames. Finalizing video...');
  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('🎉 FFmpeg finished successfully!');
        resolve();
      } else {
        console.error('❌ FFmpeg exited with code:', code);
        console.error('FFmpeg stderr output:\n', ffmpegErr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });

  await browser.close();

  // Copy to project root / Desktop folder for quick access
  if (fs.existsSync(outputPath)) {
    fs.copyFileSync(outputPath, desktopPath);
    const stats = fs.statSync(outputPath);
    console.log(`📁 Video saved to:`);
    console.log(`   1. ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   2. ${desktopPath}`);
  }
}

renderVideo().catch((err) => {
  console.error('Fatal rendering error:', err);
  process.exit(1);
});
