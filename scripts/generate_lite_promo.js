require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

function concatWavs(wavBuffers, pauseDurationMs = 500) {
  if (!wavBuffers.length) return null;
  const sampleRate = wavBuffers[0].readUInt32LE(24);
  const channels = wavBuffers[0].readUInt16LE(22);
  const bitsPerSample = wavBuffers[0].readUInt16LE(34);
  const bytesPerSample = (bitsPerSample / 8) * channels;
  
  const pauseBytes = Math.floor((sampleRate * (pauseDurationMs / 1000)) * bytesPerSample);
  const pauseBuffer = Buffer.alloc(pauseBytes);

  const header = Buffer.from(wavBuffers[0].subarray(0, 44));
  const pcmChunks = [];
  let totalDataLength = 0;

  for (let i = 0; i < wavBuffers.length; i++) {
    const pcm = wavBuffers[i].subarray(44);
    pcmChunks.push(pcm);
    totalDataLength += pcm.length;

    if (i < wavBuffers.length - 1 && pauseDurationMs > 0) {
      pcmChunks.push(pauseBuffer);
      totalDataLength += pauseBuffer.length;
    }
  }

  header.writeUInt32LE(36 + totalDataLength, 4);
  header.writeUInt32LE(totalDataLength, 40);

  return Buffer.concat([header, ...pcmChunks]);
}

function getWavDuration(buffer) {
  const byteRate = buffer.readUInt32LE(28);
  const dataSize = buffer.readUInt32LE(40);
  return dataSize / byteRate;
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  // 2 ta yaxlit qism (har biri ~30 soniya, jami ~60 soniya)
  const part1 = 
`Assalomu alaykum, bo'lajak yuristlar va abituriyentlar! Huquqshunoslik fanidan Milliy Sertifikat imtihoniga tayyorlanyapsizmi? Unda bu ajoyib yangilik aynan siz uchun! Endi qimmat repetitorlarga qatnamasdan, o'z uyingizda turib A plyus darajasidagi sertifikatni qo'lga kiritishingiz mumkin. Huquqdan Sertifikat rasmiy boti va platformasida barcha qirqta qonun bo'yicha sakkiz yuzta saralangan testlar hamda ellikta to'liq imtihon variantlari mavjud!`;

  const part2 = 
`Bundan tashqari, do'stlaringiz bilan jonli Huquqiy Duel janglarida bilimingizni sinashingiz va aqlli sun'iy intellekt repetitor yordamida har bir xatoingizni qonun moddalari asosida chuqur tahlil qilishingiz mumkin! Shuningdek, o'nta do'stingizni taklif qiling va to'liq VIP PRO tarifini mutlaqo bepul qo'lga kiriting. Hoziroq Huquqdan Sertifikat botiga kiring va talabalik sari birinchi qadamni tashlang!`;

  console.log("🎙️ Gemini 3.8 Flash-Lite TTS: 2 qismdan iborat 60 soniyalik reklama audiosi yaratilmoqda...");

  const wavBuffers = [];

  console.log("⏳ 1-qism yaratilmoqda...");
  const resp1 = await ai.interactions.create({
    model: 'gemini-3.8-flash-lite-tts',
    input: part1,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: 'Kore' }] },
  });
  if (!resp1.output_audio?.data) throw new Error("1-qism audio olinmadi");
  wavBuffers.push(Buffer.from(resp1.output_audio.data, 'base64'));
  console.log("✅ 1-qism tayyor!");

  console.log("⏳ 2-qism yaratilmoqda...");
  const resp2 = await ai.interactions.create({
    model: 'gemini-3.8-flash-lite-tts',
    input: part2,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: 'Kore' }] },
  });
  if (!resp2.output_audio?.data) throw new Error("2-qism audio olinmadi");
  wavBuffers.push(Buffer.from(resp2.output_audio.data, 'base64'));
  console.log("✅ 2-qism tayyor!");

  console.log("🔗 Qismlar birlashtirilmoqda...");
  const finalWav = concatWavs(wavBuffers, 500);

  const desktopPath = path.join('C:', 'Users', 'user', 'Desktop', 'Huquq_Milliy_Sertifikat_Reklama_Ayol_Ovozi.wav');
  const publicPath = path.join(__dirname, '..', 'public', 'huquq_reklama_ayol_ovoz.wav');

  fs.writeFileSync(desktopPath, finalWav);
  fs.writeFileSync(publicPath, finalWav);

  const duration = getWavDuration(finalWav);
  console.log("==========================================");
  console.log("🎉 AUDIOMASTER MUVAFFAQIYATLI YARATILDI!");
  console.log(`⏱ Aniq davomiyligi: ${duration.toFixed(1)} soniya (~60 soniya)`);
  console.log(`📁 Ishchi stolda: ${desktopPath}`);
  console.log(`🌐 Saytda: ${publicPath}`);
  console.log("==========================================");
}

run().catch(e => {
  console.error("Xatolik:", e);
  process.exit(1);
});
