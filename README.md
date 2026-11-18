# ⚖️ Huquq Milliy Sertifikat (BMBA) - Telegram Mini App & Bot Platformasi

O‘zbekiston Respublikasi Vazirlar Mahkamasining tegishli qarorlari va BMBA tomonidan tasdiqlangan **Huquqshunoslik fanidan milliy test tizimi tafsiloti** asosida ishlab chiqilgan to‘liq interaktiv imtihon va trenajyor platformasi.

---

## 🎯 Loyiha Imkoniyatlari

1. **Katta Mock Test (T-760 Namunaviy varianti):**
   * **1–32 (Y-1):** Yopiq testlar (nazariya, Konstitutsiya, Eyler-Venn diagrammalari, atamalar).
   * **33–35 (Y-2):** "Texno-Line" MChJ mehnat nizosi bo‘yicha amaliy vaziyatli keys.
   * **36–45 (O):** Qisqa javobli ochiq savollar (muddatlar, foizlar, jarima soatlari va huquqiy atamalarni kiritish).
2. **Jonli Taymer va Navigatsiya:**
   * 90 daqiqalik real vaqt teskari hisoblagichi.
   * 1 dan 45 gacha bo‘lgan savollar matritsasi (Matrix modal).
   * Savollarni xatcho'pga qo'shish (Bookmark).
3. **Muddatlar va Foizlar Trenajyori (Flashcards):**
   * Ochiq savollarda eng ko‘p uchraydigan 20+ muhim muddatlar, jarima va staj mezonlari.
4. **40 ta Qonunchilik Hujjati Katalogi:**
   * Spesifikatsiyaga kiritilgan barcha 40 ta normativ-huquqiy hujjat va ularning to‘g‘ridan-to‘g‘ri **Lex.uz** rasmiy sahifalariga havolalari.
5. **Natijalar va Tahlil:**
   * Ball, foiz va BMBA darajasi (A+, A, B+, B, C).
   * Har bir savol bo‘yicha to‘g‘ri javob va qonuniy asoslar sharhi.
   * Natijani to‘g‘ridan-to‘g‘ri Telegram botga uzatish.

---

## 🚀 Ishga Tushirish Qo‘llanmasi

### 1. Bog'liqliklarni o‘rnatish:
Loyihada Node.js ishlatiladi. Terminalda quyidagini bajaring:
```bash
npm install
```

### 2. Lokal Brauzerda Ishga Tushirish (Bot tokensiz ham to‘liq ishlaydi):
```bash
node server.js
```
Brauzerda oching: [http://localhost:5000](http://localhost:5000)

### 3. Telegram Bot va Mini App sifatida ulash:
1. Telegramda [@BotFather](https://t.me/BotFather) ga kiring va yangi bot yarating (`/newbot`).
2. Berilgan tokenni `.env` fayliga yozing:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCDEF...
   WEB_APP_URL=https://your-domain.ngrok-free.app
   ```
3. Lokal serveringizni tashqi internetga ochish uchun (masalan ngrok yordamida):
   ```bash
   npx ngrok http 5000
   ```
4. Hosil bo‘lgan `https://...ngrok-free.app` manzilini:
   * `.env` faylidagi `WEB_APP_URL` ga qo‘ying.
   * Yoki `@BotFather` da `/newapp` buyrug‘i orqali botingiz menyusiga to‘g‘ridan-to‘g‘ri Menu Button qilib biriktiring.
5. Serverni qayta ishga tushiring:
   ```bash
   node server.js
   ```

---

## 📁 Loyiha Strukturasi

```
HuquqMIlliySertifikat/
├── data/
│   └── laws_list.json       # 40 ta qonunning to'liq ro'yxati va Lex.uz linklari
├── public/
│   ├── index.html           # Telegram Mini App interfeysi (Tailwind CSS)
│   └── js/
│       ├── exam_data.js     # BMBA T-760 varianti (45 ta savol, kalitlar, sharhlar)
│       ├── flashcards.js    # Muddatlar, foizlar va jarimalar trenajyori
│       └── app.js           # Telegram WebApp mantiqi, taymer, ball hisoblash
├── bot.js                   # Telegram Bot mantiqi
├── server.js                # Express veb-server va API
├── package.json
└── README.md
```
