require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { generateVariant } = require('./scripts/generator');
const { initBot, getBotInstance, getAdminIds } = require('./bot');
const { askAiTutor, checkOpenAnswer, explainQuestion } = require('./scripts/aiService');

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
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
function getUsersList() {
  return safeReadJSON('users.json', []);
}
function saveUsersList(users) {
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

let inMemoryDuelLeaderboard = null;
function getDuelLeaderboardList() {
  if (!inMemoryDuelLeaderboard) {
    inMemoryDuelLeaderboard = safeReadJSON('duel_leaderboard.json', []);
  }
  return inMemoryDuelLeaderboard;
}
function saveDuelLeaderboardList(list) {
  inMemoryDuelLeaderboard = list;
  safeWriteJSON('duel_leaderboard.json', list);
}

function getDuelRankTitle(score) {
  if (score >= 1000) return "Oktagon Chempioni 🏆👑";
  if (score >= 600) return "Oliy Sud Himoyachisi 🏛️";
  if (score >= 300) return "Master Yurist ⚖️";
  if (score >= 100) return "Huquqiy Jangchi ⚔️";
  return "Oktagon Debyutanti 🥊";
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getApprovedVipIds() {
  const list = safeReadJSON('approved_vip_users.json', []);
  return Array.isArray(list) ? list.map(String) : [];
}

function addApprovedVipId(id) {
  if (!id) return;
  const list = getApprovedVipIds();
  const strId = id.toString().trim().replace(/^TG-/, '');
  if (!list.includes(strId)) {
    list.push(strId);
    safeWriteJSON('approved_vip_users.json', list);
  }
}

// Statik fayllarni ulash va Keshni butunlay to'xtatish (Har doim eng yangi versiya yuklanishi uchun)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0
}));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Reels video saqlash API
app.post('/api/save-reels-video', express.raw({ type: '*/*', limit: '150mb' }), (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'reels_huquq_sertifikat.webm');
    fs.writeFileSync(filePath, req.body);
    console.log(`🎬 Reels video saqlandi: ${filePath} (${(req.body.length / 1024 / 1024).toFixed(2)} MB)`);
    res.json({ success: true, url: '/reels_huquq_sertifikat.webm', size: req.body.length });
  } catch (err) {
    console.error('Reels video saqlashda xatolik:', err);
    res.status(500).json({ error: err.message });
  }
});

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

// API: 40 ta Qonunchilik Variantlari ro'yxati (Har bir qonun uchun 1 ta variant, 20 ta test)
app.get('/api/law-variants', (req, res) => {
  try {
    const lawsFile = path.join(__dirname, 'data', 'laws_list.json');
    if (!fs.existsSync(lawsFile)) {
      return res.status(404).json({ error: "Qonunlar ro'yxati topilmadi" });
    }
    const laws = JSON.parse(fs.readFileSync(lawsFile, 'utf8'));
    const list = laws.map(l => ({
      id: l.id,
      lawId: l.id,
      title: `${l.id}-qonun: ${l.name}`,
      shortName: l.name,
      category: l.category,
      totalQuestions: 20,
      timeMinutes: 25,
      lexUrl: l.url,
      isPremium: l.id > 1,
      badge: l.id === 1 ? "Bepul Namunaviy" : "🔒 Premium"
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Qonun variantlarini yuklashda xatolik: " + err.message });
  }
});

// API: Qonun varianti bo'yicha 20 talik to'liq test savollari
app.get('/api/law-variants/:id', (req, res) => {
  const lId = parseInt(req.params.id) || 1;
  try {
    const file = path.join(__dirname, 'data', 'law_variants', `law_var_${lId}.json`);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return res.json(data);
    }
    res.status(404).json({ error: `${lId}-qonun varianti topilmadi` });
  } catch (err) {
    res.status(500).json({ error: "Qonun variantini yuklashda xatolik: " + err.message });
  }
});

// API: Duel uchun bot va platformadan foydalanayotgan haqiqiy ishtirokchilar
app.get('/api/duel/opponents', (req, res) => {
  try {
    const users = getUsersList() || [];
    const leaderboard = getLeaderboardList() || [];

    const namesSet = new Set();
    const opponents = [];

    // 1. Leaderboarddagi faol qatnashchilar
    leaderboard.forEach(u => {
      if (u.name && !namesSet.has(u.name.trim())) {
        namesSet.add(u.name.trim());
        opponents.push({
          name: u.name.trim(),
          title: u.grade ? `${u.name.trim()} (${u.grade} • ${u.score} ball)` : u.name.trim(),
          score: u.score || 40,
          grade: u.grade || "A",
          source: "leaderboard"
        });
      }
    });

    // 2. Telegram bot va saytdan ro'yxatdan o'tgan haqiqiy foydalanuvchilar
    users.forEach(u => {
      if (u.name && !namesSet.has(u.name.trim())) {
        namesSet.add(u.name.trim());
        opponents.push({
          name: u.name.trim(),
          title: `${u.name.trim()} (Faol ishtirokchi)`,
          score: u.score || 39,
          grade: "B+",
          source: "user"
        });
      }
    });

    // Realistik qatnashchilar (agar baza yangi bo'lsa)
    const defaultParticipants = [
      "Sardorbek Rahimov (Toshkent)",
      "Madinabonu Aliyeva (Samarqand)",
      "Jasurbek To'xtayev (Buxoro)",
      "Dilshod Karimov (Farg'ona)",
      "Nilufar Yo'ldosheva (Namangan)",
      "Shohrux Mirzayev (Andijon)",
      "Zilola Rustamova (Qashqadaryo)",
      "Behzod Mahmudov (Xorazm)"
    ];

    defaultParticipants.forEach(name => {
      if (!namesSet.has(name)) {
        opponents.push({
          name: name,
          title: name,
          score: 42,
          grade: "A",
          source: "verified"
        });
      }
    });

    res.json(opponents);
  } catch (err) {
    res.status(500).json({ error: "Raqiblarni yuklashda xatolik: " + err.message });
  }
});

// API: Duel uchun 800+ savol ichidan 10 ta mutlaqo yangi, turli savollar (10 raund)
app.get('/api/duel/questions', (req, res) => {
  try {
    const lawVariantsDir = path.join(__dirname, 'data', 'law_variants');
    let allQuestions = [];

    if (fs.existsSync(lawVariantsDir)) {
      const files = fs.readdirSync(lawVariantsDir).filter(f => f.endsWith('.json'));
      // Tasodifiy 12-15 ta turli qonun variantlarini o'qiymiz
      const shuffledFiles = [...files].sort(() => 0.5 - Math.random()).slice(0, 15);
      for (const file of shuffledFiles) {
        try {
          const varData = JSON.parse(fs.readFileSync(path.join(lawVariantsDir, file), 'utf8'));
          if (Array.isArray(varData.questions)) {
            varData.questions.forEach(q => {
              if (q.options && q.options.length >= 2) {
                allQuestions.push({
                  text: q.text,
                  options: q.options,
                  correct: q.correct || q.correctKey || "A",
                  section: varData.lawName || q.section || "Qonunchilik",
                  explanation: q.explanation || ""
                });
              }
            });
          }
        } catch (e) {}
      }
    }

    if (allQuestions.length < 10) {
      const qBankFile = path.join(__dirname, 'data', 'questions_bank.json');
      if (fs.existsSync(qBankFile)) {
        const qBank = JSON.parse(fs.readFileSync(qBankFile, 'utf8'));
        if (Array.isArray(qBank)) {
          allQuestions.push(...qBank.filter(q => q.options && q.options.length >= 2));
        }
      }
    }

    // Har safar 10 ta mutlaqo tasodifiy savol
    const selected = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
    res.json(selected);
  } catch (err) {
    res.status(500).json({ error: "Duel savollarini yuklashda xatolik: " + err.message });
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

// API: Majburiy a'zolikni tekshirish (@Huquq_study va @General_Huquq)
app.post('/api/check-subscription', async (req, res) => {
  const { userId, channel } = req.body;
  const bot = getBotInstance();

  if (!bot) {
    // Agar bot tokeni sozlanmagan bo'lsa (lokal test), ochiq rejimda ruxsat beramiz
    return res.json({
      subscribed: true,
      message: "Lokal rejim: A'zolik tekshiruvi muvaffaqiyatli o'tdi",
      channels: ['@Huquq_study', '@General_Huquq']
    });
  }

  if (!userId) {
    return res.json({
      subscribed: false,
      message: "Foydalanuvchi Telegram ID si aniqlanmadi"
    });
  }

  try {
    if (channel) {
      const isSub = await bot.checkUserSubscription(userId, channel);
      return res.json({
        subscribed: isSub,
        channel: channel,
        message: isSub ? "A'zolik tasdiqlandi" : "Kanalga a'zo bo'linmagan"
      });
    }

    const subCheck = await bot.checkAllSubscriptions(userId);
    return res.json({
      subscribed: subCheck.ok,
      missing: subCheck.missing ? subCheck.missing.map(m => m.username) : [],
      message: subCheck.ok ? "Ikkala kanalga ham a'zolik tasdiqlandi" : "Kanallarga to'liq a'zo bo'linmagan"
    });
  } catch (err) {
    return res.json({
      subscribed: false,
      error: err.message
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

  const result = await checkOpenAnswer({ questionText, expectedAnswer, userAnswer, explanation });
  return res.json(result);
});

// Xatolar ustida AI Tahlil ("Nega aynan shu javob to'g'ri?")
app.post('/api/ai/explain-question', async (req, res) => {
  const { questionText, options, correctAnswer, userAnswer, explanation, lawRef } = req.body;
  const result = await explainQuestion({ questionText, options, correctAnswer, userAnswer, explanation, lawRef });
  return res.json(result);
});

// ==================== AI USTOZ (CHATGPT KABI HAR QANDAY SAVOLGA JAVOB BERUVCHI AI) ====================

app.post('/api/ai/tutor-chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Savol matni kiritilmadi." });
  }

  const result = await askAiTutor(message, history);
  return res.json(result);
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

// ==================== 2.1 DUEL LEADERBOARD API ====================

app.get('/api/duel/leaderboard', (req, res) => {
  try {
    const list = getDuelLeaderboardList();
    list.sort((a, b) => (b.duelScore || 0) - (a.duelScore || 0) || (b.wins || 0) - (a.wins || 0));
    res.json(list.slice(0, 30));
  } catch (err) {
    res.status(500).json({ error: "Duel reytingini yuklashda xatolik: " + err.message });
  }
});

// API: Duel natijasi va ballarni saqlash
app.post('/api/duel/result', (req, res) => {
  const { userId, userName, scoreGained, won, isKnockout, correctCount, totalRounds, opponentName } = req.body;
  try {
    const list = getDuelLeaderboardList();
    const cleanName = (userName || "Yurist").trim();
    const gained = parseInt(scoreGained, 10) || 0;

    let player = list.find(u => (userId && u.userId === userId) || (u.name && u.name.toLowerCase() === cleanName.toLowerCase()));

    if (player) {
      player.duelScore = (player.duelScore || 0) + gained;
      if (won) {
        player.wins = (player.wins || 0) + 1;
      } else {
        player.losses = (player.losses || 0) + 1;
      }
      player.matches = (player.matches || 0) + 1;
      player.rankTitle = getDuelRankTitle(player.duelScore);
      player.lastActive = new Date().toLocaleDateString('uz-UZ');
    } else {
      player = {
        id: Date.now(),
        userId: userId || null,
        name: cleanName,
        duelScore: Math.max(0, gained),
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        matches: 1,
        rankTitle: getDuelRankTitle(Math.max(0, gained)),
        lastActive: new Date().toLocaleDateString('uz-UZ')
      };
      list.push(player);
    }

    list.sort((a, b) => (b.duelScore || 0) - (a.duelScore || 0) || (b.wins || 0) - (a.wins || 0));
    saveDuelLeaderboardList(list.slice(0, 50));

    res.json({
      success: true,
      message: "Duel natijasi va ballari muvaffaqiyatli saqlandi!",
      player,
      scoreGained: gained
    });
  } catch (err) {
    console.error("Duel result saqlashda xatolik:", err);
    res.status(500).json({ error: "Duel natijasini saqlashda xatolik: " + err.message });
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
app.post('/api/payments/submit-receipt', async (req, res) => {
  const { transactionId, userContact, userName, userPhone, userId, userUsername, amount, tariffId } = req.body;
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
      userPhone: userPhone || "",
      userId: userId ? userId.toString() : "",
      userUsername: userUsername || "",
      tariffId: tariffId || "tariff_vip",
      amount: amount || "89 000 UZS (VIP PRO)",
      date: new Date().toISOString(),
      status: "pending"
    };

    receipts.unshift(newReceipt);
    saveReceiptsList(receipts);

    // Adminlarga Telegram orqali bildirishnoma yuborish
    try {
      const bot = getBotInstance();
      if (bot) {
        const adminIds = typeof getAdminIds === 'function' ? getAdminIds() : ['8348657980'];
        const adminMsg = `📥 <b>YANGI TO'LOV CHEKI (Mini App orqali)!</b> 💳\n\n` +
          `👤 <b>Foydalanuvchi:</b> ${newReceipt.userName}\n` +
          `🆔 <b>Telegram ID:</b> <code>${newReceipt.userId || 'Noma\'lum'}</code>\n` +
          `📱 <b>Aloqa / Username:</b> ${newReceipt.userUsername || newReceipt.userContact}\n` +
          `💰 <b>Summa:</b> ${newReceipt.amount}\n` +
          `🔢 <b>Tranzaksiya / Kvitansiya:</b> <code>${newReceipt.transactionId}</code>\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}\n` +
          `🆔 <b>Chek ID:</b> <code>${newReceipt.id}</code>\n\n` +
          `<i>Ushbu foydalanuvchiga VIP PRO berishni tasdiqlaysizmi?</i>`;

        for (const aId of adminIds) {
          bot.sendMessage(aId, adminMsg, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Tasdiqlash (VIP PRO berish)", callback_data: `approve_receipt_${newReceipt.id}` },
                  { text: "❌ Rad etish", callback_data: `reject_receipt_${newReceipt.id}` }
                ],
                [
                  { text: "💬 Foydalanuvchiga yozish", url: newReceipt.userUsername ? `https://t.me/${newReceipt.userUsername.replace('@', '')}` : (newReceipt.userId ? `tg://user?id=${newReceipt.userId}` : "https://t.me/Imomali_Mamatkulov") }
                ]
              ]
            }
          }).catch(err => console.error("Admin notify error:", err.message));
        }
      }
    } catch (botErr) {
      console.error("Bot admin notification error:", botErr.message);
    }

    res.json({
      success: true,
      message: "Chek qabul qilindi! Operatorimiz 5–15 daqiqa ichida tekshirib, VIP a'zoligingizni faollashtiradi.",
      receiptId: newReceipt.id
    });
  } catch (err) {
    res.status(500).json({ error: "Chekni saqlashda xatolik: " + err.message });
  }
});

// API: Mini Appdan to'lov cheki rasmini (Base64) qabul qilish va adminga yuborish
app.post('/api/payments/submit-receipt-image', async (req, res) => {
  const { imageBase64, userName, userId, userUsername, amount, tariffId } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Chek rasmi tanlanmadi!" });
  }

  try {
    const receipts = getReceiptsList();
    const receiptId = "REC-" + Date.now();

    const newReceipt = {
      id: receiptId,
      transactionId: "Rasm yuklandi",
      userContact: userUsername || userId || "Telegram WebApp",
      userName: userName || "O'quvchi",
      userId: userId ? userId.toString() : "",
      userUsername: userUsername || "",
      tariffId: tariffId || "tariff_vip",
      amount: amount || "89 000 UZS (VIP PRO)",
      hasImage: true,
      date: new Date().toISOString(),
      status: "pending"
    };

    receipts.unshift(newReceipt);
    saveReceiptsList(receipts);

    // Adminlarga Telegram orqali rasmni yuborish
    try {
      const bot = getBotInstance();
      if (bot && bot.token) {
        const adminIds = typeof getAdminIds === 'function' ? getAdminIds() : ['8348657980'];
        const adminCaption = `📥 <b>YANGI TO'LOV CHEKI (Mini App orqali)!</b> 💳\n\n` +
          `👤 <b>Foydalanuvchi:</b> ${escapeHtml(newReceipt.userName)}\n` +
          `🆔 <b>Telegram ID:</b> <code>${newReceipt.userId || 'Noma\'lum'}</code>\n` +
          `📱 <b>Username:</b> ${newReceipt.userUsername || 'Mavjud emas'}\n` +
          `💰 <b>Summa:</b> ${newReceipt.amount}\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}\n` +
          `🔢 <b>Chek ID:</b> <code>${newReceipt.id}</code>\n\n` +
          `<i>Ushbu foydalanuvchiga VIP PRO berishni tasdiqlaysizmi?</i>`;

        // Base64 dan Buffer va FormData tayyorlash
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        for (const aId of adminIds) {
          try {
            const formData = new FormData();
            formData.append('chat_id', aId);
            formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'receipt.jpg');
            formData.append('caption', adminCaption);
            formData.append('parse_mode', 'HTML');
            formData.append('reply_markup', JSON.stringify({
              inline_keyboard: [
                [
                  { text: "✅ Tasdiqlash (VIP PRO berish)", callback_data: `approve_receipt_${newReceipt.id}` },
                  { text: "❌ Rad etish", callback_data: `reject_receipt_${newReceipt.id}` }
                ],
                [
                  { text: "💬 Foydalanuvchiga yozish", url: newReceipt.userUsername ? `https://t.me/${newReceipt.userUsername.replace('@', '')}` : (newReceipt.userId ? `tg://user?id=${newReceipt.userId}` : "https://t.me/Imomali_Mamatkulov") }
                ]
              ]
            }));

            await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } catch (sendErr) {
            console.error(`Admin ${aId} ga rasm yuborishda xato:`, sendErr.message);
          }
        }
      }
    } catch (botErr) {
      console.error("Bot admin rasm yuborish xatosi:", botErr.message);
    }

    res.json({
      success: true,
      message: "Chek rasmi muvaffaqiyatli qabul qilindi! Admin ko'rib chiqib, 5–15 daqiqada VIP a'zoligingizni faollashtiradi.",
      receiptId: newReceipt.id
    });
  } catch (err) {
    res.status(500).json({ error: "Chekni saqlashda xatolik: " + err.message });
  }
});

// API: Kitob sotib olish uchun to'lov cheki rasmini (Base64) qabul qilish va adminga yuborish
app.post('/api/payments/submit-book-receipt', async (req, res) => {
  const { imageBase64, bookId, bookTitle, userName, userId, userUsername, amount } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Chek rasmi tanlanmadi!" });
  }

  try {
    const receipts = getReceiptsList();
    const receiptId = "REC-BK-" + Date.now();

    const newReceipt = {
      id: receiptId,
      type: "book_purchase",
      bookId: bookId ? bookId.toString() : "1",
      bookTitle: bookTitle || "Huquq Milliy Sertifikat Kitobi",
      transactionId: "Kitob xaridi cheki",
      userContact: userUsername || userId || "Telegram WebApp",
      userName: userName || "O'quvchi",
      userId: userId ? userId.toString() : "",
      userUsername: userUsername || "",
      amount: amount || "80 000 UZS",
      hasImage: true,
      date: new Date().toISOString(),
      status: "pending"
    };

    receipts.unshift(newReceipt);
    saveReceiptsList(receipts);

    // Adminlarga Telegram orqali rasmni yuborish
    try {
      const bot = getBotInstance();
      if (bot && bot.token) {
        const adminIds = typeof getAdminIds === 'function' ? getAdminIds() : ['8348657980'];
        const adminCaption = `📚 <b>YANGI KITOB XARIDI CHEKI!</b> 💳\n\n` +
          `📖 <b>Kitob:</b> ${escapeHtml(newReceipt.bookTitle)}\n` +
          `👤 <b>Xaridor:</b> ${escapeHtml(newReceipt.userName)}\n` +
          `🆔 <b>Telegram ID:</b> <code>${newReceipt.userId || 'Noma\'lum'}</code>\n` +
          `📱 <b>Username:</b> ${newReceipt.userUsername || 'Mavjud emas'}\n` +
          `💰 <b>Summa:</b> ${newReceipt.amount}\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}\n` +
          `🔢 <b>Chek ID:</b> <code>${newReceipt.id}</code>\n\n` +
          `<i>Chekni tekshirib tasdiqlang. Tasdiqlashingiz bilan bot avtomatik ushbu foydalanuvchiga PDF kitobni tashlab beradi!</i>`;

        // Base64 dan Buffer va FormData tayyorlash
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        for (const aId of adminIds) {
          try {
            const formData = new FormData();
            formData.append('chat_id', aId);
            formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'book_receipt.jpg');
            formData.append('caption', adminCaption);
            formData.append('parse_mode', 'HTML');
            formData.append('reply_markup', JSON.stringify({
              inline_keyboard: [
                [
                  { text: "✅ Tasdiqlash va PDF yuborish", callback_data: `approve_book_${newReceipt.bookId}_${newReceipt.id}` },
                  { text: "❌ Rad etish", callback_data: `reject_receipt_${newReceipt.id}` }
                ],
                [
                  { text: "💬 Foydalanuvchiga yozish", url: newReceipt.userUsername ? `https://t.me/${newReceipt.userUsername.replace('@', '')}` : (newReceipt.userId ? `tg://user?id=${newReceipt.userId}` : "https://t.me/Imomali_Mamatkulov") }
                ]
              ]
            }));

            await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } catch (sendErr) {
            console.error(`Admin ${aId} ga kitob cheki yuborishda xato:`, sendErr.message);
          }
        }
      }
    } catch (botErr) {
      console.error("Bot admin kitob cheki yuborish xatosi:", botErr.message);
    }

    res.json({
      success: true,
      message: "To'lov cheki adminga yuborildi! Admin tasdiqlashi bilan kitob PDF fayli botingizga yuboriladi.",
      receiptId: newReceipt.id
    });
  } catch (err) {
    res.status(500).json({ error: "Kitob chekini saqlashda xatolik: " + err.message });
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
    const idParam = (req.params.id || '').toString().trim();
    const cleanId = idParam.replace(/^TG-/, '');
    const approvedVips = getApprovedVipIds();
    const isApprovedVip = approvedVips.includes(cleanId) || approvedVips.includes(idParam);

    let user = users.find(u => 
      (u.id && u.id.toString() === idParam) ||
      (u.id && u.id.toString() === `TG-${cleanId}`) ||
      (u.tgId && u.tgId.toString() === cleanId) ||
      (u.tgId && u.tgId.toString() === idParam)
    );

    if (!user) {
      user = {
        id: `TG-${cleanId}`,
        tgId: cleanId,
        name: "O'quvchi",
        role: "Abituriyent",
        plan: isApprovedVip ? "tariff_vip" : "START",
        isVip: isApprovedVip
      };
    } else if (isApprovedVip) {
      user.isVip = true;
      user.plan = "tariff_vip";
    }

    const { password: _, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: VIP holatini tekshirish
app.get('/api/check-vip-status', (req, res) => {
  const userId = (req.query.userId || '').toString().trim();
  const cleanId = userId.replace(/^TG-/, '');
  const approvedVips = getApprovedVipIds();
  const isVip = approvedVips.includes(cleanId) || approvedVips.includes(userId);
  res.json({ isVip, plan: isVip ? "tariff_vip" : "tariff_start" });
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

// Kunlik eslatmalar va Kanalga avto-viktorina (Vercel Cron orqali har soatda ishlaydi)
app.all('/api/cron/reminders', async (req, res) => {
  const bot = getBotInstance();
  if (!bot) {
    return res.status(503).json({ error: "TELEGRAM_BOT_TOKEN topilmadi yoki bot ulanmagan" });
  }

  const output = { success: true, timestamp: new Date().toISOString() };
  try {
    // 1. Kanalga avto-test tashlash (har 2 soatlik interval tekshiruvi)
    if (req.query.force_quiz === 'true') {
      output.channelQuiz = await bot.postNextQuizToChannel(null, true);
    } else {
      output.channelQuiz = await bot.checkAndPostScheduledQuiz();
    }

    // 2. Kunlik eslatmalar (Har kuni UTC 14:00 = Toshkent 19:00 da yoki force qilinganda)
    const currentUtcHour = new Date().getUTCHours();
    if (currentUtcHour === 14 || req.query.force_reminders === 'true') {
      output.dailyReminders = await bot.sendDailyRetentionReminders();
    } else {
      output.dailyReminders = { status: "scheduled_at_19_00", currentUtcHour };
    }

    res.json(output);
  } catch (err) {
    console.error("Cron handler error:", err);
    res.status(500).json({ error: err.message, output });
  }
});

// Kanallarga avtomatik test tashlash (Cron va avto-interval tekshiruvi)
app.all('/api/cron/channel-quiz', async (req, res) => {
  const bot = getBotInstance();
  if (!bot) {
    return res.status(503).json({ error: "TELEGRAM_BOT_TOKEN topilmadi yoki bot ulanmagan" });
  }

  try {
    const force = req.query.force === 'true' || req.query.now === 'true';
    let result;
    if (force) {
      result = await bot.postNextQuizToChannel(null, true);
    } else {
      result = await bot.checkAndPostScheduledQuiz();
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (err) {
    console.error("Channel quiz cron error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Yagona Master Cron Runner (Vercel Hobby 1-cron limiti uchun)
app.all('/api/cron/runner', async (req, res) => {
  const bot = getBotInstance();
  if (!bot) {
    return res.status(503).json({ error: "Bot ulanmagan" });
  }

  const results = {};
  try {
    // 1. Kanalga avtomatik test tashlashni tekshirish
    results.channelQuiz = await bot.checkAndPostScheduledQuiz();

    // 2. Kunlik eslatmalar (Har kuni UTC 14:00 = Toshkent 19:00 da)
    const currentUtcHour = new Date().getUTCHours();
    if (currentUtcHour === 14 || req.query.reminders === 'true') {
      results.dailyReminders = await bot.sendDailyRetentionReminders();
    } else {
      results.dailyReminders = { status: "waiting_evening_time", currentUtcHour };
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (err) {
    console.error("Cron runner error:", err);
    res.status(500).json({ error: err.message, results });
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
