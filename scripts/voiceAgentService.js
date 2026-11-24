require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey, apiVersion: 'v1beta' });
    console.log('🎙️ Gemini Voice Agent xizmati tayyor');
  } catch (err) {
    console.warn('⚠️ Gemini Voice Agent initsializatsiya xatosi:', err.message);
  }
}

// Personalar uchun Tizim Yo'riqnomalari (System Prompts)
const PERSONA_CONFIGS = {
  angry: {
    name: "G'azablangan Ustoz 🔥",
    voice: "Kore",
    style: "furious, strict, yelling, demanding, fast-paced teacher, angry tone, uzbek language",
    systemInstruction: `Sen — O'quvchilarni temir intizom bilan tayyorlaydigan, o'ta talabchan, g'azablangan va kesatuvchi "Qattiqqo'l Ustoz"san (xuddi GoPrep Angry AI rejimidek).
Foydalanuvchi bilan real-vaqtda og'zaki ovozli muloqot qilasan.

Qat'iy qoidalar:
1. Erkalatish va lutfbozlik MUTLAQO TAQIQLANADI! Shirinso'z bo'lma.
2. Agar foydalanuvchi dangasalik qilsa, ahmoqona gapirsa, xato qilsa yoki seni ChatGPT bilan solishtirsa — uni darhol shiddat bilan tergab tashla ("Sen ahmoq! Nega vaqtimni o'g'irlayapsan?!", "Bunday kalla bilan imtihonga kirmoqchimisan?!", "Tezroq gapir, yaramas!").
3. Xatolarini ayamay yuziga sol va to'g'ri javobni darhol talab qil.
4. Agar Huquq fani yoki qonun haqida bo'lsa: "Sen moddalarni o'qiganmisan o'zi?! Qaysi modda, tez ayt!" deb bosim qil.
5. OG'ZAKI NUTQ TALABI: Javoblaring qisqa, lo'nda, shiddatli va 1-3 jumlali bo'lsin. Hech qachon uzun ma'ruza o'qima, chunki bu ovoz orqali eshittiriladi!
6. O'zbek tilida tabiiy, jonli, emotsiyaga boy va keskin gapir.`
  },

  judge: {
    name: "Qattiqqo'l Sudya ⚖️",
    voice: "Kore",
    style: "deep, authoritative, serious, solemn, judicial, dignified tone, uzbek language",
    systemInstruction: `Sen — O'zbekiston Respublikasi Huquq tizimi bo'yicha qat'iyatli, sovuqqon va talabchan "Bosh Sudya"san.
Foydalanuvchi bilan og'zaki ovozli muloqot qilasan.

Qoidalar:
1. Qonun ustuvorligi — yagona mezon. Faqat aniq moddalar, dalillar va qat'iy huquqiy normalar bilan gapir.
2. O'quvchining noaniq yoki noqonuniy javoblariga zudlik bilan e'tiroz bildir: "Dalilingiz asossiz! Qonunning qaysi normasiga suyanyapsiz?!" deb talab qil.
3. Javoblaring salobatli, jiddiy, lo'nda va 2-3 jumlali og'zaki nutqda bo'lsin.
4. O'zbek adabiy tilida, qat'iy va rasmiy ohangda gapir.`
  },

  coach: {
    name: "Jo'shqin Murabbiy ⚡",
    voice: "Kore",
    style: "energetic, motivating, intense, confident, loud, uzbek language",
    systemInstruction: `Sen — Har qanday o'quvchini yuqori cho'qqiga va A+ sertifikatiga olib chiquvchi o'ta talabchan, jo'shqin va tinib-tinchimas "Murabbiy"san.
Foydalanuvchi bilan og'zaki muloqot qilasan.

Qoidalar:
1. Tempni pasaytirma! Dangasalarga bu yerda joy yo'q!
2. Har bir xatoni zudlik bilan to'g'irla va darhol yangi sinov savoli bilan talabani tekshir.
3. Javoblaring baquvvat, qisqa, motivatsiyaga to'la va 2-3 jumlali bo'lsin.
4. O'zbek tilida harakatga undovchi jo'shqin tilda gapir.`
  }
};

/**
 * Matn yaratish (LLM)
 */
async function generateTutorReply(userMessage, history = [], personaKey = 'angry') {
  if (!ai) throw new Error("Gemini API kaliti ulanmagan");

  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.angry;
  const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

  let conversationPrompt = "";
  if (Array.isArray(history) && history.length > 0) {
    conversationPrompt += "Oldingi suhbat:\n" + history.slice(-6).map(h => `${h.role === 'user' ? 'Talaba' : 'Ustoz'}: ${h.text}`).join("\n") + "\n\n";
  }
  conversationPrompt += `Talaba aytdi: "${userMessage}"\n\nUstoz (1-3 ta shiddatli og'zaki jumla bilan javob ber):`;

  let replyText = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: conversationPrompt,
          config: {
            systemInstruction: config.systemInstruction,
            temperature: 0.8,
            maxOutputTokens: 250
          }
        });

        if (resp && resp.text) {
          replyText = resp.text.trim();
          break;
        }
      } catch (err) {
        if (attempt === 1 && (err.status === 503 || err.status === 429)) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
    if (replyText) break;
  }

  // Favqulodda fallback agar internet/kvota muammosi bo'lsa
  if (!replyText) {
    if (personaKey === 'angry') {
      const ANGRY_FALLBACKS = [
        "Sen ahmoq! Nega gapirmay vaqtimni o'g'irlayapsan?! Savolingni tezroq aniq qilib ayt, bo'lmasa darsdan haydalasan!",
        "Menga qara! Bosh chayqab o'tirmasdan, og'zingni ochib aniq gapir! Dars o'tyaptimi bu yerda yoki bozor?!",
        "Nima deb g'o'ldirayapsan?! Balandroq va dadilroq gapir! Bunday lattachaynar bilan imtihon topshirib bo'lmaydi!",
        "Savoling bormi o'zi yoki shunchaki vaqtimni o'g'irlagani keldingmi?! Qani, tez ayt, nimani tushunmading?!",
        "Kallang ishlayaptimi o'zi?! Bir marta gapirib yana jim bo'lib qoldingku! Tezroq davom et, yaramas!"
      ];
      replyText = ANGRY_FALLBACKS[Math.floor(Math.random() * ANGRY_FALLBACKS.length)];
    } else if (personaKey === 'judge') {
      replyText = "E'tiroz qabul qilinmadi! Savolingizni aniq qonun moddasi bilan bayon eting.";
    } else {
      replyText = "Tempni tushurma! Diqqatingni jamla va savolingni qaytadan aniq ayt!";
    }
  }

  return { replyText, config };
}

/**
 * Matnni Ovozga aylantirish (Gemini 3.8 Flash TTS)
 */
async function textToSpeech(text, personaKey = 'angry', customVoice = null) {
  if (!ai) return null;

  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.angry;
  const voiceName = customVoice || config.voice || 'Kore';
  // TTS uchun toza matn (keraksiz belgilarni olib tashlash)
  const cleanSpeechText = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\s+/g, ' ').trim();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await ai.interactions.create({
        model: 'gemini-3.8-flash-tts',
        input: [{
          type: 'user_input',
          content: [{
            type: 'text',
            text: cleanSpeechText,
            annotations: [{
              type: 'speech_metadata',
              style: config.style,
            }],
          }],
        }],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [
            { voice: voiceName },
          ],
        },
      });

      if (resp.output_audio?.data) {
        return resp.output_audio.data; // Base64 WAV audio
      }
    } catch (err) {
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 400));
        continue;
      }
      console.warn("TTS xatosi (attempt " + attempt + "):", err.message);
    }
  }

  return null;
}

/**
 * Asosiy Voice Agent Funksiyasi (24/7 Har doim ishlash kafolati)
 */
async function processVoiceAgentInteraction({ message, history = [], persona = 'angry', voice = null }) {
  const personaKey = PERSONA_CONFIGS[persona] ? persona : 'angry';
  let cleanMessage = (message || '').trim();

  // Agar foydalanuvchi jim turgan bo'lsa yoki mikrofon so'z olmagan bo'lsa
  if (!cleanMessage || cleanMessage.length < 2) {
    cleanMessage = "Ustoz, men jim turibman!";
  }

  // 1. Javob matnini generatsiya qilish
  const { replyText, config } = await generateTutorReply(cleanMessage, history, personaKey);

  // 2. Javobni jonli ovozga (TTS) aylantirish
  let audioBase64 = null;
  try {
    audioBase64 = await textToSpeech(replyText, personaKey, voice);
  } catch (e) {
    console.warn("TTS generatsiya e'tiborsiz xatosi:", e.message);
  }

  return {
    success: true,
    userMessage: cleanMessage,
    replyText,
    audioBase64, // browser <audio> da to'g'ridan-to'g'ri ijro etiladi
    persona: {
      key: personaKey,
      name: config.name,
      voice: voice || config.voice
    }
  };
}

module.exports = {
  PERSONA_CONFIGS,
  generateTutorReply,
  textToSpeech,
  processVoiceAgentInteraction
};
