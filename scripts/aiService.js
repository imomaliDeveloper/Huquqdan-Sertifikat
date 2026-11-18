const { GoogleGenAI } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('🤖 AI moduli muvaffaqiyatli initsializatsiya qilindi');
  } catch (err) {
    console.warn('⚠️ AI ulanishida ogohlantirish:', err.message);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY topilmadi, AI funksiyalari fallback rejimida ishlaydi.');
}

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash'
];

async function generateAiContent({ prompt, systemInstruction, responseMimeType }) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY topilmadi yoki ulanmagan.');
  }

  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const response = await genAI.models.generateContent({
          model,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} (urinish ${attempt}) xatolik: ${err.message}`);
        if (err.status === 503 || err.status === 429) {
          await new Promise(r => setTimeout(r, 1200));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Hech qaysi AI modeli javob bera olmadi.');
}

const TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda aqlli, keng dunyoqarashli, madaniyatli, do'stona va universal "AI Ustoz"siz (xuddi ChatGPT / GPT-4o kabi).
Foydalanuvchi sizga HAR QANDAY mavzuda savol berishi mumkin:
1. Huquqshunoslik, BMBA milliy sertifikat imtihonlari, 40 ta qonun, O'zbekiston Respublikasi Konstitutsiyasi, Mehnat kodeksi, Fuqarolik kodeksi, Oila kodeksi, Jinoyat kodeksi, Ma'muriy javobgarlik to'g'risidagi kodeks, vaziyatli keyslar va barcha maktab darsliklari;
2. Boshqa barcha fanlar va sohalar: tarix, matematika, fizika, biologiya, tillar, axborot texnologiyalari, dasturlash, insho yoki arizalar yozish, motivatsiya, mantiqiy savollar, hayotiy maslahatlar va umumiy suhbat.

QOIDALAR:
- Foydalanuvchining ISTALGAN savoliga o'zbek tilida to'liq, aniq, mantiqiy, do'stona va mukammal javob bering.
- Hech qachon javob berishdan bosh tortmang (hech qachon "men faqat huquqni bilaman" deb aytmang!). Nima so'ralsa, o'sha mavzuda eng yuqori saviyada javob bering.
- Huquqqa oid savollarda qonun nomi va moddasiga aniq asoslaning.
- Javobni chiroyli va o'qishga oson tuzilma bilan taqdim eting (kerakli joyda ro'yxatlar, qalin shriftlar, mos emojilar bilan).`;

async function askAiTutor(message, history = []) {
  if (!message || !message.trim()) {
    return {
      reply: "Savol kiritilmadi. Iltimos, savolingizni yozing.",
      source: "AI Ustoz (ChatGPT)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  }

  const userQuery = message.trim();

  try {
    let prompt = "";
    if (Array.isArray(history) && history.length > 0) {
      prompt += "Oldingi suhbat:\n" + history.slice(-6).map(h => `${h.role === 'user' ? 'Foydalanuvchi' : 'AI Ustoz'}: ${h.text}`).join("\n") + "\n\n";
    }
    prompt += `Foydalanuvchining savoli: "${userQuery}"\nAI Ustoz javobi:`;

    const aiText = await generateAiContent({
      prompt,
      systemInstruction: TUTOR_SYSTEM_INSTRUCTION
    });

    return {
      reply: aiText.trim(),
      source: "AI Ustoz (ChatGPT)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.error('AI Ustoz xatolik:', err.message);

    // Fallback javob (faqat internet yoki API uzilganda)
    return {
      reply: getTutorFallbackReply(userQuery),
      source: "AI Ustoz (Zaxira rejim)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  }
}

function getTutorFallbackReply(userQuery) {
  const qLower = userQuery.toLowerCase();
  if (qLower.includes("salom") || qLower.includes("assalom") || qLower.includes("qalaysiz") || qLower.includes("kim siz")) {
    return `Assalomu alaykum! Xush kelibsiz! 👋\n\nMen sizning universal **AI Ustozingizman** (ChatGPT kabi ishlayman). Menga xohlagan mavzuingizda savol berishingiz mumkin:\n\n• ⚖️ **Huquq va Qonunchilik:** BMBA sertifikati, 40 ta qonun, kodekslar va keyslar;\n• 📚 **Ta'lim va Fanlar:** Tarix, matematika, tillar va darsliklar;\n• 💡 **Maslahatlar:** Insho yozish, imtihonga tayyorlanish va boshqa barcha savollar.\n\nBugun sizga qaysi savol bo'yicha yordam beray?`;
  }
  return `🤖 **AI Ustoz tahlili:**\n\nSizning savolingiz: **"${userQuery}"**\n\nUshbu masala bo'yicha quyidagilarga e'tibor qaratish tavsiya etiladi:\n1. Mavzuning asosiy qoidalari va mohiyatini o'rganing;\n2. Mantiqiy ketma-ketlikda amaliy misollar bilan tahlil qiling;\n3. Imtihon yoki qonunchilikka oid bo'lsa, me'yoriy asoslarni qayta ko'rib chiqing.\n\nSavolingiz bo'yicha qo'shimcha savollaringiz bo'lsa, bemalol so'rang!`;
}

async function checkOpenAnswer({ questionText, expectedAnswer, userAnswer, explanation }) {
  const normUser = (userAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');
  const normExpected = (expectedAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');

  try {
    const prompt = `Siz O'zbekiston Respublikasi BMBA Huquqshunoslik milliy sertifikat imtihoni bo'yicha bosh ekspertsiz.
Savol: "${questionText || 'Huquqiy savol'}"
Kutilgan to'g'ri javob: "${expectedAnswer}"
Talaba yozgan javob: "${userAnswer}"
Qonuniy izoh: "${explanation || ''}"

Vazifa: Talabaning javobini tahlil qiling. Agar talaba javobni so'zlar bilan (masalan "uch yuz" va "300"), kichik sinonimlar, qo'shimcha so'zlar ("1 oy" va "bir oylik muddatda") yoki kichik imlo farqlari bilan to'g'ri yozgan bo'lsa, isCorrect=true deb toping.
Qat'iy JSON formatida javob qaytaring:
{
  "isCorrect": boolean,
  "similarityScore": raqam (0 dan 100 gacha),
  "feedback": "Talabaga o'zbek tilida 1 jumlada do'stona baho va tushuntirish",
  "standardizedAnswer": "${expectedAnswer}"
}`;

    const text = await generateAiContent({
      prompt,
      responseMimeType: 'application/json'
    });

    return JSON.parse(text);
  } catch (err) {
    console.error('checkOpenAnswer xatolik:', err.message);
    const isMatch = normUser.includes(normExpected) || normExpected.includes(normUser);
    return {
      isCorrect: isMatch,
      similarityScore: isMatch ? 85 : 30,
      feedback: isMatch ? "Javob to'g'ri deb qabul qilindi!" : "Kutilgan javobdan farq qiladi.",
      standardizedAnswer: expectedAnswer
    };
  }
}

async function explainQuestion({ questionText, options, correctAnswer, userAnswer, explanation, lawRef }) {
  try {
    const prompt = `Siz BMBA Huquqshunoslik milliy sertifikati bo'yicha professional repetitor-o'qituvchisiz.
Talaba quyidagi test savoli bo'yicha tushuntirish so'ramoqda:
Savol: "${questionText}"
Variantlar: ${JSON.stringify(options || [])}
To'g'ri javob: "${correctAnswer}"
Talaba kiritgan javob: "${userAnswer || 'Belgilanmagan'}"
Mavjud sharh: "${explanation || ''}"
Qonuniy asos: "${lawRef || ''}"

Vazifa: Talabaga 100% tushunarli, aniq moddalar bilan asoslangan va yodda qoladigan qilib tushuntiring.
Faqat JSON qaytaring:
{
  "lawArticle": "Tegishli qonun va moddasi (masalan, Mehnat kodeksi 204-modda)",
  "explanation": "Nega aynan shu javob to'g'ri ekanligi haqida 2-3 jumlali lo'nda tushuntirish",
  "mistakeReason": "O'quvchilar bu savolda qaysi nozik nuqtada chalg'iydi",
  "memoryTip": "Imtihonda ushbu normani oson eslab qolish uchun 1 ta amaliy maslahat yoki mnemonika"
}`;

    const text = await generateAiContent({
      prompt,
      responseMimeType: 'application/json'
    });

    return JSON.parse(text);
  } catch (err) {
    console.error('explainQuestion xatolik:', err.message);
    return {
      lawArticle: lawRef || "O'zbekiston Respublikasi Qonunchiligi",
      explanation: explanation || "Ushbu savol bo'yicha to'g'ri javob normativ-huquqiy hujjat talablariga to'liq mos keladi.",
      mistakeReason: "Savoldagi shartlar va muddatlarga e'tibor bermaslik ko'p uchraydi.",
      memoryTip: "Savol kalit so'zlari va unga berilgan muddatlarni Flashcards orqali mustahkamlang."
    };
  }
}

module.exports = {
  askAiTutor,
  checkOpenAnswer,
  explainQuestion,
  generateAiContent
};
