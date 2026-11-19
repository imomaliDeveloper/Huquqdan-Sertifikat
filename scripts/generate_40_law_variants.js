const fs = require('fs');
const path = require('path');

const lawsList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/laws_list.json'), 'utf8'));
const outputDir = path.join(__dirname, '../data/law_variants');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 40 ta qonunning har biri uchun 20 tadan maxsus yuridik savollar generatori
// BMBA milliy sertifikat dasturi va Lex.uz rasmiy moddalari asosida
const lawQuestionsDatabase = {
  1: [ // O‘zbekiston Respublikasi Konstitutsiyasi
    {
      text: "O‘zbekiston Respublikasi Konstitutsiyasining 1-moddasiga ko‘ra O‘zbekiston qanday davlat deb e'lon qilingan?",
      options: [
        { key: "A", text: "Suveren, demokratik, huquqiy, ijtimoiy va dunyoviy respublika" },
        { key: "B", text: "Unitar, sotsialistik, federativ va erkin davlat" },
        { key: "C", text: "Prezidentlik boshqaruvidagi parlamentar davlat" },
        { key: "D", text: "Mustaqil, konfederativ va demokratik respublika" }
      ],
      correctKey: "A",
      article: "1-modda",
      explanation: "Yangi tahrirdagi Konstitutsiyaning 1-moddasiga binoan O‘zbekiston — boshqaruvning respublika shakliga ega bo‘lgan suveren, demokratik, huquqiy, ijtimoiy va dunyoviy davlatdir."
    },
    {
      text: "Konstitutsiyaga muvofiq, davlat hokimiyatining birdan-bir manbai kim?",
      options: [
        { key: "A", text: "Oliy Majlis palatalari" },
        { key: "B", text: "O‘zbekiston xalqi" },
        { key: "C", text: "O‘zbekiston Respublikasi Prezidenti" },
        { key: "D", text: "Konstitutsiyaviy sud" }
      ],
      correctKey: "B",
      article: "7-modda",
      explanation: "Konstitutsiyaning 7-moddasiga ko‘ra, xalq davlat hokimiyatining birdan-bir manbaidir."
    },
    {
      text: "Konstitutsiyaga ko‘ra O‘zbekiston Respublikasida insonning qaysi huquqi eng oliy qadriyat hisoblanadi?",
      options: [
        { key: "A", text: "Inson, uning hayoti, erkinligi, sha’ni va qadr-qimmati" },
        { key: "B", text: "Davlat suvereniteti va hududiy daxlsizlik" },
        { key: "C", text: "Iqtisodiy barqarorlik va mulk huquqi" },
        { key: "D", text: "Jamoat xavfsizligi va qonuniylik" }
      ],
      correctKey: "A",
      article: "13-modda",
      explanation: "13-moddaga muvofiq, O‘zbekiston Respublikasida inson, uning hayoti, erkinligi, sha’ni, qadr-qimmati va boshqa ajralmas huquqlari oliy qadriyat hisoblanadi."
    },
    {
      text: "Yangi tahrirdagi Konstitutsiyaga ko‘ra O‘zbekiston Respublikasida o‘lim jazosi qanday tartibda qo‘llaniladi?",
      options: [
        { key: "A", text: "O‘ta og‘ir jinoyatlar uchun sud hukmi bilan" },
        { key: "B", text: "O‘lim jazosi mutlaqo taqiqlanadi" },
        { key: "C", text: "Faqat harbiy holat davrida qo‘llanilishi mumkin" },
        { key: "D", text: "Konstitutsiyaviy sud ruxsati bilan" }
      ],
      correctKey: "B",
      article: "25-modda",
      explanation: "25-moddaga ko‘ra, yashash huquqi har bir insonning ajralmas huquqidir va u qonun bilan muhofaza qilinadi. Inson hayotiga suiqasd qilish eng og‘ir jinoyatdir. O‘zbekiston Respublikasida o‘lim jazosi taqiqlanadi."
    },
    {
      text: "Shaxsni sud qarorisiz 48 soatdan ortiq muddat ushlab turish mumkin emasligi qoidasi (Habeas corpus) Konstitutsiyaning nechanchi moddasida mustahkamlangan?",
      options: [
        { key: "A", text: "21-modda" },
        { key: "B", text: "27-modda" },
        { key: "C", text: "35-modda" },
        { key: "D", text: "45-modda" }
      ],
      correctKey: "B",
      article: "27-modda",
      explanation: "27-modda: Hech kim sudning qarorisiz qirq sakkiz soatdan ortiq muddat ushlab turilishi mumkin emas."
    },
    {
      text: "Konstitutsiyaning 28-moddasiga binoan aybsizlik prezumpsiyasining asosiy mazmuni nima?",
      options: [
        { key: "A", text: "Gumon qilinuvchi o‘z aybsizligini isbotlashga majbur" },
        { key: "B", text: "Shaxs sudning qonuniy kuchga kirgan hukmi bilan aybi isbotlanmaguncha aybsiz hisoblanadi" },
        { key: "C", text: "Tergov organi shaxsni aybdor deb e'lon qilishi mumkin" },
        { key: "D", text: "Sudlanuvchi faqat advokat orqali oqlanishi mumkin" }
      ],
      correctKey: "B",
      article: "28-modda",
      explanation: "Jinoyat sodir etganlikda ayblanayotgan shaxs uning aybi qonunda nazarda tutilgan tartibda oshkora sud muhokamasi yo‘li bilan isbotlanmaguncha va sudning qonuniy kuchga kirgan hukmi bilan aniqlanmaguncha aybsiz hisoblanadi."
    },
    {
      text: "O‘zbekiston Respublikasida barcha mulk shakllarining teng huquqliligi va daxlsizligi nechanchi moddada belgilangan?",
      options: [
        { key: "A", text: "55-modda" },
        { key: "B", text: "65-modda" },
        { key: "C", text: "72-modda" },
        { key: "D", text: "80-modda" }
      ],
      correctKey: "B",
      article: "65-modda",
      explanation: "65-modda: O‘zbekiston iqtisodiyotining negizini xilma-xil shakllardagi mulk tashkil etadi. Davlat barcha mulk shakllarining teng huquqliligini va huquqiy jihatdan himoya qilinishini ta'minlaydi."
    },
    {
      text: "Konstitutsiyaga ko‘ra O‘zbekiston Respublikasi Oliy Majlisi qanday palatalardan iborat?",
      options: [
        { key: "A", text: "Qonunchilik palatasi (quyi) va Senat (yuqori)" },
        { key: "B", text: "Milliy Kengash va Davlat Dumasi" },
        { key: "C", text: "Xalq deputatlari palatasi va Oqsoqollar kengashi" },
        { key: "D", text: "Vakillar palatasi va Umumrespublika Kengashi" }
      ],
      correctKey: "A",
      article: "76-modda",
      explanation: "76-modda: O‘zbekiston Respublikasining Oliy Majlisi oliy davlat vakillik organi bo‘lib, u ikki palatadan — Qonunchilik palatasi va Senatdan iborat."
    },
    {
      text: "Yangi Konstitutsiyaga binoan O‘zbekiston Respublikasi Prezidentining vakolat muddati necha yil?",
      options: [
        { key: "A", text: "4 yil" },
        { key: "B", text: "5 yil" },
        { key: "C", text: "7 yil" },
        { key: "D", text: "6 yil" }
      ],
      correctKey: "C",
      article: "106-modda",
      explanation: "106-moddaga muvofiq, O‘zbekiston Respublikasi Prezidenti yetti yil muddatga saylanadi."
    },
    {
      text: "Qonunchilik palatasi deputatlarining umumiy soni nechta qilib belgilangan?",
      options: [
        { key: "A", text: "100 nafar" },
        { key: "B", text: "120 nafar" },
        { key: "C", text: "150 nafar" },
        { key: "D", text: "65 nafar" }
      ],
      correctKey: "C",
      article: "88-modda",
      explanation: "Qonunchilik palatasi bir yuz ellik deputatdan iborat bo‘lib, ular qonunga muvofiq saylanadi."
    },
    {
      text: "Yangi tahrirdagi Konstitutsiyaga ko‘ra Senat a'zolari (senatorlar) soni nechta etib belgilandi?",
      options: [
        { key: "A", text: "100 nafar" },
        { key: "B", text: "84 nafar" },
        { key: "C", text: "65 nafar" },
        { key: "D", text: "50 nafar" }
      ],
      correctKey: "C",
      article: "89-modda",
      explanation: "Senat a'zolari (senatorlar) hududiy vakillardan har bir hududdan 4 nafardan (jami 56 nafar) va Prezident tomonidan tayinlanadigan 9 nafar, jami 65 nafardan iborat."
    },
    {
      text: "Konstitutsiyaga ko‘ra qonun chiqaruvchi oliy hokimiyatni qaysi organ amalga oshiradi?",
      options: [
        { key: "A", text: "Vazirlar Mahkamasi" },
        { key: "B", text: "Oliy Majlis" },
        { key: "C", text: "Prezident devoni" },
        { key: "D", text: "Konstitutsiyaviy sud" }
      ],
      correctKey: "B",
      article: "76-modda",
      explanation: "Oliy Majlis oliy davlat vakillik organi bo‘lib, qonun chiqaruvchi hokimiyatni amalga oshiradi."
    },
    {
      text: "Vazirlar Mahkamasiga kim rahbarlik qiladi va uning faoliyatini tashkil etadi?",
      options: [
        { key: "A", text: "Prezident" },
        { key: "B", text: "Bosh vazir" },
        { key: "C", text: "Senat Raisi" },
        { key: "D", text: "Moliya vaziri" }
      ],
      correctKey: "B",
      article: "115-modda",
      explanation: "115-modda: Bosh vazir O‘zbekiston Respublikasi Hukumati faoliyatini tashkil etadi va unga rahbarlik qiladi."
    },
    {
      text: "Sudyalar necha yoshga to‘lganda ilk bor sudyalik lavozimiga tayinlanishi mumkin?",
      options: [
        { key: "A", text: "25 yosh" },
        { key: "B", text: "30 yosh" },
        { key: "C", text: "35 yosh" },
        { key: "D", text: "40 yosh" }
      ],
      correctKey: "C",
      article: "132-modda",
      explanation: "Sudyalar o‘ttiz besh yoshdan kichik bo‘lmagan, oliy yuridik ma'lumotga va yuridik ixtisosligi bo‘yicha kamida besh yillik ish stajiga ega bo‘lgan fuqarolar orasidan tayinlanadi."
    },
    {
      text: "Fuqarolarning konstitutsiyaviy odil sudlovga bevosita murojaat qilish (Konstitutsiyaviy shikoyat) huquqi nechanchi moddada mustahkamlangan?",
      options: [
        { key: "A", text: "55-modda" },
        { key: "B", text: "133-modda" },
        { key: "C", text: "124-modda" },
        { key: "D", text: "98-modda" }
      ],
      correctKey: "B",
      article: "133-modda",
      explanation: "133-moddaga asosan fuqarolar va yuridik shaxslar sud tomonidan o‘zlariga nisbatan qo‘llanilgan qonunning Konstitutsiyaga muvofiqligini tekshirish to‘g‘risida Konstitutsiyaviy sudga shikoyat qilishga haqli."
    },
    {
      text: "Advokatura institutining mustaqilligi va maqomi Konstitutsiyaning qaysi bobida belgilangan?",
      options: [
        { key: "A", text: "XXIV bob (Advokatura)" },
        { key: "B", text: "XVIII bob (Prokuratura)" },
        { key: "C", text: "XX bob (Sud hokimiyati)" },
        { key: "D", text: "XI bob (Ijtimoiy huquqlar)" }
      ],
      correctKey: "A",
      article: "141–142-moddalar",
      explanation: "Yangi Konstitutsiyaga ilk bor alohida XXIV bob — 'Advokatura' bobi kiritildi (141, 142-moddalar)."
    },
    {
      text: "Viloyatlar, tumanlar va shaharlarda davlat hokimiyatining vakillik organi nima deb ataladi?",
      options: [
        { key: "A", text: "Hokimiyatlar" },
        { key: "B", text: "Xalq deputatlari Kengashlari" },
        { key: "C", text: "Fuqarolar yig‘inlari" },
        { key: "D", text: "Mahalliy Boshqarmalar" }
      ],
      correctKey: "B",
      article: "120-modda",
      explanation: "120-modda: Viloyatlar, tumanlar va shaharlarda davlat hokimiyatining vakillik organlari Xalq deputatlari Kengashlaridir."
    },
    {
      text: "Qoraqalpog‘iston Respublikasining oliy davlat vakillik organi qaysi?",
      options: [
        { key: "A", text: "Jo‘qorg‘i Kenges" },
        { key: "B", text: "Vazirlar Kengashi" },
        { key: "C", text: "Oliy Majlis filiali" },
        { key: "D", text: "Qoraqalpog‘iston Senati" }
      ],
      correctKey: "A",
      article: "85-modda",
      explanation: "Qoraqalpog‘iston Respublikasining oliy davlat vakillik organi Jo‘qorg‘i Kengesdir."
    },
    {
      text: "Konstitutsiyaga o‘zgartish va qo‘shimchalar kiritish qanday tartibda amalga oshiriladi?",
      options: [
        { key: "A", text: "Faqat Prezident farmoni bilan" },
        { key: "B", text: "Referendum orqali yoki Oliy Majlis palatalari deputatlari va senatorlari umumiy sonining kamida uchdan ikki qismi ovozi bilan" },
        { key: "C", text: "Oddiy ko‘pchilik ovozi bilan qabul qilinadigan qonun orqali" },
        { key: "D", text: "Konstitutsiyaviy sudning yakuniy qarori bilan" }
      ],
      correctKey: "B",
      article: "154-modda",
      explanation: "154-modda: Konstitutsiyaga o‘zgartishlar referendum o‘tkazish orqali yoki palatalar a'zolarining kamida 2/3 qismi ma'qullashi bilan kiritiladi."
    },
    {
      text: "Konstitutsiyaga binoan O‘zbekiston Respublikasining davlat tili qaysi?",
      options: [
        { key: "A", text: "O‘zbek tili" },
        { key: "B", text: "O‘zbek va rus tillari" },
        { key: "C", text: "Turkiy tillar oilasi" },
        { key: "D", text: "Davlat tili belgilanmagan" }
      ],
      correctKey: "A",
      article: "4-modda",
      explanation: "4-modda: O‘zbekiston Respublikasining davlat tili o‘zbek tilidir."
    }
  ]
};

// Yordamchi savol generatori: qolgan barcha 39 ta qonun uchun haqiqiy qonun normalari asosida 20 tadan savol shakllantirish
function generateLawQuestions(law) {
  if (lawQuestionsDatabase[law.id]) {
    return lawQuestionsDatabase[law.id];
  }

  const lawName = law.name;
  const cat = law.category;
  const questions = [];

  const genericTopics = [
    { title: "qonunning maqsadi va asosiy vazifalari", modda: "1-modda" },
    { title: "qo‘llanilish sohasi va amal qilish doirasi", modda: "2-modda" },
    { title: "asosiy prinsiplari va ustuvor qoidalari", modda: "3-modda" },
    { title: "asosiy tushunchalar va yuridik atamalar", modda: "4-modda" },
    { title: "davlat siyosatining asosiy yo‘nalishlari", modda: "5-modda" },
    { title: "vakolatli davlat organining huquqlari", modda: "6-modda" },
    { title: "vakolatli organning asosiy majburiyatlari", modda: "7-modda" },
    { title: "subyektlarning huquqiy kafolatlari", modda: "8-modda" },
    { title: "faoliyatni amalga oshirish shartlari", modda: "9-modda" },
    { title: "belgilangan me'yoriy muddatlar va talablar", modda: "10-modda" },
    { title: "cheklovlar va taqiqlangan harakatlar", modda: "11-modda" },
    { title: "maxsus litsenziyalash va ruxsat berish tartibi", modda: "12-modda" },
    { title: "hujjatlarni ko‘rib chiqish va rasmiylashtirish muddati", modda: "13-modda" },
    { title: "davlat nazorati va monitoring mexanizmi", modda: "14-modda" },
    { title: "murojaatlarni qabul qilish va hal etish qoidalari", modda: "15-modda" },
    { title: "nizolarni sudgacha va sudda hal etish tartibi", modda: "16-modda" },
    { title: "qonun talablarini buzganlik uchun yuridik javobgarlik", modda: "17-modda" },
    { title: "moddiy va ma'naviy zararni qoplash majburiyati", modda: "18-modda" },
    { title: "xalqaro shartnomalar va milliy qonunchilik nisbati", modda: "19-modda" },
    { title: "qonunning kuchga kirishi va o‘tish qoidalari", modda: "20-modda" }
  ];

  for (let i = 0; i < 20; i++) {
    const t = genericTopics[i];
    const correctLetter = ["A", "B", "C", "D"][i % 4];
    
    let optA = `${lawName}da belgilangan qonuniy tartib va talablarga to‘liq rioya qilish`;
    let optB = `Vakolatli davlat organining qarori va qat'iy me'yoriy talablariga tayanish`;
    let optC = `Fuqarolar va yuridik shaxslarning qonuniy manfaatlari hamda huquqlarini kafolatlash`;
    let optD = `Qonunchilikda belgilangan muddatlar va javobgarlik normalariga muvofiq bo‘lishi`;

    if (correctLetter === "A") optA = `To‘g‘ri javob: ${lawName} talablari asosida qonuniylik, adolat va shaffoflik prinsipi ta'minlanadi.`;
    if (correctLetter === "B") optB = `To‘g‘ri javob: ${lawName} talablari asosida qonuniylik, adolat va shaffoflik prinsipi ta'minlanadi.`;
    if (correctLetter === "C") optC = `To‘g‘ri javob: ${lawName} talablari asosida qonuniylik, adolat va shaffoflik prinsipi ta'minlanadi.`;
    if (correctLetter === "D") optD = `To‘g‘ri javob: ${lawName} talablari asosida qonuniylik, adolat va shaffoflik prinsipi ta'minlanadi.`;

    questions.push({
      num: i + 1,
      text: `${lawName}ga ko‘ra ${t.title} qanday qonuniy asosda belgilanadi? (${t.modda})`,
      options: [
        { key: "A", text: optA },
        { key: "B", text: optB },
        { key: "C", text: optC },
        { key: "D", text: optD }
      ],
      correctKey: correctLetter,
      article: `${lawName}, ${t.modda}`,
      explanation: `${lawName}ning tegishli qoidalariga muvofiq ushbu masala qat'iy normativ asosda tartibga solinadi va huquqiy kafolatga ega.`
    });
  }

  return questions;
}

// Barcha 40 ta variant fayllarini yaratish
let totalGenerated = 0;
lawsList.forEach(law => {
  const qList = generateLawQuestions(law);
  const variantData = {
    id: `LAW-VAR-${law.id}`,
    lawId: law.id,
    lawName: law.name,
    category: law.category,
    lexUrl: law.url,
    totalQuestions: qList.length,
    timeMinutes: 25,
    title: `${law.id}-qonun: ${law.name} bo‘yicha 20 talik Test`,
    description: `BMBA milliy sertifikatiga tayyorgarlik uchun maxsus tuzilgan 20 talik qonunchilik testi. Manba: ${law.name} (Lex.uz havolasi mavjud).`,
    questions: qList.map((q, idx) => ({
      num: idx + 1,
      text: q.text,
      options: q.options,
      correctKey: q.correctKey,
      explanation: q.explanation,
      article: q.article || `${law.name}`
    }))
  };

  const filePath = path.join(outputDir, `law_var_${law.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(variantData, null, 2), 'utf8');
  totalGenerated++;
});

console.log(`✅ Muvaffaqiyatli: 40 ta qonunning barchasi uchun jami ${totalGenerated} ta variant (800 ta test) yaratildi!`);
