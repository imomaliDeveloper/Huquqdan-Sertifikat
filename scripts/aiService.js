const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

let genAI = null;
if (geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('🤖 Gemini AI moduli muvaffaqiyatli initsializatsiya qilindi');
  } catch (err) {
    console.warn('⚠️ Gemini AI ulanishida ogohlantirish:', err.message);
  }
}

// 1. OpenAI (Haqiqiy ChatGPT)
async function tryOpenAi(fullPrompt) {
  if (!openaiApiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.7
      })
    });
    const data = await res.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
  } catch (e) {}
  return null;
}

// 2. Groq (Tezkor Llama-3.3-70B)
async function tryGroq(fullPrompt) {
  if (!groqApiKey) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.7
      })
    });
    const data = await res.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
  } catch (e) {}
  return null;
}

// 3. Google Gemini
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite'
];

async function tryGemini(fullPrompt, responseMimeType) {
  if (!genAI) return null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config = {};
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const callPromise = genAI.models.generateContent({
          model,
          contents: fullPrompt,
          config: Object.keys(config).length > 0 ? config : undefined
        });

        const response = await Promise.race([
          callPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
        ]);

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err) {
        if ((err.status === 503 || (err.message && err.message.includes('503'))) && attempt === 1) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
  }
  return null;
}

async function generateAiContent({ prompt, systemInstruction, responseMimeType }) {
  const fullPrompt = systemInstruction 
    ? `${systemInstruction}\n\nFoydalanuvchi so'rovi:\n${prompt}\n\nJavob:`
    : prompt;

  // 1. OpenAI (ChatGPT)
  const openAiReply = await tryOpenAi(fullPrompt);
  if (openAiReply) return openAiReply;

  // 2. Groq
  const groqReply = await tryGroq(fullPrompt);
  if (groqReply) return groqReply;

  // 3. Gemini
  const geminiReply = await tryGemini(fullPrompt, responseMimeType);
  if (geminiReply) return geminiReply;

  throw new Error('AI serverlarida vaqtinchalik yuklama yuqori.');
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

// Zaxira javob generatori
function getTutorFallbackReply(userQuery, isStrict = false) {
  const qLower = userQuery.toLowerCase().trim();

  // Hisob-kitob
  const mathMatch = qLower.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : 'nolga bo\'lish mumkin emas';
    return isStrict
      ? `🔥 **Hisob natijasi:** **${a} ${op} ${b} = ${res}**\n\nOddiy hisoblardan vaqtni yo'qotma, asosiy fanga diqqatingni qarat! 👊`
      : `Javob: **${a} ${op} ${b} = ${res}** ✅`;
  }

  // Salomlashish
  if (qLower.startsWith('salom') || qLower.startsWith('assalom') || qLower === 'qalaysiz') {
    return isStrict
      ? `🔥 **Assalomu alaykum! Men sizning Qattiq Qo'l Ustozingizman!**\n\nVaqtni behuda sarflamaymiz. Qaysi mavzuda savolingiz bor? Tezda yozing, tahlil qilamiz! ⚖️`
      : `Assalomu alaykum! Xush kelibsiz! 👋\n\nMen sizning universal AI Ustozingizman (xuddi ChatGPT kabi ishlayman). Menga istalgan mavzuda (fanlar, darslar, tahlillar yoki suhbat) savol berishingiz mumkin. Bugun sizga qanday yordam beray?`;
  }

  // Kvant fizikasi
  if (qLower.includes('kvant') || qLower.includes('fizika')) {
    const pAns = `🔬 **Kvant fizikasi nima?**\n\nKvant fizikasi — bu olamning eng mikroskopik darajadagi, ya'ni **atomlar, elektronlar, fotonlar va subatom zarralar** harakatini o'rganadigan zamonaviy fizika bo'limidir.\n\n**Asosiy qoidalari:**\n1. **Kvantlanish:** Yorug'lik va energiya porsiyalar (kvantlar) shaklida tarqaladi;\n2. **Superpozitsiya:** Zarracha bir vaqtning o'zida bir nechta holatda bo'lishi mumkin;\n3. **Amaliy qo'llanilishi:** Kvant kompyuterlari, lazerlar, mikroprotsessorlar va MRT apparatlari aynan shu qonunlarga asoslangan.`;
    return isStrict
      ? `🔥 **Qattiq Qo'l Ustoz:**\n\n${pAns}\n\n❓ **Sinov:** Yorug'likning elementar zarrasi nima deb ataladi? Tezda yoz! 👊`
      : `${pAns}\n\nYana qanday savollaringiz bor?`;
  }

  // Dasturlash
  if (qLower.includes('dasturlash') || qLower.includes('python') || qLower.includes('javascript')) {
    return `💻 **Dasturlash haqida:**\nDasturlash — zamonaviy dunyoning eng talabgir sohasidir. Boshlash uchun:\n• **Python:** Sun'iy intellekt va sodda sintaksis uchun a'lo;\n• **JavaScript:** Veb-saytlar va ilovalar yaratishda yetakchi.\nQaysi yo'nalishga qiziqasiz? Yo'l xaritasini tuzib berishim mumkin!`;
  }

  // Tarix
  if (qLower.includes('amir temur') || qLower.includes('temur')) {
    return `🏛️ **Amir Temur (1336–1405):**\nBuyuk sarkarda, davlat arbobi va qudratli Temuriylar imperiyasining asoschisi. U poytaxt Samarqandni jahon ilm-fani va madaniyati markaziga aylantirgan. Mashhur shiori: *"Kuch — adolatdadir"*.`;
  }

  // Huquqiy savollar
  if (isLegalQuery(qLower)) {
    const matched = searchBmbaQuestions(userQuery, 1);
    if (matched && matched.length > 0) {
      const bq = matched[0];
      const opts = bq.options.map(o => `${o.key}) ${o.text}`).join('\n');
      return isStrict
        ? `🔥 **Qattiq Qo'l Ustoz tekshiruvi:**\n\nSavolingiz: **"${userQuery}"**\n\n📌 **Imtihon savoli:** ${bq.text}\n\n${opts}\n\n❓ To'g'ri javobni yozing, tekshiramiz! ⚖️`
        : `💡 **Huquqiy tahlil:**\n\nSavolingiz: **"${userQuery}"**\n\n📖 **Savol:** ${bq.text}\n\n${opts}\n\n✅ **To'g'ri javob:** ${bq.correct}\n📌 **Izoh:** ${bq.explanation || 'Qonun talablariga mos javob.'}`;
    }
  }

  // Boshqa istalgan erkin savol
  if (isStrict) {
    return `🔥 **Qattiq Qo'l Ustoz:**\n\nSavolingiz: **"${userQuery}"**\n\nUshbu masalaga jiddiy va amaliy yondashish kerak. Savolingizni aniqroq vaziyat yoki misol bilan davom ettiring, to'liq tahlil qilib beraman! 👊`;
  }

  return `🤖 **AI Ustoz:**\n\nSizning savolingiz: **"${userQuery}"**\n\nUshbu mavzuni yanada chuqurroq tushunish uchun aniqroq misol yoki savol bersangiz, barcha tafsilotlari bilan batafsil yoritib beraman!`;
}

// Tizim yo'riqnomasi
const TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda aqlli, erkin fikrlovchi, har tomonlama yetuk va universal sun'iy intellektsiz (xuddi ChatGPT / GPT-4o kabi).
FOYDALANUVCHINING ISTALGAN SAVOLIGA o'zbek tilida tabiiy, aqlli, batafsil, go'zal va erkin javob bering!
Foydalanuvchi qaysi tilda va qaysi mavzuda (ilm-fan, texnologiya, dasturlash, matematika, tarix, insho, huquq, hayotiy maslahat yoki erkin suhbat) yozsa, aynan o'sha mavzuda xuddi ChatGPT kabi to'liq va mukammal yoritib bering.`;

const STRICT_TUTOR_SYSTEM_INSTRUCTION = `Siz talabchan, qat'iyatli, jiddiy va temir intizomli "QATTIQ QO'L USTOZ"siz (Universal Repetitor).
Foydalanuvchining har qanday mavzudagi savoliga eng yuqori saviyada, aniq va lutfbozliksiz to'g'ridan-to'g'ri javob bering.
Agar foydalanuvchi erinchoqlik yoki dangasalik qilsa — qat'iy intizomga chaqiring. Javobingiz oxirida o'quvchini sinov savoli bilan tekshiring! Emojilar: 🔥, ⚖️, ⚠️, 👊, 🎓.`;

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
    prompt += `Savol: "${userQuery}"`;

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
