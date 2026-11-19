require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

async function generatePromoVoice() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY topilmadi!");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  const promoScript = 
`Assalomu alaykum, bo'lajak yuristlar va qadrli abituriyentlar!
Huquqshunoslik fanidan Milliy Sertifikat imtihoniga tayyorlanyapsizmi? Unda siz uchun ajoyib yangilik!
Endi uydan chiqmasdan turib, eng yuqori A plyus darajadagi sertifikatga ega bo'lishingiz mumkin.
Huquqdan Sertifikat rasmiy boti va platformasida:
Barcha qirqta qonun bo'yicha sakkiz yuzta maxsus test,
Ellikta yangi formatdagi to'liq imtihon varianti,
Do'stlaringiz bilan jonli Huquqiy Duel jangi,
Va eng asosiysi — xatolaringizni qonun moddasi bilan tushuntirib beruvchi aqlli sun'iy intellekt repetitor sizni kutmoqda!
Bundan tashqari, o'nta do'stingizni taklif qiling va VIP obunani mutlaqo bepul qo'lga kiriting.
Hoziroq Huquqdan Sertifikat botiga kiring va orzuingizdagi talabalik sari birinchi qadamni tashlang!`;

  console.log("Audio sintez qilinmoqda (gemini-3.8-flash-tts)...");

  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash-tts',
      input: [{
        type: 'user_input',
        content: [{
          type: 'text',
          text: promoScript,
          annotations: [{
            type: 'speech_metadata',
            style: 'cheerful, inspiring, confident, professional female speaker with clear pronunciation',
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
      const outPathDesktop = path.join('C:', 'Users', 'user', 'Desktop', 'huquq_reklama_ayol_ovoz.wav');
      const outPathPublic = path.join(__dirname, '..', 'public', 'huquq_reklama_ayol_ovoz.wav');

      fs.writeFileSync(outPathDesktop, audioBuffer);
      fs.writeFileSync(outPathPublic, audioBuffer);

      console.log("Audio muvaffaqiyatli saqlandi:");
      console.log("Desktop:", outPathDesktop);
      console.log("Public:", outPathPublic);
      console.log("Hajmi:", audioBuffer.length, "bayt");
    } else {
      console.error("Audio ma'lumoti olinmadi:", interaction);
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
  }
}

generatePromoVoice();
