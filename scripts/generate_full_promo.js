require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

function concatWavs(wavBuffers, pauseDurationMs = 400) {
  if (!wavBuffers.length) return null;
  const sampleRate = wavBuffers[0].readUInt32LE(24);
  const channels = wavBuffers[0].readUInt16LE(22);
  const bitsPerSample = wavBuffers[0].readUInt16LE(34);
  const bytesPerSample = (bitsPerSample / 8) * channels;
  
  // Pause PCM buffer
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

  const parts = [
    "Assalomu alaykum, bo'lajak yuristlar va abituriyentlar! Huquqshunoslik fanidan Milliy Sertifikat imtihoniga tayyorlanyapsizmi? Unda bu xabar aynan siz uchun! Endi qimmat repetitorlarga qatnamasdan, o'z uyingizda turib A plyus darajasidagi sertifikatga ega bo'lishingiz mumkin.",
    "Huquqdan Sertifikat rasmiy boti va platformasida barcha qirqta qonun bo'yicha sakkiz yuzta saralangan testlar, ellikta to'liq yangi formatdagi rasmiy imtihon variantlari va do'stlaringiz bilan jonli Huquqiy Duel janglari mavjud.",
    "Eng ajoyibi — aqlli sun'iy intellekt repetitor har bir xatoingizni qonun moddalari asosida bir zumda tushuntirib beradi! Shuningdek, o'nta do'stingizni taklif qilib, VIP obunani mutlaqo bepul qo'lga kiritishingiz mumkin.",
    "Imkoniyatni qo'ldan boy bermang! Hoziroq Huquqdan Sertifikat botiga kiring va orzuingizdagi talabalik sari birinchi qadamni tashlang!"
  ];

  console.log(`🎙️ Gemini 3.8 Flash TTS: 4 ta qism bo'yicha ayol ovozida (Kore) audio yaratilmoqda...`);

  const wavBuffers = [];

  for (let i = 0; i < parts.length; i++) {
    console.log(`⏳ ${i + 1}-qism sintez qilinmoqda (${parts[i].substring(0, 35)}...)...`);
    const resp = await ai.interactions.create({
      model: 'gemini-3.8-flash-tts',
      input: parts[i],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { voice: 'Kore' },
        ],
      },
    });

    if (!resp.output_audio?.data) {
      throw new Error(`${i + 1}-qismda audio olinmadi`);
    }

    const buf = Buffer.from(resp.output_audio.data, 'base64');
    wavBuffers.push(buf);
    console.log(`✅ ${i + 1}-qism tayyor! (Hajmi: ${(buf.length / 1024).toFixed(1)} KB)`);
  }

  console.log("🔗 Barcha qismlar tabiiy nafas pauzalari bilan birlashtirilmoqda...");
  const finalWav = concatWavs(wavBuffers, 450);

  const desktopPath = path.join('C:', 'Users', 'user', 'Desktop', 'Huquq_Milliy_Sertifikat_Reklama_Ayol_Ovozi.wav');
  const publicPath = path.join(__dirname, '..', 'public', 'huquq_reklama_ayol_ovoz.wav');

  fs.writeFileSync(desktopPath, finalWav);
  fs.writeFileSync(publicPath, finalWav);

  const duration = getWavDuration(finalWav);
  console.log("==========================================");
  console.log("🎉 AUDIOMUSTER TAYYOR!");
  console.log(`⏱ Aniq davomiyligi: ${duration.toFixed(1)} soniya (~60 soniya)`);
  console.log(`📁 Ishchi stolda: ${desktopPath}`);
  console.log(`🌐 Saytda: ${publicPath}`);
  console.log("==========================================");
}

run().catch(e => {
  console.error("Xatolik:", e);
  process.exit(1);
});
