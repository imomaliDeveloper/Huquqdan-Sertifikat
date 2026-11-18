require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { askAiTutor } = require('./scripts/aiService');

const botUserAiCounts = {};

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5000';
const channelId = process.env.TELEGRAM_CHANNEL_ID || '@Huquq_study'; // Asosiy kanal

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
      parse_mode: options.parse_mode || 'Markdown',
      reply_markup: options.reply_markup
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

  // Foydalanuvchining kanalga a'zoligini tekshirish (getChatMember)
  async checkUserSubscription(userId, channel = '@Huquq_study') {
    if (!this.token || this.token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      return true; // Token bo'lmagan lokal rejimda ruxsat berish
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

      console.warn(`[getChatMember] ${channel} javobi:`, res.description || res.error);
      return false;
    } catch (err) {
      console.error('checkUserSubscription error:', err.message);
      return false;
    }
  }

  // Majburiy a'zolik talab qilinadigan xabar
  async sendSubscriptionGate(chatId, firstName = "O'quvchi") {
    const text = `Assalomu alaykum, *${firstName}*! ⚖️\n\n` +
      `⚠️ *Botdan to'liq foydalanish uchun rasmiy kanalimizga a'zo bo'ling!*\n\n` +
      `Platformadagi 50 ta BMBA varianti, 25 ta vaziyatli keys, xatolar tahlili va *Huquqiy Octagon (Duel)* janglaridan to'liq foydalanish uchun rasmiy kanalimizga obuna bo'lishingiz lozim.\n\n` +
      `📢 Asosiy o'quv kanali: *@Huquq_study*\n` +
      `_(Har kuni yangi testlar, rasmiy qonunlar tahlili va sertifikat yangiliklari!)_\n\n` +
      `👇 Kanalga a'zo bo'lib, quyidagi *"✅ A'zolikni tekshirish"* tugmasini bosing:`;

    const keyboard = [
      [{ text: "📢 1. @Huquq_study kanaliga a'zo bo'lish ↗️", url: "https://t.me/Huquq_study" }],
      [{ text: "📢 2. @huquqiyaxborot (Adliya vazirligi) ↗️", url: "https://t.me/huquqiyaxborot" }],
      [{ text: "✅ A'zolikni tekshirish", callback_data: "check_subscription" }],
      [{ text: "📚 Barcha tavsiya etiladigan kanallar", callback_data: "cmd_all_channels" }]
    ];

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Asosiy menyu
  async sendMainMenu(chatId, firstName = "O'quvchi", isNewVerification = false) {
    let welcome = isNewVerification
      ? `🎉 *A'zoligingiz muvaffaqiyatli tasdiqlandi, ${firstName}!* ⚖️\n\n`
      : `Assalomu alaykum, *${firstName}*! ⚖️\n\n`;

    welcome += `*Huquqshunoslik fanidan Milliy Sertifikat (BMBA)* tayyorgarlik platformasiga xush kelibsiz!\n\n` +
      `🎯 *Tizim imkoniyatlari:*\n` +
      `• *50 ta to'liq rasmiy test varianti* (T-760 va yangi format)\n` +
      `• *25 ta vaziyatli keyslar banki* (Y-2 topshiriqlari)\n` +
      `• *🥊 Huquqiy Octagon:* 1v1 jonli duel jang rejimi\n` +
      `• *Mening xatolarim:* Xatolar ustida AI bilan ishlash\n` +
      `• *Rasmiy BMBA sertifikati:* A+, A, B+ sertifikati va QR kod\n` +
      `• *40 ta qonun & 4 ta yangi maktab darsligi*\n\n` +
      `Quyidagi tugmani bosing va Telegram ichida testni boshlang:`;

    const keyboard = [
      [{ text: "🎯 Testni boshlash (Mini App)", web_app: { url: this.appUrl } }],
      [
        { text: "🥊 Huquqiy Octagon (Duel)", web_app: { url: `${this.appUrl}#octagon` } },
        { text: "📋 25 ta Keys (Y-2)", web_app: { url: `${this.appUrl}#cases` } }
      ],
      [
        { text: "📚 40 ta Qonun kutubxonasi", callback_data: "cmd_laws" },
        { text: "⏱ Muddatlar Flashcards", callback_data: "cmd_flashcards" }
      ],
      [
        { text: "📢 Barcha foydali huquqiy kanallar", callback_data: "cmd_all_channels" }
      ]
    ];

    return await this.sendMessage(chatId, welcome, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Barcha kanallar ro'yxatini yuborish
  async sendAllChannels(chatId) {
    const channelsPath = path.join(__dirname, 'data', 'channels.json');
    let channels = [];
    if (fs.existsSync(channelsPath)) {
      try { channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8')); } catch (e) {}
    }

    let text = `🏛️ *Tavsiya etiladigan rasmiy va o'quv huquqiy kanallar:*\n\n`;
    const keyboard = [];

    channels.forEach((ch, idx) => {
      text += `*${idx + 1}. ${ch.name}* (${ch.username})\n` +
        `• Yo'nalish: _${ch.category}_\n` +
        `• Obunachilar: *${ch.subscribers}* ${ch.verified ? '✅' : ''}\n` +
        `• Tavsif: ${ch.description}\n\n`;

      keyboard.push([{ text: `🔗 ${ch.name} ga o'tish`, url: ch.url }]);
    });

    text += `Pastdagi tugmalar orqali to'g'ridan-to'g'ri kanalga obuna bo'lishingiz mumkin 👇`;
    keyboard.push([{ text: "🏠 Asosiy menyu", callback_data: "cmd_home" }]);

    return await this.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Telegram Kanalga Rasmiy Quiz/Viktorina tashlash
  async sendQuizToChannel(quizData, targetChatId = null) {
    const target = targetChatId || this.channelId;
    if (!target) {
      return { ok: false, error: "Kanal ID sozlanmagan" };
    }

    let qText = quizData.text;
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
      correct_option_id: quizData.correctIndex,
      explanation: explanation,
      explanation_parse_mode: 'Markdown'
    });

    if (pollRes.ok) {
      await this.sendMessage(target, `💡 *Huquqshunoslik Milliy Test Tizimi*\nYuqoridagi savolni yechib, bilimingizni tekshiring!\n\nTo'liq 45 talik yangi variantlarni yechish uchun pastdagi ilovani oching 👇`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📲 Mini Appda 45 talik testni yechish", web_app: { url: this.appUrl } }]
          ]
        }
      });
    }

    return pollRes;
  }

  async postNextQuizToChannel(chatNotifyId = null) {
    try {
      const bankPath = path.join(__dirname, 'data', 'questions_bank.json');
      const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
      if (!questions.length) return;

      const q = questions[this.lastPostedIndex % questions.length];
      this.lastPostedIndex++;

      const res = await this.sendQuizToChannel(q);
      if (res.ok) {
        console.log(`✅ Kanalga test tashlandi: [${q.id}] ${q.text.substring(0, 40)}...`);
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, `✅ Kanalga muvaffaqiyatli test tashlandi!`);
        }
      } else {
        console.error('Kanalga tashlashda xatolik:', res);
        if (chatNotifyId) {
          await this.sendMessage(chatNotifyId, `⚠️ Xatolik: ${res.description || res.error}`);
        }
      }
    } catch (err) {
      console.error('postNextQuizToChannel xatolik:', err);
    }
  }

  startAutoPosting(intervalHours = 3) {
    if (this.autoPostTimer) clearInterval(this.autoPostTimer);
    const ms = intervalHours * 60 * 60 * 1000;
    this.autoPostTimer = setInterval(() => {
      this.postNextQuizToChannel();
    }, ms);
    console.log(`⏰ Avtoposting yoqildi: har ${intervalHours} soatda kanalga test tashlanadi.`);
  }

  stopAutoPosting() {
    if (this.autoPostTimer) {
      clearInterval(this.autoPostTimer);
      this.autoPostTimer = null;
      console.log('🛑 Avtoposting to\'xtatildi.');
    }
  }

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

  async handleUpdate(update) {
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const userId = msg.from?.id || chatId;
      const text = msg.text || '';
      const firstName = msg.from?.first_name || "O'quvchi";

      // Mini App dan kelgan natija (web_app_data)
      if (msg.web_app_data) {
        try {
          const data = JSON.parse(msg.web_app_data.data);
          if (data.action === 'test_completed') {
            const resultMsg = `🎉 *Tabriklaymiz, ${firstName}!* Siz Huquq Milliy Testini yakunladingiz.\n\n` +
              `📊 *Natijangiz:*\n` +
              `• To'plangan ball: *${data.score} / ${data.total}*\n` +
              `• Foiz: *${data.percent}*\n` +
              `• BMBA Darajangiz: *${data.level}*\n\n` +
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

      // /start yoki /test
      if (text.startsWith('/start') || text === '/test') {
        const isSubscribed = await this.checkUserSubscription(userId, '@Huquq_study');
        if (!isSubscribed) {
          return await this.sendSubscriptionGate(chatId, firstName);
        }
        return await this.sendMainMenu(chatId, firstName);
      } else if (text === '/channels') {
        return await this.sendAllChannels(chatId);
      } else if (text === '/post_quiz') {
        await this.postNextQuizToChannel(chatId);
      } else if (text.trim()) {
        const isSubscribed = await this.checkUserSubscription(userId, '@Huquq_study');
        if (!isSubscribed) {
          return await this.sendSubscriptionGate(chatId, firstName);
        }

        const used = botUserAiCounts[userId] || 0;
        if (used >= 2) {
          return await this.sendMessage(chatId,
            `⚠️ *Hurmatli ${firstName}! Siz 2 ta bepul AI Ustoz savol limitidan to'liq foydalandingiz.*\n\n` +
            `Cheksiz va to'liq savol-javoblar uchun Mini App orqali *VIP PRO* tarifiga ulaning! 🚀`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "👑 VIP PRO Tarifiga Ulanish", web_app: { url: this.appUrl } }],
                [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
              ]
            }
          });
        }

        // AI Ustoz - Har qanday savolga aqlli, to'liq va tushunarli javob beradi
        await this.callApi('sendChatAction', { chat_id: chatId, action: 'typing' });
        const aiRes = await askAiTutor(text.trim());
        botUserAiCounts[userId] = used + 1;
        const remaining = 2 - botUserAiCounts[userId];
        const limitNote = remaining > 0 
          ? `\n\n_(💡 Sizda yana ${remaining} ta bepul savol imkoniyati qoldi)_` 
          : `\n\n_(⚠️ 2 ta bepul savol limitingiz tugadi. Cheksiz foydalanish uchun VIP PRO ga o'ting!)_`;

        const replyText = `🤖 *AI Ustoz:*\n\n${aiRes.reply}${limitNote}`;

        try {
          await this.sendMessage(chatId, replyText, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📲 Mini Appni ochish", web_app: { url: this.appUrl } }],
                [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
              ]
            }
          });
        } catch (e) {
          await this.callApi('sendMessage', {
            chat_id: chatId,
            text: `🤖 AI Ustoz:\n\n${aiRes.reply}`,
            reply_markup: {
              inline_keyboard: [
                [{ text: "📲 Mini Appni ochish", web_app: { url: this.appUrl } }],
                [{ text: "🔙 Asosiy Menyu", callback_data: "cmd_home" }]
              ]
            }
          });
        }
      }
    } else if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message.chat.id;
      const userId = q.from?.id || chatId;
      const firstName = q.from?.first_name || "O'quvchi";

      if (q.data === 'check_subscription') {
        const isSubscribed = await this.checkUserSubscription(userId, '@Huquq_study');
        if (isSubscribed) {
          await this.answerCallbackQuery(q.id, "✅ A'zoligingiz tasdiqlandi!");
          await this.sendMainMenu(chatId, firstName, true);
        } else {
          await this.answerCallbackQuery(
            q.id,
            "❌ Siz hali @Huquq_study kanaliga a'zo bo'lmadingiz! Iltimos, avval kanalga obuna bo'ling va so'ng tekshiring.",
            true
          );
        }
      } else if (q.data === 'cmd_all_channels') {
        await this.answerCallbackQuery(q.id);
        await this.sendAllChannels(chatId);
      } else if (q.data === 'cmd_home') {
        await this.answerCallbackQuery(q.id);
        await this.sendMainMenu(chatId, firstName);
      } else if (q.data === 'cmd_post_quiz') {
        await this.answerCallbackQuery(q.id);
        await this.postNextQuizToChannel(chatId);
      } else if (q.data === 'cmd_laws' || q.data === 'cmd_flashcards') {
        await this.answerCallbackQuery(q.id);
        await this.sendMessage(chatId, "Barcha materiallar va interaktiv trenajyor Mini App ichida joylashgan:", {
          reply_markup: {
            inline_keyboard: [[{ text: "📲 Mini Appni ochish", web_app: { url: this.appUrl } }]]
          }
        });
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

  // Faqat lokal yoki VPS da polling yoqiladi, Vercel Serverless da webhook ishlatiladi
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

module.exports = { initBot, getBotInstance };