require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const client = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY, 
  apiVersion: 'v1beta' 
});

const promoScript = `Assalomu alaykum, aziz do‘stlar, bo‘lajak talabalar va huquqshunoslik ixlosmandlari!

Huquq fanidan milliy sertifikat imtihoniga tayyorlanib, eng yuqori — A plyus darajasini qo‘lga kiritmoqchimisiz?

Unda ushbu zamonaviy bot va Mini App platformasi aynan siz uchun maxsus yaratildi!

Bu yerda sizni Bilimni baholash agentligi standarti asosidagi qirq beshta savolli to‘liq mock imtihonlar, real hayotiy keyslar hamda ochiq savollar kutmoqda.

Shuningdek, rasmiy ro‘yxatdagi qirqta qonun hujjatlari katalogi, eng ko‘p tushadigan muhim muddatlar va foizlar trenajyori ham mavjud.

Eng ajoyibi — tushunmagan har qanday savolingizga kechayu kunduz aniq javob beruvchi aqlli AI Ustoz doim siz bilan!

Ortiqcha vaqt yo‘qotmasdan bilimingizni mustahkamlang, xatolaringiz ustida ishlang va imtihonga yuz foiz ishonch bilan kiring!

Hoziroq botimizga kiring va muvaffaqiyat sari qadam tashlang!`;

async function generateAudio(voiceIdOrName, filename) {
  console.log(`Boshlandi: ${voiceIdOrName} -> ${filename}`);
  try {
    const res = await client.interactions.create({
      model: 'gemini-3.8-flash-tts',
      input: [{
        type: 'user_input',
        content: [{
          type: 'text',
          text: promoScript,
          annotations: [{
            type: 'speech_metadata',
            style: 'enthusiastic, warm, inspiring, articulate and clear female voiceover for educational advertisement, smooth rhythm and confident professional pronunciation',
          }],
        }],
      }],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { voice: voiceIdOrName },
        ],
      },
    });

    if (res.output_audio?.data) {
      const buf = Buffer.from(res.output_audio.data, 'base64');
      const outPath = path.resolve(__dirname, '..', filename);
      fs.writeFileSync(outPath, buf);
      const dataSize = buf.length - 44;
      const durationSeconds = dataSize / 48000;
      console.log(`✅ Tayyor! Fayl: ${filename} | Hajmi: ${(buf.length / 1024).toFixed(1)} KB | Davomiyligi: ${durationSeconds.toFixed(1)} soniya`);
      return { filename, durationSeconds, size: buf.length };
    } else {
      console.error(`❌ Ovoz ma'lumotlari qaytmadi: ${voiceIdOrName}`);
    }
  } catch (err) {
    console.error(`❌ Xatolik (${voiceIdOrName}):`, err.message);
  }
}

async function run() {
  console.log("🎙️ Gemini Voice Agent orqali ayol ovozidagi 60 soniyalik reklama audiosi tayyorlanmoqda...\n");
  
  // 1. Aoede (Prebuilt yoqimli, samimiy ayol ovozi)
  await generateAudio('Aoede', 'public/reklama_huquq_bot_aoede.wav');
  
  // 2. Kore (Prebuilt professional, qat'iyatli, jozibali ayol ovozi)
  await generateAudio('Kore', 'public/reklama_huquq_bot_kore.wav');

  // 3. Maxsus Voice Design qilingan yosh o'zbek ayoli ovozi
  await generateAudio('voice_6uqor2o93yvd', 'public/reklama_huquq_bot_designed.wav');
  
  console.log("\n🎉 Barcha variantlar muvaffaqiyatli saqlandi!");
}

run();
