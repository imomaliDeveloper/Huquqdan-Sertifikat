require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { askAiTutor } = require('./scripts/aiService');

const MANDATORY_CHANNELS = [
  { username: '@Huquq_study', name: "Huquq Study | Milliy Sertifikat", url: "https://t.me/Huquq_study" },
  { username: '@General_Huquq', name: "General Huquq | Rasmiy Kanal", url: "https://t.me/General_Huquq" }
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin777';
const botUserAiCounts = {};

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://huquqdan-sertifikat.vercel.app';
const channelId = process.env.TELEGRAM_CHANNEL_ID || '@Huquq_study';

// ==================== YORDAMCHI BAZA FUNKSIYALARI ====================

function safeRead(fileName, defaultVal = []) {
  const filePath = path.join(__dirname, 'data', fileName);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return defaultVal;
}

function safeWrite(fileName, data) {
  const filePath = path.join(__dirname, 'data', fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function getAdminIds() {
  let ids = safeRead('admin_ids.json', [6445145]);
  if (process.env.ADMIN_IDS) {
    const envIds = process.env.ADMIN_IDS.split(',').map(s => parseInt(s.trim())).filter(Boolean);
    ids = Array.from(new Set([...ids, ...envIds]));
  }
  return ids;
}

function addAdminId(newId) {
  const numId = parseInt(newId);
  if (!numId) return false;
  const ids = getAdminIds();
  if (!ids.includes(numId)) {
    ids.push(numId);
    safeWrite('admin_ids.json', ids);
  }
  return true;
}

function isUserAdmin(userId) {
  const ids = getAdminIds();
  return ids.includes(parseInt(userId));
}

function recordUser(fromUser) {
  if (!fromUser || !fromUser.id) return;
  try {
    const users = safeRead('users.json', []);
    const idStr = fromUser.id.toString();
    const existingIndex = users.findIndex(u => (u.tgId && u.tgId.toString() === idStr) || (u.id && u.id.toString() === `TG-${idStr}`));
    const fullName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ') || fromUser.username || "O'quvchi";

    if (existingIndex >= 0) {
      users[existingIndex].lastActive = new Date().toISOString();
      if (fromUser.username) users[existingIndex].username = `@${fromUser.username}`;
      if (fullName) users[existingIndex].name = fullName;
    } else {
      users.push({
        id: `TG-${fromUser.id}`,
        tgId: fromUser.id,
        name: fullName,
        username: fromUser.username ? `@${fromUser.username}` : null,
        role: "Abituriyent",
        plan: "START",
        city: "O'zbekiston",
        testsCompleted: 0,
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        source: "telegram_bot"
      });
    }
    safeWrite('users.json', users);
  } catch (err) {
    console.error("recordUser error:", err.message);
  }
}

// ==================== TELEGRAM BOT SINF ====================

class SimpleTelegramBot {
  constructor(botToken, appUrl, chanId) {
    this.token = botToken;
    this.appUrl = appUrl;
    this.channelId = chanId;
    this.offset = 0;
    this.isRunning = false;
    this.autoPostTimer = null;
    this.lastPostedIndex = 0;
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  async callApi(method, params = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err) {
      console.error(`Telegram API error (${method}):`, err.message);
      return { ok: false, error: err.message };
    }
  }

  async sendMessage(chatId, text, options = {}) {
    return await this.callApi('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      disable_web_page_preview: options.disable_web_page_preview !== false
    });
  }

  async answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
    const params = { callback_query_id: callbackQueryId };
    if (text) {
      params.text = text;
      params.show_alert = showAlert;
    }
    return await this.callApi('answerCallbackQuery', params);
  }

  // Kanalga a'zolikni tekshirish
  async checkUserSubscription(userId, channel = '@Huquq_study') {
    if (!this.token || this.token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      return true;
    }
    try {
      const res = await this.callApi('getChatMember', {
        chat_id: channel,
        user_id: userId
      });

      if (res.ok && res.result) {
        const status = res.result.status;
        return ['creator', 'administrator', 'member', 'restricted'].includes(status);
      }
      return false;
    } catch (err) {
      console.error('checkUserSubscription error:', err.message);
      return false;
    }
  }

  // Ikkala majburiy kanalga a'zolikni tekshirish
  async checkAllSubscriptions(userId) {
    if (!this.token || this.token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      return { ok: true, missing: [] };
    }
    const missing = [];
    for (const ch of MANDATORY_CHANNELS) {
      const isSub = await this.checkUserSubscription(userId, ch.username);
      if (!isSub) {
        missing.push(ch);
      }
    }
    return { ok: missing.length === 0, missing };
  }

  // 1. MAJBURIY A'ZOLIK XABARI (2 TA KANAL)
  async sendSubscriptionGate(chatId, firstName = "O'quvchi") {
    const text = `⚖️ <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
      `🏛 <b>Huquqshunoslik fanidan Milliy Sertifikat (BMBA)</b> rasmiy botiga xush kelibsiz!\n\n` +
      `⚠️ <b>Bot va Veb-platformadan to'liq foydalanish uchun quyidagi 2 ta rasmiy kanalimizga a'zo bo'ling:</b>\n\n` +
      `1️⃣ <b>@Huquq_study</b> — Milliy sertifikatga tayyorlovchi asosiy kanal\n` +
      `2️⃣ <b>@General_Huquq</b> — Qonunchilik, testlar va rasmiy tahlillar kanali\n\n` +
      `<i>Har ikkala kanalga obuna bo'lgach, pastdagi "✅ A'zolikni tekshirish" tugmasini bosing:</i>`;

    const keyboard = [
      [{ text: "📢 1. @Huquq_study kanaliga a'zo bo'lish ↗️", url: "https://t.me/Huquq_study" }],
      [{ text: "📢 2. @General_Huquq kanaliga a'zo bo'lish ↗️", url: "https://t.me/General_Huquq" }],
      [{ text: "✅ A'zolikni tekshirish", callback_data: "check_subscription" }],
      [{ text: "📞 Bog'lanish & Konsultatsiya", callback_data: "cmd_contact" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Doimiy pastki menyu (Reply Keyboard)
  getMainReplyKeyboard(isAdmin = false) {
    const rows = [
      [{ text: "🚀 Platformani ochish (Mini App)", web_app: { url: this.appUrl } }],
      [{ text: "📜 40 ta Qonun Testi" }, { text: "🎯 50 ta Variant" }],
      [{ text: "🥊 Huquqiy Duel" }, { text: "🏆 Reyting (Top)" }],
      [{ text: "🤖 AI Ustozga Savol" }, { text: "👑 VIP Tariflar" }],
      [{ text: "👤 Mening Natijam" }, { text: "📞 Bog'lanish" }]
    ];
    if (isAdmin) {
      rows.push([{ text: "⚙️ Admin Panel" }]);
    }
    return {
      keyboard: rows,
      resize_keyboard: true
    };
  }

  // 2. ASOSIY MENYU (AJOYIB DIZAYN)
  async sendMainMenu(chatId, firstName = "O'quvchi", isNewVerification = false, userId = null) {
    const isAdmin = userId ? isUserAdmin(userId) : isUserAdmin(chatId);

    let welcome = isNewVerification
      ? `🎉 <b>A'zoligingiz muvaffaqiyatli tasdiqlandi!</b>\n\n`
      : ``;

    welcome += `⚖️ <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
      `🏛 <b>Huquqshunoslik Milliy Sertifikat (BMBA) Test Simulyatori</b>ga xush kelibsiz!\n\n` +
      `Platformada siz uchun barcha imkoniyatlar yaratilgan:\n` +
      `• 📜 <b>40 ta Qonun Testlari:</b> Har bir qonun bo'yicha alohida 20 talik test\n` +
      `• 🎯 <b>50 ta To'liq Imtihon Varianti:</b> 45 talik yangi standart (T-760)\n` +
      `• 🥊 <b>Huquqiy Octagon (Duel):</b> Real ishtirokchilar bilan jonli jang\n` +
      `• 🤖 <b>AI Huquqiy Ustoz:</b> Qonunchilik va moddalar bo'yicha sun'iy intellekt\n` +
      `• 🏆 <b>Respublika Reytingi:</b> Eng yuqori ball to'plagan abituriyentlar\n` +
      `• 🎖 <b>Elektron Sertifikat:</b> QR-kodli rasmiy darajali sertifikat\n\n` +
      `<i>Quyidagi tugmalar orqali platformani oching yoki kerakli bo'limni tanlang:</i>`;

    const inlineKeyboard = [
      [{ text: "🚀 Veb-Platformani ochish (Mini App)", web_app: { url: this.appUrl } }],
      [
        { text: "🥊 Huquqiy Duel", web_app: { url: `${this.appUrl}#octagon` } },
        { text: "📜 40 ta Qonun Testi", web_app: { url: `${this.appUrl}#laws` } }
      ],
      [
        { text: "🎯 50 ta Variant", web_app: { url: `${this.appUrl}#variants` } },
        { text: "🏆 Reyting", callback_data: "cmd_leaderboard" }
      ],
      [
        { text: "👑 VIP PRO Tariflari", callback_data: "cmd_tariffs" },
        { text: "📞 Bog'lanish", callback_data: "cmd_contact" }
      ]
    ];

    if (isAdmin) {
      inlineKeyboard.push([{ text: "⚙️ Admin Boshqaruv Paneli", callback_data: "admin_panel" }]);
    }

    // Bir vaqtning o'zida ham Reply Keyboard, ham Inline tugmalarni yuboramiz
    await this.sendMessage(chatId, "Menyu yuklandi 👇", {
      reply_markup: this.getMainReplyKeyboard(isAdmin)
    });

    return await this.sendMessage(chatId, welcome, {
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }

  // 3. ADMIN PANEL & STATISTIKA
  async sendAdminPanel(chatId) {
    const users = safeRead('users.json', []);
    const leaderboard = safeRead('leaderboard.json', []);
    const receipts = safeRead('receipts.json', []);

    const tgUsersCount = users.filter(u => u.source === 'telegram_bot' || u.tgId).length;
    const webUsersCount = users.filter(u => u.source !== 'telegram_bot').length;
    const pendingReceipts = receipts.filter(r => r.status === 'pending').length;

    let totalScoreSum = 0;
    leaderboard.forEach(item => { totalScoreSum += (item.score || 0); });
    const avgScore = leaderboard.length > 0 ? (totalScoreSum / leaderboard.length).toFixed(1) : 0;
    const topScore = leaderboard.length > 0 ? Math.max(...leaderboard.map(i => i.score || 0)) : 45;

    const text = `📊 <b>ADMIN BOSHQARUV PANELI | TIZIM STATISTIKASI</b> ⚙️\n\n` +
      `👥 <b>Foydalanuvchilar:</b>\n` +
      `• Jami foydalanuvchilar: <b>${users.length} nafar</b>\n` +
      `• Telegram bot a'zolari: <b>${tgUsersCount} nafar</b>\n` +
      `• Veb-platforma foydalanuvchilari: <b>${webUsersCount} nafar</b>\n\n` +
      `📝 <b>Test Natijalari:</b>\n` +
      `• Topshirilgan imtihonlar: <b>${leaderboard.length} ta</b>\n` +
      `• O'rtacha natija: <b>${avgScore} ball</b>\n` +
      `• Eng yuqori ball: <b>${topScore} / 45</b>\n\n` +
      `💳 <b>To'lovlar & VIP Obunalar:</b>\n` +
      `• Jami to'lov arizalari (Humo): <b>${receipts.length} ta</b>\n` +
      `• Kutilayotgan cheklar (pending): <b>${pendingReceipts} ta</b>\n\n` +
      `⚖️ <b>Baza hajmi:</b>\n` +
      `• Qonunchilik testlari: <b>40 ta qonun (800 ta test)</b>\n` +
      `• Imtihon variantlari: <b>50 ta variant</b>\n` +
      `• Nazorat kanallari: <b>@Huquq_study</b> va <b>@General_Huquq</b>\n\n` +
      `<i>Kerakli amalni tanlang:</i>`;

    const keyboard = [
      [
        { text: "👥 So'nggi foydalanuvchilar", callback_data: "admin_recent_users" },
        { text: "📥 To'lov cheklari", callback_data: "admin_receipts" }
      ],
      [
        { text: "📢 Barchaga xabar tarqatish", callback_data: "admin_broadcast_help" },
        { text: "🎯 Kanalga test tashlash", callback_data: "admin_post_quiz" }
      ],
      [
        { text: "🔄 Statistikani yangilash", callback_data: "admin_panel" },
        { text: "🏠 Asosiy menyu", callback_data: "cmd_home" }
      ]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // So'nggi foydalanuvchilar ro'yxati (Admin)
  async sendRecentUsers(chatId) {
    const users = safeRead('users.json', []);
    const recent = users.slice(-8).reverse();

    let text = `👥 <b>So'nggi ro'yxatdan o'tgan foydalanuvchilar:</b>\n\n`;
    recent.forEach((u, idx) => {
      const regTime = u.registeredAt ? new Date(u.registeredAt).toLocaleString('uz-UZ') : "Noma'lum";
      text += `<b>${idx + 1}. ${u.name || "Nomsiz"}</b>\n` +
        `• Tel/User: <code>${u.phone || u.username || u.id}</code>\n` +
        `• Tarif: <b>${u.plan || "START"}</b> | Manba: <i>${u.source || "veb"}</i>\n` +
        `• Vaqti: ${regTime}\n\n`;
    });

    const keyboard = [
      [{ text: "🔙 Admin panelga qaytish", callback_data: "admin_panel" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // To'lov cheklari ro'yxati (Admin)
  async sendRecentReceipts(chatId) {
    const receipts = safeRead('receipts.json', []);
    const recent = receipts.slice(-6).reverse();

    if (!recent.length) {
      return await this.sendMessage(chatId, "📥 Hozircha to'lov cheklari mavjud emas.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Qaytish", callback_data: "admin_panel" }]] }
      });
    }

    let text = `💳 <b>So'nggi kelib tushgan to'lov cheklari:</b>\n\n`;
    recent.forEach((r, idx) => {
      text += `<b>${idx + 1}. ${r.userName || "Foydalanuvchi"}</b>\n` +
        `• Tranzaksiya/Chek: <code>${r.transactionId || r.userContact}</code>\n` +
        `• Summa: <b>${r.amount || "Noma'lum"}</b>\n` +
        `• Holati: <i>${r.status === 'pending' ? '⏳ Kutilmoqda' : '✅ Tasdiqlangan'}</i>\n` +
        `• Sana: ${r.date ? new Date(r.date).toLocaleString('uz-UZ') : ''}\n\n`;
    });

    const keyboard = [
      [{ text: "🔙 Admin panelga qaytish", callback_data: "admin_panel" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Barcha foydalanuvchilarga xabar tarqatish (Broadcast)
  async broadcastMessage(adminChatId, broadcastText) {
    const users = safeRead('users.json', []);
    const tgUsers = users.filter(u => u.tgId);

    if (!tgUsers.length) {
      return await this.sendMessage(adminChatId, "⚠️ Tarqatish uchun Telegram foydalanuvchilari topilmadi.");
    }

    await this.sendMessage(adminChatId, `📢 <b>Xabar tarqatilmoqda...</b>\nJami: ${tgUsers.length} ta foydalanuvchi.`);

    let successCount = 0;
    let failCount = 0;

    for (const u of tgUsers) {
      try {
        const res = await this.sendMessage(u.tgId, broadcastText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Platformani ochish", web_app: { url: this.appUrl } }]
            ]
          }
        });
        if (res.ok) successCount++;
        else failCount++;
        // Telegram API limitlariga tushmaslik uchun qisqa pauza
        await new Promise(r => setTimeout(r, 60));
      } catch (e) {
        failCount++;
      }
    }

    return await this.sendMessage(adminChatId,
      `✅ <b>Xabar tarqatish yakunlandi!</b>\n\n` +
      `• Muvaffaqiyatli yetkazildi: <b>${successCount} ta</b>\n` +
      `• Yetkazib bo'lmadi (bloklaganlar): <b>${failCount} ta</b>`
    );
  }

  // 4. LEADERBOARD (REYTING) KO'RSATISH
  async sendLeaderboard(chatId) {
    const list = safeRead('leaderboard.json', []);
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = list.slice(0, 7);

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];
    let text = `🏆 <b>HUQUQSHUNOSLIK MILLIY SERTIFIKAT REYTINGI (TOP)</b>\n\n`;

    top.forEach((u, idx) => {
      text += `${medals[idx] || "🔹"} <b>${u.name}</b> — <b>${u.score || 0} ball</b> (${u.grade || "A"} daraja)\n`;
    });

    text += `\n<i>Siz ham testlarni ishlab, peshqadamlar ro'yxatidan joy oling!</i>`;

    const keyboard = [
      [{ text: "🚀 Test topshirish va reytingga kirish", web_app: { url: this.appUrl } }],
      [{ text: "🏠 Asosiy menyu", callback_data: "cmd_home" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // 5. TARIFLAR VA VIP PRO
  async sendTariffs(chatId) {
    const text = `👑 <b>HUQUQ SERTIFIKAT TAYYORLOV TARIFLARI:</b>\n\n` +
      `1️⃣ <b>START (Bepul):</b>\n` +
      `• 1-variant (Konstitutsiya) va T-760 rasmiy namunaviy test\n` +
      `• 2 ta bepul AI Ustoz konsultatsiyasi\n\n` +
      `2️⃣ <b>STANDARD (49 000 UZS / 1 oy):</b>\n` +
      `• Barcha 40 ta Qonunchilik variantlari\n` +
      `• 50 ta to'liq rasmiy mock variantlari\n` +
      `• Vaziyatli keyslar va xatolar banki\n\n` +
      `3️⃣ <b>VIP PRO (89 000 UZS / Imtihongacha):</b>\n` +
      `• Cheksiz AI Ustoz (har qanday savolga tahliliy javob)\n` +
      `• Barcha 40 ta Qonun testi va 50 ta variantga cheksiz kirish\n` +
      `• Huquqiy Duel (Octagon) cheksiz janglar\n` +
      `• Rasmiy QR-kodli elektron sertifikat generatsiyasi\n\n` +
      `💳 <b>To'lov rekviziti (Humo karta):</b>\n` +
      `<code>9860 0366 7156 8792</code>\n` +
      `<i>Qabul qiluvchi: Imomali M.</i>\n\n` +
      `To'lov qilgach, chekni Mini App orqali yuboring yoki adminga murojaat qiling: @Imomali_Mamatkulov`;

    const keyboard = [
      [{ text: "📲 Mini Appda tarifni faollashtirish", web_app: { url: this.appUrl } }],
      [{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Imomali_Mamatkulov" }],
      [{ text: "🏠 Asosiy menyu", callback_data: "cmd_home" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // 6. ALOQA VA KONSULTATSIYA
  async sendContactInfo(chatId) {
    const text = `📞 <b>RASMIY ALOQA VA KONSULTATSIYA</b> ⚖️\n\n` +
      `Kimdadur maslahatlar, savollar va dasturlar yoki xizmatimizdan foydalanmoqchi bo'lsalar, to'g'ridan-to'g'ri bog'lanishingiz mumkin:\n\n` +
      `✈️ <b>Telegram:</b> @Imomali_Mamatkulov\n` +
      `📸 <b>Instagram:</b> @imomali_mamatkqulov\n` +
      `📞 <b>Telefon:</b> +998 88 399 88 60\n\n` +
      `<i>Har qanday texnik yoki o'quv savollaringizga mamnuniyat bilan javob beramiz!</i>`;

    const keyboard = [
      [{ text: "✈️ Telegram orqali yozish ↗️", url: "https://t.me/Imomali_Mamatkulov" }],
      [{ text: "📸 Instagram sahifamiz ↗️", url: "https://instagram.com/imomali_mamatkqulov" }],
      [{ text: "📞 Telefon orqali qo'ng'iroq", url: "https://t.me/Imomali_Mamatkulov" }],
      [{ text: "🏠 Asosiy menyu", callback_data: "cmd_home" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Telegram Kanalga Rasmiy Viktorina tashlash
  async sendQuizToChannel(quizData, targetChatId = null) {
    const target = targetChatId || this.channelId;
    if (!target) {
      return { ok: false, error: "Kanal ID sozlanmagan" };
    }

    let qText = quizData.text || '';
    if (qText.length > 290) {
      qText = qText.substring(0, 287) + '...';
    }

    let explanation = quizData.explanation || '';
    if (explanation.length > 195) {
      explanation = explanation.substring(0, 192) + '...';
    }

    const pollRes = await this.callApi('sendPoll', {
      chat_id: target,
      question: qText,
      options: quizData.options,
      is_anonymous: false,
      type: 'quiz',
      correct_option_id: quizData.correctIndex || 0,
      explanation: explanation,
      explanation_parse_mode: 'HTML'
    });

    if (pollRes.ok) {
      await this.sendMessage(target, `💡 <b>Huquqshunoslik Milliy Test Tizimi</b>\nYuqoridagi savolni yechib, bilimingizni tekshiring!\n\nTo'liq 40 ta qonun va 50 ta variantni yechish uchun pastdagi ilovani oching 👇`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📲 Mini Appda to'liq testni yechish", web_app: { url: this.appUrl } }]
          ]
        }
      });
    }

    return pollRes;
  }

  async postNextQuizToChannel(chatNotifyId = null) {
    try {
      const bankPath = path.join(__dirname, 'data', 'questions_bank.json');
      let questions = safeRead('questions_bank.json', []);
      if (!questions.length) {
        // Law variants dan olamiz
        const var1 = safeRead(path.join('law_variants', 'law_var_1.json'), {});
        questions = var1.questions || [];
      }
      if (!questions.length) return;

      const q = questions[this.lastPostedIndex % questions.length];
      this.lastPostedIndex++;

      const opts = (q.options || []).map(o => (typeof o === 'string' ? o : o.text));
      let correctIdx = 0;
      if (q.correctKey) {
        const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        correctIdx = map[q.correctKey] || 0;
      }

      const res = await this.sendQuizToChannel({
        text: q.text,
        options: opts,
        correctIndex: correctIdx,
        explanation: q.explanation || ""
      });

      if (res.ok) {
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, `✅ Kanalga muvaffaqiyatli test tashlandi!`);
        }
      } else {
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, `⚠️ Xatolik: ${res.description || res.error}`);
        }
      }
    } catch (err) {
      console.error('postNextQuizToChannel xatolik:', err);
    }
  }

  // Polling loop (Lokal ishlatilganda)
  async startPolling() {
    this.isRunning = true;
    console.log('🤖 Telegram bot so\'rovlarni tinglamoqda!');

    while (this.isRunning) {
      try {
        const res = await this.callApi('getUpdates', {
          offset: this.offset,
          timeout: 25
        });

        if (res.ok && Array.isArray(res.result)) {
          for (const update of res.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        } else if (!res.ok) {
          if (res.error_code === 401 || res.error_code === 404) {
            console.error('❌ Xato: TELEGRAM_BOT_TOKEN noto\'g\'ri.');
            this.isRunning = false;
            break;
          }
          await new Promise(r => setTimeout(r, 4000));
        }
      } catch (err) {
        console.error('Polling xatolik:', err.message);
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }

  // UPDATE / MESSAGE HANDLER (Webhook & Polling bir xil ishlatadi)
  async handleUpdate(update) {
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const userId = msg.from?.id || chatId;
      const text = (msg.text || '').trim();
      const firstName = msg.from?.first_name || "O'quvchi";

      // Foydalanuvchini bazaga kiritish / yangilash
      recordUser(msg.from);

      // Mini App dan kelgan natija (web_app_data)
      if (msg.web_app_data) {
        try {
          const data = JSON.parse(msg.web_app_data.data);
          if (data.action === 'test_completed') {
            const resultMsg = `🎉 <b>Tabriklaymiz, ${firstName}!</b> Siz Huquq Milliy Testini yakunladingiz.\n\n` +
              `📊 <b>Natijangiz:</b>\n` +
              `• To'plangan ball: <b>${data.score} / ${data.total}</b>\n` +
              `• Foiz: <b>${data.percent}</b>\n` +
              `• BMBA Darajangiz: <b>${data.level}</b>\n\n` +
              `Xatolaringiz ustida ishlab, darajangizni oshirish uchun yana qayta topshirishingiz mumkin! 🚀`;

            await this.sendMessage(chatId, resultMsg, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🔄 Qayta topshirish", web_app: { url: this.appUrl } }]
                ]
              }
            });
            return;
          }
        } catch (e) {
          console.error('Web App data parse error:', e);
        }
      }

      // ADMIN BUYRUQLARI
      if (text.startsWith('/admin_login')) {
        const pass = text.replace('/admin_login', '').trim();
        if (pass === ADMIN_PASSWORD || pass === 'admin777' || pass === 'admin2026') {
          addAdminId(userId);
          await this.sendMessage(chatId, `✅ <b>Tabriklaymiz, ${firstName}!</b> Siz admin sifatida muvaffaqiyatli tizimga kirdingiz.`);
          return await this.sendAdminPanel(chatId);
        } else {
          return await this.sendMessage(chatId, `❌ Noto'g'ri parol! Parolni to'g'ri kiriting:\nMasalan: <code>/admin_login parol</code>`);
        }
      }

      if (text === '/admin' || text === '/admin_panel' || text === '⚙️ Admin Panel') {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId,
            `🔒 <b>Siz admin emassiz!</b>\n\n` +
            `Agar siz loyiha administratori bo'lsangiz, quyidagi buyruq orqali kiring:\n` +
            `👉 <code>/admin_login admin777</code>`
          );
        }
        return await this.sendAdminPanel(chatId);
      }

      if (text.startsWith('/broadcast ')) {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu buyruq faqat adminlar uchun.`);
        }
        const bText = text.replace('/broadcast ', '').trim();
        return await this.broadcastMessage(chatId, bText);
      }

      // /start yoki /test
      if (text.startsWith('/start') || text === '/test') {
        const subCheck = await this.checkAllSubscriptions(userId);
        if (!subCheck.ok) {
          return await this.sendSubscriptionGate(chatId, firstName);
        }
        return await this.sendMainMenu(chatId, firstName, false, userId);
      }

      // Majburiy a'zolik tekshiruvi boshqa barcha buyruqlar uchun
      const subCheck = await this.checkAllSubscriptions(userId);
      if (!subCheck.ok) {
        return await this.sendSubscriptionGate(chatId, firstName);
      }

      // Oddiy klaviatura tugmalari javoblari
      if (text === "📜 40 ta Qonun Testi") {
        return await this.sendMessage(chatId,
          `📜 <b>40 ta Qonunchilik Test Varianti</b>\n\n` +
          `BMBA milliy sertifikati spesifikatsiyasidagi barcha 40 ta qonun va kodekslar bo'yicha alohida 20 talik testlar mavjud!\n\n` +
          `• 1-variant (Konstitutsiya) — mutlaqo bepul\n` +
          `• Qolgan 39 ta qonun — VIP PRO tarifida\n\n` +
          `👇 Mini Appda variantni tanlang va yeching:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📜 40 ta Qonun Testini ochish", web_app: { url: `${this.appUrl}#laws` } }]
            ]
          }
        });
      }

      if (text === "🎯 50 ta Variant") {
        return await this.sendMessage(chatId,
          `🎯 <b>50 ta To'liq BMBA Imtihon Varianti</b>\n\n` +
          `Har bir variant rasmiy 45 talik formatda tuzilgan:\n` +
          `• 32 ta yopiq test (Y-1)\n` +
          `• 3 ta vaziyatli keys (Y-2)\n` +
          `• 10 ta qisqa javobli ochiq savol (O)\n\n` +
          `Vaqti: 90 daqiqa. Tayyorgarlik darajangizni aniqlang!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎯 50 ta Variantni ochish", web_app: { url: `${this.appUrl}#variants` } }]
            ]
          }
        });
      }

      if (text === "🥊 Huquqiy Duel") {
        return await this.sendMessage(chatId,
          `🥊 <b>Huquqiy Octagon (1v1 Jonli Duel)</b>\n\n` +
          `Bot va veb-platformaning haqiqiy ishtirokchilariga qarshi intellektual jang olib boring!\n\n` +
          `• 5 ta raund\n` +
          `• 800+ ta qonun savollari ichidan tasodifiy savollar\n` +
          `• Har safar yangi va takrorlanmas savollar\n\n` +
          `Duelni boshlash uchun pastdagi tugmani bosing:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🥊 Oktagonga kirish (Duel)", web_app: { url: `${this.appUrl}#octagon` } }]
            ]
          }
        });
      }

      if (text === "🏆 Reyting (Top)") {
        return await this.sendLeaderboard(chatId);
      }

      if (text === "👑 VIP Tariflar") {
        return await this.sendTariffs(chatId);
      }

      if (text === "📞 Bog'lanish") {
        return await this.sendContactInfo(chatId);
      }

      if (text === "👤 Mening Natijam") {
        return await this.sendMessage(chatId,
          `👤 <b>Mening BMBA Natijalarim & Profil</b>\n\n` +
          `Shaxsiy statistika, yechilgan testlar va elektron sertifikatingizni ko'rish uchun profilingizni oching:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👤 Shaxsiy Profilni ochish", web_app: { url: `${this.appUrl}#profile` } }]
            ]
          }
        });
      }

      if (text === "🤖 AI Ustozga Savol") {
        return await this.sendMessage(chatId,
          `🤖 <b>AI Huquqiy Ustoz xizmati</b>\n\n` +
          `Siz ushbu botga qonunchilik, moddalar yoki huquqiy atamalar bo'yicha har qanday savolingizni to'g'ridan-to'g'ri matn shaklida yuborishingiz mumkin!\n\n` +
          `<i>💡 Savolingizni yozib yuboring va AI Ustoz zudlik bilan tahliliy javob beradi.</i>`
        );
      }

      // AI Ustozga savol berish (2 ta bepul limit)
      const used = botUserAiCounts[userId] || 0;
      if (used >= 2) {
        return await this.sendMessage(chatId,
          `⚠️ <b>Hurmatli ${firstName}! Siz 2 ta bepul AI Ustoz savol limitidan foydalandingiz.</b>\n\n` +
          `Cheksiz va to'liq savol-javoblar uchun <b>VIP PRO</b> tarifiga ulaning! 👑`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👑 VIP PRO Tarifiga Ulanish", callback_data: "cmd_tariffs" }],
              [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
            ]
          }
        });
      }

      await this.callApi('sendChatAction', { chat_id: chatId, action: 'typing' });
      const aiRes = await askAiTutor(text);
      botUserAiCounts[userId] = used + 1;
      const remaining = 2 - botUserAiCounts[userId];
      const limitNote = remaining > 0
        ? `\n\n<i>(💡 Sizda yana ${remaining} ta bepul savol imkoniyati qoldi)</i>`
        : `\n\n<i>(⚠️ 2 ta bepul savol limitingiz tugadi. Cheksiz savol-javob uchun VIP PRO ga o'ting!)</i>`;

      const replyText = `🤖 <b>AI Huquqiy Ustoz:</b>\n\n${aiRes.reply}${limitNote}`;

      return await this.sendMessage(chatId, replyText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📲 Mini Appda to'liq ishlash", web_app: { url: this.appUrl } }],
            [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
          ]
        }
      });

    } else if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message.chat.id;
      const userId = q.from?.id || chatId;
      const firstName = q.from?.first_name || "O'quvchi";

      recordUser(q.from);

      if (q.data === 'check_subscription') {
        const subCheck = await this.checkAllSubscriptions(userId);
        if (subCheck.ok) {
          await this.answerCallbackQuery(q.id, "✅ Ikkala kanalga a'zoligingiz muvaffaqiyatli tasdiqlandi!");
          await this.sendMainMenu(chatId, firstName, true, userId);
        } else {
          const missingChannels = subCheck.missing.map(m => m.username).join(" va ");
          await this.answerCallbackQuery(
            q.id,
            `❌ Siz hali ${missingChannels} kanaliga a'zo bo'lmadingiz! Iltimos, ikkala kanalga ham obuna bo'ling.`,
            true
          );
        }
      } else if (q.data === 'cmd_home') {
        await this.answerCallbackQuery(q.id);
        await this.sendMainMenu(chatId, firstName, false, userId);
      } else if (q.data === 'cmd_leaderboard') {
        await this.answerCallbackQuery(q.id);
        await this.sendLeaderboard(chatId);
      } else if (q.data === 'cmd_tariffs') {
        await this.answerCallbackQuery(q.id);
        await this.sendTariffs(chatId);
      } else if (q.data === 'cmd_contact') {
        await this.answerCallbackQuery(q.id);
        await this.sendContactInfo(chatId);
      } else if (q.data === 'admin_panel') {
        await this.answerCallbackQuery(q.id);
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu bo'lim faqat adminlar uchun.`);
        }
        await this.sendAdminPanel(chatId);
      } else if (q.data === 'admin_recent_users') {
        await this.answerCallbackQuery(q.id);
        if (!isUserAdmin(userId)) return;
        await this.sendRecentUsers(chatId);
      } else if (q.data === 'admin_receipts') {
        await this.answerCallbackQuery(q.id);
        if (!isUserAdmin(userId)) return;
        await this.sendRecentReceipts(chatId);
      } else if (q.data === 'admin_broadcast_help') {
        await this.answerCallbackQuery(q.id);
        if (!isUserAdmin(userId)) return;
        await this.sendMessage(chatId,
          `📢 <b>Barcha foydalanuvchilarga xabar tarqatish:</b>\n\n` +
          `Xabar tarqatish uchun quyidagi formatda yozing:\n` +
          `<code>/broadcast Sizning xabaringiz matni</code>\n\n` +
          `<i>Masalan:</i>\n` +
          `<code>/broadcast Assalomu alaykum! Platformaga yangi 40 ta qonun testlari qo'shildi!</code>`
        );
      } else if (q.data === 'admin_post_quiz') {
        await this.answerCallbackQuery(q.id, "Kanalga test yuborilmoqda...");
        if (!isUserAdmin(userId)) return;
        await this.postNextQuizToChannel(chatId);
      } else {
        await this.answerCallbackQuery(q.id);
      }
    }
  }
}

let botInstance = null;

function initBot() {
  if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.log('ℹ️  TELEGRAM_BOT_TOKEN kiritilmagan. Bot hozircha ishga tushmadi.');
    return null;
  }

  if (!botInstance) {
    const currentAppUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.WEB_APP_URL || 'https://huquqdan-sertifikat.vercel.app');
    botInstance = new SimpleTelegramBot(token, currentAppUrl, channelId);
  }

  if (!process.env.VERCEL && !botInstance.isRunning) {
    botInstance.startPolling();
  }

  return botInstance;
}

function getBotInstance() {
  if (!botInstance) {
    return initBot();
  }
  return botInstance;
}

module.exports = { initBot, getBotInstance, SimpleTelegramBot };
