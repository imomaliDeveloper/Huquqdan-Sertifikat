const fs = require('fs');
const path = require('path');

console.log("Generating 50 BMBA specification variants with expanded Case Studies and Deadlines...");

// =========================================================================
// POOL 1: DAVLAT VA HUQUQ NAZARIYASI (8-sinf darsligi & Qonunlar) - Q1..Q6
// =========================================================================
const nazariyaPool = [
  {
    text: "Davlatning boshqaruv shakli deganda nima tushuniladi?\n1) Davlat oliy hokimiyat organlarini tashkil etish, ularning tuzilishi va xalq bilan munosabatlari;\n2) Davlatning hududiy bo‘linishi va markaz bilan hududlar munosabati;\n3) Davlat hokimiyatini amalga oshirish usul va vositalari;\n4) Davlat suverenitetini ta’minlash usullari.",
    options: [{key:"A", text:"1"}, {key:"B", text:"2"}, {key:"C", text:"3"}, {key:"D", text:"4"}],
    correct: "A",
    explanation: "Davlat boshqaruv shakli — davlat oliy hokimiyat organlarining tashkil etilishi, tuzilishi va ularning xalq bilan munosabatlari tartibini ifodalaydi.",
    bookSource: "8-sinf Davlat va huquq asoslari darsligi (1-bob)",
    lawSource: "Davlat va huquq nazariyasi kursi (BMBA 1-mavzu)"
  },
  {
    text: "Davlatning kelib chiqishi haqidagi qaysi nazariyaga ko‘ra davlat oilaning kengayishi va ota (oqsoqol) hokimiyatining davlat hokimiyatiga aylanishi deb tushuntiriladi?",
    options: [{key:"A", text:"Teologik nazariya"}, {key:"B", text:"Patriarxal nazariya"}, {key:"C", text:"Shartnoma nazariyasi"}, {key:"D", text:"Zo‘ravonlik nazariyasi"}],
    correct: "B",
    explanation: "Patriarxal nazariya (Aristotel, Filmer, Mixaylovskiy) davlatni oilaning kengayishi va ota hokimiyati davomi deb biladi.",
    bookSource: "8-sinf darsligi (Davlatning kelib chiqishi nazariyalari)",
    lawSource: "Davlat va jamiyat nazariyasi"
  },
  {
    text: "Quyidagilardan qaysi biri monarxiya boshqaruv shaklining mutlaq (absolyut) turiga xos asosiy belgi hisoblanadi?",
    options: [
      {key:"A", text:"Monarx hokimiyati konstitutsiya va parlament bilan cheklanadi"},
      {key:"B", text:"Hukumat parlament oldida to‘liq siyosiy javobgar bo‘ladi"},
      {key:"C", text:"Butun qonun chiqaruvchi va ijro etuvchi oliy hokimiyat cheklanmagan tarzda yakka monarx qo‘lida jamlanadi"},
      {key:"D", text:"Davlat boshlig‘i xalq tomonidan muayyan muddatga saylanadi"}
    ],
    correct: "C",
    explanation: "Mutlaq monarxiyada barcha oliy davlat hokimiyati bir shaxs (monarx) qo‘lida bo‘lib, hech qanday organ bilan cheklanmaydi.",
    bookSource: "8-sinf darsligi (Davlat shakllari)",
    lawSource: "Qiyosiy davlat huquqi"
  },
  {
    text: "Davlatning hududiy-ma’muriy tuzilishi shakliga ko‘ra qanday asosiy turlari mavjud?",
    options: [
      {key:"A", text:"Monarxiya va Respublika"},
      {key:"B", text:"Unitar, Federatsiya va Konfederatsiya"},
      {key:"C", text:"Demokratik, Avtoritar va Totalitar"},
      {key:"D", text:"Prezidentlik, Parlamentar va Aralash"}
    ],
    correct: "B",
    explanation: "Hududiy tuzilishiga ko‘ra davlatlar unitar (yaxlit), federativ (ittifoqdosh davlatlar) va konfederativ (davlatlar ittifoqi) shakllarda bo‘ladi.",
    bookSource: "8-sinf darsligi (Davlatning tuzilish shakli)",
    lawSource: "O'zbekiston Respublikasi Konstitutsiyasi, 1-modda"
  },
  {
    text: "Huquq normasining qaysi tarkibiy qismi norma ta’siri ostidagi subyektlarning xulq-atvor qoidasini (huquq va majburiyatlarini) bevosita belgilaydi?",
    options: [{key:"A", text:"Gipoteza"}, {key:"B", text:"Dispozitsiya"}, {key:"C", text:"Sanksiya"}, {key:"D", text:"Preambula"}],
    correct: "B",
    explanation: "Dispozitsiya — huquq normasining o‘zagi bo‘lib, subyektlarning bajarishi lozim yoki mumkin bo‘lgan xulq-atvor qoidasidir.",
    bookSource: "8-sinf darsligi (Huquq normasi tuzilishi)",
    lawSource: "Normativ-huquqiy hujjatlar to'g'risidagi Qonun (2-qonun)"
  },
  {
    text: "Huquqbuzarlikning subyektiv tomoni qanday yuridik belgilarni o‘z ichiga oladi?",
    options: [
      {key:"A", text:"Ijtimoiy xavfli qilmish va uning zararli oqibati"},
      {key:"B", text:"Ayb (qasd yoki ehtiyotsizlik), huquqbuzarlik maqsadi va motivi"},
      {key:"C", text:"Qilmish sodir etilgan vaqt, joy, usul va qurol"},
      {key:"D", text:"Shaxsning yoshi, aqli rasoligi va fuqaroligi"}
    ],
    correct: "B",
    explanation: "Subyektiv tomon — huquqbuzarning sodir etgan qilmishiga va uning oqibatlariga bo‘lgan ichki ruhiy munosabatidir (ayb, motiv, maqsad).",
    bookSource: "8-sinf darsligi (Huquqbuzarlik va yuridik javobgarlik)",
    lawSource: "Jinoyat kodeksi va MJtK umumiy qismlari"
  },
  {
    text: "Inson irodasiga bog‘liq bo‘lmagan, lekin qonunga asosan huquqiy oqibat keltirib chiqaradigan yuridik faktlar nima deb ataladi?",
    options: [{key:"A", text:"Yuridik harakatlar"}, {key:"B", text:"Yuridik hodisalar"}, {key:"C", text:"Huquqiy aktlar"}, {key:"D", text:"Yuridik qilmishlar"}],
    correct: "B",
    explanation: "Inson irodasiga bog‘liq bo‘lmagan voqeliklar (tabiiy ofat, shaxsning tug‘ilishi yoki vafoti, muddatning o‘tishi) yuridik hodisalardir.",
    bookSource: "8-sinf darsligi (Yuridik faktlar tasnifi)",
    lawSource: "Fuqarolik kodeksi, 8-modda (8-qonun)"
  },
  {
    text: "Normativ-huquqiy hujjatlarning yuridik kuchiga ko‘ra ierarxiyasida eng oliy yuridik kuchga ega bo‘lgan hujjat qaysi?",
    options: [
      {key:"A", text:"O‘zbekiston Respublikasi Qonunlari"},
      {key:"B", text:"Prezident Farmonlari va qarorlari"},
      {key:"C", text:"O‘zbekiston Respublikasi Konstitutsiyasi"},
      {key:"D", text:"Vazirlar Mahkamasining qarorlari"}
    ],
    correct: "C",
    explanation: "Konstitutsiyaning 15-moddasiga binoan O‘zbekiston Respublikasida O‘zbekiston Respublikasi Konstitutsiyasi va qonunlarining ustunligi so‘zsiz tan olinadi. Konstitutsiya oliy yuridik kuchga ega.",
    bookSource: "8-sinf darsligi (Normativ-huquqiy hujjatlar ierarxiyasi)",
    lawSource: "Konstitutsiya (1-modda, 15-modda) & Noma-hujjatlar to'g'risidagi qonun"
  },
  {
    text: "Huquqiy davlatning eng muhim va ajralmas fundamental belgisi qaysi javobda ko'rsatilgan?",
    options: [
      {key:"A", text:"Kuchli armiya va qurolli kuchlarning mavjudligi"},
      {key:"B", text:"Qonun ustuvorligi, inson huquqlarining kafolatlanishi va hokimiyatlar bo'linishi prinsipi"},
      {key:"C", text:"Faqat bitta davlat mafkurasining hukmronligi"},
      {key:"D", text:"Iqtisodiyot ustidan davlatning to'liq monopoliyasi"}
    ],
    correct: "B",
    explanation: "Huquqiy davlatning ustuvor tamoyili — barcha sohalarda qonun ustuvorligi, inson qadr-qimmati va hokimiyatning qonun chiqaruvchi, ijro etuvchi va sud hokimiyatlariga bo'linishidir.",
    bookSource: "8-sinf darsligi (Huquqiy davlat va fuqarolik jamiyati)",
    lawSource: "Konstitutsiya, 1-modda, 11-modda (1-qonun)"
  },
  {
    text: "Huquqiy ongning tarkibiy qismlari qaysi javobda to'g'ri ko'rsatilgan?",
    options: [
      {key:"A", text:"Huquqiy mafkura va huquqiy psixologiya"},
      {key:"B", text:"Faqat qonunlarni yoddan bilish"},
      {key:"C", text:"Sud amaliyoti va tergov usullari"},
      {key:"D", text:"Axloqiy qoidalar va urf-odatlar"}
    ],
    correct: "A",
    explanation: "Huquqiy ong ikki asosiy elementdan iborat: Huquqiy mafkura (nazariy, ilmiy qarashlar) va Huquqiy psixologiya (his-tuyg'ular, munosabat).",
    bookSource: "8-sinf darsligi (Huquqiy ong va huquqiy madaniyat)",
    lawSource: "Davlat va huquq nazariyasi"
  },
  {
    text: "Davlatning ichki funksiyalariga quyidagilardan qaysi biri kirmaydi?",
    options: [
      {key:"A", text:"Iqtisodiy barqarorlikni ta'minlash"},
      {key:"B", text:"Aholini ijtimoiy himoya qilish va sog'liqni saqlash"},
      {key:"C", text:"Mamlakat mudofaasini ta'minlash va tashqi tajovuzdan himoyalanish"},
      {key:"D", text:"Huquq-tartibot va qonuniylikni saqlash"}
    ],
    correct: "C",
    explanation: "Mamlakat mudofaasi va chegaralar xavfsizligini ta'minlash davlatning tashqi funksiyasidir.",
    bookSource: "8-sinf darsligi (Davlat funksiyalari)",
    lawSource: "Konstitutsiya, 153-modda"
  },
  {
    text: "Shaxsning qonunga xilof qilmishi natijasida yuridik javobgarlikning vujudga kelishiga nima sabab bo'ladi?",
    options: [
      {key:"A", text:"Huquqbuzarlik tarkibining mavjudligi"},
      {key:"B", text:"Faqat ma'naviy qoralanish"},
      {key:"C", text:"Guvohlarning shikoyat qilishi"},
      {key:"D", text:"Jarima to'lash istagi"}
    ],
    correct: "A",
    explanation: "Yuridik javobgarlikning yagona qonuniy asosi — shaxs qilmishida huquqbuzarlik tarkibining (obyekt, obyektiv tomon, subyekt, subyektiv tomon) to'liq mavjudligidir.",
    bookSource: "8-sinf darsligi (Yuridik javobgarlik asoslari)",
    lawSource: "JK va MJtK umumiy prinsiplari"
  }
];

// =========================================================================
// POOL 2: KONSTITUTSIYAVIY HUQUQ (9-sinf darsligi & Yangi Konstitutsiya) - Q7..Q17
// =========================================================================
const konstPool = [
  {
    text: "O‘zbekiston Respublikasi Konstitutsiyasining 1-moddasiga binoan O‘zbekiston qanday davlat deb e’lon qilingan?",
    options: [
      {key:"A", text:"Suveren, demokratik, huquqiy, ijtimoiy va dunyoviy davlat"},
      {key:"B", text:"Suveren, federativ, demokratik va dunyoviy davlat"},
      {key:"C", text:"Mustaqil, unitar, monarxiya davlati"},
      {key:"D", text:"Sotsialistik, teokratik va avtoritar davlat"}
    ],
    correct: "A",
    explanation: "Konstitutsiyaning 1-moddasida: 'O‘zbekiston — boshqaruvning respublika shakliga ega bo‘lgan suveren, demokratik, huquqiy, ijtimoiy va dunyoviy davlat' deb qat'iy belgilangan.",
    bookSource: "9-sinf Konstitutsiyaviy huquq asoslari darsligi (1-bob)",
    lawSource: "O'zbekiston Respublikasi Konstitutsiyasi, 1-modda (1-qonun)"
  },
  {
    text: "Konstitutsiyaga binoan Oliy Majlis Senatining a’zolari soni necha nafardan iborat?",
    options: [{key:"A", text:"100 nafar"}, {key:"B", text:"150 nafar"}, {key:"C", text:"65 nafar"}, {key:"D", text:"85 nafar"}],
    correct: "C",
    explanation: "Yangi Konstitutsiyaning 92-moddasiga ko‘ra Senat 65 nafar senatordan iborat bo'lib, har bir hududdan 4 nafardan saylanadi va 9 nafari Prezident tomonidan tayinlanadi.",
    bookSource: "9-sinf darsligi (Davlat hokimiyati vakillik organlari)",
    lawSource: "Konstitutsiya, 92-modda (1-qonun)"
  },
  {
    text: "Konstitutsiyaga ko‘ra O‘zbekiston Respublikasi Prezidenti necha yil muddatga saylanadi?",
    options: [{key:"A", text:"4 yil"}, {key:"B", text:"5 yil"}, {key:"C", text:"7 yil"}, {key:"D", text:"6 yil"}],
    correct: "C",
    explanation: "Konstitutsiyaning 106-moddasiga asosan O‘zbekiston Respublikasi Prezidenti O‘zbekiston Respublikasining fuqarolari tomonidan yetti yil muddatga saylanadi.",
    bookSource: "9-sinf darsligi (Prezidentlik instituti)",
    lawSource: "Konstitutsiya, 106-modda & Saylov kodeksi"
  },
  {
    text: "Konstitutsiyaning 20-moddasiga ko‘ra inson bilan davlat organlarining o'zaro munosabatlarida qonunchilikdagi barcha bartaraf etib bo‘lmaydigan noaniqliklar kimning foydasiga talqin qilinadi?",
    options: [
      {key:"A", text:"Davlat organlari foydasiga"},
      {key:"B", text:"Inson foydasiga"},
      {key:"C", text:"Sud foydasiga"},
      {key:"D", text:"Prokuratura foydasiga"}
    ],
    correct: "B",
    explanation: "20-modda: 'Inson bilan davlat organlarining o‘zaro munosabatlarida qonunchilikdagi noaniqliklar inson foydasiga talqin etiladi'.",
    bookSource: "9-sinf darsligi (Inson qadr-qimmati va kafolatlari)",
    lawSource: "Konstitutsiya, 20-modda (1-qonun)"
  },
  {
    text: "O‘zbekiston Respublikasining Davlat madhiyasi to'g'risidagi qonun qachon qabul qilingan?",
    options: [{key:"A", text:"1991-yil 18-noyabr"}, {key:"B", text:"1992-yil 2-iyul"}, {key:"C", text:"1992-yil 10-dekabr"}, {key:"D", text:"1992-yil 8-dekabr"}],
    correct: "C",
    explanation: "Davlat madhiyasi to‘g‘risidagi qonun 1992-yil 10-dekabrda qabul qilingan. (Bayroq: 1991-yil 18-noyabr, Gerb: 1992-yil 2-iyul).",
    bookSource: "9-sinf darsligi (Davlat ramzlari)",
    lawSource: "Davlat madhiyasi to'g'risidagi Qonun (5-qonun)"
  },
  {
    text: "Konstitutsiyaning 55-moddasiga ko‘ra shaxs milliy himoya vositalarining barchasidan foydalanib bo‘lganidan so‘ng o'z huquqlarini himoya qilish uchun qayerga murojaat qilishga haqli?",
    options: [
      {key:"A", text:"Inson huquqlarini himoya qiluvchi xalqaro organlarga"},
      {key:"B", text:"Boshqa xorijiy davlatlarning tuman sudlariga"},
      {key:"C", text:"Xorijiy elchixonalarga"},
      {key:"D", text:"Hech qayerga murojaat qila olmaydi"}
    ],
    correct: "A",
    explanation: "55-moddaga ko‘ra har kim davlatning huquqiy himoyaga doir barcha vositalaridan foydalanib bo‘lganidan so‘ng inson huquqlarini himoya qiluvchi xalqaro organlarga murojaat qilishga haqlidir.",
    bookSource: "9-sinf darsligi (Huquqiy himoya vositalari)",
    lawSource: "Konstitutsiya, 55-modda (1-qonun)"
  },
  {
    text: "O‘zbekiston Respublikasi Oliy Majlisi Qonunchilik palatasining mutlaq vakolatiga quyidagilardan qaysi biri kiradi?",
    options: [
      {key:"A", text:"Davlat budjetini qabul qilish va uning ijrosi ustidan nazoratni amalga oshirish"},
      {key:"B", text:"Sudyalarni lavozimga tayinlash va ozod qilish"},
      {key:"C", text:"Favqulodda holat joriy etish to‘g‘risidagi farmonni tasdiqlash"},
      {key:"D", text:"Bosh prokurorni lavozimga tasdiqlash"}
    ],
    correct: "A",
    explanation: "Davlat budjetini qabul qilish va uning ijrosi ustidan nazorat olib borish Qonunchilik palatasining mutlaq vakolatidir (94-modda).",
    bookSource: "9-sinf darsligi (Qonunchilik palatasi vakolatlari)",
    lawSource: "Konstitutsiya, 94-modda (1-qonun)"
  },
  {
    text: "Konstitutsiyaga ko‘ra sud hokimiyatining mustaqilligi prinsipiga rioya etilishini ta’minlash va sudyalar korpusini shakllantirish bo‘yicha mas’ul konstitutsiyaviy organ qaysi?",
    options: [
      {key:"A", text:"Adliya vazirligi"},
      {key:"B", text:"Sudyalar oliy kengashi"},
      {key:"C", text:"Konstitutsiyaviy sud"},
      {key:"D", text:"Bosh prokuratura"}
    ],
    correct: "B",
    explanation: "Sudyalar oliy kengashi — sudyalar hamjamiyatining mustaqil organi bo‘lib, sud hokimiyatining mustaqilligini ta’minlashga ko‘maklashadi (135-modda).",
    bookSource: "9-sinf darsligi (Sud hokimiyati)",
    lawSource: "Konstitutsiya, 135-modda & Sudyalar oliy kengashi to'g'risidagi qonun"
  },
  {
    text: "Konstitutsiyaga muvofiq, O‘zbekiston Respublikasi Vazirlar Mahkamasi o‘z faoliyatida kimlarning oldida javobgardir?",
    options: [
      {key:"A", text:"Faqat Oliy Majlis Qonunchilik palatasi oldida"},
      {key:"B", text:"O‘zbekiston Respublikasi Prezidenti va O‘zbekiston Respublikasi Oliy Majlisi oldida"},
      {key:"C", text:"Faqat Konstitutsiyaviy sud oldida"},
      {key:"D", text:"Faqat Adliya vazirligi oldida"}
    ],
    correct: "B",
    explanation: "Konstitutsiyaning 114-moddasiga ko‘ra Hukumat (Vazirlar Mahkamasi) O‘zbekiston Respublikasi Prezidenti va Oliy Majlis oldida javobgardir.",
    bookSource: "9-sinf darsligi (Ijro etuvchi hokimiyat)",
    lawSource: "Konstitutsiya, 114-modda & Vazirlar Mahkamasi to'g'risidagi Qonun"
  },
  {
    text: "Konstitutsiyaning 22-moddasiga muvofiq, O'zbekiston fuqarosi qaysi holatda O'zbekistondan tashqariga chiqarib yuborilishi yoki boshqa davlatga berilishi mumkin?",
    options: [
      {key:"A", text:"O'zbekiston fuqarosi O'zbekistondan tashqariga chiqarib yuborilishi yoki boshqa davlatga berilishi mutlaqo mumkin emas"},
      {key:"B", text:"Og'ir jinoyat sodir etganda mumkin"},
      {key:"C", text:"Boshqa davlat talab qilganda beriladi"},
      {key:"D", text:"Chet elda doimiy yashaganda mumkin"}
    ],
    correct: "A",
    explanation: "22-modda: 'O‘zbekiston Respublikasi fuqarosi O‘zbekistondan tashqariga chiqarib yuborilishi yoki boshqa davlatga berilishi mumkin emas'.",
    bookSource: "9-sinf darsligi (Fuqarolik huquqiy maqomi)",
    lawSource: "Konstitutsiya, 22-modda (1-qonun)"
  },
  {
    text: "Konstitutsiyaning 120-moddasiga binoan viloyatlar va Toshkent shahar hokimi o'z lavozimiga qanday tartibda tayinlanadi?",
    options: [
      {key:"A", text:"Xalq tomonidan to'g'ridan-to'g'ri saylanadi"},
      {key:"B", text:"Prezident tomonidan tayinlanadi va tegishli xalq deputatlari Kengashi tomonidan tasdiqlanadi"},
      {key:"C", text:"Oliy Majlis Senati tomonidan saylanadi"},
      {key:"D", text:"Bosh vazir tomonidan tayinlanadi"}
    ],
    correct: "B",
    explanation: "Konstitutsiyaning 120-moddasiga binoan viloyat va Toshkent shahar hokimi Prezident tomonidan tayinlanadi va Kengash tomonidan tasdiqlanadi.",
    bookSource: "9-sinf darsligi (Mahalliy davlat hokimiyati)",
    lawSource: "Konstitutsiya, 120-modda & Mahalliy davlat hokimiyati to'g'risidagi Qonun"
  },
  {
    text: "Konstitutsiyaning 128-moddasiga ko‘ra, O‘zbekiston Respublikasi fuqarolari necha yoshdan boshlab saylash huquqiga ega bo‘ladilar?",
    options: [{key:"A", text:"16 yoshdan"}, {key:"B", text:"18 yoshdan"}, {key:"C", text:"21 yoshdan"}, {key:"D", text:"25 yoshdan"}],
    correct: "B",
    explanation: "128-moddaga ko‘ra o‘n sakkiz yoshga to‘lgan fuqarolar saylash huquqiga egadirlar.",
    bookSource: "9-sinf darsligi (Saylov tizimi)",
    lawSource: "Saylov kodeksi (6-qonun)"
  }
];

// =========================================================================
// POOL 3: HUQUQ SOHALARI (10-11 sinf darsliklari & Kodekslar) - Q18..Q30
// =========================================================================
const sohalarPool = [
  {
    text: "Mehnat kodeksining 130-moddasiga ko‘ra korxona rahbari, uning o‘rinbosarlari va bosh buxgalterlar uchun dastlabki sinov muddati ko‘pi bilan necha oygacha bo‘lishi mumkin?",
    options: [{key:"A", text:"3 oy"}, {key:"B", text:"6 oy"}, {key:"C", text:"1 yil"}, {key:"D", text:"2 oy"}],
    correct: "B",
    explanation: "Oddiy xodimlar uchun sinov muddati ko'pi bilan 3 oy, rahbarlar va bosh buxgalterlar uchun esa ko'pi bilan 6 oygacha belgilanishi mumkin.",
    bookSource: "10-sinf darsligi (Mehnat huquqi asoslari)",
    lawSource: "Yangi Mehnat kodeksi, 130-modda (14-qonun)"
  },
  {
    text: "Mehnat kodeksiga ko‘ra xodimga nisbatan qanday intizomiy jazo choralari qo‘llanilishi mumkin?\n1) Hayfsan; 2) Jarima (30% gacha, qoidalarda 50% gacha); 3) Mehnat shartnomasini bekor qilish; 4) Majburiy mehnat; 5) Lavozimini pasaytirish.",
    options: [{key:"A", text:"1, 2, 3"}, {key:"B", text:"1, 2, 4"}, {key:"C", text:"1, 3, 5"}, {key:"D", text:"2, 4, 5"}],
    correct: "A",
    explanation: "Mehnat kodeksining 312-moddasida intizomiy jazo sifatida faqat 3 ta chora nazarda tutilgan: Hayfsan, Jarima va Shartnomani bekor qilish. Boshqa jazolarni qo'llash qat'iyan taqiqlanadi.",
    bookSource: "10-sinf darsligi (Mehnat intizomi)",
    lawSource: "Mehnat kodeksi, 312-modda (14-qonun)"
  },
  {
    text: "Fuqarolik huquqida buzilgan huquqni himoya qilish uchun umumiy da’vo muddati necha yilni tashkil etadi?",
    options: [{key:"A", text:"1 yil"}, {key:"B", text:"3 yil"}, {key:"C", text:"5 yil"}, {key:"D", text:"10 yil"}],
    correct: "B",
    explanation: "Fuqarolik kodeksining 150-moddasiga binoan umumiy da’vo muddati — uch yil etib belgilangan.",
    bookSource: "10-sinf darsligi (Fuqarolik huquqi: muddatlar)",
    lawSource: "Fuqarolik kodeksi, 150-modda (8-qonun)"
  },
  {
    text: "Oila kodeksiga ko‘ra qaysi holatda shaxslar o‘rtasida nikoh tuzish qonunan qat'iyan taqiqlanadi?",
    options: [
      {key:"A", text:"Nasl-nasab shajarasi bo‘yicha to‘g‘ri tutashgan qarindoshlar o‘rtasida"},
      {key:"B", text:"Turli millat yoki irq vakillari o‘rtasida"},
      {key:"C", text:"Turli din vakillari o‘rtasida"},
      {key:"D", text:"Harbiy xizmatchilar va fuqarolar o‘rtasida"}
    ],
    correct: "A",
    explanation: "Oila kodeksining 16-moddasiga ko‘ra yaqin qarindoshlar, tutash shajaradagi shaxslar, tug'ishgan va o'gay aka-singillar o‘rtasida nikoh taqiqlanadi.",
    bookSource: "10-sinf darsligi (Oila huquqi)",
    lawSource: "Oila kodeksi, 16-modda (19-qonun)"
  },
  {
    text: "Jinoyat kodeksiga binoan jinoiy jazoning asosiy maqsadi nimalardan iborat?",
    options: [
      {key:"A", text:"Mahkumdan jismoniy qasos olish va uni tahqirlash"},
      {key:"B", text:"Mahkumni axloqan tuzatish, uning jinoiy faoliyatni davom ettirishiga to‘sqinlik qilish hamda yangi jinoyatlar sodir etilishining oldini olish"},
      {key:"C", text:"Mahkumning butun mol-mulkini davlat hisobiga musodara qilish"},
      {key:"D", text:"Faqat jabrlanuvchiga moddiy kompensatsiya undirib berish"}
    ],
    correct: "B",
    explanation: "JK 42-moddasiga ko‘ra jazo mahkumni axloqan tuzatish, yangi jinoyatlar sodir etilishining oldini olish maqsadida qo‘llaniladi.",
    bookSource: "11-sinf darsligi (Jinoyat huquqi asoslari)",
    lawSource: "Jinoyat kodeksi, 42-modda (11-qonun)"
  },
  {
    text: "Voyaga yetmagan shaxslarga (14 yoshdan 18 yoshgacha) nisbatan ozodlikdan mahrum qilish jazosining eng ko‘p muddati necha yil etib belgilangan?",
    options: [{key:"A", text:"5 yil"}, {key:"B", text:"10 yil"}, {key:"C", text:"15 yil"}, {key:"D", text:"20 yil"}],
    correct: "B",
    explanation: "JK 85-moddasiga asosan voyaga yetmaganlarga ozodlikdan mahrum qilish jazosi ko‘pi bilan 10 yil muddatga tayinlanishi mumkin.",
    bookSource: "11-sinf darsligi (Voyaga yetmaganlar javobgarligi)",
    lawSource: "Jinoyat kodeksi, 85-modda (11-qonun)"
  },
  {
    text: "Ma’muriy huquqbuzarlik to‘g‘risidagi bayonnoma tuzilgach, ishni ko‘rib chiqish uchun vakolatli organga (sudga) necha kun ichida yuboriladi?",
    options: [{key:"A", text:"Bir sutka (24 soat) ichida"}, {key:"B", text:"Uch kun ichida"}, {key:"C", text:"O‘n kun ichida"}, {key:"D", text:"Bir oy ichida"}],
    correct: "A",
    explanation: "MJtK 282-moddasiga ko‘ra bayonnoma tuzilgan vaqtdan boshlab bir sutka ichida ko‘rib chiqish uchun yuboriladi.",
    bookSource: "11-sinf darsligi (Ma'muriy jarayon)",
    lawSource: "Ma'muriy javobgarlik to'g'risidagi kodeks, 282-modda (12-qonun)"
  },
  {
    text: "Mualliflik huquqi to'g'risidagi qonunga ko'ra, mulkiy huquqlar muallifning butun hayoti davomida va uning vafotidan keyin necha yil davomida amal qiladi?",
    options: [{key:"A", text:"25 yil"}, {key:"B", text:"50 yil"}, {key:"C", text:"70 yil"}, {key:"D", text:"30 yil"}],
    correct: "C",
    explanation: "Mualliflik huquqi va turdosh huquqlar to‘g‘risidagi qonunning 35-moddasiga binoan mulkiy huquqlar muallif vafotidan so‘ng 70 yil davomida amal qiladi.",
    bookSource: "10-sinf darsligi (Intellektual mulk huquqi)",
    lawSource: "Mualliflik huquqi va turdosh huquqlar to'g'risidagi Qonun (26-qonun)"
  },
  {
    text: "Xodim homilador bo‘lgan davrida ish beruvchi o‘z tashabbusi bilan u bilan mehnat shartnomasini bekor qilishi mumkinmi?",
    options: [
      {key:"A", text:"Ha, xodim ogohlantirilgan taqdirda mumkin"},
      {key:"B", text:"Faqat korxona butunlay tugatilgan hollardagina yo‘l qo‘yiladi"},
      {key:"C", text:"Shtat qisqarganda mumkin"},
      {key:"D", text:"Xodim sinovdan o'tolmaganda mumkin"}
    ],
    correct: "B",
    explanation: "Mehnat kodeksining 408-moddasiga binoan homilador ayollar bilan mehnat shartnomasini ish beruvchi tashabbusi bilan bekor qilishga faqat tashkilot tugatilgandagina yo‘l qo‘yiladi.",
    bookSource: "10-sinf darsligi (Ayollar va yoshlar mehnati kafolatlari)",
    lawSource: "Mehnat kodeksi, 408-modda (14-qonun)"
  },
  {
    text: "Korrupsiyaga qarshi kurashish sohasida maxsus vakolatli davlat organi qaysi?",
    options: [
      {key:"A", text:"Korrupsiyaga qarshi kurashish agentligi"},
      {key:"B", text:"Davlat xavfsizlik xizmati"},
      {key:"C", text:"Hisob palatasi"},
      {key:"D", text:"Adliya vazirligi"}
    ],
    correct: "A",
    explanation: "Korrupsiyaga qarshi kurashish to‘g‘risidagi qonunga binoan Korrupsiyaga qarshi kurashish agentligi ushbu sohadagi maxsus vakolatli davlat organidir.",
    bookSource: "11-sinf darsligi (Huquqni muhofaza qiluvchi organlar)",
    lawSource: "Korrupsiyaga qarshi kurashish to'g'risidagi Qonun (28-qonun)"
  },
  {
    text: "Iste’molchilarning huquqlarini himoya qilish to‘g‘risidagi qonunga ko‘ra, iste’molchi nuqsonli bo‘lmagan nooziq-ovqat tovarini sotib olgan kundan boshlab necha kun ichida almashtirib olishga haqli?",
    options: [{key:"A", text:"3 kun ichida"}, {key:"B", text:"10 kun ichida"}, {key:"C", text:"14 kun ichida"}, {key:"D", text:"30 kun ichida"}],
    correct: "C",
    explanation: "Qonunning 18-moddasiga binoan iste’molchi maqbul sifatli tovardan foydalanmagan taqdirda 14 kun ichida almashtirishga haqli.",
    bookSource: "10-sinf darsligi (Iste'molchilar huquqlari)",
    lawSource: "Iste'molchilarning huquqlarini himoya qilish to'g'risidagi Qonun (25-qonun)"
  },
  {
    text: "Advokatura to‘g‘risidagi qonunga ko‘ra advokat maqomini olish uchun shaxs kamida necha yillik yuridik stajga ega bo‘lishi lozim?",
    options: [{key:"A", text:"1 yil"}, {key:"B", text:"2 yil"}, {key:"C", text:"3 yil"}, {key:"D", text:"Staj talab qilinmaydi"}],
    correct: "B",
    explanation: "Advokatura to‘g‘risidagi qonunga ko‘ra oliy yuridik ma’lumotga va kamida ikki yillik yuridik stajga ega bo‘lgan shaxs advokat bo‘lishi mumkin.",
    bookSource: "11-sinf darsligi (Advokatura va Notariat)",
    lawSource: "Advokatura to'g'risidagi Qonun (21-qonun)"
  },
  {
    text: "Mehnat kodeksiga ko‘ra xodimlar uchun normal ish vaqtining davomiyligi haftasiga ko‘pi bilan necha soatdan ortiq bo‘lishi mumkin emas?",
    options: [{key:"A", text:"36 soat"}, {key:"B", text:"40 soat"}, {key:"C", text:"48 soat"}, {key:"D", text:"35 soat"}],
    correct: "B",
    explanation: "Yangi Mehnat kodeksining 182-moddasiga binoan xodim uchun normal ish vaqtining davomiyligi haftasiga qirq soatdan oshishi mumkin emas.",
    bookSource: "10-sinf darsligi (Ish vaqti me'yori)",
    lawSource: "Mehnat kodeksi, 182-modda (14-qonun)"
  },
  {
    text: "Oila kodeksiga ko‘ra sud tartibida ota-onalik huquqidan mahrum qilingan ota-ona bolaga ta'minot (aliment) to'lash majburiyatidan ozod qilinadimi?",
    options: [
      {key:"A", text:"Ha, to'liq ozod qilinadi"},
      {key:"B", text:"Yo'q, ota-onalik huquqidan mahrum qilinishi ota-onani bolaga ta'minot berish majburiyatidan ozod qilmaydi"},
      {key:"C", text:"Faqat bola 14 yoshga to'lganda to'laydi"},
      {key:"D", text:"Faqat sud ruxsat bergan hollarda ozod qilinadi"}
    ],
    correct: "B",
    explanation: "Oila kodeksining 81-moddasiga binoan ota-onalik huquqidan mahrum qilinishi ota-onani o‘z bolasiga ta’minot berish (aliment to'lash) majburiyatidan ozod qilmaydi.",
    bookSource: "10-sinf darsligi (Ota-onalik huquqlari va majburiyatlari)",
    lawSource: "Oila kodeksi, 81-modda (19-qonun)"
  },
  {
    text: "Fuqarolik huquqida merosxo'rlikning qaysi navbatiga vafot etgan shaxsning tug'ishgan hamda o'gay aka-ukalari va opa-singillari, shuningdek uning bobosi va buvisi kiradi?",
    options: [{key:"A", text:"Birinchi navbat"}, {key:"B", text:"Ikkinchi navbat"}, {key:"C", text:"Uchinchi navbat"}, {key:"D", text:"To'rtinchi navbat"}],
    correct: "B",
    explanation: "FK 1136-moddasiga binoan aka-uka, opa-singillar va bobo-buvilar ikkinchi navbatdagi qonuniy merosxo'rlardir.",
    bookSource: "10-sinf darsligi (Meros navbatlari)",
    lawSource: "Fuqarolik kodeksi, 1136-modda (8-qonun)"
  },
  {
    text: "Zaruriy mudofaa holatida tajovuzkorga yetkazilgan zarar yuzasidan jinoiy javobgarlik kelib chiqadimi?",
    options: [
      {key:"A", text:"Har doim jinoiy javobgarlik kelib chiqadi"},
      {key:"B", text:"Agar zaruriy mudofaa chegarasidan chetga chiqilmagan bo'lsa, qilmish jinoyat deb topilmaydi va javobgarlik kelib chiqmaydi"},
      {key:"C", text:"Faqat ma'muriy javobgarlik kelib chiqadi"},
      {key:"D", text:"Faqat moddiy tovon to'lanadi"}
    ],
    correct: "B",
    explanation: "JK 37-moddasiga ko‘ra zaruriy mudofaa chegarasidan chetga chiqilmasdan yetkazilgan zarar jinoiy javobgarlikni istisno qiladi.",
    bookSource: "11-sinf darsligi (Javobgarlikni istisno qiluvchi holatlar)",
    lawSource: "Jinoyat kodeksi, 37-modda (11-qonun)"
  }
];

// =========================================================================
// POOL 4: DIAGRAMMALAR VA ATAMALAR (Q31..Q32)
// =========================================================================
const poolAtamalar = [
  {
    atamalar: {
      text: "Atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.\n1. Veto | 2. Ratifakatsiya | 3. Amnistiya | 4. Pretsedent | 5. Alibi\n\na) davlat boshlig‘ining qonun loyihasini rad etish huquqi;\nb) xalqaro shartnomani oliy davlat organi tomonidan tasdiqlanishi;\nc) sud yoki ma’muriy organning kelgusida namuna bo‘ladigan qarori;\nd) jinoyat sodir bo‘lgan vaqtda shaxsning boshqa joyda bo‘lganligi isboti;\ne) vakolatli organ tomonidan shaxslarni jazodan ozod qilish akti.",
      options: [{key:"A", text:"1-a, 2-b, 3-e, 4-c, 5-d"}, {key:"B", text:"1-b, 2-a, 3-c, 4-d, 5-e"}, {key:"C", text:"1-a, 2-c, 3-b, 4-e, 5-d"}, {key:"D", text:"1-c, 2-b, 3-a, 4-d, 5-e"}],
      correct: "A",
      explanation: "Veto - rad etish; Ratifakatsiya - tasdiqlash; Amnistiya - jazodan ozod qilish; Pretsedent - sud namunasi; Alibi - boshqa joyda bo'lganlik.",
      bookSource: "8-sinf va 11-sinf darsliklari (Huquqiy atamalar lug'ati)",
      lawSource: "Davlat va huquq nazariyasi atamalar tizimi"
    },
    diagramma: {
      text: "Eyler-Venn diagrammasi bo‘yicha to‘g‘ri moslikni toping:\nI: Fuqarolik huquqi | II: Mehnat huquqi | III: Ikkisi uchun umumiy belgilar\n\na) mulkiy va shaxsiy nomulkiy munosabatlarni tartibga soladi;\nb) xodim va ish beruvchi o'rtasidagi ijtimoiy-mehnat munosabatlarini tartibga soladi;\nc) shartnoma erkinligi va nizolarni sud orqali hal etish tamoyili.",
      options: [{key:"A", text:"I-a; II-b; III-c"}, {key:"B", text:"I-b; II-a; III-c"}, {key:"C", text:"I-c; II-b; III-a"}, {key:"D", text:"I-a; II-c; III-b"}],
      correct: "A",
      explanation: "I-a (mulkiy munosabat), II-b (mehnat munosabati), III-c (umumiy prinsiplar).",
      bookSource: "10-sinf darsligi (Huquq sohalari qiyosiy tahlili)",
      lawSource: "Fuqarolik kodeksi & Mehnat kodeksi"
    }
  },
  {
    atamalar: {
      text: "Atamalar va ularning qonuniy izohi to‘g‘ri moslashtirilgan javobni aniqlang.\n1. Apellatsiya | 2. Kassatsiya | 3. Rekvizitsiya | 4. Emansipatsiya | 5. Prezumpksiya\n\na) qonuniy kuchga kirmagan sud qarori ustidan yuqori sudga shikoyat qilish;\nb) qonuniy kuchga kirgan sud qarorini qayta ko‘rib chiqish;\nc) tabiiy ofat paytida mol-mulkni davlat ehtiyoji uchun haq to‘lash sharti bilan olib qo‘yish;\nd) 16 yoshga to‘lgan shaxsni to‘la muomalaga layoqatli deb e’lon qilish;\ne) faktning qonunda to‘g‘ri deb taxmin qilinishi (masalan, aybsizlik prezumpsiyasi).",
      options: [{key:"A", text:"1-a, 2-b, 3-c, 4-d, 5-e"}, {key:"B", text:"1-b, 2-a, 3-c, 4-e, 5-d"}, {key:"C", text:"1-a, 2-c, 3-b, 4-d, 5-e"}, {key:"D", text:"1-c, 2-b, 3-a, 4-d, 5-e"}],
      correct: "A",
      explanation: "1-Apellatsiya, 2-Kassatsiya, 3-Rekvizitsiya, 4-Emansipatsiya, 5-Prezumpksiya.",
      bookSource: "8-11 sinf darsliklari (Yuridik atamalar)",
      lawSource: "Protsessual kodekslar & Fuqarolik kodeksi"
    },
    diagramma: {
      text: "Eyler-Venn diagrammasi: I: Jinoyat huquqi | II: Ma’muriy huquq | III: Umumiy xususiyatlar\n\na) faqat sud tomonidan jinoiy jazo tayinlanadi;\nb) vakolatli davlat organlari (IIB, inspeksiyalar) va sudyalar tomonidan jazo qo‘llanilishi mumkin;\nc) qonun bilan taqiqlangan ijtimoiy xavfli qilmishlar uchun davlat majburlovini belgilaydi.",
      options: [{key:"A", text:"I-a; II-b; III-c"}, {key:"B", text:"I-b; II-a; III-c"}, {key:"C", text:"I-c; II-b; III-a"}, {key:"D", text:"I-a; II-c; III-b"}],
      correct: "A",
      explanation: "Jinoyat uchun faqat sud jazolaydi (a), ma’muriyda boshqa idoralar ham bor (b), ikkisi ham huquqbuzarlikka qarshi kurashadi (c).",
      bookSource: "11-sinf darsligi (Javobgarlik turlari)",
      lawSource: "Jinoyat kodeksi & Ma'muriy javobgarlik to'g'risidagi kodeks"
    }
  },
  {
    atamalar: {
      text: "Huquqiy atamalarning to'g'ri izohini aniqlang:\n1. Promulgatsiya | 2. Konfiskatsiya | 3. Delikt | 4. Inkorporatsiya | 5. Retsidiv\n\na) qabul qilingan qonunni davlat rahbari tomonidan e'lon qilinishi;\nb) mol-mulkni qonunbuzarlik uchun tekinga davlat hisobiga majburiy olish;\nc) huquqbuzarlik (fuqarolik yoki ma'muriy zarar keltiruvchi qilmish);\nd) qonunlarni o'zgartirmasdan ma'lum tartibda to'plamga birlashtirish;\ne) shaxsning sudlanganlik holati tugamasdan qayta qasddan jinoyat sodir etishi.",
      options: [{key:"A", text:"1-a, 2-b, 3-c, 4-d, 5-e"}, {key:"B", text:"1-b, 2-a, 3-d, 4-c, 5-e"}, {key:"C", text:"1-c, 2-b, 3-a, 4-e, 5-d"}, {key:"D", text:"1-a, 2-c, 3-b, 4-d, 5-e"}],
      correct: "A",
      explanation: "Promulgatsiya - rasmiy e'lon qilish; Konfiskatsiya - tekinga musodara qilish; Delikt - noqonuniy zarar; Inkorporatsiya - qonunlar to'plami; Retsidiv - xavfli takrorlanish.",
      bookSource: "8-sinf va 11-sinf darsliklari (Atamalar)",
      lawSource: "Yuridik ensiklopediya"
    },
    diagramma: {
      text: "Eyler-Venn diagrammasi: I: Huquq layoqati | II: Muomala layoqati | III: Umumiy jihatlari\n\na) shaxs tug'ilgan paytdan vujudga keladi va vafoti bilan tugaydi;\nb) shaxsning o'z harakatlari bilan huquq va majburiyatlarni amalga oshirish qobiliyati;\nc) fuqarolik huquqiy subyektligining zaruriy elementi hisoblanadi.",
      options: [{key:"A", text:"I-a; II-b; III-c"}, {key:"B", text:"I-b; II-a; III-c"}, {key:"C", text:"I-c; II-b; III-a"}, {key:"D", text:"I-a; II-c; III-b"}],
      correct: "A",
      explanation: "Huquq layoqati tug'ilganda paydo bo'ladi (a), muomala layoqati yosh va aqlga bog'liq (b), ikkisi huquq subyektligini tashkil qiladi (c).",
      bookSource: "8-sinf va 10-sinf darsliklari",
      lawSource: "Fuqarolik kodeksi, 17 va 22-moddalar"
    }
  }
];

// =========================================================================
// POOL 5: 25 TA CHUQUR VA AMALIY VAZIYATLI KEYSLAR (Y-2: Q33..Q35)
// =========================================================================
const poolKeyslar = require(path.join(__dirname, '..', 'data', 'cases_bank.json'));

// =========================================================================
// POOL 6: OCHIQ SAVOLLAR (Q36..Q45 - Aniq muddatlar, foizlar, stavkalar)
// =========================================================================
const ochiqPool = [
  {
    section: "Oila huquqi",
    text: "Oila kodeksiga ko‘ra uzrli sabablar bo‘lganda nikoh yoshi tuman (shahar) hokimi qarori bilan ko‘pi bilan necha yilga kamaytirilishi mumkin?",
    acceptableAnswers: ["1 yil", "bir yil", "1", "bir"],
    canonicalAnswer: "1 yil",
    explanation: "Oila kodeksining 15-moddasiga binoan nikoh yoshi ko‘pi bilan 1 yilga kamaytirilishi mumkin.",
    bookSource: "10-sinf darsligi (Nikoh yoshi)",
    lawSource: "Oila kodeksi, 15-modda (19-qonun)"
  },
  {
    section: "Mehnat huquqi",
    text: "Xodim o‘z tashabbusi bilan mehnat shartnomasini bekor qilish to‘g‘risida ish beruvchini necha kun oldin yozma ogohlantirishi lozim?",
    acceptableAnswers: ["14 kun", "ikki hafta", "14", "2 hafta"],
    canonicalAnswer: "14 kun",
    explanation: "Mehnat kodeksining 160-moddasiga binoan xodim 14 kun (ikki hafta) oldin yozma ogohlantiradi.",
    bookSource: "10-sinf darsligi (Xodim tashabbusi bilan bo'shash)",
    lawSource: "Mehnat kodeksi, 160-modda (14-qonun)"
  },
  {
    section: "Fuqarolik huquqi",
    text: "Meros ochilgan kundan e’tiboran uni qabul qilish uchun qonun bo‘yicha necha oy muddat belgilanadi?",
    acceptableAnswers: ["6 oy", "olti oy", "6", "olti"],
    canonicalAnswer: "6 oy",
    explanation: "Fuqarolik kodeksining 1146-moddasiga asosan meros ochilgan kundan e'tiboran 6 oy ichida qabul qilinishi lozim.",
    bookSource: "10-sinf darsligi (Merosni qabul qilish)",
    lawSource: "Fuqarolik kodeksi, 1146-modda (8-qonun)"
  },
  {
    section: "Jinoyat huquqi",
    text: "Jinoyat kodeksiga binoan ozodlikdan mahrum qilish jazosining eng kam muddati necha oyni tashkil etadi?",
    acceptableAnswers: ["1 oy", "bir oy", "1", "bir"],
    canonicalAnswer: "1 oy",
    explanation: "JK 50-moddasiga ko‘ra ozodlikdan mahrum qilish bir oydan yigirma yilgacha muddatga belgilanadi.",
    bookSource: "11-sinf darsligi (Asosiy jazo turlari)",
    lawSource: "Jinoyat kodeksi, 50-modda (11-qonun)"
  },
  {
    section: "Ma'muriy huquq",
    text: "Ma’muriy jarima solish to‘g‘risidagi qaror ustidan shikoyat berish muddati qaror topshirilgan kundan e’tiboran necha kunni tashkil etadi?",
    acceptableAnswers: ["10 kun", "o'n kun", "10", "o'n"],
    canonicalAnswer: "10 kun",
    explanation: "MJtK 315-moddasiga ko‘ra ma’muriy jazo qarori ustidan o‘n kun ichida shikoyat berilishi mumkin.",
    bookSource: "11-sinf darsligi (Ma'muriy jazo ustidan shikoyat)",
    lawSource: "Ma'muriy javobgarlik to'g'risidagi kodeks, 315-modda (12-qonun)"
  },
  {
    section: "Konstitutsiyaviy huquq",
    text: "Yangi tahrirdagi Konstitutsiyaga ko‘ra O‘zbekiston Respublikasi Prezidenti lavozimiga saylanuvchi shaxs uchun yosh chegarasi kamida necha yosh etib belgilangan?",
    acceptableAnswers: ["35", "35 yosh", "o'ttiz besh", "o'ttiz besh yosh"],
    canonicalAnswer: "35 yosh",
    explanation: "Konstitutsiyaning 106-moddasiga muvofiq o‘ttiz besh yoshdan kichik bo‘lmagan fuqaro Prezident bo‘lishi mumkin.",
    bookSource: "9-sinf darsligi (Prezidentlik talablari)",
    lawSource: "Konstitutsiya, 106-modda (1-qonun)"
  },
  {
    section: "Mehnat huquqi",
    text: "Ish staji 15 yildan ortiq bo‘lgan xodimga shtat qisqarganda to‘lanadigan ishdan bo‘shatish nafaqasi o‘rtacha oylik maoshining necha foizidan kam bo‘lmasligi kerak?",
    acceptableAnswers: ["200", "200 foiz", "200%", "ikki yuz"],
    canonicalAnswer: "200 foiz",
    explanation: "Mehnat kodeksining 173-moddasiga ko‘ra 15 yildan ortiq staj uchun 200 foiz to‘lanadi.",
    bookSource: "10-sinf darsligi (Ishdan bo'shatish nafaqalari)",
    lawSource: "Mehnat kodeksi, 173-modda (14-qonun)"
  },
  {
    section: "Jinoyat-protsessual huquqi",
    text: "Gumon qilinuvchi shaxs ushlab turilgan paytdan boshlab uzog‘i bilan necha soat ichida so‘roq qilinishi shart?",
    acceptableAnswers: ["24 soat", "yigirma to'rt soat", "24", "yigirma to'rt"],
    canonicalAnswer: "24 soat",
    explanation: "JPK 226-moddasiga binoan ushlangan shaxs 24 soatdan kechiktirilmasdan so‘roq qilinishi shart.",
    bookSource: "11-sinf darsligi (Protsessual muddatlar)",
    lawSource: "Jinoyat-protsessual kodeksi, 226-modda"
  },
  {
    section: "Fuqarolik huquqi",
    text: "Topilmani topib olgan shaxs bu haqda darhol yoki uzog'i bilan necha kun ichida militsiyaga yoki tegishli organga xabar berishi lozim?",
    acceptableAnswers: ["darhol", "3 kun", "uch kun", "3"],
    canonicalAnswer: "darhol (3 kun ichida)",
    explanation: "FK 192-moddasiga binoan topilma haqida darhol xabar berilishi shart.",
    bookSource: "10-sinf darsligi (Mulk huquqining vujudga kelishi)",
    lawSource: "Fuqarolik kodeksi, 192-modda (8-qonun)"
  },
  {
    section: "Intellektual mulk",
    text: "Patent egasining ixtiroga bo‘lgan mutlaq huquqining amal qilish muddati talabnoma topshirilgan kundan boshlab necha yilni tashkil etadi?",
    acceptableAnswers: ["20 yil", "yigirma yil", "20"],
    canonicalAnswer: "20 yil",
    explanation: "Ixtirolar to‘g‘risidagi qonunchilikka binoan ixtiro patenti 20 yil muddatda amal qiladi.",
    bookSource: "10-sinf darsligi (Patent va ixtirolar)",
    lawSource: "Ixtirolar, foydali modellar to'g'risidagi Qonun"
  },
  {
    section: "Mehnat huquqi",
    text: "Mehnat kodeksiga ko‘ra har yilgi asosiy mehnat ta’tilining eng kam muddati necha kalendar kun etib belgilangan?",
    acceptableAnswers: ["21", "21 kun", "yigirma bir", "21 kalendar kun"],
    canonicalAnswer: "21 kalendar kun",
    explanation: "Mehnat kodeksining 217-moddasiga asosan har yilgi asosiy mehnat ta’tilining eng kam davomiyligi 21 kalendar kunni tashkil etadi.",
    bookSource: "10-sinf darsligi (Dam olish vaqti va ta'tillar)",
    lawSource: "Mehnat kodeksi, 217-modda (14-qonun)"
  },
  {
    section: "Oila huquqi",
    text: "Voyaga yetmagan bir nafar bola uchun ota-onaning oylik ish haqidan undiriladigan aliment miqdori qancha (necha qism)?",
    acceptableAnswers: ["to'rtdan bir", "to'rtdan bir qismi", "1/4", "25%"],
    canonicalAnswer: "to'rtdan bir qismi (1/4)",
    explanation: "Oila kodeksining 99-moddasiga ko‘ra 1 bola uchun — to‘rtdan bir qism (1/4) miqdorida aliment undiriladi.",
    bookSource: "10-sinf darsligi (Aliment majburiyatlari)",
    lawSource: "Oila kodeksi, 99-modda (19-qonun)"
  },
  {
    section: "Jinoyat huquqi",
    text: "Og'ir jinoyatlar sodir etilgan taqdirda shaxs necha yoshdan boshlab jinoiy javobgarlikka tortiladi?",
    acceptableAnswers: ["14 yosh", "14", "o'n to'rt"],
    canonicalAnswer: "14 yosh",
    explanation: "Jinoyat kodeksining 17-moddasiga ko‘ra og‘irlashtiruvchi holatlardagi qasddan odam o‘ldirish, bosqinchilik, terrorizm kabi jinoyatlar uchun 14 yoshdan javobgarlik belgilanadi.",
    bookSource: "11-sinf darsligi (Jinoiy javobgarlik yoshi)",
    lawSource: "Jinoyat kodeksi, 17-modda (11-qonun)"
  },
  {
    section: "Ma'muriy huquq",
    text: "Sudya yoki vakolatli organ tomonidan tayinlanadigan ma’muriy qamoq jazosining eng ko‘p muddati necha sutka?",
    acceptableAnswers: ["15 sutka", "15", "o'n besh", "o'n besh sutka"],
    canonicalAnswer: "15 sutka",
    explanation: "MJtK 29-moddasiga ko‘ra ma’muriy qamoq o‘n besh sutkagacha, favqulodda holatda esa 30 sutkagacha qo‘llaniladi.",
    bookSource: "11-sinf darsligi (Ma'muriy jazo turlari)",
    lawSource: "Ma'muriy javobgarlik to'g'risidagi kodeks, 29-modda (12-qonun)"
  },
  {
    section: "Mehnat huquqi",
    text: "Ish vaqtidan tashqari ishning davomiyligi xodim uchun surunkasiga ikki kun davomida necha soatdan oshmasligi kerak?",
    acceptableAnswers: ["4 soat", "to'rt soat", "4"],
    canonicalAnswer: "4 soat",
    explanation: "Mehnat kodeksining 190-moddasiga ko'ra ish vaqtidan tashqari ish surunkasiga ikki kun davomida to'rt soatdan oshmasligi shart.",
    bookSource: "10-sinf darsligi (Ish vaqti me'yorlari)",
    lawSource: "Mehnat kodeksi, 190-modda (14-qonun)"
  },
  {
    section: "Fuqarolik huquqi",
    text: "Fuqarolik qonunchiligida buzilgan huquqlarni himoya qilish uchun umumiy da’vo muddati necha yilni tashkil etadi?",
    acceptableAnswers: ["3 yil", "uch yil", "3"],
    canonicalAnswer: "3 yil",
    explanation: "Fuqarolik kodeksining 150-moddasiga asosan umumiy da’vo muddati uch yil qilib belgilangan.",
    bookSource: "10-sinf darsligi (Da'vo muddatlari)",
    lawSource: "Fuqarolik kodeksi, 150-modda (8-qonun)"
  },
  {
    section: "Iste'molchilar huquqi",
    text: "Iste’molchi nuqsoni bo‘lmagan maqbul sifatli nooziq-ovqat tovarini xarid qilgan kundan boshlab necha kun ichida almashtirishga haqli?",
    acceptableAnswers: ["14 kun", "o'n to'rt kun", "14"],
    canonicalAnswer: "14 kun",
    explanation: "Qonunning 18-moddasiga binoan iste’molchi o‘n to‘rt kun ichida tovarni almashtirib olishga haqli.",
    bookSource: "10-sinf darsligi (Iste'molchilar huquqlari)",
    lawSource: "Iste'molchilarning huquqlarini himoya qilish to'g'risidagi Qonun, 18-modda"
  },
  {
    section: "Konstitutsiyaviy huquq",
    text: "Konstitutsiyaga ko‘ra O‘zbekiston Respublikasi Prezidenti yangi tahrirdagi Konstitutsiya bo‘yicha necha yil muddatga saylanadi?",
    acceptableAnswers: ["7 yil", "yetti yil", "7"],
    canonicalAnswer: "7 yil",
    explanation: "Konstitutsiyaning 106-moddasiga ko‘ra Prezident yetti yil muddatga saylanadi.",
    bookSource: "9-sinf darsligi (Prezidentlik instituti)",
    lawSource: "Konstitutsiya, 106-modda (1-qonun)"
  },
  {
    section: "Oila huquqi",
    text: "Ikki nafar voyaga yetmagan bola uchun ota-onadan undiriladigan aliment miqdori oylik daromadning necha qismini tashkil etadi?",
    acceptableAnswers: ["uchdan bir", "uchdan bir qismi", "1/3", "33%"],
    canonicalAnswer: "uchdan bir qismi (1/3)",
    explanation: "Oila kodeksining 99-moddasiga ko‘ra ikki bola uchun — oylik ish haqining uchdan bir qismi (1/3) miqdorida aliment undiriladi.",
    bookSource: "10-sinf darsligi (Aliment stavkalari)",
    lawSource: "Oila kodeksi, 99-modda (19-qonun)"
  },
  {
    section: "Advokatura",
    text: "Advokat maqomini olish uchun talabgordan kamida necha yillik yuridik ish staji talab etiladi?",
    acceptableAnswers: ["2 yil", "ikki yil", "2"],
    canonicalAnswer: "2 yil",
    explanation: "Advokatura to‘g‘risidagi qonunga muvofiq oliy yuridik ma’lumotga va kamida 2 yillik yuridik stajga ega bo‘lish lozim.",
    bookSource: "11-sinf darsligi (Advokatura asoslari)",
    lawSource: "Advokatura to'g'risidagi Qonun (21-qonun)"
  }
];

// Helper: Shuffling with specific seed
function seededSample(pool, count, seed) {
  const result = [];
  const len = pool.length;
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 3) % len;
    result.push(pool[idx]);
  }
  return result;
}

// Generate Variant Function
function buildVariantObject(variantId) {
  const seed = variantId * 37;
  const questions = [];

  // 1-6: Davlat va huquq nazariyasi (8-sinf)
  const nazSelected = seededSample(nazariyaPool, 6, seed);
  nazSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 1,
      type: "Y-1",
      section: "Davlat va huquq nazariyasi",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource,
      lawSource: item.lawSource
    });
  });

  // 7-16: Konstitutsiyaviy huquq (9-sinf)
  const konstSelected = seededSample(konstPool, 10, seed + 5);
  konstSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 7,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq asoslari",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource,
      lawSource: item.lawSource
    });
  });

  // 17-30: Huquq sohalari (10-11 sinf)
  const sohalarSelected = seededSample(sohalarPool, 14, seed + 11);
  sohalarSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 17,
      type: "Y-1",
      section: "Huquq sohalari",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource,
      lawSource: item.lawSource
    });
  });

  // 31-32: Diagramma va Atamalar
  const atamaSet = poolAtamalar[variantId % poolAtamalar.length];
  questions.push({
    num: 31,
    type: "Y-1",
    section: "Huquqiy tahlil va diagramma",
    text: atamaSet.diagramma.text,
    options: atamaSet.diagramma.options,
    correct: atamaSet.diagramma.correct,
    explanation: atamaSet.diagramma.explanation,
    bookSource: atamaSet.diagramma.bookSource,
    lawSource: atamaSet.diagramma.lawSource
  });
  questions.push({
    num: 32,
    type: "Y-1",
    section: "Huquqiy atamalar",
    text: atamaSet.atamalar.text,
    options: atamaSet.atamalar.options,
    correct: atamaSet.atamalar.correct,
    explanation: atamaSet.atamalar.explanation,
    bookSource: atamaSet.atamalar.bookSource,
    lawSource: atamaSet.atamalar.lawSource
  });

  // 33-35: Vaziyatli keys (Y-2) — 6 ta boyitilgan keysdan variant bo'yicha tanlanadi
  const keysSet = poolKeyslar[(variantId - 1) % poolKeyslar.length];
  questions.push({
    num: 33,
    type: "Y-2",
    section: `Vaziyatli keys (${keysSet.title})`,
    scenario: keysSet.scenario,
    text: keysSet.q33.text,
    options: keysSet.q33.options,
    correct: keysSet.q33.correct,
    explanation: keysSet.q33.explanation,
    bookSource: keysSet.bookSource,
    lawSource: keysSet.lawSource
  });
  questions.push({
    num: 34,
    type: "Y-2",
    section: `Vaziyatli keys (${keysSet.title})`,
    scenario: keysSet.scenario,
    text: keysSet.q34.text,
    options: keysSet.q34.options,
    correct: keysSet.q34.correct,
    explanation: keysSet.q34.explanation,
    bookSource: keysSet.bookSource,
    lawSource: keysSet.lawSource
  });
  questions.push({
    num: 35,
    type: "Y-2",
    section: `Vaziyatli keys (${keysSet.title})`,
    scenario: keysSet.scenario,
    text: keysSet.q35.text,
    options: keysSet.q35.options,
    correct: keysSet.q35.correct,
    explanation: keysSet.q35.explanation,
    bookSource: keysSet.bookSource,
    lawSource: keysSet.lawSource
  });

  // 36-45: Ochiq topshiriqlar (O) — muddatlar va stavkalar
  const ochiqSelected = seededSample(ochiqPool, 10, seed + 19);
  ochiqSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 36,
      type: "O",
      section: item.section,
      text: item.text,
      acceptableAnswers: item.acceptableAnswers,
      canonicalAnswer: item.canonicalAnswer,
      explanation: item.explanation,
      bookSource: item.bookSource,
      lawSource: item.lawSource
    });
  });

  return {
    id: `VAR-${variantId}`,
    variantNumber: variantId,
    title: variantId === 1 ? "Variant 1 (T-760 Rasmiy Namunaviy)" : `Variant ${variantId} (BMBA Standart)`,
    totalQuestions: 45,
    timeMinutes: 90,
    description: `BMBA milliy sertifikat spesifikatsiyasiga to'liq mos variant №${variantId}. Manbalar: 8, 9, 10, 11-sinf darsliklari hamda 40 ta normativ-huquqiy hujjat.`,
    specification: {
      total: 45,
      y1Closed: 32,
      y2Cases: 3,
      oOpen: 10,
      sources: {
        textbooks: ["8-sinf yangi.pdf", "9-sinf yangi.pdf", "10-sinf yangi.pdf", "11-sinf yangi.pdf"],
        lawsCount: 40
      }
    },
    sections: [
      { id: 1, name: "Davlat va huquq nazariyasi (asoslari)", range: [1, 6], source: "8-sinf darsligi" },
      { id: 2, name: "Konstitutsiyaviy huquq asoslari", range: [7, 17], source: "9-sinf darsligi & Yangi Konstitutsiya" },
      { id: 3, name: "Huquq sohalari (Fuqarolik, Mehnat, Oila, Jinoyat, Ma'muriy)", range: [18, 35], source: "10-11 sinf darsliklari & Kodekslar" },
      { id: 4, name: "Ochiq topshiriqlar (qisqa javobli muddatlar)", range: [36, 45], source: "40 ta Qonun muddatlari va stavkalari" }
    ],
    questions: questions
  };
}

// Generate and write all 50 variants
const variantsDir = path.join(__dirname, '..', 'data', 'variants');
if (!fs.existsSync(variantsDir)) {
  fs.mkdirSync(variantsDir, { recursive: true });
}

let createdCount = 0;
for (let vId = 1; vId <= 50; vId++) {
  const variantObj = buildVariantObject(vId);
  const filePath = path.join(variantsDir, `variant_${vId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(variantObj, null, 2), 'utf8');
  createdCount++;
}

console.log(`✅ Success! All ${createdCount} variants regenerated with rich Case Studies and Deadlines.`);
