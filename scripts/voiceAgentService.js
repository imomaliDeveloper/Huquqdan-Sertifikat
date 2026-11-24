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
    name: "Qattiqqo'l GoPrep Ustoz 🔥",
    voice: "uz-UZ-MadinaNeural",
    style: "strict, commanding, demanding, highly intelligent law tutor, sharp legal facts, uzbek language",
    systemInstruction: `Sen — O'zbekiston Milliy Yuridik Sertifikatiga tayyorlaydigan eng bilimdon, professional va o'ta talabchan, qattiqqo'l GoPrep ustozisan!
ASOSIY QOIDALAR:
1. SAVOLGA ANIQ VA TO'G'RI JAVOB BER: Foydalanuvchi Huquq, Konstitutsiya, moddalar, qonunlar, testlar yoki har qanday mavzuda savol bersa, SAVOLNING O'ZAGIGA DARHOL TO'G'RI VA ANIQ JAVOBNI BER!
2. HECH QACHON bir xil gapni chaynama va quruq po'pisa qilma! Har doim aniq fakt, qonun moddasi yoki to'g'ri huquqiy qoidani ayt.
3. OHANG: Talabchan, qat'iyatli, jiddiy va shiddatli ustoz ohangida bo'lsin: "Eslab qol!", "Buni bilishing shart!", "Aniq qoida shunday: ...".
4. JAVOB HAJMI: Javobing to'liq, mazmunli va 1-2 jumlali aniq og'zaki nutq bo'lsin. Hech qachon gap o'rtasida uzilib qolmasin.
5. Agar talaba javob aytayotgan bo'lsa va xato qilsa — xatosini ko'rsatib, to'g'risini darhol o'rgat.
6. O'zbek tilida adabiy, tabiiy va ravon gapir.`
  },

  judge: {
    name: "Qattiqqo'l Sudya ⚖️",
    voice: "uz-UZ-SardorNeural",
    style: "deep, authoritative, serious, solemn, judicial, dignified tone, uzbek language",
    systemInstruction: `Sen — O'zbekiston Respublikasi Huquq tizimi bo'yicha qat'iyatli, sovuqqon va talabchan "Bosh Sudya"san.
Foydalanuvchi bilan og'zaki ovozli muloqot qilasan.

Qoidalar:
1. Qonun ustuvorligi — yagona mezon. Har bir savolga aniq moddalar, dalillar va qat'iy huquqiy normalar bilan to'g'ri javob ber.
2. O'quvchining savollariga zudlik bilan qonuniy yechimni aytib, aniq moddani ko'rsat.
3. Javoblaring salobatli, jiddiy, lo'nda va 1-2 jumlali to'liq og'zaki nutqda bo'lsin.
4. O'zbek adabiy tilida, qat'iy va rasmiy ohangda gapir.`
  },

  coach: {
    name: "Jo'shqin Murabbiy ⚡",
    voice: "uz-UZ-MadinaNeural",
    style: "energetic, motivating, intense, confident, loud, uzbek language",
    systemInstruction: `Sen — Har qanday o'quvchini yuqori cho'qqiga va A+ sertifikatiga olib chiquvchi o'ta talabchan, jo'shqin va tinib-tinchimas "Murabbiy"san.
Foydalanuvchi bilan og'zaki muloqot qilasan.

Qoidalar:
1. Tempni pasaytirma! Savolga darhol to'g'ri va o'tkir javob berib, ketidan yangi sinov savoli bilan talabani tekshir.
2. Javoblaring baquvvat, qisqa, motivatsiyaga to'la va 1-2 to'liq jumlali bo'lsin.
3. O'zbek tilida harakatga undovchi jo'shqin tilda gapir.`
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
      `Talabaning savolini yoki gapini tingla. Qattiqqo'l va bilimdon GoPrep ustoz sifatida uning savoliga TO'G'RI, ANIQ VA ILMIY JAVOBNI darhol 1-2 ta to'liq gap bilan o'zbek tilida tushuntir (uzog'i 25-30 ta so'z)!`
    ];
  } else {
    let conversationPrompt = "";
    if (Array.isArray(history) && history.length > 0) {
      conversationPrompt += "Oldingi suhbat:\n" + history.slice(-4).map(h => `${h.role === 'user' ? 'Talaba' : 'Ustoz'}: ${h.text}`).join("\n") + "\n\n";
    }
    conversationPrompt += `Talabaning savoli: "${userMessage}"\n\nUstoz (Savolga to'g'ri va aniq ilmiy javobni talabchan, qat'iy ustoz sifatida 1-2 to'liq gap bilan ayt):`;
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
          temperature: 0.6,
          maxOutputTokens: 200 // To'liq va mukammal javob uchun
        }
      });

      const resp = await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM_TIMEOUT')), 5000))
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
        "Eslab qoling! Savolingiz bo'yicha qonun normasini aniq yodlash shart, darhol qaytadan savol bering!",
        "Diqqatingizni jamlang! Aniq savol bering, kerakli qonun moddasini tahlil qilamiz!",
        "Savolingizni tushundim, balandroq va dadilroq ayting, to'g'ri huquqiy yechimni tushuntiraman!"
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

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Gemini Rasmiy Insoniy Ovozini Generatsiya Qilish (Aoede, Puck, Charon)
 */
async function generateGeminiNativeVoice(text, voiceName = 'Aoede') {
  if (!ai) return null;
  try {
    const resp = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: text,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_VOICE_TIMEOUT')), 3500))
    ]);

    const base64Pcm = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Pcm && base64Pcm.length > 500) {
      const pcmBuf = Buffer.from(base64Pcm, 'base64');
      const wavBuf = pcmToWav(pcmBuf, 24000);
      return {
        audioBase64: wavBuf.toString('base64'),
        format: 'audio/wav'
      };
    }
  } catch (err) {
    console.warn("Gemini Voice kvota/tezlik xabari:", err.message);
  }
  return null;
}

/**
 * Matnni Ovozga aylantirish (Gemini Insoniy Ovozlar + O'zbek Tili HD Neural TTS)
 */
async function textToSpeech(text, personaKey = 'angry', customVoice = null) {
  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.angry;
  const requestedVoice = customVoice || config.voice || 'uz-UZ-MadinaNeural';
  const cleanSpeechText = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanSpeechText) return null;

  // A. Agar foydalanuvchi Gemini insoniy ovozini so'ragan bo'lsa
  if (requestedVoice.startsWith('gemini_')) {
    const geminiVoiceMap = {
      'gemini_aoede': 'Aoede', // Insoniy yoqimli ayol ovozi
      'gemini_puck': 'Puck',   // Quvnoq insoniy erkak ovozi
      'gemini_charon': 'Charon'// Jiddiy insoniy erkak ovozi
    };
    const targetGeminiVoice = geminiVoiceMap[requestedVoice] || 'Aoede';
    const geminiResult = await generateGeminiNativeVoice(cleanSpeechText, targetGeminiVoice);
    if (geminiResult) return geminiResult;
    // Agar Gemini 3 req/min kvotasi to'lgan bo'lsa, xizmat uzilmasligi uchun Madina'ga o'tadi
  }

  // B. O'zbek tili 96kbps HD Neural TTS (msedge-tts, Madina & Sardor, cheksiz va 24/7)
  try {
    const voiceName = requestedVoice.startsWith('gemini_') ? 'uz-UZ-MadinaNeural' : requestedVoice;
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const msPromise = new Promise((resolve, reject) => {
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
