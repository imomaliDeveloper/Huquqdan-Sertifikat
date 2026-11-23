const fs = require('fs');
const path = require('path');
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
  console.warn('⚠️ GEMINI_API_KEY topilmadi, AI funksiyalari bilim bazasi rejimida ishlaydi.');
}

// Eng barqaror va tezkor (1-2 soniyada javob beruvchi) model
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite'
];

function withTimeout(promise, ms = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`AI javob vaqti tugadi (${ms}ms)`)), ms))
  ]);
}

async function generateAiContent({ prompt, systemInstruction, responseMimeType }) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY topilmadi yoki ulanmagan.');
  }

  for (const model of CANDIDATE_MODELS) {
    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;

    try {
      const callPromise = genAI.models.generateContent({
        model,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      // 3.5 soniya qat'iy timeout (Vercel va Telegram hech qachon qotib qolmaydi)
      const response = await withTimeout(callPromise, 3500);

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      // Vaqtinchalik 503 xatosi bo'lsa, 400ms kutib bir marta tezkor qayta urinish
      if (err.status === 503 || (err.message && err.message.includes('503'))) {
        try {
          await new Promise(r => setTimeout(r, 400));
          const retryRes = await withTimeout(genAI.models.generateContent({
            model,
            contents: prompt,
            config: Object.keys(config).length > 0 ? config : undefined
          }), 3000);
          if (retryRes && retryRes.text) return retryRes.text;
        } catch (e2) {}
      }
      break;
    }
  }

  throw new Error('AI API javob bera olmadi.');
}

// ==================== BMBA SAVOLLARINI XOTIRAGA YUKLASH VA QIDIRUV ====================
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
  } catch (err) {
    console.warn('BMBA savollarini yuklashda xatolik:', err.message);
  }
  bmbaQuestionsCache = questions;
  return questions;
}

function searchBmbaQuestions(query, limit = 2) {
  const all = loadBmbaQuestions();
  if (!all.length) return [];
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return [];

  const scored = all.map(q => {
    let score = 0;
    const textLower = (q.text || '').toLowerCase();
    const expLower = (q.explanation || '').toLowerCase();
    const lawLower = (q.lawSource || '').toLowerCase();
    const secLower = (q.section || '').toLowerCase();

    for (const w of words) {
      if (textLower.includes(w)) score += 6;
      if (expLower.includes(w)) score += 4;
      if (lawLower.includes(w)) score += 3;
      if (secLower.includes(w)) score += 2;
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
    'sinov muddati', 'ish vaqti', 'ta\'til', 'ishdan bo\'sh', 'shartnoma', 'bitim', 'da\'vo',
    'saylov', 'vakolat', 'deputat', 'notarius'
  ];
  return legalKeywords.some(kw => text.includes(kw));
}

// Asosiy huquqiy mavzular bo'yicha boyitilgan bilimlar bazasi
const LEGAL_TOPICS_KNOWLEDGE = [
  {
    keywords: ['sinov muddati', 'dastlabki sinov', 'sinov'],
    title: "Mehnat kodeksi: Dastlabki sinov muddati (129–132-moddalar)",
    summary: `• **Umumiy muddat:** Ko'pi bilan **3 oy**dan oshmasligi kerak;\n• **Rahbarlar uchun:** Tashkilot rahbarlari, ularning o'rinbosarlari, bosh buxgalterlar va alohida bo'linma rahbarlari uchun — **ko'pi bilan 6 oygacha**;\n• **Sinov belgilanmaydigan shaxslar:** Homilador ayollar, 3 yoshga to'lmagan bolasi bor ayollar (otasi/vasiysi), ta'lim muassasasi bitiruvchilari (1 yil ichida birinchi bor ishga kirganda), 6 oygacha bo'lgan muddatli mehnat shartnomasi tuzilgan xodimlar;\n• **Nozik jihat:** Vaqtincha mehnatga qobiliyatsizlik (kasallik) davri sinov muddatiga **qo'shilmaydi**!`,
    strictQuestion: {
      question: "Mehnat kodeksining 130-moddasiga ko‘ra korxona rahbari, uning o‘rinbosarlari va bosh buxgalterlar uchun dastlabki sinov muddati ko‘pi bilan necha oygacha bo‘lishi mumkin?",
      options: ["A) 1 oy", "B) 2 oy", "C) 3 oy", "D) 6 oy"],
      correct: "D"
    }
  },
  {
    keywords: ['ish vaqti', 'haftalik ish vaqti'],
    title: "Mehnat kodeksi: Ish vaqti me'yorlari (182–184-moddalar)",
    summary: `• **Normal ish vaqti:** Haftasiga **40 soatdan** oshmasligi shart;\n• **16 dan 18 yoshgacha xodimlar:** Haftasiga ko'pi bilan **36 soat**;\n• **15 dan 16 yoshgacha xodimlar:** Haftasiga ko'pi bilan **24 soat**;\n• **I va II guruh nogironligi bo'lgan xodimlar:** Haftasiga ko'pi bilan **36 soat**.`,
    strictQuestion: {
      question: "Mehnat kodeksiga binoan 16 yoshdan 18 yoshgacha bo'lgan xodimlar uchun haftalik ish vaqtining eng yuqori davomiyligi qancha?",
      options: ["A) 24 soat", "B) 30 soat", "C) 36 soat", "D) 40 soat"],
      correct: "C"
    }
  },
  {
    keywords: ['ta\'til', 'mehnat ta\'tili'],
    title: "Mehnat kodeksi: Yillik asosiy mehnat ta'tili (216–220-moddalar)",
    summary: `• **Minimal davomiylik:** Yangi Mehnat kodeksiga ko'ra — **kamida 21 kalendar kuni**;\n• **18 yoshga to'lmaganlar va I-II guruh nogironlari uchun:** Kamida **30 kalendar kuni**;\n• **Ta'tildan chaqirib olish:** Faqat xodimning **yozma roziligi** bilan yo'l qo'yiladi.`,
    strictQuestion: {
      question: "Yangi Mehnat kodeksiga asosan yillik asosiy mehnat ta'tilining minimal davomiyligi necha kalendar kunidan kam bo'lmasligi kerak?",
      options: ["A) 15 ish kuni", "B) 21 kalendar kuni", "C) 24 kalendar kuni", "D) 30 kalendar kuni"],
      correct: "B"
    }
  },
  {
    keywords: ['intizomiy jazo', 'hayfsan', 'jarima'],
    title: "Mehnat kodeksi: Intizomiy jazo choralari (312–314-moddalar)",
    summary: `• **Jazo turlari:** Faqat 3 ta: 1) Hayfsan; 2) Jarima (o'rtacha oylik ish haqining 30% dan oshmagan miqdorda, ichki tartib qoidalarida ko'rsatilgan bo'lsa 50% gacha); 3) Mehnat shartnomasini bekor qilish;\n• **Amal qilish muddati:** Intizomiy jazo berilgan kundan boshlab **1 yil**.`,
    strictQuestion: {
      question: "Mehnat kodeksiga ko'ra intizomiy jarimaning maksimal miqdori ichki mehnat tartibi qoidalarida nazarda tutilgan hollarda ko'pi bilan necha foizni tashkil qilishi mumkin?",
      options: ["A) 20%", "B) 30%", "C) 50%", "D) 70%"],
      correct: "C"
    }
  },
  {
    keywords: ['javobgarlik yoshi', 'jinoyat yoshi'],
    title: "Jinoyat kodeksi: Jinoiy javobgarlikka tortish yoshi (17-modda)",
    summary: `• **Umumiy yosh:** Jinoyat sodir etgunga qadar **16 yoshga** to'lgan aqli raso shaxslar;\n• **14 yoshdan javobgarlik:** Faqat o'ta og'ir va ayrim qilmishlar uchun (qasddan odam o'ldirish, nomusga tegish, bosqinchilik, terrorizm, o'g'rilik va b.);\n• **Ma'muriy javobgarlik yoshi:** MJTK 13-moddasiga binoan **16 yosh**.`,
    strictQuestion: {
      question: "Jinoyat kodeksining 17-moddasiga ko‘ra umumiy qoida bo‘yicha jinoiy javobgarlik necha yoshdan boshlanadi?",
      options: ["A) 14 yosh", "B) 15 yosh", "C) 16 yosh", "D) 18 yosh"],
      correct: "C"
    }
  },
  {
    keywords: ['meros', 'merosxo\'r', 'vasiyat'],
    title: "Fuqarolik kodeksi: Meros huquqi (1112–1150-moddalar)",
    summary: `• **Meros ochilish vaqti:** Fuqaroning vafot etgan kuni;\n• **1-navbatdagi qonuniy merosxo'rlar:** Bolalari (shu jumladan farzandlikka olinganlar), eri (xotini) va ota-onasi teng ulushlarda;\n• **Merosni qabul qilib olish muddati:** Meros ochilgan kundan boshlab **6 oy**.`,
    strictQuestion: {
      question: "Fuqarolik kodeksiga ko‘ra qonun bo‘yicha birinchi navbatdagi merosxo‘rlar doirasiga kimlar kiradi?",
      options: ["A) Faqat farzandlar", "B) Bolalari, eri (xotini) va vafot etganning ota-onasi", "C) Aka-uka va opa-singillar", "D) Bobo va buvilar"],
      correct: "B"
    }
  },
  {
    keywords: ['nikoh yoshi', 'nikoh', 'aliment'],
    title: "Oila kodeksi: Nikoh va Aliment munosabatlari (14–16, 99-moddalar)",
    summary: `• **Nikoh yoshi:** Erkaklar va ayollar uchun qat'iy **18 yosh**;\n• **Kamaytirish:** Uzrli sabablar bo'lganda tuman/shahar hokimi tomonidan ko'pi bilan **1 yilga** kamaytirilishi mumkin;\n• **Aliment miqdori:** 1 bola uchun — daromadning 1/4 qismi; 2 bola uchun — 1/3 qismi; 3 va undan ortiq bola uchun — 1/2 qismi.`,
    strictQuestion: {
      question: "Oila kodeksiga ko'ra aliment undirishda sud tomonidan 2 nafar voyaga yetmagan bola uchun ota-ona daromadining qancha qismi undiriladi?",
      options: ["A) 1/4", "B) 1/3", "C) 1/2", "D) 1/5"],
      correct: "B"
    }
  },
  {
    keywords: ['konstitutsiya', '1-modda', 'suveren', 'inson huquqlari'],
    title: "Yangi tahrirdagi Konstitutsiya: Asosiy prinsiplar (1-modda, 27-modda)",
    summary: `• **1-modda:** O'zbekiston — boshqaruvning respublika shakliga ega bo'lgan **suveren, demokratik, huquqiy, ijtimoiy va dunyoviy** davlat;\n• **Habeas Corpus (27-modda):** Hech kim sud qarorisiz **48 soatdan** ortiq ushlab turilishi mumkin emas;\n• **Miranda qoidasi:** Ushlash chog'ida huquqlari va sukut saqlash huquqi tushuntirilishi shart.`,
    strictQuestion: {
      question: "Yangi tahrirdagi Konstitutsiyaning 27-moddasiga binoan shaxs sudning qarorisiz ko'pi bilan necha soatdan ortiq muddat ushlab turilishi mumkin emas?",
      options: ["A) 24 soat", "B) 48 soat", "C) 72 soat", "D) 3 sutka"],
      correct: "B"
    }
  }
];

function findKnowledgeTopic(query) {
  const qLower = query.toLowerCase();
  for (const topic of LEGAL_TOPICS_KNOWLEDGE) {
    for (const kw of topic.keywords) {
      if (qLower.includes(kw)) {
        return topic;
      }
    }
  }
  return null;
}

// ==================== ZAXIRA JAVOB GENERATORI (ANIQ VA TABIIY) ====================
function getTutorFallbackReply(userQuery, isStrict = false) {
  const qLower = userQuery.toLowerCase().trim();

  // 1. Matematik ifodalar (masalan, 2+2, 25*4 va h.k.)
  const mathMatch = qLower.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let res = 0;
    if (op === '+') res = a + b;
    if (op === '-') res = a - b;
    if (op === '*') res = a * b;
    if (op === '/') res = b !== 0 ? (a / b) : 'nolga bo\'lish mumkin emas';
    return isStrict 
      ? `🔥 **Qattiq Qo'l Ustoz:**\n\nHisob-kitob natijasi: **${a} ${op} ${b} = ${res}**\n\nOddiy hisoblardan vaqtni yo'qotma, asosiy fanga diqqatingni qarat! 👊`
      : `Javob: **${a} ${op} ${b} = ${res}** ✅\nYana boshqa savollaringiz bo'lsa, bemalol so'rang!`;
  }

  // 2. Salomlashish
  if (qLower.startsWith('salom') || qLower.startsWith('assalom') || qLower === 'qalaysiz' || qLower.includes('kim siz')) {
    if (isStrict) {
      return `🔥 **Vaalaykum assalom! Men sizning Temir Intizomli Repetitoringizman!**\n\nMenga istalgan savolingizni bering: huquq, ilm-fan yoki hayotiy mavzular. Aniq, lo'nda va professional tahlil qilamiz!\n\nQaysi mavzuda savolingiz bor? Tezda yozing! ⚖️`;
    }
    return `Assalomu alaykum! Xush kelibsiz! 👋\n\nMen sizning universal **AI Ustozingizman** (ChatGPT kabi ishlayman). Menga xohlagan mavzuingizda savol berishingiz mumkin:\n\n• ⚖️ **Huquq va Qonunchilik:** BMBA sertifikati, 40 ta qonun, kodekslar va tahlillar;\n• 📚 **Barcha fanlar:** Fizika, matematika, tarix, tillar, axborot texnologiyalari;\n• 💡 **Maslahat va Ijod:** Insho, tahlil, mantiqiy savollar va shaxsiy rivojlanish.\n\nBugun sizga qaysi savol bo'yicha yordam beray?`;
  }

  // 3. Charchash, dangasalik va bahonalar
  if (qLower.includes('charchadim') || qLower.includes('dangasa') || qLower.includes('qiyin') || qLower.includes('ertaga') || qLower.includes('tushunmayapman')) {
    if (isStrict) {
      return `🔥 **Nima degani charchadim?! Darhol o'rningdan tur!**\n\nQulog'ingni yaxshilab och: imtihon zallarida senga hech kim rahm qilmaydi! Sen "charchadim, ertaga qilaman" deb yotgan paytingda, raqiblaring tunu-kun o'qiyapti! Ota-onangning umidlarini ko'z oldingga keltir!\n\n👊 **Hoziroq reja:**\n1. Borib yuzingni sovuq suvda yuv;\n2. Bahonalarni chetga sur;\n3. Kamida 20 daqiqa konsentratsiya bilan o'tirib o'qi!\n\nSavoling bormi? Hoziroq ber, birga tahlil qilamiz! ⚖️`;
    }
    return `Sizni juda yaxshi tushunaman! 🤝\n\nHar qanday katta maqsad yo'lida charchash va ikkilanishlar bo'lishi mutlaqo tabiiy. Asosiysi — bu holatda to'xtab qolmaslik.\n\n💡 **Tavsiya:** Hozir 5-10 daqiqa miyangizga dam bering, chuqur nafas oling. Katta vazifani kichik bo'laklarga bo'lib bajaring. O'zingizga ishoning, siz buni uddalay olasiz!\n\nQaysi mavzuda qiyinchilik bo'lyapti? Aytsangiz, yordam beraman.`;
  }

  // 4. Kvant fizikasi / Fizika
  if (qLower.includes('kvant') || qLower.includes('fizika')) {
    const pAns = `🔬 **Kvant fizikasi nima?**\n\nKvant fizikasi — bu olamning eng mikroskopik darajadagi, ya'ni **atomlar, elektronlar, fotonlar va subatom zarralar** harakatini o'rganadigan zamonaviy fizika bo'limidir.\n\n**Asosiy qoidalari:**\n1. **Kvantlanish:** Yorug'lik va energiya uzluksiz oqim emas, balki "kvantlar" (kichik energiya porsiyalari) shaklida tarqaladi;\n2. **Superpozitsiya:** Zarracha bir vaqtning o'zida bir nechta holatda bo'lishi mumkin (masalan, Shryodinger mushugi misoli);\n3. **Amaliy qo'llanilishi:** Kvant kompyuterlari, lazerlar, mikroprotsessorlar va MRT tibbiy apparatlari aynan kvant fizikasi qonunlariga asoslangan.`;
    return isStrict
      ? `🔥 **Qattiq Qo'l Ustoz tahlili:**\n\n${pAns}\n\n❓ **Sinov savoli:** Yorug'likning eng kichik bo'linmas zarrachasi nima deb ataladi? Tezda javob ber! 👊`
      : `${pAns}\n\nUshbu mavzu bo'yicha yana qanday savolingiz bor?`;
  }

  // 5. Dasturlash / IT
  if (qLower.includes('dasturlash') || qLower.includes('python') || qLower.includes('javascript') || qLower.includes('kod')) {
    return isStrict
      ? `🔥 **IT va Dasturlash bo'yicha tahlil:**\n\nDasturlash — bu kompyuterga aniq algoritmik buyruqlar berish san'atidir. Muvaffaqiyatli dasturchi bo'lish uchun sintaksisni quruq yodlash emas, mantiqiy fikrlash va muammolarni tizimli hal qilish (problem solving) talab etiladi!\n\n❓ **Sinov:** O'zing qaysi yo'nalishni (Frontend, Backend, AI yoki Mobil) tanlagansan? Javobingni yoz! 💻`
      : `💻 **Dasturlash haqida:**\nDasturlash — zamonaviy dunyoning eng talabgir sohalaridan biridir. Boshlash uchun eng ommabop tillar:\n• **Python:** AI, ma'lumotlar tahlili va soddaligi uchun a'lo;\n• **JavaScript:** Veb-saytlar va ilovalar yaratishda yetakchi;\nQaysi yo'nalishga qiziqasiz? Batafsil yo'l xaritasini tuzib berishim mumkin!`;
  }

  // 6. Huquqiy mavzular
  if (isLegalQuery(qLower)) {
    const matchedTopic = findKnowledgeTopic(userQuery);
    if (matchedTopic) {
      if (isStrict) {
        const q = matchedTopic.strictQuestion;
        return `🔥 **Qattiq Qo'l Ustoz tahlili:**\n\n📌 **Mavzu:** ${matchedTopic.title}\n\nQulog'ingga quyib ol, bu me'yorni yoddan bilishing shart:\n${matchedTopic.summary}\n\n⚠️ **Tekshiramiz:**\n❓ **SAVOL:** ${q.question}\n${q.options.join('\n')}\n\n👉 Qani, to'g'ri javob variantini yoz (A, B, C yoki D), ko'raylikchi haqiqatan tushundingmi?! 👊⚖️`;
      }
      return `📚 **${matchedTopic.title}**\n\nUshbu masala bo'yicha qonunchilik talablari quyidagicha:\n\n${matchedTopic.summary}\n\n💡 **Amaliy xulosa:**\nUshbu me'yoriy qoidalarni doim amaliy hayotiy vaziyat bilan bog'lab eslab qoling. Qo'shimcha savollaringiz bo'lsa, bemalol bering! 😊`;
    }

    const matchedBmba = searchBmbaQuestions(userQuery, 1);
    if (matchedBmba && matchedBmba.length > 0) {
      const bq = matchedBmba[0];
      const optsText = bq.options.map(o => `${o.key}) ${o.text}`).join('\n');
      if (isStrict) {
        return `🔥 **Qattiq Qo'l Ustoz tekshiruvi:**\n\nSavolingiz: **"${userQuery}"**\n\nBu masala yuzasidan test savoli:\n📌 **Savol:** ${bq.text}\n\n${optsText}\n\n❓ **Xo'sh, to'g'ri javob qaysi?** Variantni yoz! ⚖️`;
      }
      return `💡 **Huquqiy tahlil:**\n\nSiz so'ragan **"${userQuery}"** mavzusi bo'yicha tushuntirish:\n\n📖 **Savol:** ${bq.text}\n\n${optsText}\n\n✅ **To'g'ri javob:** ${bq.correct}\n📌 **Izoh:** ${bq.explanation || 'Qonun talablariga mos javob.'}\n🏛️ **Manba:** ${bq.lawSource || bq.bookSource || "O'zbekiston Respublikasi Qonunchiligi"}`;
    }
  }

  // 7. Boshqa istalgan erkin savol
  if (isStrict) {
    return `🔥 **Qattiq Qo'l Ustoz:**\n\nSavolingiz: **"${userQuery}"**\n\nUshbu masalaga jiddiy va amaliy yondashish kerak. Har qanday murakkab mavzuni uning asosiy qoidalari va fundamental qonuniyatlaridan boshlab tushunib olish lozim.\n\nSavolingizni aniqroq vaziyat yoki misol bilan davom ettiring, batafsil tahlil qilib beraman! 👊`;
  }

  return `🤖 **AI Ustoz tahlili:**\n\nSizning savolingiz: **"${userQuery}"**\n\nUshbu mavzuni to'liq tushunish uchun uning asosiy mohiyati va amaliy ahamiyatiga e'tibor qaratish kerak.\n\nAgar savolingizni aniqroq misol yoki holat bilan davom ettirsangiz, uni batafsil tushuntirib berishdan mamnun bo'laman!`;
}

// ==================== TIZIMNING ASOSIY EXPORT FUNKSIYALARI ====================

const TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda aqlli, erkin fikrlovchi, har tomonlama yetuk va universal sun'iy intellektsiz (xuddi ChatGPT / GPT-4o kabi).

SIZNING ASOSIY QOIDALARINGIZ:
1. FOYDALANUVCHINING ISTALGAN SAVOLIGA JAVOB BERING:
   - Siz faqat huquq bilan cheklanmaysiz!
   - Foydalanuvchi fizika, matematika, dasturlash, tarix, adabiyot, insho yozish, she'r to'qish, hayotiy maslahat, mantiqiy masalalar yoki shunchaki do'stona suhbat haqida so'rasa — O'SHA MAVZUDA erkin, batafsil, aqlli va tabiiy o'zbek tilida javob bering!
   - Hech qachon foydalanuvchining umumiy savolini majburan "huquq", "BMBA" yoki "sud"ga burmang! Nima so'ralsa, aynan o'shanga to'liq va mukammal javob bering.
2. HUQUQIY SAVOLLARDA:
   - Agar savol O'zbekiston qonunchiligi, Konstitutsiya, kodekslar yoki BMBA sertifikatiga oid bo'lsa, aniq moddalar, yuridik tushunchalar va professional huquqiy tahlil bilan yoritib bering.
3. USLUB VA FORMAT:
   - Hech qachon bir xil qotib qolgan gaplarni qaytarmang!
   - Javoblaringiz jonli, o'qishga qulay, chiroyli formatlangan (kerakli joyda ro'yxatlar, qalin shriftlar, emojilar bilan) bo'lsin.`;

const STRICT_TUTOR_SYSTEM_INSTRUCTION = `Siz talabchan, qat'iyatli, jiddiy va temir intizomli "QATTIQ QO'L USTOZ"siz (Universal Repetitor).

QOIDALAR:
1. UNIVERSAL BILIM: Foydalanuvchi har qanday fan yoki mavzuda (huquq, ilm-fan, ta'lim, motivatsiya, hayot) savol bersa, o'sha mavzuda eng yuqori saviyada, aniq va lutfbozliksiz to'g'ridan-to'g'ri javob bering.
2. TEMIR INTIZOM:
   - O'quvchi erinchoqlik, dangasalik qilsa yoki bahona izlasa ("charchadim", "ertaga qilaman", "yodlay olmayapman"), uni qattiq silkiting, raqobat kuchliligini va ota-onasi oldidagi mas'uliyatini eslatib, darhol harakatga keltiring!
3. NAZORAT SAVOLI:
   - Tushuntirgan mavzungiz bo'yicha javob oxirida o'quvchining haqiqatan tushunganini tekshiruvchi o'tkir nazorat savolini bering.
4. MUROJAAT:
   - O'quvchiga "sen" deb, jiddiy, professional, baquvvat gapirasiz. Emojilar: 🔥, ⚖️, ⚠️, 👊, 🎓.`;

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
    console.warn('AI API ulanishida cheklov/kechikish, boyitilgan bilim bazasiga o\'tildi:', err.message);

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

// Boshlang'ich keshni xotiraga tayyorlab qo'yish
setTimeout(() => {
  try {
    const count = loadBmbaQuestions().length;
    console.log(`📚 BMBA bazasidan ${count} ta savol xotiraga yuklandi.`);
  } catch (e) {}
}, 500);

module.exports = {
  askAiTutor,
  checkOpenAnswer,
  explainQuestion,
  generateAiContent,
  getTutorFallbackReply
};
