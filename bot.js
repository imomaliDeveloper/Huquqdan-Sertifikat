require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { askAiTutor } = require('./scripts/aiService');

const MANDATORY_CHANNELS = [
  { username: '@Huquq_study', name: "Huquq Study | Milliy Sertifikat", url: "https://t.me/Huquq_study" },
  { username: '@General_Huquq', name: "General Huquq | Rasmiy Kanal", url: "https://t.me/General_Huquq" }
];

const OFFICIAL_ADMIN_ID = '8348657980';
const botUserAiCounts = {};

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://huquqdan-sertifikat.vercel.app';
const channelId = process.env.TELEGRAM_CHANNEL_ID || '@Huquq_study';

// ==================== YORDAMCHI BAZA FUNKSIYALARI ====================

function safeRead(fileName, defaultVal = []) {
  // 1. /tmp dan o'qish (Vercel serverless da yozilgan yangi ma'lumotlar)
  try {
    const tmpPath = path.join('/tmp', fileName);
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    }
  } catch (e) {}

  // 2. data/ papkasidan o'qish
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}

  return defaultVal;
}

function safeWrite(fileName, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  // 1. /tmp/ papkasiga yozish (AWS Lambda va Vercel da yagona yozishga ruxsat etilgan joy)
  try {
    const tmpPath = path.join('/tmp', fileName);
    const tmpDir = path.dirname(tmpPath);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');
  } catch (e) {}

  // 2. data/ papkasiga yozish (lokal muhit uchun)
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, jsonStr, 'utf8');
  } catch (e) {}
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getAdminIds() {
  let ids = safeRead('admin_ids.json', [OFFICIAL_ADMIN_ID]);
  if (!Array.isArray(ids)) ids = [OFFICIAL_ADMIN_ID];
  ids = ids.map(id => id.toString().trim());
  if (!ids.includes(OFFICIAL_ADMIN_ID)) ids.push(OFFICIAL_ADMIN_ID);
  if (process.env.ADMIN_IDS) {
    const envIds = process.env.ADMIN_IDS.split(',').map(s => s.trim()).filter(Boolean);
    ids = Array.from(new Set([...ids, ...envIds]));
  }
  return ids;
}

function addAdminId(newId) {
  if (!newId) return false;
  const strId = newId.toString().trim();
  const ids = getAdminIds();
  if (!ids.includes(strId)) {
    ids.push(strId);
    safeWrite('admin_ids.json', ids);
  }
  return true;
}

function isUserAdmin(userId) {
  if (!userId) return false;
  const strId = userId.toString().trim();
  const ids = getAdminIds();
  return ids.includes(strId);
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
      if (!users[existingIndex].referrals) users[existingIndex].referrals = [];
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
        referrals: [],
        referredBy: null,
        referralConfirmed: false,
        isVip: false,
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

function savePendingReferral(newUserId, referrerId) {
  try {
    const users = safeRead('users.json', []);
    const newIdStr = newUserId.toString();
    const refIdStr = referrerId.toString();
    if (newIdStr === refIdStr) return; // O'zini o'zi taklif qilolmaydi

    const idx = users.findIndex(u => (u.tgId && u.tgId.toString() === newIdStr) || (u.id && u.id.toString() === `TG-${newIdStr}`));
    if (idx >= 0) {
      if (!users[idx].referredBy && !users[idx].referralConfirmed) {
        users[idx].referredBy = refIdStr;
        safeWrite('users.json', users);
      }
    } else {
      users.push({
        id: `TG-${newUserId}`,
        tgId: newUserId,
        name: "O'quvchi",
        role: "Abituriyent",
        plan: "START",
        referrals: [],
        referredBy: refIdStr,
        referralConfirmed: false,
        isVip: false,
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        source: "referral_link"
      });
      safeWrite('users.json', users);
    }
  } catch (e) {
    console.error("savePendingReferral error:", e.message);
  }
}

// ==================== TELEGRAM BOT SINF ====================

class SimpleTelegramBot {
  constructor(botToken, appUrl, chanId) {
    this.token = botToken;
    let cleanUrl = (appUrl || 'https://huquqdan-sertifikat.vercel.app').trim();
    if (!cleanUrl.endsWith('/')) {
      cleanUrl += '/';
    }
    this.appUrl = cleanUrl;
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

  async sendPhoto(chatId, photo, caption = '', options = {}) {
    return await this.callApi('sendPhoto', {
      chat_id: chatId,
      photo: photo,
      caption: caption,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup
    });
  }

  async sendDocument(chatId, document, caption = '', options = {}) {
    return await this.callApi('sendDocument', {
      chat_id: chatId,
      document: document,
      caption: caption,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup
    });
  }

  async sendLocalDocument(chatId, filePath, caption = '', options = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Fayl topilmadi: ${filePath}`);
        return { ok: false, error: 'File not found: ' + filePath };
      }
      const buffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
      if (caption) formData.append('caption', caption);
      formData.append('parse_mode', options.parse_mode || 'HTML');
      if (options.reply_markup) {
        formData.append('reply_markup', typeof options.reply_markup === 'string' ? options.reply_markup : JSON.stringify(options.reply_markup));
      }

      const response = await fetch(`${this.baseUrl}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (err) {
      console.error('sendLocalDocument error:', err.message);
      return { ok: false, error: err.message };
    }
  }

  async editMessageCaption(chatId, messageId, caption, options = {}) {
    return await this.callApi('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: caption,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup
    });
  }

  async editMessageText(chatId, messageId, text, options = {}) {
    return await this.callApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup
    });
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
      [{ text: "🎁 10 ta Do'st = VIP Bepul 👑" }, { text: "👑 VIP Tariflar" }],
      [{ text: "🤖 AI Ustozga Savol" }, { text: "👤 Mening Natijam" }]
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
        { text: "🎁 10 ta Do'st = VIP Bepul 👑", callback_data: "cmd_referral" },
        { text: "👑 VIP PRO Tariflari", callback_data: "cmd_tariffs" }
      ],
      [
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

  // 2.1 REFERAL TIZIMI (10 TA DO'ST = VIP BEPUL)
  async sendReferralMenu(chatId, userId) {
    const users = safeRead('users.json', []);
    const idStr = userId.toString();
    const user = users.find(u => (u.tgId && u.tgId.toString() === idStr) || (u.id && u.id.toString() === `TG-${idStr}`)) || {};

    const refs = user.referrals || [];
    const count = refs.length;
    const isVip = user.isVip || user.plan === 'VIP PRO' || user.plan === 'tariff_vip';

    const filled = Math.min(count, 10);
    const empty = 10 - filled;
    const progressBar = "🟩".repeat(filled) + "⬜".repeat(empty);

    const refLink = `https://t.me/HuquqdanSertifikatBot?start=ref_${userId}`;
    const shareText = encodeURIComponent(
      `🏛 Huquqshunoslik fanidan Milliy Sertifikat (BMBA) imtihoniga tayyorgarlik boti!\n\n` +
      `• 40 ta qonundan 800 ta test\n` +
      `• 50 ta to'liq rasmiy variant\n` +
      `• Jonli Huquqiy Duel (Octagon)\n\n` +
      `Do'stlar, hoziroq kiring va bilimingizni sinang 👇`
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;

    const text =
      `🎁 <b>DO'STLARNI TAKLIF QILING VA VIP PRO NI BEPUL OLING!</b>\n\n` +
      `🔥 <b>Shart juda oddiy:</b>\n` +
      `Shaxsiy taklif havolangiz orqali <b>10 nafar do'stingiz</b> botga kirib, kanallarimizga a'zo bo'lsa — sizga <b>VIP PRO (89 000 so'mlik)</b> tarifi <b>MUTLAQO BEPUL</b> ochiladi!\n\n` +
      `📊 <b>Sizning ko'rsatkichingiz:</b>\n` +
      `• Taklif qilingan do'stlar: <b>${count} / 10 ta</b>\n` +
      `• Jarayon: ${progressBar} (${Math.round((count / 10) * 100)}%)\n` +
      `• VIP Holati: <b>${isVip ? "✅ Faollashtirilgan (VIP PRO)" : (count >= 10 ? "✅ Faollashtirilgan" : `🔒 Yana ${10 - count} ta do'st kerak`)}</b>\n\n` +
      `🔗 <b>Sizning shaxsiy taklif havolangiz:</b>\n` +
      `<code>${refLink}</code>\n\n` +
      `<i>Do'stlaringiz yoki guruhlarga yuborish uchun pastdagi "Do'stlarga ulashish" tugmasini bosing:</i> 👇`;

    const keyboard = [
      [
        { text: "🚀 Do'stlarga va guruhlarga ulashish 📤", url: shareUrl }
      ],
      [
        { text: "🔄 Natijani yangilash", callback_data: "refresh_referral" },
        { text: "🏠 Asosiy Menyu", callback_data: "cmd_home" }
      ]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Referalni tasdiqlash va 10 ta do'st bo'lganda VIP berish
  async confirmReferralIfPending(newUserId, newUserName) {
    try {
      const users = safeRead('users.json', []);
      const newIdStr = newUserId.toString();
      const currentUserIndex = users.findIndex(u => (u.tgId && u.tgId.toString() === newIdStr) || (u.id && u.id.toString() === `TG-${newIdStr}`));

      if (currentUserIndex < 0) return;
      const currentUser = users[currentUserIndex];

      if (currentUser.referralConfirmed || !currentUser.referredBy) return;

      const referrerIdStr = currentUser.referredBy.toString();
      if (referrerIdStr === newIdStr) return;

      const referrerIndex = users.findIndex(u => (u.tgId && u.tgId.toString() === referrerIdStr) || (u.id && u.id.toString() === `TG-${referrerIdStr}`));
      if (referrerIndex < 0) return;

      const referrer = users[referrerIndex];
      if (!referrer.referrals) referrer.referrals = [];

      if (!referrer.referrals.includes(newIdStr)) {
        referrer.referrals.push(newIdStr);
      }
      currentUser.referralConfirmed = true;
      safeWrite('users.json', users);

      const count = referrer.referrals.length;
      const referrerTgId = referrer.tgId || referrerIdStr;

      if (count >= 10 && !referrer.isVip) {
        referrer.isVip = true;
        referrer.plan = "tariff_vip";
        referrer.vipUnlockedVia = "10_friends_referral";
        safeWrite('users.json', users);

        await this.sendMessage(referrerTgId,
          `🏆 <b>TABRIKLAYMIZ! SIZ 10 TA DO'STINGIZNI TAKLIF QILDINGIZ!</b> 🎉\n\n` +
          `Siz barcha shartlarni a'lo darajada bajardingiz!\n` +
          `👑 <b>VIP PRO (89 000 so'mlik) tarifi sizga MUTLAQO BEPUL faollashtirildi!</b>\n\n` +
          `Endi siz uchun:\n` +
          `• 📜 40 ta qonunning barchasi (800 ta test) ochiq!\n` +
          `• 🎯 50 ta rasmiy imtihon varianti to'liq ochiq!\n` +
          `• 🤖 AI Repetitor bilan cheksiz tahlil!\n` +
          `• 🥊 Huquqiy Octagon duellari cheksiz!\n\n` +
          `<i>Platformani oching va erkin foydalaning:</i> 👇`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Platformani ochish (VIP PRO)", web_app: { url: this.appUrl } }]
            ]
          }
        });

        const adminIds = getAdminIds();
        for (const aId of adminIds) {
          await this.sendMessage(aId,
            `🎁 <b>Yangi Referal VIP:</b>\n\n` +
            `Foydalanuvchi: <b>${referrer.name || referrer.username || referrerIdStr}</b> 10 ta do'stini taklif qildi va <b>VIP PRO</b> ni bepul oldi!`
          );
        }
      } else {
        await this.sendMessage(referrerTgId,
          `🎉 <b>Yangi do'stingiz a'zo bo'ldi!</b>\n\n` +
          `<b>${newUserName}</b> sizning havolangiz orqali botga qo'shildi va kanallarga obuna bo'ldi.\n\n` +
          `📊 Sizda: <b>${count} / 10 ta</b> do'st bo'ldi.\n` +
          (count < 10 ? `🎯 Yana <b>${10 - count} nafar</b> do'stingiz qo'shilsa, VIP PRO mutlaqo bepul ochiladi!` : `👑 VIP PRO faol!`)
        );
      }
    } catch (e) {
      console.error("confirmReferralIfPending error:", e.message);
    }
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
        { text: "📢 Avto-Test Sozlamalari (Interval)", callback_data: "autopost_menu" },
        { text: "🎯 Kanalga test tashlash (Hozir)", callback_data: "autopost_send_now" }
      ],
      [
        { text: "⏰ O'quvchilarga eslatma yuborish (Nazorat)", callback_data: "admin_send_reminders" }
      ],
      [
        { text: "📢 Barchaga xabar tarqatish", callback_data: "admin_broadcast_help" },
        { text: "🔄 Statistikani yangilash", callback_data: "admin_panel" }
      ],
      [
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
    const recent = receipts.slice(-10).reverse();

    if (!recent.length) {
      return await this.sendMessage(chatId, "📥 Hozircha to'lov cheklari mavjud emas.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Qaytish", callback_data: "admin_panel" }]] }
      });
    }

    let text = `💳 <b>So'nggi kelib tushgan to'lov cheklari:</b>\n\n`;
    const keyboard = [];

    recent.forEach((r, idx) => {
      const isPending = (r.status === 'pending');
      const statusIcon = isPending ? '⏳ Kutilmoqda' : (r.status === 'approved' ? '✅ Tasdiqlangan' : '❌ Rad etilgan');
      const shortName = (r.userName || "O'quvchi").slice(0, 14);

      text += `<b>${idx + 1}. ${escapeHtml(r.userName || "Foydalanuvchi")}</b>\n` +
        `• Chek / Izoh: <code>${escapeHtml(r.transactionId || r.caption || r.userContact || "Noma'lum")}</code>\n` +
        `• ID / Kontakt: <code>${r.userId || r.userContact || "Noma'lum"}</code> (${r.userUsername || ''})\n` +
        `• Summa: <b>${r.amount || "Noma'lum"}</b>\n` +
        `• Holati: <i>${statusIcon}</i>\n` +
        `• Sana: ${r.date ? new Date(r.date).toLocaleString('uz-UZ') : ''}\n\n`;

      if (isPending) {
        keyboard.push([
          { text: `✅ Tasdiqlash (${shortName})`, callback_data: `approve_receipt_${r.id}` },
          { text: `❌ Rad`, callback_data: `reject_receipt_${r.id}` }
        ]);
      }
    });

    keyboard.push([{ text: "🔙 Admin panelga qaytish", callback_data: "admin_panel" }]);

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

  // O'quvchilarga kunlik eslatma yuborish (Retention & Re-engagement)
  async sendDailyRetentionReminders(triggeredByChatId = null) {
    try {
      const users = safeRead('users.json', []);
      const tgUsers = users.filter(u => u.tgId || (u.id && u.id.toString().startsWith('TG-')));

      if (!tgUsers.length) {
        if (triggeredByChatId) {
          await this.sendMessage(triggeredByChatId, "ℹ️ Eslatma yuborish uchun Telegram o'quvchilari topilmadi.");
        }
        return { total: 0, sent: 0, skipped: 0, failed: 0 };
      }

      let sentCount = 0;
      let skippedCount = 0;
      let failCount = 0;
      const now = Date.now();

      for (const u of tgUsers) {
        const targetId = u.tgId || (u.id ? u.id.replace('TG-', '') : null);
        if (!targetId) continue;

        // Oxirgi faollik vaqtini tekshirish
        const lastActiveTime = u.lastActive ? new Date(u.lastActive).getTime() : 0;
        const diffHours = lastActiveTime > 0 ? (now - lastActiveTime) / (1000 * 60 * 60) : 999;

        // Agar oxirgi 10 soat ichida faol bo'lgan bo'lsa va test ishlagan bo'lsa, o'tkazib yuboramiz
        if (diffHours < 10 && u.testsCompleted && u.testsCompleted > 0) {
          skippedCount++;
          continue;
        }

        const firstName = u.name ? u.name.split(' ')[0] : "O'quvchi";

        let reminderText = "";
        if (diffHours >= 72 || !u.lastActive) {
          // 3 kundan ortiq kirmagan o'quvchilar uchun
          reminderText =
            `👋 <b>Assalomu alaykum, ${firstName}!</b> ⚖️\n\n` +
            `🎯 <b>Huquqshunoslik Milliy Sertifikat imtihoni har kuni yaqinlashmoqda!</b>\n\n` +
            `Bir necha kundan beri test yechmadingiz. Do'stlaringiz va raqiblaringiz esa har kuni 40 ta qonun bo'yicha bilimlarini oshirib, umumiy reytingda oldinga intilmoqda! 🔥\n\n` +
            `Bugun kamida <b>1 ta qonun varianti</b>ni yechib, bilimingizni mustahkamlang va o'rningizni boy bermang! 🚀`;
        } else {
          // 24 soat atrofida faol bo'lmagan o'quvchilar uchun
          reminderText =
            `🔔 <b>Kunlik Eslatma | BMBA Huquq Testlari</b> ⚖️\n\n` +
            `Assalomu alaykum, <b>${firstName}</b>! Bugun hali test topshirmadingiz.\n\n` +
            `🔥 <b>Kunlik streak (ketma-ketlik)ni boy bermang!</b> Kuniga 15-20 daqiqa test yechish — imtihonda yuqori sertifikat olishning eng ishonchli usulidir.\n\n` +
            `Platformadagi 40 ta qonun testlari yoki jonli duelda o'z kuchingizni sinab ko'ring! 👇`;
        }

        try {
          const res = await this.sendMessage(targetId, reminderText, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Bugungi testni yechish", web_app: { url: this.appUrl } }],
                [{ text: "🥊 Huquqiy Duelga kirish", web_app: { url: `${this.appUrl}#octagon` } }]
              ]
            }
          });

          if (res && res.ok) {
            sentCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }

        // Telegram API flood limitidan saqlanish
        await new Promise(r => setTimeout(r, 60));
      }

      if (triggeredByChatId) {
        await this.sendMessage(triggeredByChatId,
          `✅ <b>O'quvchilarga eslatma yuborish yakunlandi!</b>\n\n` +
          `• Jami o'quvchilar: <b>${tgUsers.length} nafar</b>\n` +
          `• Muvaffaqiyatli yetkazildi: <b>${sentCount} nafar</b>\n` +
          `• Bugun faol bo'lgani uchun o'tkazib yuborildi: <b>${skippedCount} nafar</b>\n` +
          `• Yetkazib bo'lmadi (botni bloklagan): <b>${failCount} nafar</b>\n\n` +
          `<i>Barcha o'quvchilar o'qish va test yechishga qayta jalb qilindi! 🎯</i>`
        );
      }

      return { total: tgUsers.length, sent: sentCount, skipped: skippedCount, failed: failCount };
    } catch (err) {
      console.error("sendDailyRetentionReminders xatolik:", err);
      if (triggeredByChatId) {
        await this.sendMessage(triggeredByChatId, `⚠️ Xatolik yuz berdi: ${err.message}`);
      }
      return { error: err.message };
    }
  }

  // 4. LEADERBOARD (REYTING) KO'RSATISH
  async sendLeaderboard(chatId, type = 'exam') {
    if (type === 'duel') {
      const list = safeRead('duel_leaderboard.json', []);
      list.sort((a, b) => (b.duelScore || 0) - (a.duelScore || 0) || (b.wins || 0) - (a.wins || 0));
      const top = list.slice(0, 10);

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      let text = `🥊 <b>HUQUQIY DUEL (OCTAGON) REYTINGI (TOP-10)</b>\n\n`;

      if (top.length === 0) {
        text += `<i>Hozircha duel natijalari mavjud emas. Birinchi bo'lib Oktagonga kiring va g'alaba qozoning!</i>\n`;
      } else {
        top.forEach((u, idx) => {
          text += `${medals[idx] || "🔹"} <b>${u.name}</b> — <b>${u.duelScore || 0} ball</b>\n` +
                  `   ┗ <i>${u.rankTitle || 'Huquqiy Jangchi'}</i> (${u.wins || 0} g'alaba / ${u.losses || 0} mag'lubiyat)\n`;
        });
      }

      text += `\n<i>Oktagon arenasida 10 raundlik qonuniy duellarda g'alaba qozonib, reytingda 1-o'ringa chiqing!</i>`;

      const keyboard = [
        [
          { text: "🏆 BMBA Imtihon Reytingi", callback_data: "cmd_leaderboard_exam" },
          { text: "🥊 Duel Reytingi (Faol)", callback_data: "cmd_leaderboard_duel" }
        ],
        [{ text: "🥊 Oktagonga kirish (1v1 Duel)", web_app: { url: `${this.appUrl}#octagon` } }],
        [{ text: "🏠 Asosiy menyu", callback_data: "cmd_home" }]
      ];

      return await this.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: keyboard }
      });
    }

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
      [
        { text: "🏆 Imtihon Reytingi (Faol)", callback_data: "cmd_leaderboard_exam" },
        { text: "🥊 Duel Reytingi", callback_data: "cmd_leaderboard_duel" }
      ],
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
      `<i>Qabul qiluvchi: Imomali Mamatqulov</i>\n\n` +
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

  // 40 ta qonundan navbatdagi savolni olish (800 ta test)
  getNextQuizQuestion() {
    let settings = safeRead('autopost_settings.json', {
      enabled: true,
      intervalHours: 2,
      targetChannels: ["@Huquq_study", "@General_Huquq"],
      lastPostedAt: null,
      totalPosted: 0,
      currentLawIndex: 1,
      currentQuestionIndex: 0
    });

    // 40 ta qonundan tasodifiy xilma-xil qonun tanlanadi (faqat konstitutsiya emas!)
    const totalLaws = 40;
    let randomLawIdx = Math.floor(Math.random() * totalLaws) + 1;
    if (settings.currentLawIndex && settings.currentLawIndex === randomLawIdx) {
      randomLawIdx = (randomLawIdx % totalLaws) + 1;
    }

    let lawFile = path.join('law_variants', `law_var_${randomLawIdx}.json`);
    let lawData = safeRead(lawFile, null);

    if (!lawData || !lawData.questions || !lawData.questions.length) {
      randomLawIdx = (randomLawIdx % totalLaws) + 1;
      lawFile = path.join('law_variants', `law_var_${randomLawIdx}.json`);
      lawData = safeRead(lawFile, null);
    }

    let questions = (lawData && lawData.questions) ? lawData.questions : [];
    if (!questions.length) {
      questions = safeRead('questions_bank.json', []);
    }
    if (!questions.length) return null;

    const randomQIdx = Math.floor(Math.random() * questions.length);
    const q = questions[randomQIdx];

    settings.currentLawIndex = randomLawIdx;
    settings.currentQuestionIndex = randomQIdx;
    safeWrite('autopost_settings.json', settings);

    const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    let correctIdx = 0;
    if (q.correctKey && map[q.correctKey] !== undefined) correctIdx = map[q.correctKey];
    else if (q.correct && map[q.correct] !== undefined) correctIdx = map[q.correct];

    const cleanOpts = (q.options || []).map(o => {
      let txt = (typeof o === 'string' ? o : o.text) || '';
      return txt.replace(/^[A-D][).:\s-]+/i, '').trim();
    }).slice(0, 4);

    return {
      text: q.text || '',
      options: cleanOpts,
      correctIndex: correctIdx,
      explanation: q.explanation || '',
      lawName: (lawData && lawData.lawName) ? lawData.lawName : "Fuqarolik huquqi"
    };
  }

  // Telegram Kanallarga Viktorina tashlash
  async postNextQuizToChannel(chatNotifyId = null, forceNow = false) {
    try {
      let settings = safeRead('autopost_settings.json', {
        enabled: true,
        intervalHours: 2,
        targetChannels: ["@Huquq_study", "@General_Huquq"],
        lastPostedAt: null,
        totalPosted: 0,
        currentLawIndex: 1,
        currentQuestionIndex: 0
      });

      if (!forceNow && !settings.enabled) {
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, "ℹ️ Avto-test tizimi hozirda to'xtatilgan (O'chiq).");
        }
        return { ok: false, error: "Tizim o'chiq" };
      }

      const q = this.getNextQuizQuestion();
      if (!q || !q.options || q.options.length < 2) {
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, "⚠️ Test savollari bazasini yuklashda xatolik yuz berdi.");
        }
        return { ok: false, error: "Savol topilmadi" };
      }

      const channels = (settings.targetChannels && settings.targetChannels.length)
        ? settings.targetChannels
        : ["@Huquq_study", "@General_Huquq"];

      const testNum = (settings.totalPosted || 0) + 1;

      // Savol va izohni keshga saqlash
      const quizCache = safeRead('posted_channel_quizzes.json', {});
      quizCache[testNum] = {
        lawName: q.lawName,
        correctIndex: q.correctIndex,
        explanation: q.explanation || "",
        postedAt: new Date().toISOString()
      };
      const cacheKeys = Object.keys(quizCache);
      if (cacheKeys.length > 200) {
        delete quizCache[cacheKeys[0]];
      }
      safeWrite('posted_channel_quizzes.json', quizCache);

      let successCount = 0;
      let failDetails = [];

      for (const ch of channels) {
        try {
          const lawName = escapeHtml(q.lawName || "Fuqarolik huquqi");
          const questionText = escapeHtml(q.text || "");
          const opt0 = escapeHtml(q.options[0] || "");
          const opt1 = escapeHtml(q.options[1] || "");
          const opt2 = escapeHtml(q.options[2] || "");
          const opt3 = escapeHtml(q.options[3] || "");

          const postText =
            `<b>Huquqdan sertifikat! GENERALIST</b>\n` +
            `🏛 <b>HUQUQIY TEST #${testNum}</b>\n\n` +
            `📌 <b>Mavzu:</b> ${lawName}\n\n` +
            `❓ <b>SAVOL:</b>\n` +
            `${questionText}\n\n` +
            `🅰️ <b>A)</b> ${opt0}\n` +
            `🅱️ <b>B)</b> ${opt1}\n` +
            `🆎 <b>C)</b> ${opt2}\n` +
            `🆓 <b>D)</b> ${opt3}\n\n` +
            `👇 <i>Javobingizni pastdagi [ A ] [ B ] [ C ] [ D ] tugmalarini bosib tekshiring!</i>\n\n` +
            `🤖 <b>Rasmiy Bot:</b> @HuquqdanSertifikatBot\n` +
            `🚀 <b>Mini App:</b> 40 ta qonundan 800 ta test va Huquqiy Duel\n` +
            `📢 <b>Kanal:</b> ${ch}\n` +
            `💡 <i>«Qonunni bilish — o'z huquqingni himoya qilishdir.»</i>`;

          const keyboard = [
            [
              { text: "🔹 A", callback_data: `ch_ans_${testNum}_0_${q.correctIndex}` },
              { text: "🔹 B", callback_data: `ch_ans_${testNum}_1_${q.correctIndex}` }
            ],
            [
              { text: "🔹 C", callback_data: `ch_ans_${testNum}_2_${q.correctIndex}` },
              { text: "🔹 D", callback_data: `ch_ans_${testNum}_3_${q.correctIndex}` }
            ],
            [
              { text: "🚀 800 ta testni Botda ishlash 📲", url: "https://t.me/HuquqdanSertifikatBot?start=quiz" }
            ],
            [
              { text: "🌐 Veb-Platformaga kirish", url: this.appUrl },
              { text: "📢 Kanalga a'zo bo'lish ↗️", url: `https://t.me/${ch.replace('@', '')}` }
            ]
          ];

          const res = await this.sendMessage(ch, postText, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });

          if (res.ok) {
            successCount++;
          } else {
            failDetails.push(`${ch}: ${res.description || 'Xatolik'}`);
          }
        } catch (e) {
          failDetails.push(`${ch}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 250));
      }

      // Sozlamalarni yangilash
      settings.lastPostedAt = new Date().toISOString();
      settings.totalPosted = testNum;
      safeWrite('autopost_settings.json', settings);

      if (chatNotifyId) {
        if (successCount > 0) {
          await this.sendMessage(chatNotifyId,
            `✅ <b>Test muvaffaqiyatli kanal(lar)ga tashlandi!</b>\n\n` +
            `• Yuborilgan kanallar: <b>${channels.join(', ')}</b>\n` +
            `• Muvaffaqiyatli: <b>${successCount} ta</b>\n` +
            `• Mavzu: <i>${q.lawName}</i>\n` +
            (failDetails.length ? `• Ogohlantirish: <code>${failDetails.join('; ')}</code>` : ``)
          );
        } else {
          let reasonMsg = failDetails.join('\n');
          let helpNote = "";
          if (reasonMsg.includes('Forbidden') || reasonMsg.includes('not a member')) {
            helpNote = `\n\n💡 <b>Yechim:</b>\n1. Telegramda <b>${channels.join('</b> va <b>')}</b> kanalingizga kiring.\n2. <i>Kanal ma'lumotlari ➡️ Administratorlar ➡️ Yangi admin qo'shish</i> bo'limiga kiring.\n3. <b>@HuquqdanSertifikatBot</b> ni qidirib topib, <b>"Xabar yozish" (Post Messages)</b> ruxsatini bering!`;
          }
          await this.sendMessage(chatNotifyId,
            `⚠️ <b>Test kanalga yuborilmadi!</b>\n\n` +
            `<b>Sabab:</b>\n<code>${reasonMsg}</code>` +
            helpNote
          );
        }
      }

      return { ok: successCount > 0, successCount, failDetails, question: q };
    } catch (err) {
      console.error("postNextQuizToChannel xatolik:", err);
      if (chatNotifyId) {
        await this.sendMessage(chatNotifyId, `⚠️ Xatolik: ${err.message}`);
      }
      return { ok: false, error: err.message };
    }
  }

  // Admin o'zi yozgan maxsus testni kanallarga tashlash
  async postCustomQuizToChannels(chatNotifyId, q) {
    try {
      const settings = safeRead('autopost_settings.json', {
        targetChannels: ["@Huquq_study", "@General_Huquq"]
      });
      const channels = (settings.targetChannels && settings.targetChannels.length)
        ? settings.targetChannels
        : ["@Huquq_study", "@General_Huquq"];

      const testNum = (settings.totalPosted || 0) + 1;

      // Savol va izohni keshga saqlash
      const quizCache = safeRead('posted_channel_quizzes.json', {});
      quizCache[testNum] = {
        lawName: q.lawName || "Maxsus Savol",
        correctIndex: q.correctIndex,
        explanation: q.explanation || "",
        postedAt: new Date().toISOString()
      };
      safeWrite('posted_channel_quizzes.json', quizCache);

      let successCount = 0;
      let failDetails = [];

      for (const ch of channels) {
        try {
          const lawName = escapeHtml(q.lawName || "Huquqiy Sinov");
          const questionText = escapeHtml(q.text || "");
          const opt0 = escapeHtml(q.options[0] || "");
          const opt1 = escapeHtml(q.options[1] || "");
          const opt2 = escapeHtml(q.options[2] || "");
          const opt3 = escapeHtml(q.options[3] || "");

          const postText =
            `<b>Huquqdan sertifikat! GENERALIST</b>\n` +
            `🏛 <b>HUQUQIY TEST #${testNum}</b>\n\n` +
            `📌 <b>Mavzu:</b> ${lawName}\n\n` +
            `❓ <b>SAVOL:</b>\n` +
            `${questionText}\n\n` +
            `🅰️ <b>A)</b> ${opt0}\n` +
            `🅱️ <b>B)</b> ${opt1}\n` +
            `🆎 <b>C)</b> ${opt2}\n` +
            `🆓 <b>D)</b> ${opt3}\n\n` +
            `👇 <i>Javobingizni pastdagi [ A ] [ B ] [ C ] [ D ] tugmalarini bosib tekshiring!</i>\n\n` +
            `🤖 <b>Rasmiy Bot:</b> @HuquqdanSertifikatBot\n` +
            `🚀 <b>Mini App:</b> 40 ta qonundan 800 ta test va Huquqiy Duel\n` +
            `📢 <b>Kanal:</b> ${ch}\n` +
            `💡 <i>«Qonunni bilish — o'z huquqingni himoya qilishdir.»</i>`;

          const keyboard = [
            [
              { text: "🔹 A", callback_data: `ch_ans_${testNum}_0_${q.correctIndex}` },
              { text: "🔹 B", callback_data: `ch_ans_${testNum}_1_${q.correctIndex}` }
            ],
            [
              { text: "🔹 C", callback_data: `ch_ans_${testNum}_2_${q.correctIndex}` },
              { text: "🔹 D", callback_data: `ch_ans_${testNum}_3_${q.correctIndex}` }
            ],
            [
              { text: "🚀 800 ta testni Botda ishlash 📲", url: "https://t.me/HuquqdanSertifikatBot?start=quiz" }
            ],
            [
              { text: "🌐 Veb-Platformaga kirish", url: this.appUrl },
              { text: "📢 Kanalga a'zo bo'lish ↗️", url: `https://t.me/${ch.replace('@', '')}` }
            ]
          ];

          const res = await this.sendMessage(ch, postText, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });

          if (res.ok) {
            successCount++;
          } else {
            failDetails.push(`${ch}: ${res.description || 'Xatolik'}`);
          }
        } catch (e) {
          failDetails.push(`${ch}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 250));
      }

      settings.totalPosted = testNum;
      safeWrite('autopost_settings.json', settings);

      if (chatNotifyId) {
        if (successCount > 0) {
          await this.sendMessage(chatNotifyId, `✅ <b>Siz tuzgan test kanal(lar)ga muvaffaqiyatli tashlandi!</b>\n\n• Kanallar: <b>${channels.join(', ')}</b>\n• Muvaffaqiyatli: <b>${successCount} ta</b>`);
        } else {
          await this.sendMessage(chatNotifyId, `⚠️ <b>Xatolik yuz berdi:</b>\n${failDetails.join('\n')}`);
        }
      }
      return { ok: successCount > 0 };
    } catch (err) {
      if (chatNotifyId) await this.sendMessage(chatNotifyId, `⚠️ Xatolik: ${err.message}`);
      return { ok: false };
    }
  }

  // Cron va interval bo'yicha tekshirish
  async checkAndPostScheduledQuiz() {
    try {
      const settings = safeRead('autopost_settings.json', {
        enabled: true,
        intervalHours: 2,
        targetChannels: ["@Huquq_study", "@General_Huquq"],
        lastPostedAt: null,
        totalPosted: 0
      });

      if (!settings.enabled) {
        return { status: "skipped", reason: "disabled" };
      }

      const now = Date.now();
      const lastTime = settings.lastPostedAt ? new Date(settings.lastPostedAt).getTime() : 0;
      const intervalMs = (settings.intervalHours || 2) * 60 * 60 * 1000;
      const diffMs = now - lastTime;

      if (diffMs >= intervalMs || !settings.lastPostedAt) {
        const res = await this.postNextQuizToChannel(null, true);
        return { status: "posted", result: res };
      } else {
        const remainingMinutes = Math.round((intervalMs - diffMs) / 60000);
        return { status: "waiting", remainingMinutes: remainingMinutes };
      }
    } catch (err) {
      console.error("checkAndPostScheduledQuiz error:", err);
      return { status: "error", error: err.message };
    }
  }

  // Admin Avto-Test Sozlamalari Menyusi
  async sendAutopostMenu(chatId) {
    const settings = safeRead('autopost_settings.json', {
      enabled: true,
      intervalHours: 2,
      targetChannels: ["@Huquq_study", "@General_Huquq"],
      lastPostedAt: null,
      totalPosted: 0,
      currentLawIndex: 1
    });

    const statusBadge = settings.enabled ? "🟢 FAOL (Avtomatik)" : "🔴 TO'XTATILGAN (Pauza)";
    const lastStr = settings.lastPostedAt
      ? new Date(settings.lastPostedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })
      : "Hali tashlanmagan";

    const channelsStr = (settings.targetChannels || []).join(', ') || "Tanlanmagan";

    const text =
      `📢 <b>KANALLARGA AVTOMATIK TEST TASHLASH SOZLAMALARI</b> ⚙️\n\n` +
      `• <b>Tizim holati:</b> ${statusBadge}\n` +
      `• <b>Joriy interval:</b> Har <b>${settings.intervalHours || 2} soatda</b>\n` +
      `• <b>Biriktirilgan kanallar:</b> <code>${channelsStr}</code>\n` +
      `• <b>So'nggi test vaqti:</b> <i>${lastStr}</i>\n` +
      `• <b>Jami tashlangan testlar:</b> <b>${settings.totalPosted || 0} ta</b>\n` +
      `• <b>Savollar manbasi:</b> 40 ta qonun bazasi (800 ta rasmiy test)\n\n` +
      `<i>Intervalni yoki kanallarni o'zgartirish uchun quyidagi tugmalarni bosing:</i>`;

    const toggleBtn = settings.enabled
      ? { text: "🔴 Tizimni To'xtatish", callback_data: "autopost_toggle" }
      : { text: "🟢 Tizimni Yoqish", callback_data: "autopost_toggle" };

    const keyboard = [
      [toggleBtn],
      [
        { text: (settings.intervalHours === 1 ? "✅ 1 soat" : "⏱ 1 soat"), callback_data: "autopost_interval_1" },
        { text: (settings.intervalHours === 2 ? "✅ 2 soat (Standart)" : "⏱ 2 soat"), callback_data: "autopost_interval_2" },
        { text: (settings.intervalHours === 3 ? "✅ 3 soat" : "⏱ 3 soat"), callback_data: "autopost_interval_3" }
      ],
      [
        { text: (settings.intervalHours === 4 ? "✅ 4 soat" : "⏱ 4 soat"), callback_data: "autopost_interval_4" },
        { text: (settings.intervalHours === 6 ? "✅ 6 soat" : "⏱ 6 soat"), callback_data: "autopost_interval_6" },
        { text: (settings.intervalHours === 12 ? "✅ 12 soat" : "⏱ 12 soat"), callback_data: "autopost_interval_12" }
      ],
      [
        { text: "📢 Ikkala kanal", callback_data: "autopost_chan_both" },
        { text: "1️⃣ @Huquq_study", callback_data: "autopost_chan_1" },
        { text: "2️⃣ @General_Huquq", callback_data: "autopost_chan_2" }
      ],
      [
        { text: "🎯 Hozir test tashlash (Darhol)", callback_data: "autopost_send_now" }
      ],
      [
        { text: "🔙 Admin panelga qaytish", callback_data: "admin_panel" }
      ]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
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
      const text = (msg.text || msg.caption || '').trim();
      const firstName = msg.from?.first_name || "O'quvchi";

      // Foydalanuvchini bazaga kiritish / yangilash
      recordUser(msg.from);

      // 0. TO'LOV CHEKI (RASM YOKI HUJJAT) QABUL QILISH VA ADMINGA YUBORISH
      const isPhoto = Array.isArray(msg.photo) && msg.photo.length > 0;
      const isDocImage = msg.document && (msg.document.mime_type?.startsWith('image/') || msg.document.mime_type === 'application/pdf');

      if (isPhoto || isDocImage) {
        const fileId = isPhoto ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
        const receiptId = "REC-" + Date.now();
        const userName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || firstName;
        const userUsername = msg.from?.username ? `@${msg.from.username}` : "Kiritilmagan";
        const captionText = (msg.caption || text || "To'lov cheki skrinshoti").trim();

        const newReceipt = {
          id: receiptId,
          userId: userId.toString(),
          chatId: chatId,
          userName: userName,
          userUsername: userUsername,
          photoFileId: fileId,
          isDocument: !isPhoto,
          caption: captionText,
          amount: "89 000 UZS (VIP PRO)",
          status: "pending",
          date: new Date().toISOString()
        };

        const receipts = safeRead('receipts.json', []);
        receipts.unshift(newReceipt);
        safeWrite('receipts.json', receipts);

        // Foydalanuvchiga samimiy va xushmuomala javob
        await this.sendMessage(chatId,
          `✅ <b>To'lov chekingiz muvaffaqiyatli qabul qilindi!</b>\n\n` +
          `Hurmatli <b>${firstName}</b>, chekingiz tekshirish uchun ma'muriyatga yetkazildi.\n` +
          `Operatorlarimiz 5–15 daqiqa ichida to'lovni tasdiqlashadi va sizga <b>VIP PRO</b> imkoniyatlari to'liq ochiladi! 🎉\n\n` +
          `<i>Savollaringiz bo'lsa adminga yozishingiz mumkin: @Imomali_Mamatkulov</i>`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📲 Mini Appni ochish", web_app: { url: this.appUrl } }],
              [{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Imomali_Mamatkulov" }]
            ]
          }
        });

        // Adminga darhol to'lov cheki va tasdiqlash tugmalarini yuborish
        const adminCaption = `📥 <b>YANGI TO'LOV CHEKI KELDI!</b> 💳\n\n` +
          `👤 <b>Foydalanuvchi:</b> ${escapeHtml(userName)}\n` +
          `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
          `📱 <b>Username:</b> ${userUsername}\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}\n` +
          `📝 <b>Izoh:</b> ${escapeHtml(captionText)}\n` +
          `🔢 <b>Chek ID:</b> <code>${receiptId}</code>\n\n` +
          `<i>Foydalanuvchiga VIP PRO berishni tasdiqlaysizmi?</i>`;

        const adminIds = getAdminIds();
        for (const aId of adminIds) {
          try {
            const kb = {
              inline_keyboard: [
                [
                  { text: "✅ Tasdiqlash (VIP PRO)", callback_data: `approve_receipt_${receiptId}` },
                  { text: "❌ Rad etish", callback_data: `reject_receipt_${receiptId}` }
                ],
                [
                  { text: "💬 Foydalanuvchiga yozish", url: msg.from?.username ? `https://t.me/${msg.from.username}` : `tg://user?id=${userId}` }
                ]
              ]
            };
            if (isPhoto) {
              await this.sendPhoto(aId, fileId, adminCaption, { reply_markup: kb });
            } else {
              await this.sendDocument(aId, fileId, adminCaption, { reply_markup: kb });
            }
          } catch (e) {
            console.error(`Admin ${aId} ga chek yuborishda xato:`, e.message);
          }
        }
        return;
      }

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

      // ADMIN BUYRUQLARI (Faqat tasdiqlangan admin ID uchun)
      if (text.startsWith('/admin_login')) {
        return await this.sendMessage(chatId, `🔒 Adminlik faqat rasmiy Telegram ID (8348657980) orqali beriladi.`);
      }

      if (text === '/admin' || text === '/admin_panel' || text === '⚙️ Admin Panel') {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId,
            `🔒 <b>Kirish taqiqlangan!</b>\n\n` +
            `Ushbu buyruq faqat loyiha bosh administratori uchun mo'ljallangan.`
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

      if (text === '/send_reminders' || text === '/remind') {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu buyruq faqat adminlar uchun.`);
        }
        await this.sendMessage(chatId, `⏳ O'quvchilarga eslatmalar yuborilmoqda, biroz kuting...`);
        return await this.sendDailyRetentionReminders(chatId);
      }

      if (text === '/autopost' || text === '/interval') {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu buyruq faqat adminlar uchun.`);
        }
        return await this.sendAutopostMenu(chatId);
      }

      // Navbatdagi qonun testini kanalga reklama bilan tashlash
      if (text === '/quiz' || text === '/post_quiz' || text === '/test_tashlash' || text === '/kanalga_test') {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu buyruq faqat bosh admin uchun.`);
        }
        await this.sendMessage(chatId, `⏳ Kanallarga navbatdagi qonun testi va reklama tashlanmoqda...`);
        return await this.postNextQuizToChannel(chatId, true);
      }

      // Admin o'zi tuzgan maxsus testni tashlash
      if (text.startsWith('/yangi_test')) {
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, `🔒 Bu buyruq faqat admin uchun.`);
        }
        const raw = text.replace('/yangi_test', '').trim();
        const parts = raw.split('|').map(s => s.trim());
        if (parts.length < 6) {
          return await this.sendMessage(chatId,
            `ℹ️ <b>O'zingiz tuzgan maxsus testni kanalga tashlash tartibi:</b>\n\n` +
            `<code>/yangi_test Savol matni | A variant | B variant | C variant | D variant | 1 | Tushuntirish</code>\n\n` +
            `<i>Misol:</i>\n` +
            `<code>/yangi_test O'zbekiston Konstitutsiyasi nechanchi yilda qabul qilingan? | 1991 | 1992 | 1993 | 1994 | 2 | O'zbekiston Konstitutsiyasi 1992-yil 8-dekabrda qabul qilingan.</code>`
          );
        }
        const rawOpts = [parts[1], parts[2], parts[3], parts[4]].filter(Boolean);
        const formattedOpts = rawOpts.map((o) => {
          return (o || '').replace(/^[A-D][).:\s-]+/i, '').trim();
        });

        const customQ = {
          text: parts[0],
          options: formattedOpts,
          correctIndex: (parseInt(parts[5]) - 1) || 0,
          explanation: parts[6] || "",
          lawName: "Huquqiy Sinov"
        };
        await this.sendMessage(chatId, `⏳ Maxsus tuzilgan test kanal(lar)ga tashlanmoqda...`);
        return await this.postCustomQuizToChannels(chatId, customQ);
      }

      // /start yoki /test
      if (text.startsWith('/start') || text === '/test') {
        const refMatch = text.match(/^\/start\s+ref_(\d+)/i);
        if (refMatch) {
          const referrerId = refMatch[1];
          if (referrerId !== userId.toString()) {
            savePendingReferral(userId, referrerId);
          }
        }

        const subCheck = await this.checkAllSubscriptions(userId);
        if (!subCheck.ok) {
          return await this.sendSubscriptionGate(chatId, firstName);
        }
        await this.confirmReferralIfPending(userId, firstName);

        // Maxsus to'lov cheki parametri bilan kirganda (/start tolov_cheki yoki /start chek)
        if (text.includes('tolov_cheki') || text.includes('chek') || text.includes('tolov')) {
          return await this.sendMessage(chatId,
            `📩 <b>Assalomu alaykum, hurmatli ${firstName}!</b>\n` +
            `<i>"Huquq Milliy Sertifikat platformasida VIP obuna uchun to'lov qildim. Chekni taqdim etmoqdaman:"</i>\n\n` +
            `📸 <b>To'lov kvitansiyasining (Click / Payme) skrinshotini (rasmini) shu yerga yuboring!</b> 🖼\n\n` +
            `Rasm kelishi bilan zudlik bilan ma'muriyatimizga yetkaziladi va bir necha daqiqa ichida profilingizga <b>VIP PRO</b> to'liq ochib beriladi! ✅\n\n` +
            `<i>💳 Humo karta:</i> <code>9860 0366 7156 8792</code> <i>(Imomali Mamatqulov)</i>`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📲 Mini Appga qaytish", web_app: { url: this.appUrl } }],
                [{ text: "🏠 Asosiy Menyu", callback_data: "cmd_home" }]
              ]
            }
          });
        }

        return await this.sendMainMenu(chatId, firstName, false, userId);
      }

      // Majburiy a'zolik tekshiruvi boshqa barcha buyruqlar uchun
      const subCheck = await this.checkAllSubscriptions(userId);
      if (!subCheck.ok) {
        return await this.sendSubscriptionGate(chatId, firstName);
      }

      // Referal tizimi: 10 ta do'st = VIP Bepul
      if (text === "🎁 10 ta Do'st = VIP Bepul 👑" || text === "/ref" || text === "/referral" || text === "/dostlar") {
        return await this.sendReferralMenu(chatId, userId);
      }

      // Platformani ochish (Mini App)
      if (text.includes("Platformani ochish") || text.includes("Mini App") || text === "/app" || text === "/webapp") {
        return await this.sendMessage(chatId,
          `🚀 <b>Huquqshunoslik Milliy Sertifikat Platformasi (Mini App)</b>\n\n` +
          `Platformani Telegram ichida to'liq ekranda ochish uchun quyidagi tugmani bosing: 👇`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Platformani ochish (Mini App)", web_app: { url: this.appUrl } }],
              [
                { text: "🥊 Huquqiy Duel", web_app: { url: `${this.appUrl}#octagon` } },
                { text: "📜 40 ta Qonun Testi", web_app: { url: `${this.appUrl}#laws` } }
              ],
              [
                { text: "🎯 50 ta Variant", web_app: { url: `${this.appUrl}#variants` } },
                { text: "👤 Shaxsiy Profil", web_app: { url: `${this.appUrl}#profile` } }
              ]
            ]
          }
        });
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
          `• <b>10 ta shiddatli raund:</b> 800+ ta qonun savollari ichidan tasodifiy tushadi\n` +
          `• <b>Duel ballari:</b> Har bir to'g'ri zarba va g'alaba uchun ball beriladi\n` +
          `• <b>Alohida Duel Reytingi:</b> Ball to'plang va Oktagon chempioni unvoniga erishing!\n\n` +
          `Duelni boshlash uchun pastdagi tugmani bosing:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🥊 Oktagonga kirish (10 Raund Duel)", web_app: { url: `${this.appUrl}#octagon` } }],
              [{ text: "🏆 Duel Reytingini ko'rish", callback_data: "cmd_leaderboard_duel" }]
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

      // TABIIY MULOQOT & KICHIK SAVOLLAR (AI savol limitini bekorga yeb qo'ymaslik uchun)
      const cleanLower = text.toLowerCase().replace(/['`’‘]/g, '').trim();

      // Salomlashish
      if (['salom', 'assalomu alaykum', 'assalom alaykum', 'salom alaykum', 'qalaysiz', 'qalesiz', 'hayrli kun', 'privet'].includes(cleanLower)) {
        return await this.sendMessage(chatId,
          `⚖️ <b>Vaalaykum assalom, hurmatli ${firstName}!</b>\n\n` +
          `Huquqshunoslik fanidan Milliy Sertifikat (BMBA) tayyorlov tizimiga xush kelibsiz!\n\n` +
          `Sizga qanday yordam bera olaman? Quyidagi bo'limlardan birini tanlashingiz mumkin: 👇`, {
          reply_markup: this.getMainReplyKeyboard(isUserAdmin(userId))
        });
      }

      // Rahmat / Minnatdorchilik
      if (['rahmat', 'katta rahmat', 'tashakkur', 'raxmat', 'spasibo', 'salomat boling'].includes(cleanLower)) {
        return await this.sendMessage(chatId,
          `Arzimaydi, hurmatli ${firstName}! 😊 Sizga yordam bera olganimizdan mamnunmiz. Imtihonda eng yuqori A+ darajaga erishishingizga tilakdoshmiz! ⚖️`
        );
      }

      // Narxlar va Tariflar haqida so'rash
      if (cleanLower.includes('narx') || cleanLower.includes('qancha') || cleanLower.includes('tolov qanday') || cleanLower.includes('obuna narxi') || cleanLower === 'tarif') {
        return await this.sendTariffs(chatId);
      }

      // To'lov / Chek haqida gapirsa, skrinshot yuborishni so'rash
      if (cleanLower.includes('chek') || cleanLower.includes('toladim') || cleanLower.includes('pul otdim') || cleanLower.includes('otkazdim') || cleanLower.includes('tolov qildim')) {
        return await this.sendMessage(chatId,
          `💳 <b>Hurmatli ${firstName}!</b>\n\n` +
          `Agar to'lov qilgan bo'lsangiz, iltimos, <b>to'lov kvitansiyasining (cheki) skrinshotini</b> to'g'ridan-to'g'ri shu yerga <b>rasm ko'rinishida yuboring</b> 📸\n\n` +
          `Rasm kelishi bilan zudlik bilan adminga tasdiqlash uchun yuboriladi va profilingizga <b>VIP PRO</b> ochib beriladi! ✅\n\n` +
          `<i>Savollar bo'lsa adminga murojaat qiling: @Imomali_Mamatkulov</i>`
        );
      }

      // Agar foydalanuvchi juda qisqa yoki noaniq matn yozsa
      if (cleanLower.length < 3) {
        return await this.sendMessage(chatId,
          `Hurmatli ${firstName}, savolingizni to'liqroq yozing yoki pastdagi menyudan kerakli bo'limni tanlang: 👇`, {
          reply_markup: this.getMainReplyKeyboard(isUserAdmin(userId))
        });
      }

      // AI Ustozga savol berish (VIP foydalanuvchilarda CHEKSIZ, bepulda 2 ta limit)
      const allUsers = safeRead('users.json', []);
      const curUser = allUsers.find(u => (u.tgId && u.tgId.toString() === userId.toString()) || (u.id && u.id.toString() === `TG-${userId}`));
      const approvedVips = safeRead('approved_vip_users.json', []).map(String);
      const isVipUser = isUserAdmin(userId) || approvedVips.includes(userId.toString()) || (curUser && (curUser.isVip || curUser.plan === 'VIP PRO' || curUser.plan === 'tariff_vip'));

      const used = botUserAiCounts[userId] || 0;
      if (!isVipUser && used >= 2) {
        return await this.sendMessage(chatId,
          `⚠️ <b>Hurmatli ${firstName}! Siz 2 ta bepul AI Ustoz savol limitidan to'liq foydalandingiz.</b>\n\n` +
          `Cheksiz va tezkor savol-javoblar uchun <b>VIP PRO</b> tarifiga ulaning! 👑\n` +
          `<i>Yoki 10 ta do'stingizni taklif qilib, VIP PRO ni mutlaqo bepul qo'lga kiriting!</i>`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👑 VIP PRO Tarifiga Ulanish", callback_data: "cmd_tariffs" }],
              [{ text: "🎁 10 ta Do'st = VIP Bepul", callback_data: "cmd_referral" }],
              [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
            ]
          }
        });
      }

      await this.callApi('sendChatAction', { chat_id: chatId, action: 'typing' });
      const aiRes = await askAiTutor(text);

      let limitNote = "";
      if (isVipUser) {
        limitNote = `\n\n<i>(👑 VIP PRO a'zosi — Cheksiz AI maslahat)</i>`;
      } else {
        botUserAiCounts[userId] = used + 1;
        const remaining = 2 - botUserAiCounts[userId];
        limitNote = remaining > 0
          ? `\n\n<i>(💡 Sizda yana ${remaining} ta bepul savol imkoniyati qoldi)</i>`
          : `\n\n<i>(⚠️ 2 ta bepul savol limitingiz tugadi. Cheksiz savol-javob uchun VIP PRO ga o'ting!)</i>`;
      }

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
      const chatId = q.message?.chat?.id;
      const userId = q.from?.id || chatId;
      const firstName = q.from?.first_name || "O'quvchi";

      recordUser(q.from);

      // Kanallardagi test javoblari (🔹 A, 🔹 B, 🔹 C, 🔹 D)
      if (q.data && q.data.startsWith('ch_ans_')) {
        const parts = q.data.split('_');
        // Format: ch_ans_<testNum>_<selectedIdx>_<correctIdx>
        const testNum = parts[2];
        const selectedIdx = parseInt(parts[3]);
        const correctIdx = parseInt(parts[4]);

        const letters = ['A', 'B', 'C', 'D'];
        const selectedLetter = letters[selectedIdx] || 'A';
        const correctLetter = letters[correctIdx] || 'A';

        const quizCache = safeRead('posted_channel_quizzes.json', {});
        const savedQuiz = quizCache[testNum];

        let alertText = "";
        if (selectedIdx === correctIdx) {
          alertText = `✅ TO'G'RI JAVOB (${selectedLetter})! 🎉\n\n`;
          if (savedQuiz && savedQuiz.explanation) {
            alertText += `💡 ${savedQuiz.explanation}\n\n`;
          }
          alertText += `👉 Qolgan barcha 40 ta qonun testlarini @HuquqdanSertifikatBot da yeching!`;
        } else {
          alertText = `❌ NOTO'G'RI! Siz ${selectedLetter} ni tanladingiz.\n\n`;
          alertText += `✅ To'g'ri javob: ${correctLetter})\n\n`;
          if (savedQuiz && savedQuiz.explanation) {
            alertText += `💡 ${savedQuiz.explanation}\n\n`;
          }
          alertText += `👉 To'liq tahlil va duel @HuquqdanSertifikatBot da!`;
        }

        if (alertText.length > 195) {
          alertText = alertText.substring(0, 192) + '...';
        }

        return await this.answerCallbackQuery(q.id, alertText, true);
      }

      if (q.data === 'check_subscription') {
        const subCheck = await this.checkAllSubscriptions(userId);
        if (subCheck.ok) {
          await this.answerCallbackQuery(q.id, "✅ Ikkala kanalga a'zoligingiz muvaffaqiyatli tasdiqlandi!");
          await this.confirmReferralIfPending(userId, firstName);
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
      } else if (q.data === 'cmd_referral' || q.data === 'refresh_referral') {
        await this.answerCallbackQuery(q.id);
        await this.sendReferralMenu(chatId, userId);
      } else if (q.data === 'cmd_leaderboard' || q.data === 'cmd_leaderboard_exam') {
        await this.answerCallbackQuery(q.id);
        await this.sendLeaderboard(chatId, 'exam');
      } else if (q.data === 'cmd_leaderboard_duel') {
        await this.answerCallbackQuery(q.id);
        await this.sendLeaderboard(chatId, 'duel');
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
      } else if (q.data && q.data.startsWith('approve_receipt_')) {
        const rId = q.data.replace('approve_receipt_', '');
        await this.answerCallbackQuery(q.id, "✅ To'lov tasdiqlanmoqda...");
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, "🔒 Faqat adminlar to'lovni tasdiqlashi mumkin.");
        }

        const receipts = safeRead('receipts.json', []);
        const receipt = receipts.find(r => r.id === rId);
        if (!receipt) {
          return await this.sendMessage(chatId, `⚠️ Chek topilmadi (${rId}).`);
        }

        receipt.status = 'approved';
        receipt.approvedBy = userId;
        receipt.approvedAt = new Date().toISOString();
        safeWrite('receipts.json', receipts);

        // Foydalanuvchini bazada VIP qilish
        const users = safeRead('users.json', []);
        const targetUserIdStr = (receipt.userId || '').toString().trim();
        let targetUser = users.find(u => 
          (u.tgId && u.tgId.toString() === targetUserIdStr) ||
          (u.id && u.id.toString() === `TG-${targetUserIdStr}`) ||
          (u.id && u.id.toString() === targetUserIdStr)
        );

        if (targetUser) {
          targetUser.isVip = true;
          targetUser.plan = "tariff_vip";
          targetUser.vipUnlockedVia = "payment_approved";
          targetUser.vipApprovedAt = new Date().toISOString();
        } else if (targetUserIdStr) {
          targetUser = {
            id: `TG-${targetUserIdStr}`,
            tgId: parseInt(targetUserIdStr) || targetUserIdStr,
            name: receipt.userName || "O'quvchi",
            username: receipt.userUsername || null,
            role: "Abituriyent",
            plan: "tariff_vip",
            isVip: true,
            vipUnlockedVia: "payment_approved",
            registeredAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            referrals: []
          };
          users.push(targetUser);
        }
        safeWrite('users.json', users);

        const cleanUserId = targetUserIdStr.replace(/^TG-/, '');
        if (cleanUserId) {
          const approvedVips = safeRead('approved_vip_users.json', []);
          if (!approvedVips.map(String).includes(cleanUserId)) {
            approvedVips.push(cleanUserId);
            safeWrite('approved_vip_users.json', approvedVips);
          }
        }

        // Foydalanuvchiga Telegramda chiroyli tasdiq xabari yuborish
        const targetChatId = receipt.chatId || receipt.userId;
        const cleanBaseUrl = this.appUrl.replace(/\/+$/, '');
        const vipAppUrl = `${cleanBaseUrl}/?vip=true&uid=${cleanUserId || targetUserIdStr || ''}`;

        if (targetChatId) {
          try {
            await this.sendMessage(targetChatId,
              `🎉 <b>TABRIKLAYMIZ! TO'LOVINGIZ TASDIQLANDI!</b> 👑\n\n` +
              `Hurmatli <b>${escapeHtml(receipt.userName || "O'quvchi")}</b>, to'lov chekingiz admin tomonidan tekshirilib, tasdiqlandi!\n\n` +
              `🌟 <b>Sizga VIP PRO tarifi to'liq faollashtirildi:</b>\n` +
              `• 📜 Barcha 40 ta Qonunchilik testlari (800 ta test) ochiq!\n` +
              `• 🎯 50 ta to'liq rasmiy BMBA imtihon variantlari ochiq!\n` +
              `• 🤖 AI Yuridik Ustoz bilan cheksiz muloqot!\n` +
              `• 🥊 Huquqiy Octagon cheksiz janglari!\n` +
              `• 🎓 Rasmiy elektron sertifikatlar generatsiyasi!\n\n` +
              `<i>Quyidagi tugmani bosing va platformani VIP PRO rejimida oching:</i> 👇`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🚀 Platformani ochish (VIP PRO Faol)", web_app: { url: vipAppUrl } }]
                ]
              }
            });
          } catch (notifErr) {
            console.error("Foydalanuvchiga tasdiq xabari yuborishda xato:", notifErr.message);
          }
        }

        // Admin xabarini yangilash
        try {
          if (q.message?.caption) {
            await this.editMessageCaption(chatId, q.message.message_id,
              `${q.message.caption}\n\n✅ <b>TASDIQLANDI: VIP PRO BERILDI! (${new Date().toLocaleTimeString('uz-UZ')})</b>`
            );
          } else if (q.message?.text) {
            await this.editMessageText(chatId, q.message.message_id,
              `${q.message.text}\n\n✅ <b>TASDIQLANDI: VIP PRO BERILDI! (${new Date().toLocaleTimeString('uz-UZ')})</b>`
            );
          }
        } catch (e) {}

      } else if (q.data && q.data.startsWith('approve_book_')) {
        // q.data format: approve_book_<bookId>_<receiptId>
        const parts = q.data.replace('approve_book_', '').split('_');
        const bookId = parts[0];
        const rId = parts.slice(1).join('_');

        await this.answerCallbackQuery(q.id, "✅ Kitob yuborilmoqda...");
        if (!isUserAdmin(userId)) {
          return await this.sendMessage(chatId, "🔒 Faqat adminlar to'lovni tasdiqlashi mumkin.");
        }

        const receipts = safeRead('receipts.json', []);
        const receipt = receipts.find(r => r.id === rId);
        if (!receipt) {
          return await this.sendMessage(chatId, `⚠️ Chek topilmadi (${rId}).`);
        }

        receipt.status = 'approved';
        receipt.approvedBy = userId;
        receipt.approvedAt = new Date().toISOString();
        safeWrite('receipts.json', receipts);

        const targetUserIdStr = (receipt.userId || '').toString().trim();
        const targetChatId = receipt.chatId || receipt.userId;

        // Kitob faylini aniqlash
        let bookFileName = 'HUQUQSHUNOSLIK_MILLIY_SERTIFIKAT_30_VARIANT.pdf';
        let bookTitleName = "Huquqshunoslik Milliy Sertifikat | 30 ta Professional Variant";
        if (bookId === '2') {
          bookFileName = 'kitob_natija.pdf';
          bookTitleName = "Huquqshunoslik Fanidan Milliy Test Tizimi To'plami & Yechimlar";
        }

        const cleanBaseUrl = this.appUrl.replace(/\/+$/, '');
        const miniAppBookUrl = `${cleanBaseUrl}/?purchased_book=${bookId}&uid=${targetUserIdStr || ''}`;

        // Xaridorga tabrik va PDF kitobni yuborish
        if (targetChatId) {
          try {
            await this.sendMessage(targetChatId,
              `🎉 <b>TABRIKLAYMIZ! KITOB TO'LOVINGIZ TASDIQLANDI!</b> 📚\n\n` +
              `Hurmatli <b>${escapeHtml(receipt.userName || "O'quvchi")}</b>, to'lov chekingiz admin tomonidan tekshirilib tasdiqlandi!\n\n` +
              `📖 <b>Kitob:</b> ${escapeHtml(bookTitleName)}\n` +
              `💰 <b>To'langan summa:</b> 80 000 UZS\n\n` +
              `<i>Quyida siz sotib olgan kitobning rasmiy elektron PDF fayli yuklanmoqda... Marhamat, yuklab oling!</i> 👇`
            );

            // PDF faylni to'g'ridan-to'g'ri Telegram chatga yuborish
            const pdfPath = path.join(__dirname, 'public', 'books', bookFileName);
            const caption = `📘 <b>${escapeHtml(bookTitleName)}</b>\n\nMuallif: Imomali Mamatqulov\nFormat: PDF (To'liq nashr)`;
            
            await this.sendLocalDocument(targetChatId, pdfPath, caption, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📱 Mini Appda ochish", web_app: { url: miniAppBookUrl } }]
                ]
              }
            });
          } catch (sendBookErr) {
            console.error("Xaridorga kitob yuborishda xato:", sendBookErr.message);
          }
        }

        // Admin xabarini yangilash
        try {
          if (q.message?.caption) {
            await this.editMessageCaption(chatId, q.message.message_id,
              `${q.message.caption}\n\n✅ <b>TASDIQLANDI: Xaridorga PDF kitob yuborildi! (${new Date().toLocaleTimeString('uz-UZ')})</b>`
            );
          } else if (q.message?.text) {
            await this.editMessageText(chatId, q.message.message_id,
              `${q.message.text}\n\n✅ <b>TASDIQLANDI: Xaridorga PDF kitob yuborildi! (${new Date().toLocaleTimeString('uz-UZ')})</b>`
            );
          }
        } catch (adminEditErr) {
          console.error("Admin xabarini tahrirlashda xato:", adminEditErr.message);
        }

      } else if (q.data && q.data.startsWith('reject_receipt_')) {
        const rId = q.data.replace('reject_receipt_', '');
        await this.answerCallbackQuery(q.id, "❌ To'lov rad etildi.");
        if (!isUserAdmin(userId)) return;

        const receipts = safeRead('receipts.json', []);
        const receipt = receipts.find(r => r.id === rId);
        if (receipt) {
          receipt.status = 'rejected';
          receipt.rejectedBy = userId;
          receipt.rejectedAt = new Date().toISOString();
          safeWrite('receipts.json', receipts);

          const targetChatId = receipt.chatId || receipt.userId;
          if (targetChatId) {
            try {
              await this.sendMessage(targetChatId,
                `⚠️ <b>Hurmatli ${escapeHtml(receipt.userName || "Foydalanuvchi")}!</b>\n\n` +
                `Siz yuborgan to'lov cheki ma'muriyat tomonidan tasdiqlanmadi (chek noaniq yoki to'lov kelib tushmagan).\n\n` +
                `Iltimos, to'lov skrinshotini qayta tekshirib yuboring yoki adminga murojaat qiling: @Imomali_Mamatkulov`, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Imomali_Mamatkulov" }]
                  ]
                }
              });
            } catch (e) {}
          }

          try {
            if (q.message?.caption) {
              await this.editMessageCaption(chatId, q.message.message_id,
                `${q.message.caption}\n\n❌ <b>RAD ETILDI (${new Date().toLocaleTimeString('uz-UZ')})</b>`
              );
            } else if (q.message?.text) {
              await this.editMessageText(chatId, q.message.message_id,
                `${q.message.text}\n\n❌ <b>RAD ETILDI (${new Date().toLocaleTimeString('uz-UZ')})</b>`
              );
            }
          } catch (e) {}
        }
      } else if (q.data === 'admin_send_reminders') {
        await this.answerCallbackQuery(q.id, "Eslatmalar yuborilmoqda...");
        if (!isUserAdmin(userId)) return;
        await this.sendMessage(chatId, `⏳ O'quvchilarga motivatsion eslatmalar yuborilmoqda, biroz kuting...`);
        await this.sendDailyRetentionReminders(chatId);
      } else if (q.data === 'autopost_menu') {
        await this.answerCallbackQuery(q.id);
        if (!isUserAdmin(userId)) return;
        await this.sendAutopostMenu(chatId);
      } else if (q.data === 'autopost_toggle') {
        if (!isUserAdmin(userId)) return;
        const s = safeRead('autopost_settings.json', { enabled: true, intervalHours: 2 });
        s.enabled = !s.enabled;
        safeWrite('autopost_settings.json', s);
        await this.answerCallbackQuery(q.id, s.enabled ? "🟢 Avto-test tizimi yoqildi!" : "🔴 Avto-test tizimi to'xtatildi!");
        await this.sendAutopostMenu(chatId);
      } else if (q.data.startsWith('autopost_interval_')) {
        if (!isUserAdmin(userId)) return;
        const h = parseInt(q.data.replace('autopost_interval_', '')) || 2;
        const s = safeRead('autopost_settings.json', { enabled: true, intervalHours: 2 });
        s.intervalHours = h;
        safeWrite('autopost_settings.json', s);
        await this.answerCallbackQuery(q.id, `⏱ Interval har ${h} soatga sozlandi!`);
        await this.sendAutopostMenu(chatId);
      } else if (q.data === 'autopost_chan_both') {
        if (!isUserAdmin(userId)) return;
        const s = safeRead('autopost_settings.json', {});
        s.targetChannels = ["@Huquq_study", "@General_Huquq"];
        safeWrite('autopost_settings.json', s);
        await this.answerCallbackQuery(q.id, "✅ Ikkala kanal tanlandi!");
        await this.sendAutopostMenu(chatId);
      } else if (q.data === 'autopost_chan_1') {
        if (!isUserAdmin(userId)) return;
        const s = safeRead('autopost_settings.json', {});
        s.targetChannels = ["@Huquq_study"];
        safeWrite('autopost_settings.json', s);
        await this.answerCallbackQuery(q.id, "✅ Faqat @Huquq_study tanlandi!");
        await this.sendAutopostMenu(chatId);
      } else if (q.data === 'autopost_chan_2') {
        if (!isUserAdmin(userId)) return;
        const s = safeRead('autopost_settings.json', {});
        s.targetChannels = ["@General_Huquq"];
        safeWrite('autopost_settings.json', s);
        await this.answerCallbackQuery(q.id, "✅ Faqat @General_Huquq tanlandi!");
        await this.sendAutopostMenu(chatId);
      } else if (q.data === 'autopost_send_now' || q.data === 'admin_post_quiz') {
        await this.answerCallbackQuery(q.id, "Test kanalga tashlanmoqda...");
        if (!isUserAdmin(userId)) return;
        await this.postNextQuizToChannel(chatId, true);
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

module.exports = { initBot, getBotInstance, SimpleTelegramBot, getAdminIds, isUserAdmin };
