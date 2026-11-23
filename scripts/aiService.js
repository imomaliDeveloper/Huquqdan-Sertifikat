const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

let genAI = null;
if (geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('🤖 Gemini AI moduli muvaffaqiyatli initsializatsiya qilindi');
  } catch (err) {
    console.warn('⚠️ Gemini AI ulanishida ogohlantirish:', err.message);
  }
}

// 1. OpenAI (Haqiqiy ChatGPT) orqali chaqirish
async function callOpenAiApi(prompt, systemInstruction) {
  if (!openaiApiKey) return null;
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content.trim();
  }
  return null;
}

// 2. Groq (Tezkor va bepul Llama-3.3-70b) orqali chaqirish
async function callGroqApi(prompt, systemInstruction) {
  if (!groqApiKey) return null;
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content.trim();
  }
  return null;
}

// 3. Google Gemini orqali chaqirish
const GEMINI_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash'
];

async function callGeminiApi(prompt, systemInstruction, responseMimeType) {
  if (!genAI) return null;

  for (const model of GEMINI_CANDIDATES) {
    try {
      const config = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseMimeType) config.responseMimeType = responseMimeType;

      const callPromise = genAI.models.generateContent({
        model,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      const response = await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7000))
      ]);

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      // 503 yoki 429 bo'lsa keyingi modelga o'tish
      continue;
    }
  }
  return null;
}

// Universal AI generatori (OpenAI -> Groq -> Gemini)
async function generateAiContent({ prompt, systemInstruction, responseMimeType }) {
  // 1. Agar OpenAI kaliti bo'lsa — to'g'ridan-to'g'ri ChatGPT
  if (openaiApiKey) {
    try {
      const ans = await callOpenAiApi(prompt, systemInstruction);
      if (ans) return ans;
    } catch (e) {}
  }

  // 2. Agar Groq kaliti bo'lsa
  if (groqApiKey) {
    try {
      const ans = await callGroqApi(prompt, systemInstruction);
      if (ans) return ans;
    } catch (e) {}
  }

  // 3. Gemini modellari
  if (geminiApiKey) {
    const ans = await callGeminiApi(prompt, systemInstruction, responseMimeType);
    if (ans) return ans;
  }

  throw new Error('Hozirda AI serverlarida yuklama yuqori (kvota cheklovi).');
}

// ==================== BMBA SAVOLLARINI XOTIRAGA YUKLASH ====================
let bmbaQuestionsCache = null;

function loadBmbaQuestions() {
  if (bmbaQuestionsCache) return bmbaQuestionsCache;
  const questions = [];
  try {
    const variantsDir = path.join(__dirname, '..', 'data', 'variants');
    if (fs.existsSync(variantsDir)) {
      const files = fs.readdirSync(variantsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(variantsDir, file), 'utf8');
          const data = JSON.parse(raw);
          if (Array.isArray(data.questions)) {
            for (const q of data.questions) {
              questions.push({
                num: q.num,
                section: q.section || '',
                text: q.text || '',
                options: q.options || [],
                correct: q.correct || '',
                explanation: q.explanation || '',
                lawSource: q.lawSource || '',
                bookSource: q.bookSource || ''
              });
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {}
  bmbaQuestionsCache = questions;
  return questions;
}

function searchBmbaQuestions(query, limit = 1) {
  const all = loadBmbaQuestions();
  if (!all.length) return [];
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return [];

  const scored = all.map(q => {
    let score = 0;
    const textLower = (q.text || '').toLowerCase();
    const expLower = (q.explanation || '').toLowerCase();
    for (const w of words) {
      if (textLower.includes(w)) score += 6;
      if (expLower.includes(w)) score += 3;
    }
    return { q, score };
  });

  return scored
    .filter(s => s.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.q);
}

function isLegalQuery(text) {
  const legalKeywords = [
    'qonun', 'modda', 'kodeks', 'huquq', 'jinoyat', 'sud', 'jazo', 'mehnat', 'meros',
    'aliment', 'konstitutsiya', 'bmba', 'dtm', 'sertifikat', 'vasiyat', 'fuqaro', 'prokuror',
    'advokat', 'hokimiyat', 'parlament', 'senat', 'prezident', 'jarima', 'intizomiy',
    'sinov muddati', 'ish vaqti', 'ta\'til', 'ishdan bo\'sh', 'shartnoma', 'bitim', 'da\'vo'
  ];
  return legalKeywords.some(kw => text.includes(kw));
}

// Zaxira javob
function getTutorFallbackReply(userQuery, isStrict = false) {
  const qLower = userQuery.toLowerCase().trim();

  // Hisob-kitob
  const mathMatch = qLower.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : 'nolga bo\'lish mumkin emas';
    return `Natija: **${a} ${op} ${b} = ${res}** ✅`;
  }

  // Salomlashish
  if (qLower.startsWith('salom') || qLower.startsWith('assalom') || qLower === 'qalaysiz') {
    return isStrict
      ? `🔥 **Assalomu alaykum! Men Qattiq Qo'l Ustozingizman!**\n\nVaqtni behuda ketkazmaymiz. Qaysi mavzuda savolingiz bor? Tezda yozing, tahlil qilamiz! ⚖️`
      : `Assalomu alaykum! Xush kelibsiz! 👋\n\nMen sizning AI yordamchingizman. Istalgan mavzuda (ilm-fan, huquq, darslar yoki shunchaki suhbat) savol berishingiz mumkin. Bugun sizga nima bo'yicha yordam beray?`;
  }

  // Huquqiy savol
  if (isLegalQuery(qLower)) {
    const matched = searchBmbaQuestions(userQuery, 1);
    if (matched && matched.length > 0) {
      const bq = matched[0];
      const opts = bq.options.map(o => `${o.key}) ${o.text}`).join('\n');
      return isStrict
        ? `🔥 **Qattiq Qo'l Ustoz tahlili:**\n\nSavolingiz: **"${userQuery}"**\n\nBu masala bo'yicha imtihon savoli:\n📌 **Savol:** ${bq.text}\n\n${opts}\n\n❓ To'g'ri javobni yozing, tekshiramiz! ⚖️`
        : `💡 **Huquqiy tushuntirish:**\n\nSavolingiz: **"${userQuery}"**\n\n📖 **BMBA namunasi:** ${bq.text}\n\n${opts}\n\n✅ **To'g'ri javob:** ${bq.correct}\n📌 **Izoh:** ${bq.explanation || 'Qonun talablariga mos javob.'}`;
    }
  }

  // Umumiy savol
  if (isStrict) {
    return `🔥 **Qattiq Qo'l Ustoz:**\n\nSavolingiz: **"${userQuery}"**\n\nHar qanday masalaga yuzaki emas, chuqur va faktlar bilan yondashish kerak. Savolingizni aniqroq qilib yozsangiz, darhol to'liq tahlil qilib beraman!`;
  }

  return `🤖 **AI Ustoz:**\n\nSizning savolingiz: **"${userQuery}"**\n\nBu bo'yicha aniqroq vaziyat yoki savol bersangiz, barcha tafsilotlari bilan batafsil yoritib beraman!`;
}

const TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda aqlli, erkin fikrlovchi, har tomonlama yetuk va universal sun'iy intellektsiz (xuddi ChatGPT / GPT-4o kabi).
FOYDALANUVCHINING ISTALGAN SAVOLIGA o'zbek tilida tabiiy, aqlli, batafsil va go'zal javob bering! Hech qanday sohada cheklanmaysiz.`;

const STRICT_TUTOR_SYSTEM_INSTRUCTION = `Siz talabchan, qat'iyatli, jiddiy va temir intizomli "QATTIQ QO'L USTOZ"siz.
Har qanday mavzuda eng yuqori saviyada to'g'ridan-to'g'ri javob bering va oxirida o'quvchini sinov savoli bilan tekshiring!`;

async function askAiTutor(message, history = [], persona = 'friendly') {
  if (!message || !message.trim()) {
    return {
      reply: "Savol kiritilmadi. Iltimos, savolingizni yozing.",
      source: persona === 'strict' ? "Qattiq Qo'l Ustoz 🔥" : "AI Ustoz (ChatGPT)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  }

  const userQuery = message.trim();
  const isStrict = persona === 'strict' || persona === 'qattiq';
  const systemInstruction = isStrict ? STRICT_TUTOR_SYSTEM_INSTRUCTION : TUTOR_SYSTEM_INSTRUCTION;
  const sourceName = isStrict ? "Qattiq Qo'l Ustoz 🔥" : "AI Ustoz (ChatGPT)";

  try {
    let prompt = "";
    if (Array.isArray(history) && history.length > 0) {
      prompt += "Oldingi suhbat:\n" + history.slice(-6).map(h => `${h.role === 'user' ? 'Foydalanuvchi' : 'AI'}: ${h.text}`).join("\n") + "\n\n";
    }
    prompt += `Foydalanuvchi so'rovi: "${userQuery}"\n${isStrict ? 'Qattiq Qo\'l Ustoz javobi va nazorat savoli:' : 'AI javobi:'}`;

    const aiText = await generateAiContent({
      prompt,
      systemInstruction
    });

    return {
      reply: aiText.trim(),
      source: sourceName,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.warn('AI API cheklovi:', err.message);

    return {
      reply: getTutorFallbackReply(userQuery, isStrict),
      source: isStrict ? "Qattiq Qo'l Ustoz 🔥" : "AI Ustoz (ChatGPT)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  }
}

async function checkOpenAnswer({ questionText, expectedAnswer, userAnswer, explanation }) {
  const normUser = (userAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');
  const normExpected = (expectedAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');

  try {
    const prompt = `Siz BMBA Huquqshunoslik milliy sertifikat imtihoni bo'yicha bosh ekspertsiz.
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
  generateAiContent,
  getTutorFallbackReply
};
