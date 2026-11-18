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
    console.log('🤖 Google Gemini AI moduli muvaffaqiyatli ulandi (gemini-3.8-flash)');
  } catch (err) {
    console.warn('⚠️ Gemini AI ulanishida ogohlantirish:', err.message);
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
        model: 'gemini-3.8-flash',
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
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(aiResponse.text);
      return res.json(parsed);
    } catch (err) {
      console.error('Gemini explain-question xatolik:', err.message);
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

// ==================== 2. REYTING & LEADERBOARD API ====================

app.get('/api/leaderboard', (req, res) => {
  try {
    const lbPath = path.join(__dirname, 'data', 'leaderboard.json');
    if (!fs.existsSync(lbPath)) {
      return res.json([]);
    }
    const raw = fs.readFileSync(lbPath, 'utf8');
    const list = JSON.parse(raw);
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
    const lbPath = path.join(__dirname, 'data', 'leaderboard.json');
    let list = [];
    if (fs.existsSync(lbPath)) {
      list = JSON.parse(fs.readFileSync(lbPath, 'utf8'));
    }

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
    fs.writeFileSync(lbPath, JSON.stringify(list.slice(0, 50), null, 2), 'utf8');

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
    const receiptsPath = path.join(__dirname, 'data', 'receipts.json');
    let receipts = [];
    if (fs.existsSync(receiptsPath)) {
      receipts = JSON.parse(fs.readFileSync(receiptsPath, 'utf8'));
    }

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
    fs.writeFileSync(receiptsPath, JSON.stringify(receipts, null, 2), 'utf8');

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
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tariffs.json'), 'utf8'));
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
    const usersPath = path.join(__dirname, 'data', 'users.json');
    let users = [];
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existing = users.find(u => u.phone.replace(/\s+/g, '') === cleanPhone);
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
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik: " + err.message });
  }
});

// API: Kirish (Login)
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Telefon raqam va parol kiritilishi shart!" });
  }

  try {
    const usersPath = path.join(__dirname, 'data', 'users.json');
    let users = [];
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const user = users.find(u => u.phone.replace(/\s+/g, '') === cleanPhone && u.password === password);
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
    const usersPath = path.join(__dirname, 'data', 'users.json');
    if (!fs.existsSync(usersPath)) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
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
    console.log(`🤖  AI Repetitor (Gemini): ${genAI ? "Faol (gemini-3.8-flash)" : "O'chiq"}`);
    console.log(`💳  To'lov tizimi (Humo): 9860 0366 7156 8792`);
    console.log(`=======================================================`);

    // Telegram botni ishga tushirish (faqat lokal yoki doimiy serverda)
    initBot();
  });
}

// Vercel serverless uchun eksport
module.exports = app;
