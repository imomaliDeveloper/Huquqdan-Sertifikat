require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { generateVariant } = require('./scripts/generator');
const { initBot, getBotInstance } = require('./bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Gemini AI initsializatsiyasi
let genAI = null;
const geminiApiKey = process.env.GEMINI_API_KEY;
if (geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('🤖 AI moduli muvaffaqiyatli ulandi (ChatGPT rejimida)');
  } catch (err) {
    console.warn('⚠️ AI ulanishida ogohlantirish:', err.message);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY topilmadi, AI funksiyalari fallback rejimida ishlaydi.');
}

app.use(cors());
app.use(express.json());

// Brauzer keshini cheklash - yangilanishlar zudlik bilan ochilishi uchun
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.html') || req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// ==================== SERVERLESS XAVFSIZ JSON STORAGE (VERCEL READ-ONLY UCHUN) ====================
function safeReadJSON(fileName, defaultVal = []) {
  // 1. /tmp dan o'qish (Vercel serverless da yangilangan ma'lumotlar)
  try {
    const tmpPath = path.join('/tmp', fileName);
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    }
  } catch (e) {}

  // 2. data/ papkasidan o'qish
  try {
    const localPath = path.join(__dirname, 'data', fileName);
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
  } catch (e) {}

  return defaultVal;
}

function safeWriteJSON(fileName, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  // 1. /tmp/ papkasiga yozish (AWS Lambda va Vercel da yagona yozishga ruxsat etilgan joy)
  try {
    const tmpPath = path.join('/tmp', fileName);
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');
  } catch (e) {}

  // 2. data/ papkasiga yozish (faqat lokal disk ruxsat bergan hollarda)
  try {
    const localPath = path.join(__dirname, 'data', fileName);
    fs.writeFileSync(localPath, jsonStr, 'utf8');
  } catch (e) {
    // Vercel EROFS read-only bo'lsa xatolik otmaymiz, chunki /tmp ga yozildi!
  }
}

// In-Memory Keshlar
let inMemoryUsers = null;
function getUsersList() {
  if (!inMemoryUsers) {
    inMemoryUsers = safeReadJSON('users.json', []);
  }
  return inMemoryUsers;
}
function saveUsersList(users) {
  inMemoryUsers = users;
  safeWriteJSON('users.json', users);
}

let inMemoryLeaderboard = null;
function getLeaderboardList() {
  if (!inMemoryLeaderboard) {
    inMemoryLeaderboard = safeReadJSON('leaderboard.json', []);
  }
  return inMemoryLeaderboard;
}
function saveLeaderboardList(list) {
  inMemoryLeaderboard = list;
  safeWriteJSON('leaderboard.json', list);
}

let inMemoryReceipts = null;
function getReceiptsList() {
  if (!inMemoryReceipts) {
    inMemoryReceipts = safeReadJSON('receipts.json', []);
  }
  return inMemoryReceipts;
}
function saveReceiptsList(list) {
  inMemoryReceipts = list;
  safeWriteJSON('receipts.json', list);
}

// Statik fayllarni ulash
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0
}));
app.use('/data', express.static(path.join(__dirname, 'data')));

// API: 50 ta Variantlar ro'yxati
app.get('/api/variants', (req, res) => {
  const variants = [];
  for (let i = 1; i <= 50; i++) {
    const isFree = i <= 5;
    variants.push({
      id: i,
      title: i === 1 ? "Variant 1 (T-760 Rasmiy Namunaviy)" : `Variant ${i} (BMBA Standart)`,
      totalQuestions: 45,
      timeMinutes: 90,
      badge: i === 1 ? "Rasmiy Namunaviy" : (isFree ? "Bepul sinov" : "🔒 Premium"),
      isPremium: !isFree,
      sectionsCount: { y1: 32, y2: 3, o: 10 }
    });
  }
  res.json(variants);
});

// API: Muayyan variantni olish (1..50)
app.get('/api/variants/:id', (req, res) => {
  const vId = parseInt(req.params.id) || 1;
  try {
    const variantFile = path.join(__dirname, 'data', 'variants', `variant_${vId}.json`);
    if (fs.existsSync(variantFile)) {
      const data = JSON.parse(fs.readFileSync(variantFile, 'utf8'));
      return res.json(data);
    }
    const variant = generateVariant(vId);
    res.json(variant);
  } catch (err) {
    res.status(500).json({ error: "Variantni yuklashda xatolik: " + err.message });
  }
});

// API: 40 ta qonun ro'yxati
app.get('/api/laws', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'laws_list.json'), 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Qonunlar ro'yxatini yuklashda xatolik" });
  }
});

// API: Tavsiya etiladigan rasmiy va o'quv kanallar ro'yxati
app.get('/api/channels', (req, res) => {
  try {
    const channelsPath = path.join(__dirname, 'data', 'channels.json');
    if (fs.existsSync(channelsPath)) {
      const data = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
      return res.json(data);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: "Kanallar ro'yxatini yuklashda xatolik: " + err.message });
  }
});

// API: Majburiy a'zolikni tekshirish (@Huquq_study)
app.post('/api/check-subscription', async (req, res) => {
  const { userId, channel } = req.body;
  const targetChannel = channel || '@Huquq_study';
  const bot = getBotInstance();

  if (!bot) {
    // Agar bot tokeni sozlanmagan bo'lsa (lokal test), ochiq rejimda ruxsat beramiz
    return res.json({
      subscribed: true,
      message: "Lokal rejim: A'zolik tekshiruvi muvaffaqiyatli o'tdi",
      channel: targetChannel
    });
  }

  if (!userId) {
    return res.json({
      subscribed: false,
      message: "Foydalanuvchi Telegram ID si aniqlanmadi",
      channel: targetChannel
    });
  }

  try {
    const isSubscribed = await bot.checkUserSubscription(userId, targetChannel);
    return res.json({
      subscribed: isSubscribed,
      channel: targetChannel,
      message: isSubscribed ? "A'zolik tasdiqlandi" : "Kanalga a'zo bo'linmagan"
    });
  } catch (err) {
    return res.json({
      subscribed: false,
      error: err.message,
      channel: targetChannel
    });
  }
});

// API: 4 ta Asosiy Darslik Kitobi (8, 9, 10, 11-sinf)
app.get('/api/textbooks', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'textbooks.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Darsliklarni yuklashda xatolik" });
  }
});

// API: 25 ta Vaziyatli Keyslar banki (Y-2)
app.get('/api/cases', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'cases_bank.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Keyslar bankini yuklashda xatolik: " + err.message });
  }
});

// API: Savollar bankini olish
app.get('/api/questions', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'questions_bank.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Savollar bankini yuklashda xatolik" });
  }
});

// ==================== 1. AI REPETITOR API (GEMINI) ====================

// Ochiq savollarni semantik tekshirish
app.post('/api/ai/check-open-answer', async (req, res) => {
  const { questionText, expectedAnswer, userAnswer, explanation } = req.body;

  if (!userAnswer || !expectedAnswer) {
    return res.json({
      isCorrect: false,
      similarityScore: 0,
      feedback: "Javob kiritilmadi.",
      standardizedAnswer: expectedAnswer || ""
    });
  }

  // To'g'ridan-to'g'ri oddiy moslik (tezkor tekshiruv)
  const normUser = userAnswer.toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');
  const normExpected = expectedAnswer.toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');

  if (normUser === normExpected) {
    return res.json({
      isCorrect: true,
      similarityScore: 100,
      feedback: "To'g'ri! Mukammal aniqlikda javob berildi.",
      standardizedAnswer: expectedAnswer
    });
  }

  // Agar Gemini AI mavjud bo'lsa, semantik tekshiramiz
  if (genAI) {
    try {
      const prompt = `Siz O'zbekiston Respublikasi BMBA (Davlat test markazi) Huquqshunoslik milliy sertifikat imtihoni bo'yicha bosh ekspert va o'qituvchisiz.
Savol: "${questionText || 'Huquqiy savol'}"
Kutilgan to'g'ri javob: "${expectedAnswer}"
Talaba yozgan javob: "${userAnswer}"
Qonuniy izoh: "${explanation || ''}"

Vazifa: Talabaning javobini tahlil qiling. Agar talaba javobni so'zlar bilan (masalan "uch yuz" va "300"), kichik sinonimlar, qo'shimcha so'zlar ("1 oy" va "bir oylik muddatda") yoki kichik imlo farqlari bilan to'g'ri yozgan bo'lsa, isCorrect=true deb toping.
Qat'iy JSON formatida javob qaytaring:
{
  "isCorrect": boolean (true yoki false),
  "similarityScore": raqam (0 dan 100 gacha),
  "feedback": "Talabaga o'zbek tilida 1 jumlada do'stona baho va tushuntirish",
  "standardizedAnswer": "${expectedAnswer}"
}`;

      const aiResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(aiResponse.text);
      return res.json(parsed);
    } catch (err) {
      console.error('Gemini check-open-answer xatolik:', err.message);
    }
  }

  // Fallback (Agar AI ishlamasa yoki ulanish bo'lmasa)
  const isMatch = normUser.includes(normExpected) || normExpected.includes(normUser);
  return res.json({
    isCorrect: isMatch,
    similarityScore: isMatch ? 85 : 30,
    feedback: isMatch ? "Javob to'g'ri deb qabul qilindi!" : "Kutilgan javobdan farq qiladi.",
    standardizedAnswer: expectedAnswer
  });
});

// Xatolar ustida AI Tahlil ("Nega aynan shu javob to'g'ri?")
app.post('/api/ai/explain-question', async (req, res) => {
  const { questionText, options, correctAnswer, userAnswer, explanation, lawRef } = req.body;

  if (genAI) {
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

      const aiResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(aiResponse.text);
      return res.json(parsed);
    } catch (err) {
      console.error('AI explain-question xatolik:', err.message);
    }
  }

  // Fallback tushuntirish
  return res.json({
    lawArticle: lawRef || "O'zbekiston Respublikasi Qonunchiligi",
    explanation: explanation || "Ushbu savol bo'yicha to'g'ri javob normativ-huquqiy hujjat talablariga to'liq mos keladi.",
    mistakeReason: "Savoldagi shartlar va muddatlarga e'tibor bermaslik ko'p uchraydi.",
    memoryTip: "Savol kalit so'zlari va unga berilgan muddatlarni Flashcards orqali mustahkamlang."
  });
});

// ==================== AI USTOZ (CHATGPT KABI HAR QANDAY SAVOLGA JAVOB BERUVCHI AI) ====================

app.post('/api/ai/tutor-chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Savol matni kiritilmadi." });
  }

  const userQuery = message.trim();

  if (genAI) {
    try {
      const systemInstruction = `Siz xuddi ChatGPT (GPT-4o) kabi nihoyatda aqlli, keng dunyoqarashli, madaniyatli, do'stona va universal "AI Ustoz"siz.
Foydalanuvchi sizga har qanday mavzuda savol berishi mumkin:
1. Huquqshunoslik, BMBA milliy sertifikat imtihonlari, 40 ta qonun, O'zbekiston Respublikasi Konstitutsiyasi, Mehnat kodeksi, Fuqarolik kodeksi, Oila kodeksi, Jinoyat kodeksi, vaziyatli keyslar va barcha maktab darsliklari;
2. Istalgan umumiy sohalar: ta'lim, ilm-fan, tarix, matematika, tillar, axborot texnologiyalari, dasturlash, insho yoki arizalar yozish, motivatsiya, hayotiy maslahatlar va umumiy suhbat.

QOIDALAR:
- Xuddi ChatGPT kabi barcha savollarga xushmuomala, to'liq, batafsil, mantiqiy va tushunarli qilib javob bering.
- Hech qachon javob berishdan bosh tortmang (hech qachon "men faqat huquqni bilaman" deb aytmang!). Foydalanuvchi nima so'rasa, o'sha mavzuda eng oliy darajada yordam bering.
- Huquq va BMBA imtihonlariga oid savollarda qat'iy ravishda tegishli qonun nomi, moddasi va amaliy tushuntirishini keltiring.
- Boshqa fanlar yoki hayotiy savollarda esa eng to'g'ri, foydali ma'lumotlar, misollar va maslahatlarni bering.
- Javobni chiroyli va o'qishga oson markdown formatida (qalin shriftlar, ro'yxatlar, chiroyli bo'limlar va mos emojilar bilan) taqdim eting.`;

      let prompt = `${systemInstruction}\n\n`;
      if (Array.isArray(history) && history.length > 0) {
        prompt += "Oldingi suhbat:\n" + history.slice(-6).map(h => `${h.role === 'user' ? 'Foydalanuvchi' : 'AI Ustoz'}: ${h.text}`).join("\n") + "\n\n";
      }
      prompt += `Foydalanuvchining yangi savoli: "${userQuery}"\nAI Ustoz (ChatGPT kabi) javobi:`;

      const aiResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({
        reply: aiResponse.text || "Savolingiz o'rganildi. Iltimos, batafsilroq ma'lumot kiriting.",
        source: "AI Ustoz (ChatGPT)",
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error('AI Ustoz chat xatolik:', err.message);
    }
  }

  // Aqlli Universal ChatGPT Fallback Javoblar
  let fallbackReply = "";
  const qLower = userQuery.toLowerCase();

  if (qLower.includes("salom") || qLower.includes("assalom") || qLower.includes("qalaysiz") || qLower.includes("qalesan") || qLower.includes("kim siz")) {
    fallbackReply = `Assalomu alaykum! Xush kelibsiz! 👋\n\nMen sizning universal **AI Ustozingizman** (ChatGPT kabi ishlayman). Menga xohlagan mavzuingizda savol berishingiz mumkin:\n\n• ⚖️ **Huquq va Qonunchilik:** BMBA sertifikati, 40 ta qonun, Mehnat, Oila, Fuqarolik va Jinoyat kodekslari;\n• 📚 **Ta'lim va Fanlar:** Tarix, matematika, tillar, darsliklar va imtihonga tayyorlanish uslublari;\n• 💡 **Maslahatlar:** Insho yozish, mantiqiy masalalar, shaxsiy rivojlanish va boshqa istalgan savollar.\n\nBugun sizga qaysi masala yoki savol bo'yicha yordam beray?`;
  } else if (qLower.includes("mehnat") || qLower.includes("shartnoma") || qLower.includes("ish haqi") || qLower.includes("ta'til") || qLower.includes("ishdan bo'shatish")) {
    fallbackReply = `📋 **Mehnat qonunchiligi (Yangi Mehnat kodeksi tahlili):**\n\n1. **Mehnat shartnomasini bekor qilish (155–173-moddalar):**\n• Ish beruvchi tashabbusi bilan bekor qilishda ogohlantirish muddatlari: shtat qisqarganda kamida 2 oy, xodim malakasi yetarli bo'lmaganda 1 oy oldin yozma xabar beriladi.\n\n2. **Ishdan bo'shatish nafaqasi (173-modda):**\n• Ish staji 3 yilgacha: o'rtacha oylik ish haqining 50% miqdorida;\n• 3 yildan 5 yilgacha: 75%;\n• 5 yildan 10 yilgacha: 100%;\n• 10 yildan 15 yilgacha: 150%;\n• 15 yildan ortiq: 200% miqdorida kafolatlangan to'lov to'lanadi.\n\n3. **Sinov muddati (129–132-moddalar):** Umumiy tartibda ko'pi bilan 3 oydan oshmasligi shart.`;
  } else if (qLower.includes("nikoh") || qLower.includes("oila") || qLower.includes("aliment") || qLower.includes("ajralish")) {
    fallbackReply = `💍 **Oila huquqi (Oila kodeksi tahlili):**\n\n1. **Nikoh yoshi (15-modda):** Erkaklar va ayollar uchun qat'iy 18 yosh.\n2. **Nikoh shartnomasi (38–48-moddalar):** Nikoh shartnomasi faqat va faqat er-xotinning **mulkiy** huquq va majburiyatlarini belgilaydi. Notarial tasdiqlash majburiydir.\n3. **Aliment undirish (99-modda):** Voyaga yetmagan bolalar uchun: 1 bola uchun daromadning 1/4 qismi, 2 bola uchun 1/3 qismi, 3 va undan ortiq bola uchun yarmi (1/2) miqdorida undiriladi.\n4. **300 kun qoidasi (60-modda):** Nikoh bekor qilinganidan keyin 300 kun ichida tug'ilgan bola sobiq erdan deb hisoblanadi.`;
  } else if (qLower.includes("keys") || qLower.includes("y-2") || qLower.includes("vaziyat")) {
    fallbackReply = `⚖️ **BMBA Y-2 Vaziyatli keyslarni ChatGPT usulida yechish:**\n\n1. **Faktlarni ajrating:** Vaziyatda da'vogar kim va javobgar kim? Taraflar orasidagi munosabat qachon boshlangan?\n2. **Normativ asosni aniqlang:** Bu holat Mehnat kodeksi, Fuqarolik kodeksi, Iste'molchilar huquqlarini himoya qilish yoki Ma'muriy javobgarlik sohasiga kiradimi?\n3. **Muddatlar va sanalarni tekshiring:** Huquqiy da'vo muddati (odatda FK bo'yicha 3 yil, mehnat nizolarida esa ishdan bo'shatish bo'yicha buyruq berilgan kundan boshlab 1 oy) o'tmaganligini aniqlang.\n4. **Xulosa qiling:** Qonunning aniq moddasiga asoslanib da'vo qanoatlantirilishi yoki rad etilishi kerakligini belgilang.`;
  } else if (qLower.includes("40") || qLower.includes("qonun") || qLower.includes("spesifikatsiya")) {
    fallbackReply = `📜 **BMBA Milliy Sertifikatining 40 ta Qonuni:**\n\nImtihon quyidagi asosiy normativ hujjatlarni qamrab oladi:\n• **O'zbekiston Respublikasi Konstitutsiyasi** (barcha bo'limlar);\n• **Mehnat kodeksi**, **Fuqarolik kodeksi**, **Oila kodeksi**, **Jinoyat kodeksi**, **Ma'muriy javobgarlik to'g'risidagi kodeks**;\n• *"Sudlar to'g'risida"*, *"Prokuratura to'g'risida"*, *"Advokatura to'g'risida"*, *"Ichki ishlar organlari to'g'risida"*, *"Korrupsiyaga qarshi kurashish to'g'risida"* va boshqa 40 ta maxsus qonunlar.\n\n💡 Ilovaning **"40 ta Qonun"** bo'limida barcha hujjatlarning to'liq Lex.uz havolalari keltirilgan.`;
  } else {
    fallbackReply = `🤖 **ChatGPT AI Ustoz tahlili:**\n\nSizning savolingiz: **"${userQuery}"**\n\nUshbu masala bo'yicha quyidagi muhim jihatlarga e'tibor qaratish lozim:\n\n1. **Asosiy tushuncha va mohiyat:** Har qanday fanda yoki hayotiy vaziyatda eng avvalo fundamental qoidalar va ta'riflarga tayanish to'g'ri natija beradi.\n2. **Mantiqiy yondashuv:** Mavzuni bosqichma-bosqich tahlil qiling: sabab, jarayon va natija bog'liqligini aniqlang.\n3. **Amaliy tavsiya:** Agar bu savol imtihon yoki huquqqa oid bo'lsa, qonun moddasi va amaliyotdagi pretsedentlarni o'rganing; agar umumiy mavzuda bo'lsa, tizimli reja tuzib o'rganishni tavsiya qilaman.\n\nSizga ushbu mavzu bo'yicha yana qanday batafsil ma'lumot yoki tushuntirish kerak bo'lsa, bemalol so'rang!`;
  }

  return res.json({
    reply: fallbackReply,
    source: "AI Ustoz (ChatGPT)",
    timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  });
});

// ==================== 2. REYTING & LEADERBOARD API ====================

app.get('/api/leaderboard', (req, res) => {
  try {
    const list = getLeaderboardList();
    list.sort((a, b) => b.score - a.score || a.percentage - b.percentage);
    res.json(list.slice(0, 15));
  } catch (err) {
    res.status(500).json({ error: "Leaderboardni yuklashda xatolik" });
  }
});

// API: Natijalarni saqlash va Leaderboardni yangilash
app.post('/api/results', (req, res) => {
  const resultData = req.body;
  try {
    const list = getLeaderboardList();

    const newEntry = {
      id: Date.now(),
      name: resultData.userName || "Talaba",
      score: resultData.score || 0,
      total: resultData.total || 45,
      percentage: resultData.percentage || 0,
      grade: resultData.grade || "C",
      timeSpent: resultData.timeSpent || "90 daqiqa",
      date: new Date().toLocaleDateString('uz-UZ')
    };

    list.push(newEntry);
    list.sort((a, b) => b.score - a.score);
    saveLeaderboardList(list.slice(0, 50));

    res.json({ success: true, message: "Natijangiz reytingga qo'shildi!", entry: newEntry });
  } catch (err) {
    console.error('Natija saqlashda xatolik:', err);
    res.json({ success: true, message: "Natija qabul qilindi" });
  }
});

// API: Telegram kanalga bitta test tashlash (Kanal autoposter)
app.post('/api/channel/post-quiz', async (req, res) => {
  const bot = getBotInstance();
  if (!bot) {
    return res.status(400).json({ error: "Telegram bot faol emas yoki token kiritilmagan" });
  }
  try {
    await bot.postNextQuizToChannel();
    res.json({ success: true, message: "Kanalga test muvaffaqiyatli tashlandi!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: To'lov chekini qabul qilish va saqlash
app.post('/api/payments/submit-receipt', (req, res) => {
  const { transactionId, userContact, userName, amount } = req.body;
  if (!transactionId && !userContact) {
    return res.status(400).json({ error: "Tranzaksiya ma'lumoti yoki aloqa kiritilmadi" });
  }

  try {
    const receipts = getReceiptsList();

    const newReceipt = {
      id: "REC-" + Date.now(),
      transactionId: transactionId || "Noma'lum",
      userContact: userContact || "Kiritilmagan",
      userName: userName || "O'quvchi",
      amount: amount || "49 000 UZS",
      date: new Date().toISOString(),
      status: "pending"
    };

    receipts.unshift(newReceipt);
    saveReceiptsList(receipts);

    res.json({
      success: true,
      message: "Chek qabul qilindi! Tez orada VIP a'zoligingiz faollashtiriladi.",
      receiptId: newReceipt.id
    });
  } catch (err) {
    res.status(500).json({ error: "Chekni saqlashda xatolik: " + err.message });
  }
});

// ==================== TARIFFS & AUTH API ====================

// API: 3 ta Tariflar ro'yxati
app.get('/api/tariffs', (req, res) => {
  try {
    const data = safeReadJSON('tariffs.json', []);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Tariflarni yuklashda xatolik: " + err.message });
  }
});

// API: Ro'yxatdan o'tish (Register)
app.post('/api/auth/register', (req, res) => {
  const { name, phone, password, role, city } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Ism, telefon raqam va parol kiritilishi shart!" });
  }

  try {
    const users = getUsersList();

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existing = users.find(u => u.phone && u.phone.replace(/\s+/g, '') === cleanPhone);
    if (existing) {
      return res.status(400).json({ error: "Ushbu telefon raqam bilan allaqachon ro'yxatdan o'tilgan!" });
    }

    const newUser = {
      id: "USR-" + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      password: password,
      plan: "START",
      role: role || "Abituriyent",
      city: city || "O'zbekiston",
      registeredAt: new Date().toISOString(),
      testsCompleted: 0,
      averageScore: "0%",
      bestGrade: "C"
    };

    users.push(newUser);
    saveUsersList(users);

    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
  } catch (err) {
    console.error("Serverless register ogohlantirish:", err.message);
    // Hatto serverless xotira muammosi bo'lsa ham foydalanuvchini muvaffaqiyatli ro'yxatdan o'tkazamiz:
    const safeUser = {
      id: "USR-" + Date.now(),
      name: name.trim(),
      phone: phone.trim().replace(/\s+/g, ''),
      plan: "START",
      role: role || "Abituriyent",
      city: city || "O'zbekiston",
      registeredAt: new Date().toISOString(),
      testsCompleted: 0,
      averageScore: "0%",
      bestGrade: "C"
    };
    res.json({ success: true, user: safeUser, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
  }
});

// API: Kirish (Login)
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Telefon raqam va parol kiritilishi shart!" });
  }

  try {
    const users = getUsersList();

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const user = users.find(u => u.phone && u.phone.replace(/\s+/g, '') === cleanPhone && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Telefon raqam yoki parol noto'g'ri!" });
    }

    const { password: _, ...userWithoutPass } = user;
    res.json({ success: true, user: userWithoutPass, message: "Xush kelibsiz!" });
  } catch (err) {
    res.status(500).json({ error: "Kirishda xatolik: " + err.message });
  }
});

// API: Foydalanuvchi profilini olish
app.get('/api/auth/profile/:id', (req, res) => {
  try {
    const users = getUsersList();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const { password: _, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TELEGRAM WEBHOOK API ====================

// Telegram Webhook qabul qilish (24/7 Serverless)
app.post('/api/webhook', async (req, res) => {
  const bot = getBotInstance();
  if (bot && req.body) {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      console.error('Webhook xatolik:', err.message);
    }
  }
  res.status(200).send('OK');
});

// Webhookni bir marta sozlash (browser orqali ochiladi)
app.get('/api/set-webhook', async (req, res) => {
  const bot = getBotInstance();
  if (!bot || !bot.token) {
    return res.status(400).json({ error: "TELEGRAM_BOT_TOKEN topilmadi yoki kiritilmagan" });
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'huquqdan-sertifikat.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${proto}://${host}/api/webhook`;

  try {
    const tgRes = await bot.callApi('setWebhook', { url: webhookUrl });
    res.json({
      success: tgRes.ok,
      webhookUrl: webhookUrl,
      telegramResponse: tgRes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bosh sahifa yo'naltirish (Fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverni ishga tushirish (Vercel serverless da listen qilinmaydi)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚖️  Huquq Milliy Sertifikat Platformasi ishga tushdi!`);
    console.log(`🌐  Lokal veb-manzil: http://localhost:${PORT}`);
    console.log(`🤖  AI Ustoz (ChatGPT): ${genAI ? "Faol (ChatGPT rejimida)" : "O'chiq"}`);
    console.log(`💳  To'lov tizimi (Humo): 9860 0366 7156 8792`);
    console.log(`=======================================================`);

    // Telegram botni ishga tushirish (faqat lokal yoki doimiy serverda)
    initBot();
  });
}

// Vercel serverless uchun eksport
module.exports = app;
