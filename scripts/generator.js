const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. DAVLAT VA HUQUQ NAZARIYASI (8-sinf darsligi & 40 ta Qonunchilik)
// =========================================================================
const nazariyaQuestions = [
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
    text: "Shaxsning o'z huquq va majburiyatlarini o'z harakatlari bilan amalga oshirish va javobgarlikni o'z zimmasiga olish qobiliyati nima deyiladi?",
    options: [{key:"A", text:"Huquq layoqati"}, {key:"B", text:"Muomala layoqati"}, {key:"C", text:"Delikt layoqati"}, {key:"D", text:"Huquq subyektligi"}],
    correct: "B",
    explanation: "Muomala layoqati — fuqaroning o‘z harakatlari bilan fuqarolik huquqlariga ega bo‘lish va ularni amalga oshirish, o‘zi uchun majburiyatlar vujudga keltirish qobiliyatidir.",
    bookSource: "8-sinf darsligi & 10-sinf Fuqarolik huquqi",
    lawSource: "Fuqarolik kodeksi, 22-modda (8-qonun)"
  }
];

// =========================================================================
// 2. KONSTITUTSIYAVIY HUQUQ (9-sinf darsligi & Yangi Konstitutsiya)
// =========================================================================
const konstitutsiyaQuestions = [
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
    text: "Konstitutsiyaning 60-moddasiga binoan O‘zbekiston Respublikasida fuqarolarning jamoat birlashmalariga birlashish huquqi qanday kafolatlanadi?",
    options: [
      {key:"A", text:"Faqat davlat ruxsati bilan kasaba uyushmasi tuzish mumkin"},
      {key:"B", text:"Kasaba uyushmalariga, siyosiy partiyalarga va boshqa jamoat birlashmalariga birlashish, ommaviy harakatlarda ishtirok etish huquqiga ega"},
      {key:"C", text:"Siyosiy partiyalarga a'zolik taqiqlanadi"},
      {key:"D", text:"Faqat yuridik shaxslargina jamoat birlashmasi tuza oladi"}
    ],
    correct: "B",
    explanation: "Konstitutsiyaning 60-moddasida fuqarolarning kasaba uyushmalariga, siyosiy partiyalarga va boshqa nodavlat notijorat tashkilotlariga birlashish huquqi kafolatlangan.",
    bookSource: "9-sinf darsligi (Siyosiy huquqlar)",
    lawSource: "Konstitutsiya, 60-modda & Jamoat birlashmalari to'g'risidagi Qonun"
  }
];

// =========================================================================
// 3. HUQUQ SOHALARI (10-11 sinf darsliklari & Kodekslar / Maxsus Qonunlar)
// =========================================================================
const sohalarQuestions = [
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
  }
];

// =========================================================================
// 4. ATAMALAR VA DIAGRAMMALAR (31-32 savollar)
// =========================================================================
const poolAtamalarJadvalVaried = [
  {
    atamalar: {
      text: "Atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.\n1. Veto | 2. Ratifakatsiya | 3. Amnistiya | 4. Pretsedent | 5. Alibi\n\na) davlat boshlig‘ining qonun loyihasini rad etish huquqi;\nb) xalqaro shartnomani oliy davlat organi tomonidan tasdiqlanishi;\nc) sud yoki ma’muriy organning kelgusida namuna bo‘ladigan qarori;\nd) jinoyat sodir bo‘lgan vaqtda shaxsning boshqa joyda bo‘lganligi isboti;\ne) vakolatli organ tomonidan shaxslarni jazodan ozod qilish akti.",
      options: [{key:"A", text:"1-a, 2-b, 3-e, 4-c, 5-d"}, {key:"B", text:"1-b, 2-a, 3-c, 4-d, 5-e"}, {key:"C", text:"1-a, 2-c, 3-b, 4-e, 5-d"}, {key:"D", text:"1-c, 2-b, 3-a, 4-d, 5-e"}],
      correct: "A",
      explanation: "Veto - rad etish; Ratifakatsiya - xalqaro aktni tasdiqlash; Amnistiya - jazodan ozod qilish; Pretsedent - sud namunasi; Alibi - boshqa joyda bo‘lganlik.",
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
      explanation: "1-Apellatsiya (kuchga kirmagan), 2-Kassatsiya (kuchga kirgan), 3-Rekvizitsiya (haq to‘lab olish), 4-Emansipatsiya (16 yoshda muomala layoqati), 5-Prezumpksiya (haqiqat deb taxmin qilish).",
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
  }
];

// =========================================================================
// 5. VAZIYATLI KEYSLAR (Y-2: 33-35 savollar)
// =========================================================================
const poolKeyslarVaried = [
  {
    title: "Meros taqsimoti keysi",
    scenario: "Fuqaro Sobirov vafot etdi. Uning ortidan xotini, 15 yoshli o‘g‘li va keksaygan nafaqaxo‘r onasi qoldi. Sobirov hayotlik chog‘ida barcha mol-mulkini (qiymati 600 million so‘mlik uy-joy) do‘sti Alimovga vasiyat qilib qoldirganligi aniqlandi. Sobirovning xotini va onasi bu vasiyatnomadan norozi bo‘lib, sudga merosdagi o‘z ulushlarini talab qilib da’vo arizasi kiritdilar.",
    bookSource: "10-sinf darsligi (Meros huquqi mavzusi)",
    lawSource: "Fuqarolik kodeksi, 1142-modda (8-qonun)",
    q33: {
      text: "Fuqarolik kodeksining 1142-moddasiga ko‘ra vasiyatnoma mavjud bo‘lganda ham qaramog‘idagi voyaga yetmagan bola va mehnatga layoqatsiz onaning merosdagi majburiy ulushi qonun bo‘yicha tegishli ulushning kamida qancha qismini tashkil etadi?",
      options: [{key:"A", text:"uchdan bir qismini"}, {key:"B", text:"kamida yarmini (1/2)"}, {key:"C", text:"to‘rtdan bir qismini"}, {key:"D", text:"to‘liq ulushni"}],
      correct: "B",
      explanation: "FK 1142-moddasiga binoan voyaga yetmagan yoki mehnatga layoqatsiz merosxo‘rlar qonun bo‘yicha ularga tegishi kerak bo‘lgan ulushning kamida yarmini (majburiy ulush) oladilar."
    },
    q34: {
      text: "Agar vasiyatnoma bo‘lmaganda Sobirovning mol-mulki xotini, o‘g‘li va onasi o‘rtasida qanday taqsimlangan bo‘lar edi?",
      options: [{key:"A", text:"Faqat o‘g‘liga tegardi"}, {key:"B", text:"Uchala merosxo‘r o‘rtasida teng ulushlarda (1/3 dan)"}, {key:"C", text:"Faqat xotiniga tegardi"}, {key:"D", text:"Davlat hisobiga o‘tardi"}],
      correct: "B",
      explanation: "FK 1135-moddasiga ko‘ra bolalari, xotini (eri) va ota-onasi birinchi navbatdagi qonuniy merosxo‘rlar bo‘lib, teng ulushlarda meros oladilar."
    },
    q35: {
      text: "Vasiyatnomani haqiqiy emas deb topish to‘g‘risidagi da’vo qaysi organga beriladi?",
      options: [{key:"A", text:"Notariat idorasiga"}, {key:"B", text:"Fuqarolik ishlari bo‘yicha tuman (shahar) sudiga"}, {key:"C", text:"Ichki ishlar bo‘limiga"}, {key:"D", text:"Adliya vazirligiga"}],
      correct: "B",
      explanation: "Vasiyatnomani haqiqiy emas deb topish vakolati faqat fuqarolik ishlari bo‘yicha sudga tegishlidir."
    }
  },
  {
    title: "Mehnat shartnomasini bekor qilish keysi",
    scenario: "'Texno-Line' MChJ rahbariyati korxona qayta tashkil etilganligi sababli dasturchi Nazarov bilan mehnat shartnomasini bekor qildi. Nazarov ushbu korxonada 6 yil uzluksiz ish stajiga ega. Unga atigi 10 kun oldin xabar berilgan va 1 oylik kompensatsiya to'langan.",
    bookSource: "10-sinf darsligi (Mehnat shartnomasini bekor qilish asoslari)",
    lawSource: "Yangi Mehnat kodeksi, 165 va 173-moddalar (14-qonun)",
    q33: {
      text: "Mehnat kodeksining 165-moddasiga ko‘ra shtat o‘zgarishi sababli shartnoma bekor qilinganda xodim necha oy oldin yozma ogohlantirilishi kerak?",
      options: [{key:"A", text:"1 oy"}, {key:"B", text:"2 oy"}, {key:"C", text:"2 hafta"}, {key:"D", text:"3 kun"}],
      correct: "B",
      explanation: "MK 165-moddasi 1-qismi 1-bandiga ko‘ra kamida 2 oy oldin yozma ogohlantirish shart."
    },
    q34: {
      text: "6 yillik ish staji bo‘lgan Nazarovga to‘lanishi kerak bo‘lgan ishdan bo‘shatish nafaqasi o‘rtacha oylik ish haqining necha foizidan kam bo‘lmasligi lozim?",
      options: [{key:"A", text:"100 foizi"}, {key:"B", text:"150 foizi"}, {key:"C", text:"200 foizi"}, {key:"D", text:"50 foizi"}],
      correct: "B",
      explanation: "MK 173-moddasiga binoan 5 yildan 10 yilgacha staj uchun 150 foiz to‘lanadi."
    },
    q35: {
      text: "Agar xodim ogohlantirish muddatini pul kompensatsiyasiga almashtirishga rozi bo‘lsa, bunga qanday yo‘l qo‘yiladi?",
      options: [{key:"A", text:"Faqat xodim va ish beruvchining o'zaro yozma kelishuviga ko‘ra"}, {key:"B", text:"Ish beruvchining bir tomonlama buyrug‘i bilan"}, {key:"C", text:"Bunga qonunchilikda yo‘l qo‘yilmaydi"}, {key:"D", text:"Faqat sud ruxsati bilan"}],
      correct: "A",
      explanation: "MK 165-moddasiga muvofiq ogohlantirish muddatini pullik kompensatsiya bilan almashtirish taraflarning kelishuvi bilan hal qilinadi."
    }
  }
];

// =========================================================================
// 6. OCHIQ SAVOLLAR POOLI (36-45 savollar - Aniq muddatlar va stavkalar)
// =========================================================================
const poolOchiqVaried = [
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
  }
];

// =========================================================================
// 7. 45 TA VARIANTNI NOYOBLASHTIRIB GENERATSIYA QILISH
// =========================================================================
function generateVariant(variantNum) {
  // Avval data/variants/variant_${variantNum}.json mavjudligini tekshiramiz
  const filePath = path.join(__dirname, '..', 'data', 'variants', `variant_${variantNum}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Boshqa variantlar (2 dan 50 gacha) uchun seed asosida tasodifiy permutatsiya
  const seed = variantNum * 31;
  const questions = [];

  function getUniqueItems(pool, count, offset) {
    const res = [];
    const len = pool.length;
    for (let i = 0; i < count; i++) {
      const idx = (offset + i * 2 + seed) % len;
      res.push(pool[idx]);
    }
    return res;
  }

  // 1-6: Davlat va huquq nazariyasi (8-sinf darsligi)
  const nazSelected = getUniqueItems(nazariyaQuestions, 6, variantNum);
  nazSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 1,
      type: "Y-1",
      section: "Davlat va huquq nazariyasi",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource || "8-sinf darsligi (Davlat va huquq nazariyasi)",
      lawSource: item.lawSource || "Spesifikatsiyadagi normativ asos"
    });
  });

  // 7-16: Konstitutsiyaviy huquq asoslari (9-sinf darsligi)
  const konstSelected = getUniqueItems(konstitutsiyaQuestions, 10, variantNum * 2);
  konstSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 7,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq asoslari",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource || "9-sinf darsligi (Konstitutsiyaviy huquq)",
      lawSource: item.lawSource || "O'zbekiston Respublikasi Konstitutsiyasi"
    });
  });

  // 17-30: Huquq sohalari (10 va 11-sinf darsliklari)
  const sohalarSelected = getUniqueItems(sohalarQuestions, 14, variantNum * 3);
  sohalarSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 17,
      type: "Y-1",
      section: "Huquq sohalari",
      text: item.text,
      options: item.options,
      correct: item.correct,
      explanation: item.explanation,
      bookSource: item.bookSource || "10-11 sinf darsliklari (Huquq sohalari)",
      lawSource: item.lawSource || "Tegishli kodekslar (Mehnat, Fuqarolik, Jinoyat, Oila)"
    });
  });

  // 31-32: Diagramma va Atamalar (8-11 sinf)
  const atamaSet = poolAtamalarJadvalVaried[(variantNum) % poolAtamalarJadvalVaried.length];
  questions.push({
    num: 31,
    type: "Y-1",
    section: "Huquqiy tahlil va diagramma",
    text: atamaSet.diagramma.text,
    options: atamaSet.diagramma.options,
    correct: atamaSet.diagramma.correct,
    explanation: atamaSet.diagramma.explanation,
    bookSource: atamaSet.diagramma.bookSource || "10-sinf darsligi (Eyler-Venn diagrammasi)",
    lawSource: atamaSet.diagramma.lawSource || "Qiyosiy huquqiy tahlil"
  });
  questions.push({
    num: 32,
    type: "Y-1",
    section: "Huquqiy atamalar",
    text: atamaSet.atamalar.text,
    options: atamaSet.atamalar.options,
    correct: atamaSet.atamalar.correct,
    explanation: atamaSet.atamalar.explanation,
    bookSource: atamaSet.atamalar.bookSource || "8-11 sinf darsliklari (Yuridik atamalar)",
    lawSource: atamaSet.atamalar.lawSource || "40 ta Qonunchilik hujjati"
  });

  // 33-35: Vaziyatli Keys topshirig'i (Y-2)
  const keysSet = poolKeyslarVaried[(variantNum - 1) % poolKeyslarVaried.length];
  questions.push({
    num: 33,
    type: "Y-2",
    section: `Vaziyatli keys (${keysSet.title})`,
    scenario: keysSet.scenario,
    text: keysSet.q33.text,
    options: keysSet.q33.options,
    correct: keysSet.q33.correct,
    explanation: keysSet.q33.explanation,
    bookSource: keysSet.bookSource || "10-sinf darsligi",
    lawSource: keysSet.lawSource || "Amaliy nizo tahlili"
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
    bookSource: keysSet.bookSource || "10-sinf darsligi",
    lawSource: keysSet.lawSource || "Amaliy nizo tahlili"
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
    bookSource: keysSet.bookSource || "10-sinf darsligi",
    lawSource: keysSet.lawSource || "Amaliy nizo tahlili"
  });

  // 36-45: Ochiq topshiriqlar (O: 40 ta Qonun muddatlari va stavkalari)
  const ochiqSelected = getUniqueItems(poolOchiqVaried, 10, variantNum * 4);
  ochiqSelected.forEach((item, idx) => {
    questions.push({
      num: idx + 36,
      type: "O",
      section: item.section,
      text: item.text,
      acceptableAnswers: item.acceptableAnswers,
      canonicalAnswer: item.canonicalAnswer,
      explanation: item.explanation,
      bookSource: item.bookSource || "10-11 sinf darsliklari (Muddatlar)",
      lawSource: item.lawSource || "40 ta Qonunchilik hujjati"
    });
  });

  return {
    id: `VAR-${variantNum}`,
    variantNumber: variantNum,
    title: `Huquqshunoslik (BMBA) - ${variantNum}-Variant`,
    totalQuestions: 45,
    timeMinutes: 90,
    description: `BMBA milliy test spesifikatsiyasi, 8, 9, 10, 11-sinf darsliklari hamda 40 ta normativ-huquqiy hujjat asosida tuzilgan rasmiy variant №${variantNum}.`,
    sources: {
      textbooks: ["8-sinf yangi.pdf", "9-sinf yangi.pdf", "10-sinf yangi.pdf", "11-sinf yangi.pdf"],
      lawsCount: 40
    },
    questions: questions
  };
}

module.exports = { generateVariant };
