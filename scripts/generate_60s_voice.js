require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

function getWavDuration(filePath) {
  const buffer = fs.readFileSync(filePath);
  const sampleRate = buffer.readUInt32LE(24);
  const byteRate = buffer.readUInt32LE(28);
  const dataSize = buffer.readUInt32LE(40);
  const duration = dataSize / byteRate;
  return duration;
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  const script = 
`Assalomu alaykum, bo'lajak yuristlar va abituriyentlar!
Huquqshunoslik fanidan Milliy Sertifikat imtihoniga tayyorlanyapsizmi? Unda bu xabar aynan siz uchun!
Endi qimmat repetitorlarga qatnamasdan, uyingizda turib A plyus darajasidagi sertifikatni qo'lga kiritishingiz mumkin.
Huquqdan Sertifikat rasmiy boti va platformasida:
Barcha qirqta qonun bo'yicha sakkiz yuzta saralangan testlar,
Ellikta to'liq yangi formatdagi rasmiy imtihon variantlari,
Hamda do'stlaringiz bilan qiziqarli jonli Huquqiy Duel janglari mavjud!
Eng ajoyibi — aqlli sun'iy intellekt repetitor har bir xatoingizni qonun moddalari asosida bir zumda tushuntirib beradi.
Bundan tashqari, o'nta do'stingizni taklif qiling va to'liq VIP obunani mutlaqo bepul qo'lga kiriting!
Imkoniyatni qo'ldan boy bermang. Hoziroq Huquqdan Sertifikat botiga kiring va talabalik sari birinchi qadamni tashlang!`;

  console.log("Gemini 3.8 Flash TTS orqali ayol ovozida 60 soniyalik audio yaratilmoqda...");

  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash-tts',
      input: [{
        type: 'user_input',
        content: [{
          type: 'text',
          text: script,
          annotations: [{
            type: 'speech_metadata',
            style: 'warm, confident, inspiring, cheerful and professional female presenter with clear and fluent articulation',
          }],
        }],
      }],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { voice: 'Kore' },
        ],
      },
    });

    if (interaction.output_audio?.data) {
      const audioBuffer = Buffer.from(interaction.output_audio.data, 'base64');
      const desktopPath = path.join('C:', 'Users', 'user', 'Desktop', 'Huquq_Milliy_Sertifikat_Reklama_Ayol_Ovozi.wav');
      const publicPath = path.join(__dirname, '..', 'public', 'huquq_reklama_ayol_ovoz.wav');

      fs.writeFileSync(desktopPath, audioBuffer);
      fs.writeFileSync(publicPath, audioBuffer);

      const duration = getWavDuration(desktopPath);
      console.log("✅ Audio muvaffaqiyatli tayyorlandi!");
      console.log(`⏱ Davomiyligi: ${duration.toFixed(1)} soniya`);
      console.log(`📁 Fayl: ${desktopPath}`);
      console.log(`🌐 Saytda: ${publicPath}`);
    } else {
      console.error("Audio ma'lumoti topilmadi:", interaction);
    }
  } catch (err) {
    console.error("Xatolik:", err.message);
  }
}

run();
