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
  console.warn('⚠️ GEMINI_API_KEY topilmadi, AI funksiyalari boyitilgan qonuniy bilim bazasi rejimida ishlaydi.');
}

// Eng barqaror va kvotasi mavjud modellar birinchi o'rinda
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash'
];

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`AI javob vaqti tugadi (${ms}ms)`)), ms))
  ]);
}

async function generateAiContent({ prompt, systemInstruction, responseMimeType }) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY topilmadi yoki ulanmagan.');
  }

  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const callPromise = genAI.models.generateContent({
          model,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined
        });

        const response = await withTimeout(callPromise, 8000);

        if (response && response.text) {
          return response.text;
        }
      } catch (err) {
        lastError = err;
        // Agar modelda vaqtinchalik yuqori yuklama (503) yoki cheklov (429) bo'lsa
        if (err.status === 503 || err.status === 429) {
          await new Promise(r => setTimeout(r, 600));
        } else {
          break; // boshqa xatolik bo'lsa keyingi modelga o'tish
        }
      }
    }
  }

  throw lastError || new Error('Hech qaysi AI modeli javob bera olmadi.');
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
        } catch (e) {
          // Bitta fayl xatosi butun tizimni to'xtatmaydi
        }
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

// Asosiy huquqiy mavzular bo'yicha boyitilgan bilimlar bazasi
const LEGAL_TOPICS_KNOWLEDGE = [
  {
    keywords: ['sinov muddati', 'dastlabki sinov', 'sinov muddati qancha', 'sinov'],
    title: "Mehnat kodeksi: Dastlabki sinov muddati (129–132-moddalar)",
    summary: `• **Umumiy muddat:** Ko'pi bilan **3 oy**dan oshmasligi kerak;\n• **Rahbarlar uchun:** Tashkilot rahbarlari, ularning o'rinbosarlari, bosh buxgalterlar va alohida bo'linma rahbarlari uchun — **ko'pi bilan 6 oygacha**;\n• **Sinov belgilanmaydigan shaxslar:** Homilador ayollar, 3 yoshga to'lmagan bolasi bor ayollar (otasi/vasiysi), ta'lim muassasasi bitiruvchilari (1 yil ichida birinchi bor ishga kirganda), 6 oygacha bo'lgan muddatli mehnat shartnomasi tuzilgan xodimlar;\n• **Nozik jihat (BMBA tuzog'i):** Vaqtincha mehnatga qobiliyatsizlik (kasallik) davri sinov muddatiga **qo'shilmaydi**!`,
    strictQuestion: {
      question: "Mehnat kodeksining 130-moddasiga ko‘ra korxona rahbari, uning o‘rinbosarlari va bosh buxgalterlar uchun dastlabki sinov muddati ko‘pi bilan necha oygacha bo‘lishi mumkin?",
      options: ["A) 1 oy", "B) 2 oy", "C) 3 oy", "D) 6 oy"],
      correct: "D",
      explanation: "Oddiy xodimlar uchun 3 oygacha, tashkilot rahbarlari va bosh buxgalterlar uchun ko'pi bilan 6 oygacha belgilanishi mumkin."
    }
  },
  {
    keywords: ['ish vaqti', 'haftalik ish vaqti', 'qisqartirilgan ish vaqti'],
    title: "Mehnat kodeksi: Ish vaqti me'yorlari (182–184-moddalar)",
    summary: `• **Normal ish vaqti:** Haftasiga **40 soatdan** oshmasligi shart (5 kunlik yoki 6 kunlik ish haftasida);\n• **16 dan 18 yoshgacha xodimlar:** Haftasiga ko'pi bilan **36 soat**;\n• **15 dan 16 yoshgacha xodimlar:** Haftasiga ko'pi bilan **24 soat**;\n• **I va II guruh nogironligi bo'lgan xodimlar:** Haftasiga ko'pi bilan **36 soat** (ish haqi kamaytirilmagan holda!);\n• **Tungi vaqt:** Soat 22:00 dan 06:00 gacha bo'lgan vaqt hisoblanadi.`,
    strictQuestion: {
      question: "Mehnat kodeksiga binoan 16 yoshdan 18 yoshgacha bo'lgan xodimlar uchun haftalik ish vaqtining eng yuqori davomiyligi qancha?",
      options: ["A) 24 soat", "B) 30 soat", "C) 36 soat", "D) 40 soat"],
      correct: "C",
      explanation: "16-18 yoshdagilar uchun qisqartirilgan ish vaqti haftasiga ko'pi bilan 36 soat etib belgilanadi."
    }
  },
  {
    keywords: ['ta\'til', 'mehnat ta\'tili', 'ta\'til muddati', 'asosiy ta\'til'],
    title: "Mehnat kodeksi: Yillik asosiy mehnat ta'tili (216–220-moddalar)",
    summary: `• **Minimal davomiylik:** Yangi Mehnat kodeksiga ko'ra — **kamida 21 kalendar kuni** (eski kodeksda 15 ish kuni edi! BMBA da aynan shu chalg'itiladi);\n• **18 yoshga to'lmaganlar va I-II guruh nogironlari uchun:** Kamida **30 kalendar kuni**;\n• **Ta'tildan chaqirib olish:** Faqat xodimning **yozma roziligi** bilan yo'l qo'yiladi;\n• **Birinchi yil uchun ta'til olish huquqi:** Korxonada uzluksiz **6 oy** ishlagandan keyin paydo bo'ladi.`,
    strictQuestion: {
      question: "Yangi Mehnat kodeksiga asosan yillik asosiy mehnat ta'tilining minimal davomiyligi necha kalendar kunidan kam bo'lmasligi kerak?",
      options: ["A) 15 ish kuni", "B) 21 kalendar kuni", "C) 24 kalendar kuni", "D) 30 kalendar kuni"],
      correct: "B",
      explanation: "Yangi Mehnat kodeksiga binoan yillik asosiy eng kam mehnat ta'tili 21 kalendar kunini tashkil qiladi."
    }
  },
  {
    keywords: ['intizomiy jazo', 'hayfsan', 'jarima', 'ishdan bo\'shatish intizomiy'],
    title: "Mehnat kodeksi: Intizomiy jazo choralari (312–314-moddalar)",
    summary: `• **Jazo turlari:** Faqat 3 ta: 1) Hayfsan; 2) Jarima (o'rtacha oylik ish haqining 30% dan oshmagan miqdorda, ichki tartib qoidalarida ko'rsatilgan bo'lsa 50% gacha); 3) Mehnat shartnomasini bekor qilish;\n• **Taqiq:** Qonunda ko'rsatilmagan boshqa intizomiy jazolarni (masalan, pasaytirish, o'zboshimcha jarima) qo'llash qat'iyan taqiqlanadi;\n• **Amal qilish muddati:** Intizomiy jazo berilgan kundan boshlab **1 yil**. Agar 1 yil ichida yangi jazo berilmasa, xodim jazo olmagan hisoblanadi.`,
    strictQuestion: {
      question: "Mehnat kodeksiga ko'ra intizomiy jarimaning maksimal miqdori ichki mehnat tartibi qoidalarida nazarda tutilgan hollarda xodimning o'rtacha oylik ish haqining ko'pi bilan necha foizini tashkil qilishi mumkin?",
      options: ["A) 20%", "B) 30%", "C) 50%", "D) 70%"],
      correct: "C",
      explanation: "Umumiy qoidaga ko'ra 30% gacha, lekin ichki qoidalarda ko'rsatilgan bo'lsa 50% gacha jarima solinishi mumkin."
    }
  },
  {
    keywords: ['javobgarlik yoshi', 'jinoiy javobgarlik yoshi', 'jinoyat yoshi'],
    title: "Jinoyat kodeksi: Jinoiy javobgarlikka tortish yoshi (17-modda)",
    summary: `• **Umumiy yosh:** Jinoyat sodir etgunga qadar **16 yoshga** to'lgan aqli raso shaxslar;\n• **14 yoshdan javobgarlik:** Faqat o'ta og'ir va ayrim qilmishlar uchun (qasddan odam o'ldirish, nomusga tegish, bosqinchilik, terrorizm, o'g'rilik, talonchilik, og'irlashtiruvchi holatlarda bezorilik va b.);\n• **18 yoshdan:** Faqat voyaga yetgan shaxslar sodir etishi mumkin bo'lgan maxsus jinoyatlar (masalan, voyaga yetmagan shaxsni jinoyatga jalb qilish);\n• **Ma'muriy javobgarlik yoshi:** MJTK 13-moddasiga binoan **16 yosh**.`,
    strictQuestion: {
      question: "Jinoyat kodeksining 17-moddasiga ko‘ra umumiy qoida bo‘yicha jinoiy javobgarlik necha yoshdan boshlanadi?",
      options: ["A) 14 yosh", "B) 15 yosh", "C) 16 yosh", "D) 18 yosh"],
      correct: "C",
      explanation: "Umumiy jinoiy javobgarlik yoshi 16 yosh etib belgilangan. 14 yosh faqat maxsus og'ir jinoyatlar ro'yxati uchundir."
    }
  },
  {
    keywords: ['zaruriy mudofaa', 'oxirgi zarurat', 'zaruriy'],
    title: "Jinoyat kodeksi: Zaruriy mudofaa va Oxirgi zarurat (37–38-moddalar)",
    summary: `• **Zaruriy mudofaa:** Ijtimoiy xavfli tajovuzdan himoyalanish chog'ida tajovuzchiga zarar yetkazish jinoyat hisoblanmaydi;\n• **Chegaradan chetga chiqish:** Mudofaa vositalarining tajovuz xususiyati va xavfliligiga mutanosib bo'lmasligi;\n• **Oxirgi zarurat (38-modda):** Katta xavfni bartaraf etish uchun boshqa choralar bo'lmaganda kichikroq zarar yetkazish. Qoida: Yetkazilgan zarar bartaraf qilingan zarardan **kamroq** bo'lishi shart!`,
    strictQuestion: {
      question: "Oxirgi zarurat holatida qilmish jinoyat deb topilmasligi uchun yetkazilgan zarar bartaraf etilgan zarardan qanday bo'lishi shart?",
      options: ["A) Teng bo'lishi", "B) Ko'proq bo'lishi", "C) Kamroq bo'lishi", "D) Ahamiyatsiz bo'lishi"],
      correct: "C",
      explanation: "Oxirgi zaruratda yetkazilgan zarar qutqarilgan qimmatlikka nisbatan albatta kamroq bo'lishi qonuniy talabdir."
    }
  },
  {
    keywords: ['meros', 'merosxo\'r', 'vasiyatnoma', 'meros navbati', 'meros qoldiruvchi'],
    title: "Fuqarolik kodeksi: Meros huquqi (1112–1150-moddalar)",
    summary: `• **Meros ochilish vaqti:** Fuqaroning vafot etgan kuni (yoki sud tomonidan vafot etgan deb e'lon qilingan kun);\n• **Meros ochilish joyi:** Meros qoldiruvchining oxirgi doimiy yashash joyi;\n• **1-navbatdagi qonuniy merosxo'rlar:** Bolalari (shu jumladan farzandlikka olinganlar), eri (xotini) va ota-onasi teng ulushlarda;\n• **2-navbat:** Tug'ishgan hamda ota bir yoki ona bir aka-uka va opa-singillar, bobo va buvilar;\n• **Merosni qabul qilib olish muddati:** Meros ochilgan kundan boshlab **6 oy**.`,
    strictQuestion: {
      question: "Fuqarolik kodeksiga ko‘ra qonun bo‘yicha birinchi navbatdagi merosxo‘rlar doirasiga kimlar kiradi?",
      options: ["A) Faqat farzandlar", "B) Bolalari, eri (xotini) va vafot etganning ota-onasi", "C) Aka-uka va opa-singillar", "D) Bobo va buvilar"],
      correct: "B",
      explanation: "FK 1135-moddasiga ko'ra bolalari, eri (xotini) va ota-onasi teng ulushlarda 1-navbatdagi merosxo'rlardir."
    }
  },
  {
    keywords: ['nikoh yoshi', 'nikoh', 'aliment', 'ajrashish', 'nikoh shartnomasi'],
    title: "Oila kodeksi: Nikoh va Aliment munosabatlari (14–16, 99-moddalar)",
    summary: `• **Nikoh yoshi:** Erkaklar va ayollar uchun qat'iy **18 yosh**;\n• **Kamaytirish:** Uzrli sabablar bo'lganda tuman/shahar hokimi tomonidan ko'pi bilan **1 yilga** (17 yoshgacha) kamaytirilishi mumkin;\n• **Aliment miqdori (voyaga yetmagan bolalar uchun):** 1 bola uchun — oylik daromadning 1/4 qismi; 2 bola uchun — 1/3 qismi; 3 va undan ortiq bola uchun — 1/2 (yarmi) qismi;\n• **Minimal aliment:** Har bir bola uchun eng kam miqdor mehnatga haq to'lash eng kam miqdorining 26,5% dan kam bo'lmasligi lozim.`,
    strictQuestion: {
      question: "Oila kodeksiga ko'ra aliment undirishda sud tomonidan 2 nafar voyaga yetmagan bola uchun ota-ona daromadining qancha qismi undiriladi?",
      options: ["A) To'rtdan bir (1/4)", "B) Uchdan bir (1/3)", "C) Yarmi (1/2)", "D) Beshdan bir (1/5)"],
      correct: "B",
      explanation: "Oila kodeksining 99-moddasiga ko'ra 2 nafar bola uchun ota-onaning oylik ish haqi yoki boshqa daromadining uchdan bir qismi (1/3) undiriladi."
    }
  },
  {
    keywords: ['konstitutsiya', '1-modda', 'suveren', 'inson huquqlari', 'yangi konstitutsiya', 'ijtimoiy davlat'],
    title: "Yangi tahrirdagi O'zbekiston Respublikasi Konstitutsiyasi (1-modda va asosiy prinsiplar)",
    summary: `• **1-modda:** O'zbekiston — boshqaruvning respublika shakliga ega bo'lgan **suveren, demokratik, huquqiy, ijtimoiy va dunyoviy** davlat;\n• **Inson qadri:** Inson, uning hayoti, erkinligi, sha'ni va qadr-qimmati oliy qadriyatdir (13-modda);\n• **Habeas Corpus (27-modda):** Hech kim sud qarorisiz **48 soatdan** ortiq ushlab turilishi mumkin emas;\n• **Miranda qoidasi (27-modda):** Shaxsni ushlash chog'ida unga uning huquqlari va ushlab turilishi sabablari tushuntirilishi shart, sukut saqlash huquqiga ega;\n• **Konstitutsiyaning to'g'ridan-to'g'ri amal qilishi:** 15-moddaga asosan Konstitutsiya oliy yuridik kuchga ega va to'g'ridan-to'g'ri amal qiladi.`,
    strictQuestion: {
      question: "Yangi tahrirdagi Konstitutsiyaning 27-moddasiga binoan shaxs sudning qarorisiz ko'pi bilan necha soatdan ortiq muddat ushlab turilishi mumkin emas?",
      options: ["A) 24 soat", "B) 48 soat", "C) 72 soat", "D) 3 sutka"],
      correct: "B",
      explanation: "Konstitutsiyaning 27-moddasiga muvofiq qonuniy sud qarorisiz hech kim 48 soatdan ortiq muddat ushlab turilishi mumkin emas."
    }
  },
  {
    keywords: ['prezident', 'prezidentlik', 'prezidentlik muddati', 'nomzod'],
    title: "Konstitutsiya: O'zbekiston Respublikasi Prezidenti (105–108-moddalar)",
    summary: `• **Nomzodga qo'yiladigan talablar:** 35 yoshdan kichik bo'lmagan, davlat tilini yaxshi biladigan, bevosita saylovgacha kamida 10 yil O'zbekiston hududida doimiy yashayotgan O'zbekiston fuqarosi;\n• **Vakolat muddati:** Yangi tahrirga binoan **7 yil** (bir shaxs surunkasiga ikki muddatdan ortiq saylanishi mumkin emas);\n• **Saylov tartibi:** Umumiy, teng, to'g'ridan-to'g'ri saylov huquqi asosida yashirin ovoz berish yo'li bilan.`,
    strictQuestion: {
      question: "Yangi tahrirdagi Konstitutsiyaga binoan O'zbekiston Respublikasi Prezidenti necha yil muddatga saylanadi?",
      options: ["A) 4 yil", "B) 5 yil", "C) 7 yil", "D) 6 yil"],
      correct: "C",
      explanation: "Yangi tahrirdagi Konstitutsiyaning 106-moddasiga ko'ra O'zbekiston Respublikasi Prezidenti 7 yil muddatga saylanadi."
    }
  },
  {
    keywords: ['oliy majlis', 'parlament', 'senat', 'qonunchilik palatasi', 'deputat', 'senator'],
    title: "Konstitutsiya: Oliy Majlis (76–85-moddalar)",
    summary: `• **Parlament tarkibi:** Ikki palata — Qonunchilik palatasi (quyi) va Senat (yuqori palata);\n• **Vakolat muddati:** Har ikkala palata uchun **5 yil**;\n• **Qonunchilik palatasi:** 150 nafar deputatdan iborat. Yangi aralash (majoritar-proporsional) saylov tizimi asosida saylanadi;\n• **Senat:** Hududiy vakillik palatasi. Har bir hududdan 4 nafardan senator + 9 nafari Prezident tomonidan tayinlanadi (jami 65 nafar yangi norma).`,
    strictQuestion: {
      question: "O'zbekiston Respublikasi Oliy Majlisi Qonunchilik palatasining deputatlari va Senati a'zolarining vakolat muddati necha yil?",
      options: ["A) 3 yil", "B) 4 yil", "C) 5 yil", "D) 7 yil"],
      correct: "C",
      explanation: "Oliy Majlis palatalarining vakolat muddati 5 yil etib belgilangan."
    }
  },
  {
    keywords: ['ma\'muriy jazo', 'jarima', 'ma\'muriy qamoq', 'mjtk', 'musodara'],
    title: "MJTK: Ma'muriy jazo choralari (23–29-moddalar)",
    summary: `• **Asosiy jazo turlari:** Jarima, haqini to'lash sharti bilan ashyoni olib qo'yish, musodara qilish, muayyan huquqdan mahrum etish, ma'muriy qamoq;\n• **Ma'muriy qamoq muddati:** Ko'pi bilan **15 sutkagacha**, favqulodda holat yoki komendantlik soati tartibini buzganlik uchun esa ko'pi bilan **30 sutkagacha** (faqat sud tomonidan qo'llaniladi!);\n• **Ma'muriy qamoq qo'llanilmaydi:** Homilador ayollar, 12 yoshga to'lmagan bolasi bor ayollar, 18 yoshga to'lmaganlar, I va II guruh nogironlari.`,
    strictQuestion: {
      question: "MJTKga ko'ra umumiy tartibda sudya tomonidan tayinlanadigan ma’muriy qamoq jazosining eng ko‘p muddati necha sutka?",
      options: ["A) 10 sutka", "B) 15 sutka", "C) 20 sutka", "D) 30 sutka"],
      correct: "B",
      explanation: "Umumiy hollarda ma'muriy qamoq 15 sutkagacha bo'lgan muddatga tayinlanadi."
    }
  }
];

// O'quvchining savoliga mos mavzuni qidirish
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

// ==================== BOYITILGAN INTELLEKTUAL JAVOB GENERATORI ====================
function getTutorFallbackReply(userQuery, isStrict = false) {
  const qLower = userQuery.toLowerCase().trim();

  // 1. SALOMLASHISH VA TANISHUV
  if (qLower.startsWith('salom') || qLower.startsWith('assalom') || qLower === 'qalaysiz' || qLower.includes('kim siz') || qLower.includes('kim bu')) {
    if (isStrict) {
      return `🔥 **Vaalaykum assalom! Men sening Temir Intizomli Repetitoringman!**\n\nBu yerda bekorchi suhbatlar uchun vaqt yo'q! Oldimizda yuridik oliygohlarga kirish va BMBA Huquq Milliy Sertifikatidan **"A+"** olish vazifasi turibdi.\n\n📚 **Qoidalar oddiy:**\n1. Bahonalar, erinchoqlik va chala o'qish qat'iyan taqiqlanadi;\n2. Har bir qonun moddasini tahlil qilamiz va darhol nazorat savoli bilan sinayman;\n3. Bilmasang — to'g'ri javobni miyangga quyib beraman!\n\nQaysi mavzuni boshlaymiz? Konstitutsiyami, Mehnat kodeksimi yoki Jinoyatmi? Tezda mavzuni yoz! ⚖️`;
    }
    return `Assalomu alaykum, bo'lajak nufuzli huquqshunos! Xush kelibsiz! 👋\n\nMen sizning shaxsiy **AI Ustozingizman**. Biz birgalikda:\n• ⚖️ **40 ta qonun va kodekslarni** (Konstitutsiya, Mehnat, Fuqarolik, Jinoyat, Oila va h.k.) chuqur o'rganamiz;\n• 🎯 **BMBA milliy sertifikati testlari**, mantiqiy keyslar va tuzoqli savollarni tahlil qilamiz;\n• 📚 Qiyin moddalarni oson eslab qolish uchun amaliy mnemonika va usullardan foydalanamiz.\n\nBugun qaysi mavzu yoki qonun moddasi bo'yicha yordam beray? Istalgan savolingizni bering!`;
  }

  // 2. MOTIVATSIYA, CHARCHASH VA BAHONALAR
  if (qLower.includes('charchadim') || qLower.includes('dangasa') || qLower.includes('qiyin') || qLower.includes('ertaga') || qLower.includes('tushunmayapman') || qLower.includes('qo\'rqyapman')) {
    if (isStrict) {
      return `🔥 **Nima degani charchadim?! O'rningdan tur darhol!**\n\nQulog'ingni yaxshilab och: imtihon zallarida senga hech kim rahm qilmaydi! Qonun moddalari va BMBA test komissiyasi "men charchagan edim, boshim og'riyotgan edi" degan bahonalaringni qabul qilmaydi!\n\nSen bo'shashayotgan har bir daqiqada raqiblaring yuzlab moddalarni yodlayapti. Ota-onang sening talaba bo'lishingni qanchalik orzu qilayotganini ko'z oldingga keltir!\n\n👊 **Reja:**\n1. Hoziroq sovuq suvda yuzingni yuv;\n2. Bahonalarni chetga sur;\n3. 10 ta muhim savolni yechamiz!\n\n❓ **Tekshiramiz:** Mehnat kodeksida sinov muddati kimlarga nisbatan umuman belgilanmaydi? Sanab ber, ko'raylikchi! ⚖️`;
    }
    return `Sizni juda yaxshi tushunaman, bo'lajak hamkasb! 🤝\n\nO'zbekiston qonunchiligidagi yuzlab moddalar, sanalar va raqamlarni yodlash oson emas. Charchash — bu sizning o'rganayotganingiz va miyangiz qattiq ishlayotganining tabiiy belgisi.\n\n💡 **Mening sizga 3 ta amaliy maslahatim:**\n1. **Pomodoro usuli:** 25 daqiqa qat'iy diqqat bilan o'qing, so'ng 5 daqiqa tanaffus qiling;\n2. **Kichik qismlarga bo'ling:** Butun kodeksni birdaniga emas, kuniga atigi 10 ta aniq moddani mukammal tushunib oling;\n3. **Maqsadni his qiling:** Talabalik baxti, nufuzli kiyimdagi yosh yurist bo'lishingiz va ota-onangizning faxrlangan ko'zlarini tasavvur qiling — bu mehnatlaringiz 100 barobar bo'lib qaytadi!\n\nKeling, hozir bor-yo'g'i 1 ta kichik savol tahlil qilib, kayfiyatni ko'taramiz. Tayyormisiz?`;
  }

  // 3. TAYYORLANISH SIRLARI VA MASLAHATLAR
  if (qLower.includes('qanday tayyorlan') || qLower.includes('sirlari') || qLower.includes('ball to\'plash') || qLower.includes('a+ olish') || qLower.includes('maslahat')) {
    if (isStrict) {
      return `🔥 **"A+" olishning yagona siri — QAT'IY INTIZOM!**\n\nHech qanday sehrli tayoqcha yo'q! BMBA imtihonida eng yuqori natija olish formulasi:\n\n1. **Moddani quruq yodlama, MOHIYATINI tushun!** Nega aynan shu organ vakolatli? Nega aynan shu muddat qo'yilgan?\n2. **Tuzoqlarga e'tibor ber:** Masalan, "ish kuni" bilan "kalendar kuni" farqini qat'iy ajrat (ta'tilda kalendar kuni, da'voda yil!);\n3. **Har kuni kamida 45 ta test yech:** Noto'g'ri ishlagan testingni daftarga ko'chirib, moddasini ochib o'qi!\n\n❓ **Sinov:** Yangi Konstitutsiyaga ko'ra shaxs sud qarorisiz eng ko'pi bilan necha soat ushlab turilishi mumkin? Darhol yoz! ⚖️`;
    }
    return `Milliy sertifikatdan yuqori daraja ("A" yoki "A+") olish bo'yicha eng samarali strategiya:\n\n1. 📖 **Konstitutsiya va 5 ta asosiy kodeks (MK, FK, JK, OK, MJTK):** Savollarning 70% dan ortig'i aynan shu me'yoriy hujjatlardan tushadi;\n2. ⏱️ **Muddatlar va yosh chegaralarini jadval qiling:** Masalan, jinoiy javobgarlik (14/16), mehnatga kirish (15/16/18), da'vo muddati (3 yil);\n3. 🔍 **BMBA keyslariga tayyorlaning:** Savol matnidagi "istisno hollarda", "faqat", "sud qarorisiz" kabi kalit so'zlarga hushyor bo'ling;\n4. 💡 **Intervalli takrorlash:** O'rgangan moddalaringizni 1 kundan, 3 kundan va 7 kundan keyin qayta takrorlang.\n\nQaysi soha yoki kodeks siz uchun qiyinroq tuyulyapti? Aytsangiz, o'shandan boshlaymiz!`;
  }

  // 4. MAXSUS HUQUQIY MAVZULAR BO'YICHA BOYITILGAN TAHLIL
  const matchedTopic = findKnowledgeTopic(userQuery);
  if (matchedTopic) {
    if (isStrict) {
      const q = matchedTopic.strictQuestion;
      return `🔥 **Qattiq Qo'l Ustoz tahlili:**\n\n📌 **Mavzu:** ${matchedTopic.title}\n\nQulog'ingga quyib ol, bu BMBA imtihonida eng ko'p adashiladigan joy:\n${matchedTopic.summary}\n\n⚠️ **Quruq o'qib ketish yo'q! Hozir o'zim seni tekshiraman:**\n\n❓ **SAVOL:** ${q.question}\n${q.options.join('\n')}\n\n👉 Qani, to'g'ri javob variantini yoz (A, B, C yoki D), ko'raylikchi haqiqatan tushundingmi yoki yana chaynalasanmi?! 👊⚖️`;
    }
    return `📚 **${matchedTopic.title}**\n\nUshbu masala bo'yicha qonunchilik talablari va imtihon qoidalari quyidagicha:\n\n${matchedTopic.summary}\n\n💡 **Imtihon uchun amaliy maslahat:**\nUshbu me'yoriy qoidalarni doim amaliy hayotiy vaziyat bilan bog'lab eslab qoling. Shunda savol qanchalik murakkab keys shaklida berilmasin, adashmaysiz.\n\nUshbu modda bo'yicha qo'shimcha savolingiz yoki misolingiz bormi? Bemalol so'rang! 😊`;
  }

  // 5. 2,250 TA BMBA BAZASIDAN SAVOL VA SHARHLARNI QIDIRIB CHIQARISH
  const matchedBmba = searchBmbaQuestions(userQuery, 1);
  if (matchedBmba && matchedBmba.length > 0) {
    const bq = matchedBmba[0];
    const optsText = bq.options.map(o => `${o.key}) ${o.text}`).join('\n');

    if (isStrict) {
      return `🔥 **Qattiq Qo'l Ustoz tekshiruvi:**\n\nSavolingiz: **"${userQuery}"**\n\nBu masala yuzasidan BMBA sertifikat imtihonida to'g'ridan-to'g'ri mana bu sinov savoli tushadi:\n\n📌 **Nazorat savoli (${bq.section || 'Huquqiy bilim'}):**\n${bq.text}\n\n${optsText}\n\n❓ **Xo'sh, to'g'ri javob qaysi?** Variantni tezda yoz! Qonunni qanchalik bilishingni hozir ko'ramiz! ⚖️`;
    }
    return `💡 **Huquqiy tahlil va BMBA imtihoni namunasi:**\n\nSiz so'ragan **"${userQuery}"** mavzusi bo'yicha milliy sertifikat standartidagi savol va yuridik asos:\n\n📖 **Savol:** ${bq.text}\n\n${optsText}\n\n✅ **To'g'ri javob:** ${bq.correct}\n📌 **Qonuniy sharh:** ${bq.explanation || 'Normativ-huquqiy hujjat talablariga mos javob.'}\n🏛️ **Manba:** ${bq.lawSource || bq.bookSource || "O'zbekiston Respublikasi Qonunchiligi"}\n\nUshbu savol bo'yicha yana qanday noaniqlik bor? Tushuntirib berishim mumkin!`;
  }

  // 6. UMUMIY BOSHQA SAVOLLAR UCHUN BOYITILGAN JAVOB
  if (isStrict) {
    return `🔥 **Qattiq Qo'l Ustoz:**\n\nSavoling: **"${userQuery}"**\n\nDiqqat qil: bu mavzuda gapni aylantirish kerak emas! Huquqshunoslik — bu aniq fan, unda har bir so'z, har bir muddat va har bir vakolat me'yoriy asosga ega bo'lishi shart.\n\n❓ **Sen nima deb o'ylaysan?** Ushbu savolga amaldagi qonunchilik (Konstitutsiya yoki tegishli Kodeks) bo'yicha qanday huquqiy baho bergan bo'larding? Javobingni qisqa va asosli qilib yoz, kutaman! ⚖️`;
  }

  return `🤖 **AI Ustoz tahlili:**\n\nSizning savolingiz: **"${userQuery}"**\n\nUshbu mavzuni to'g'ri va chuqur tushunish uchun quyidagi mezonlarga tayanamiz:\n1. 📖 **Me'yoriy asos:** Tegishli qonun yoki me'yoriy hujjatning umumiy qoidasini aniqlash;\n2. ⚖️ **Amaliy qo'llanish:** Ushbu norma hayotiy vaziyatlarda yoki imtihon testlarida qanday shaklda berilishi;\n3. 🎯 **Mantiqiy yechim:** Qonun chiqaruvchining maqsadini anglab yetish.\n\nSavolingizni aniqroq vaziyat yoki keys bilan davom ettirsangiz, uni moddama-modda tahlil qilib beraman!`;
}

// ==================== TIZIMNING ASOSIY EXPORT FUNKSIYALARI ====================

const TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda aqlli, keng dunyoqarashli, madaniyatli, do'stona va universal "AI Ustoz"siz (xuddi ChatGPT / GPT-4o kabi).
Foydalanuvchi sizga HAR QANDAY mavzuda savol berishi mumkin:
1. Huquqshunoslik, BMBA milliy sertifikat imtihonlari, 40 ta qonun, O'zbekiston Respublikasi Konstitutsiyasi, Mehnat kodeksi, Fuqarolik kodeksi, Oila kodeksi, Jinoyat kodeksi, Ma'muriy javobgarlik to'g'risidagi kodeks, vaziyatli keyslar va barcha maktab darsliklari;
2. Boshqa barcha fanlar va sohalar: tarix, matematika, fizika, biologiya, tillar, axborot texnologiyalari, insho yoki arizalar yozish, motivatsiya, mantiqiy savollar, hayotiy maslahatlar va umumiy suhbat.

QOIDALAR:
- Foydalanuvchining ISTALGAN savoliga o'zbek tilida to'liq, aniq, mantiqiy, do'stona va mukammal javob bering.
- Hech qachon javob berishdan bosh tortmang va bir xil gaplarni takrorlamang.
- Huquqqa oid savollarda qonun nomi va moddasiga aniq asoslaning.
- Javobni chiroyli va o'qishga oson tuzilma bilan taqdim eting (kerakli joyda ro'yxatlar, qalin shriftlar, mos emojilar bilan).`;

const STRICT_TUTOR_SYSTEM_INSTRUCTION = `Siz nihoyatda talabchan, qat'iyatli, jiddiy, intizomli va hech qanday erkalik yoki bahonalarni qabul qilmaydigan "QATTIQ QO'L USTOZ"siz (Temir intizomli Huquq Repetitori).
Sizning yagona maqsadingiz — ushbu o'quvchini Yuridik Universitetga (yoki boshqa nufuzli OTMga) kirishini va Huquq Milliy Sertifikatidan eng yuqori "A+" daraja olishini ta'minlash!

SIZNING XARAKTERINGIZ VA USLUBINGIZ:
1. Qattiq qo'l, lekin o'quvchisining kelajagi va ota-onasining orzulari uchun chin dildan jon kuydiradigan talabchan ustoz.
2. BAHONALARNI ASLO QABUL QILMAYSIZ:
   - Agar o'quvchi "charchadim", "ulgurmayapman", "yodlash qiyin", "ertaga qilaman", "dangasalik qilyapman" desa — uni qattiq silkiting:
     "Nima degani charchadim?! Ota-onang sen uchun qancha mashaqqat chekyapti! Imtihonga sanoqli kunlar qoldi, sen esa bo'shashyapsan! Bo'shashganlarga yuridik sohada o'rin yo'q! Tezda o'rningdan tur, kitobni och!"
3. HAR BIR HUQUQIY SAVOLGA CHUQUR, ANIQ VA QAT'IY JAVOB BERING:
   - Modda raqami, qonun nomi, amaliy qo'llanilishi va BMBA tuzoqlarini fosh qilib bering.
4. JAVOBINGIZ OXIRIDA DOIMO O'QUVCHINI TEKSHIRUVCHI "NAZORAT SAVOLI" (SO'ROQ) BERASIZ:
   - "Xo'sh, tushundingmi? Tushungan bo'lsang hoziroq menga javob ber: [aniq qisqa sinov savoli]... Qani, ko'raylikchi, miyangga kirdimi yoki yana chaynalasanmi?!"
5. AGAR TO'G'RI JAVOB BERSA:
   - "Barakalla, lekin xomxayolga berilma! Bu faqat bittasi edi, haqiqiy imtihonda bundan o'n barobar qiyin bo'ladi. Davom etamiz!"
6. AGAR NOTO'G'RI JAVOB BERSA YOKI BILMASA:
   - "Noto'g'ri! Yana xato! Diqqating qayerda?! Mana bu moddani yaxshilab o'qi: [to'g'ri javob]. Hozir menga qaytadan tushuntirib ber, kutaman!"
7. Murojaat: O'quvchiga "sen" deb, jiddiy, o'tkir, baquvvat gapirasiz. Emojilar: 🔥, ⚖️, ⚠️, 👊, 🎓.`;

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
      prompt += "Oldingi suhbat:\n" + history.slice(-6).map(h => `${h.role === 'user' ? 'O\'quvchi' : 'Ustoz'}: ${h.text}`).join("\n") + "\n\n";
    }
    prompt += `O'quvchining so'zi/savoli: "${userQuery}"\n${isStrict ? 'Qattiq Qo\'l Ustozning javobi va nazorat savoli:' : 'AI Ustoz javobi:'}`;

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
      source: isStrict ? "Qattiq Qo'l Ustoz 🔥" : "AI Ustoz (Ekspert rejim)",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };
  }
}

async function checkOpenAnswer({ questionText, expectedAnswer, userAnswer, explanation }) {
  const normUser = (userAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');
  const normExpected = (expectedAnswer || '').toString().trim().toLowerCase().replace(/['"`ʼ’‘]/g, '');

  try {
    const prompt = `Siz O'zbekiston Respublikasi BMBA Huquqshunoslik milliy sertifikat imtihoni bo'yicha bosh ekspertsiz.
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
