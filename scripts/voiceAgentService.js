require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

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
    voice: "uz-UZ-MadinaNeural",
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
    voice: "uz-UZ-SardorNeural",
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
    voice: "uz-UZ-MadinaNeural",
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
 * Matn yaratish (LLM) - Matn yoki to'g'ridan-to'g'ri Audio orqali
 */
async function generateTutorReply(input, history = [], personaKey = 'angry') {
  if (!ai) throw new Error("Gemini API kaliti ulanmagan");

  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.angry;
  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

  let userMessage = typeof input === 'string' ? input : (input?.userMessage || '');
  let audioBase64Input = typeof input === 'object' ? input?.audioBase64Input : null;
  let audioMimeType = typeof input === 'object' ? input?.audioMimeType : null;

  let contents;
  if (audioBase64Input) {
    contents = [
      {
        inlineData: {
          data: audioBase64Input,
          mimeType: audioMimeType || 'audio/webm'
        }
      },
      `Talabaning ushbu ovozli gapini eshit. Qattiqqo'l, talabchan va g'azablangan GoPrep ustoz sifatida unga darhol FAQAT 1 TA QISQA, KESKIN GAP bilan o'zbek tilida og'zaki javob ber (uzog'i 10-15 ta so'z)!`
    ];
  } else {
    let conversationPrompt = "";
    if (Array.isArray(history) && history.length > 0) {
      conversationPrompt += "Oldingi suhbat:\n" + history.slice(-4).map(h => `${h.role === 'user' ? 'Talaba' : 'Ustoz'}: ${h.text}`).join("\n") + "\n\n";
    }
    conversationPrompt += `Talaba aytdi: "${userMessage}"\n\nUstoz (faqat 1 ta juda qisqa, shiddatli gap bilan darhol javob ber):`;
    contents = conversationPrompt;
  }

  let replyText = null;

  for (const model of candidateModels) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: config.systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 60 // Chaqmoqdek tez javob berish uchun 60 token
        }
      });

      const resp = await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM_TIMEOUT')), 3000))
      ]);

      if (resp && resp.text) {
        replyText = resp.text.trim();
        break;
      }
    } catch (err) {
      continue;
    }
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
 * Matnni Ovozga aylantirish (Tabiiy O'zbek Tili Neural TTS + Gemini TTS Fallback)
 */
async function textToSpeech(text, personaKey = 'angry', customVoice = null) {
  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.angry;
  const voiceName = customVoice || config.voice || 'uz-UZ-SardorNeural';
  const cleanSpeechText = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanSpeechText) return null;

  // 1. Eng tezkor va tabiiy O'zbek tili Neural TTS (msedge-tts, 96kbps HD audio)
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const msPromise = new Promise((resolve, reject) => {
      // Madina ovozi juda yoqimli va tabiiy yangraydi (+0%, +0Hz). Sardor uchun biroz salobatli (-2%, -2Hz)
      const isMadina = voiceName.includes('Madina');
      const voiceOptions = isMadina
        ? { rate: '+0%', pitch: '+0Hz' }
        : { rate: '-2%', pitch: '-2Hz' };

      const { audioStream } = tts.toStream(cleanSpeechText, voiceOptions);
      const chunks = [];
      audioStream.on('data', d => chunks.push(d));
      audioStream.on('end', () => {
        try { tts.close(); } catch (e) {}
        resolve({
          audioBase64: Buffer.concat(chunks).toString('base64'),
          format: 'audio/mp3'
        });
      });
      audioStream.on('error', err => {
        try { tts.close(); } catch (e) {}
        reject(err);
      });
    });

    const result = await Promise.race([
      msPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('MSEDGE_TTS_TIMEOUT')), 5000))
    ]);

    if (result && result.audioBase64 && result.audioBase64.length > 500) {
      return result;
    }
  } catch (msErr) {
    console.warn("msedge-tts xatosi:", msErr.message);
  }

  // 2. Fallback: Gemini 3.8 Flash TTS
  if (ai) {
    try {
      const geminiVoice = customVoice || 'Kore';
      const ttsPromise = ai.interactions.create({
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
            { voice: geminiVoice },
          ],
        },
      });

      const resp = await Promise.race([
        ttsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TTS_TIMEOUT')), 3500))
      ]);

      if (resp && resp.output_audio?.data) {
        return {
          audioBase64: resp.output_audio.data,
          format: 'audio/wav'
        };
      }
    } catch (gErr) {
      // Gemini TTS ham o'tmadi
    }
  }

  return null;
}

/**
 * Asosiy Voice Agent Funksiyasi (24/7 Har doim ishlash kafolati)
 */
async function processVoiceAgentInteraction({ message, audioBase64Input = null, audioMimeType = null, history = [], persona = 'angry', voice = null }) {
  const personaKey = PERSONA_CONFIGS[persona] ? persona : 'angry';
  let cleanMessage = (message || '').trim();

  // Agar foydalanuvchi jim turgan bo'lsa yoki mikrofon so'z olmagan bo'lsa
  if (!cleanMessage && !audioBase64Input) {
    cleanMessage = "Ustoz, men jim turibman!";
  }

  // 1. Javob matnini generatsiya qilish
  const { replyText, config } = await generateTutorReply({
    userMessage: cleanMessage,
    audioBase64Input,
    audioMimeType
  }, history, personaKey);

  // 2. Javobni jonli ovozga (TTS) aylantirish
  let ttsResult = null;
  try {
    ttsResult = await textToSpeech(replyText, personaKey, voice);
  } catch (e) {
    console.warn("TTS generatsiya e'tiborsiz xatosi:", e.message);
  }

  return {
    success: true,
    userMessage: cleanMessage || "Ovozli xabar",
    replyText,
    audioBase64: ttsResult?.audioBase64 || null, // browser <audio> da to'g'ridan-to'g'ri ijro etiladi
    audioFormat: ttsResult?.format || 'audio/mp3',
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
