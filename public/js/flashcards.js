// Huquq Milliy Sertifikat - Muddatlar, Foizlar va Muhim Raqamlar trenajyori (40 ta Qonun va 4 ta Darslik tahlili)
const FLASHCARDS_DATA = [
  // ==================== MEHNAT HUQUQI (10-sinf darsligi & Yangi Mehnat kodeksi) ====================
  {
    id: 1,
    category: "Mehnat huquqi",
    question: "Xodimlar uchun normal ish vaqtining davomiyligi haftasiga ko'pi bilan necha soatdan ortiq bo'lishi mumkin emas?",
    answer: "Haftasiga 40 soat",
    reference: "Yangi Mehnat kodeksi, 182-modda",
    note: "Kunlik ish vaqti 5 kunlik haftada 8 soatdan, 6 kunlik haftada 7 soatdan oshmasligi kerak."
  },
  {
    id: 2,
    category: "Mehnat huquqi",
    question: "16 yoshdan 18 yoshgacha bo'lgan xodimlar uchun qisqartirilgan ish vaqtining haftalik davomiyligi qancha?",
    answer: "Haftasiga 36 soat",
    reference: "Mehnat kodeksi, 183 va 414-moddalar",
    note: "15 dan 16 yoshgacha bo'lganlar uchun esa haftasiga 24 soatdan oshmaydi."
  },
  {
    id: 3,
    category: "Mehnat huquqi",
    question: "Oddiy xodimlar uchun dastlabki sinov muddatining eng yuqori chegarasi necha oy?",
    answer: "3 oy",
    reference: "Mehnat kodeksi, 130-modda",
    note: "Tashkilot rahbarlari, o'rinbosarlari va bosh buxgalterlar uchun 6 oygacha."
  },
  {
    id: 4,
    category: "Mehnat huquqi",
    question: "Dastlabki sinov muddati qaysi toifadagi xodimlar uchun qonunan taqiqlanadi?",
    answer: "Homilador ayollar, 3 yoshgacha bolasi borlar va oliy ta'limni yangi bitirganlar",
    reference: "Mehnat kodeksi, 129-modda",
    note: "Ta'lim muassasasini tamomlagan kundan 1 yil ichida birinchi bor ishga kirayotganda sinov belgilanmaydi."
  },
  {
    id: 5,
    category: "Mehnat huquqi",
    question: "Shtat qisqarganda yoki texnologiya o'zgarganda xodim kamida qancha vaqt oldin yozma ogohlantirilishi shart?",
    answer: "2 oy oldin",
    reference: "Mehnat kodeksi, 165-modda",
    note: "Tashkilot butunlay tugatilganda ham kamida 2 oy oldin ogohlantirish shart."
  },
  {
    id: 6,
    category: "Mehnat huquqi",
    question: "Xodim o'z xohishi (tashabbusi) bilan mehnat shartnomasini bekor qilish to'g'risida necha kun oldin ogohlantiradi?",
    answer: "14 kun (ikki hafta) oldin",
    reference: "Mehnat kodeksi, 160-modda",
    note: "Arizani qaytarib olishga ushbu 14 kunlik muddat davomida istalgan paytda haqli."
  },
  {
    id: 7,
    category: "Mehnat huquqi",
    question: "Dastlabki sinov natijasi qoniqarsiz bo'lganda shartnoma necha kun oldin ogohlantirilib bekor qilinadi?",
    answer: "3 kun oldin",
    reference: "Mehnat kodeksi, 132-modda",
    note: "Xodim ham, ish beruvchi ham sinov davrida 3 kun oldin ogohlantirib shartnomani bekor qilishi mumkin."
  },
  {
    id: 8,
    category: "Mehnat huquqi",
    question: "Ish staji 15 yildan ortiq bo'lgan xodimga shtat qisqarganda to'lanadigan ishdan bo'shatish nafaqasi miqdori?",
    answer: "O'rtacha oylik maoshining kamida 200 foizi",
    reference: "Mehnat kodeksi, 173-modda",
    note: "Staj 3 yilgacha - 50%, 3-5 yil - 75%, 5-10 yil - 150%, 10-15 yil - 175%, 15 yildan ortiq - 200%."
  },
  {
    id: 9,
    category: "Mehnat huquqi",
    question: "Har yilgi asosiy mehnat ta'tilining eng kam davomiyligi necha kalendar kun?",
    answer: "21 kalendar kun",
    reference: "Mehnat kodeksi, 217-modda",
    note: "Yangi Mehnat kodeksida 15 ish kunidan 21 kalendar kunga oshirildi."
  },
  {
    id: 10,
    category: "Mehnat huquqi",
    question: "18 yoshga to'lmagan xodimlar uchun har yilgi asosiy ta'til muddati necha kalendar kun?",
    answer: "30 kalendar kun",
    reference: "Mehnat kodeksi, 413-modda",
    note: "I va II guruh nogironligi bo'lgan xodimlarga ham 30 kalendar kun beriladi."
  },
  {
    id: 11,
    category: "Mehnat huquqi",
    question: "Ish vaqtidan tashqari ishning davomiyligi xodim uchun ketma-ket 2 kun davomida va yiliga qancha soatdan oshmasligi kerak?",
    answer: "Surunkasiga 2 kunda 4 soatdan, yiliga 300 soatdan oshmasligi",
    reference: "Mehnat kodeksi, 190-modda",
    note: "Ish smenasi davomiyligi 12 soat bo'lganda, ish vaqtidan tashqari ishga jalb qilish taqiqlanadi."
  },
  {
    id: 12,
    category: "Mehnat huquqi",
    question: "Qonunchilikda qaysi soatlar tungi vaqt deb hisoblanadi?",
    answer: "Soat 22:00 dan 06:00 gacha bo'lgan vaqt",
    reference: "Mehnat kodeksi, 188-modda",
    note: "Tungi vaqtdagi ish uchun kamida bir yarim hissa (150%) miqdorida haq to'lanadi."
  },
  {
    id: 13,
    category: "Mehnat huquqi",
    question: "Dam olish kunlari va bayram kunlaridagi ish uchun xodimga qancha haq to'lanadi?",
    answer: "Kamida ikki hissa (200%) miqdorida",
    reference: "Mehnat kodeksi, 263-modda",
    note: "Xodimning xohishiga ko'ra qo'shimcha dam olish kuni (otgul) berilishi ham mumkin."
  },
  {
    id: 14,
    category: "Mehnat huquqi",
    question: "Intizomiy jarima jazosi xodimning o'rtacha oylik ish haqining necha foizidan oshishi mumkin emas?",
    answer: "30 foizdan (ichki qoidalarda 50 foizgacha)",
    reference: "Mehnat kodeksi, 312-modda",
    note: "Bir qilmish uchun faqat 1 ta intizomiy jazo qo'llaniladi."
  },
  {
    id: 15,
    category: "Mehnat huquqi",
    question: "Intizomiy jazo nojo'ya xatti-harakat aniqlangan kundan va sodir etilgan kundan boshlab qancha muddatda qo'llanilishi mumkin?",
    answer: "Aniqlangandan 1 oy, sodir etilgandan 6 oy ichida",
    reference: "Mehnat kodeksi, 314-modda",
    note: "Moliya-xo'jalik taftishi yoki audit tekshiruvi natijasida esa sodir etilgan kundan 2 yil ichida."
  },
  {
    id: 16,
    category: "Mehnat huquqi",
    question: "Ish haqini to'lash davriyligi kamida qanday bo'lishi shart?",
    answer: "Har yarim oyda kamida bir marta (16 kundan oshmasdan)",
    reference: "Mehnat kodeksi, 253-modda",
    note: "Haq to'lash kuni dam olish yoki bayramga to'g'ri kelsa, undan oldingi kuni to'lanadi."
  },
  {
    id: 17,
    category: "Mehnat huquqi",
    question: "Xodimga ish haqi saqlanmagan ta'tilning umumiy davomiyligi 12 oylik davrda ko'pi bilan qancha bo'lishi mumkin?",
    answer: "Jami 3 oydan oshmasligi kerak",
    reference: "Mehnat kodeksi, 241-modda",
    note: "Karantin yoki favqulodda vaziyatlarda bu muddat Hukumat qarori bilan uzaytirilishi mumkin."
  },

  // ==================== FUQAROLIK HUQUQI (10-sinf darsligi & Fuqarolik kodeksi) ====================
  {
    id: 18,
    category: "Fuqarolik huquqi",
    question: "Fuqarolik huquqida huquqlarni himoya qilish bo'yicha umumiy da'vo muddati necha yil?",
    answer: "3 yil",
    reference: "Fuqarolik kodeksi, 150-modda",
    note: "Maxsus da'vo muddatlari qonun bilan boshqacha belgilanishi mumkin."
  },
  {
    id: 19,
    category: "Fuqarolik huquqi",
    question: "Fuqaroni bedarak yo'qolgan deb topish uchun yashash joyida qancha vaqt ma'lumot bo'lmasligi kerak?",
    answer: "1 yil davomida",
    reference: "Fuqarolik kodeksi, 33-modda",
    note: "Sud qarori bilan manfaatdor shaxslarning arizasiga binoan amalga oshiriladi."
  },
  {
    id: 20,
    category: "Fuqarolik huquqi",
    question: "Fuqaroni vafot etgan deb e'lon qilishning umumiy muddati qancha?",
    answer: "3 yil (o'lim xavfi solgan holatlarda 6 oy)",
    reference: "Fuqarolik kodeksi, 36-modda",
    note: "Harbiy harakatlarda yo'qolgan harbiy xizmatchilar bo'yicha urush tugagach 2 yil o'tgach."
  },
  {
    id: 21,
    category: "Fuqarolik huquqi",
    question: "16 yoshga to'lgan voyaga yetmagan shaxsni to'la muomalaga layoqatli (emansipatsiya) deb e'lon qilish shartlari?",
    answer: "Mehnat shartnomasi bo'yicha ishlayotgan yoki tadbirkorlik bilan shug'ullanayotgan bo'lsa",
    reference: "Fuqarolik kodeksi, 28-modda",
    note: "Ota-onaning roziligi bilan vasiylik organi, rozilik bo'lmasa sud orqali hal qilinadi."
  },
  {
    id: 22,
    category: "Fuqarolik huquqi",
    question: "Meros ochilgan kundan e'tiboran uni qabul qilish uchun qonun bo'yicha necha oy muddat belgilanadi?",
    answer: "6 oy ichida",
    reference: "Fuqarolik kodeksi, 1146-modda",
    note: "Uzrli sabablar bilan o'tkazib yuborilgan muddat sud tomonidan tiklanishi mumkin."
  },
  {
    id: 23,
    category: "Fuqarolik huquqi",
    question: "Merosda voyaga yetmagan yoki mehnatga layoqatsiz merosxo'rlarning majburiy ulushi qancha?",
    answer: "Qonun bo'yicha ulushining kamida yarmi (1/2)",
    reference: "Fuqarolik kodeksi, 1142-modda",
    note: "Vasiyatnoma mazmunidan qat'i nazar majburiy ulush ta'minlanishi shart."
  },
  {
    id: 24,
    category: "Fuqarolik huquqi",
    question: "Ko'chmas mulkni o'ziniki qilib olishga doir egalik muddati (muddati o'tgan egalik) necha yil?",
    answer: "15 yil (ko'char mulk uchun 5 yil)",
    reference: "Fuqarolik kodeksi, 187-modda",
    note: "Shaxs mol-mulkka o'zinikidek halol, oshkora va uzluksiz egalik qilgan bo'lishi shart."
  },
  {
    id: 25,
    category: "Fuqarolik huquqi",
    question: "Topilmani topib olgan shaxs egasi ma'lum bo'lmasa, necha kun ichida militsiyaga yoki hokimlikka xabar berishi shart?",
    answer: "Darhol (uzog'i bilan 3 kun ichida)",
    reference: "Fuqarolik kodeksi, 192-modda",
    note: "Agar 6 oy ichida ashyoning egasi topilmasa, topib olgan shaxs mulk huquqini oladi."
  },
  {
    id: 26,
    category: "Fuqarolik huquqi",
    question: "Qarz shartnomasi qaysi summadan oshganda fuqarolar o'rtasida yozma shaklda tuzilishi shart?",
    answer: "BHMning 10 baravaridan ortiq bo'lganda",
    reference: "Fuqarolik kodeksi, 733-modda",
    note: "Yuridik shaxs qarz beruvchi bo'lsa, summasidan qat'i nazar yozma tuziladi."
  },

  // ==================== OILA HUQUQI (10-sinf darsligi & Oila kodeksi) ====================
  {
    id: 27,
    category: "Oila huquqi",
    question: "O'zbekistonda nikoh yoshi erkaklar va ayollar uchun necha yosh etib belgilangan?",
    answer: "18 yosh",
    reference: "Oila kodeksi, 15-modda",
    note: "Uzrli sabablar (homiladorlik, bola tug'ilishi) bo'lganda hokim qarori bilan ko'pi bilan 1 yilga kamaytiriladi."
  },
  {
    id: 28,
    category: "Oila huquqi",
    question: "FHDY organiga ariza topshirilgach, nikoh necha muddat o'tgach qayd etiladi?",
    answer: "1 oy o'tgach",
    reference: "Oila kodeksi, 13-modda",
    note: "Alohida holatlarda (homiladorlik, hayotga xavf) nikoh ariza berilgan kuni tuzilishi mumkin."
  },
  {
    id: 29,
    category: "Oila huquqi",
    question: "Er qaysi davrda xotinining roziligisiz nikohni bekor qilish to'g'risida sudga da'vo qo'zg'ata olmaydi?",
    answer: "Xotinining homiladorlik vaqtida va bola 1 yoshga to'lguniga qadar",
    reference: "Oila kodeksi, 39-modda",
    note: "Xotinning o'zi esa bu davrda erining roziligisiz ham ajralish da'vosi berishi mumkin."
  },
  {
    id: 30,
    category: "Oila huquqi",
    question: "Sud nikohdan ajratish to'g'risidagi ishlarda er-xotinga yarashish uchun ko'pi bilan qancha muddat berishi mumkin?",
    answer: "6 oygacha muddat",
    reference: "Oila kodeksi, 40-modda",
    note: "Sud ishni ko'rishni kechiktirib, 6 oygacha bo'lgan muddat tayinlaydi."
  },
  {
    id: 31,
    category: "Oila huquqi",
    question: "Sud qaroriga binoan 1 nafar, 2 nafar va 3 nafar bola uchun ota-onadan undiriladigan aliment miqdorlari?",
    answer: "1 bolaga — 1/4 (25%), 2 bolaga — 1/3 (33.3%), 3 va undan ko'piga — 1/2 (50%)",
    reference: "Oila kodeksi, 99-modda",
    note: "Har bir bola uchun aliment eng kam ish haqining 26.5% dan kam bo'lmasligi lozim."
  },
  {
    id: 32,
    category: "Oila huquqi",
    question: "Moddiy ta'minot (aliment) undirish to'g'risidagi talab bo'yicha o'tgan davr uchun ko'pi bilan necha yillik aliment undiriladi?",
    answer: "3 yillik aliment",
    reference: "Oila kodeksi, 136-modda",
    note: "Sudgacha aliment olish choralari ko'rilgani, lekin javobgar to'lashdan bo'yin tovlagani isbotlansa."
  },
  {
    id: 33,
    category: "Oila huquqi",
    question: "Nikoh bekor qilinganidan so'ng sobiq er-xotinning umumiy mol-mulkini bo'lish bo'yicha da'vo muddati necha yil?",
    answer: "3 yil",
    reference: "Oila kodeksi, 27-modda",
    note: "Muddat er-xotin o'z huquqi buzilganini bilgan yoki bilishi lozim bo'lgan kundan hisoblanadi."
  },
  {
    id: 34,
    category: "Oila huquqi",
    question: "Nikoh tugatilganidan so'ng necha kun ichida tug'ilgan bola sobiq erning bolasi deb prezumpsiya qilinadi?",
    answer: "300 kun ichida",
    reference: "Oila kodeksi, 60-modda",
    note: "Sobiq er bola tug'ilgan paytdan boshlab otasi deb tan olinadi."
  },

  // ==================== JINOYAT VA JAZO HUQUQI (11-sinf darsligi & Jinoyat kodeksi) ====================
  {
    id: 35,
    category: "Jinoyat huquqi",
    question: "Jinoiy javobgarlikka tortishning umumiy yoshi necha yosh etib belgilangan?",
    answer: "16 yosh",
    reference: "Jinoyat kodeksi, 17-modda",
    note: "Og'irlashtiruvchi qasddan odam o'ldirish, talonchilik, bosqinchilik kabi moddalar bo'yicha 14 yoshdan."
  },
  {
    id: 36,
    category: "Jinoyat huquqi",
    question: "Ozodlikdan mahrum qilish jazosining eng kam va eng ko'p umumiy muddatlari qancha?",
    answer: "1 oydan 20 yilgacha (umrbod ozodlikdan mahrum qilish alohida)",
    reference: "Jinoyat kodeksi, 50-modda",
    note: "Hukmlar majmui bo'yicha 25 yilgacha tayinlanishi mumkin."
  },
  {
    id: 37,
    category: "Jinoyat huquqi",
    question: "Voyaga yetmagan shaxslarga ozodlikdan mahrum qilish jazosi ko'pi bilan necha yil muddatga tayinlanishi mumkin?",
    answer: "Ko'pi bilan 10 yil muddatga",
    reference: "Jinoyat kodeksi, 85-modda",
    note: "O'ta og'ir jinoyat yoki bir necha jinoyatlar sodir etilganda 12 yildan 15 yilgacha."
  },
  {
    id: 38,
    category: "Jinoyat huquqi",
    question: "Majburiy jamoat ishlari jazosining umumiy belgilangan soat chegarasi qancha?",
    answer: "120 soatdan 480 soatgacha",
    reference: "Jinoyat kodeksi, 45-1-modda",
    note: "Voyaga yetmaganlarga esa 60 soatdan 240 soatgacha, kuniga 2-3 soat."
  },
  {
    id: 39,
    category: "Jinoyat huquqi",
    question: "Axloq tuzatish ishlari jazosi muddati va oylik ish haqidan davlat hisobiga ushlab qolinadigan foiz?",
    answer: "6 oydan 3 yilgacha; ish haqining 10% dan 30% gacha",
    reference: "Jinoyat kodeksi, 46-modda",
    note: "Jazo shaxsning o'z ish joyida yoki maxsus belgilangan boshqa joylarda o'taladi."
  },
  {
    id: 40,
    category: "Jinoyat huquqi",
    question: "Ozodlikni cheklash jazosining muddati qancha etib belgilangan?",
    answer: "6 oydan 5 yilgacha",
    reference: "Jinoyat kodeksi, 48-modda",
    note: "Voyaga yetmaganlarga esa 6 oydan 2 yilgacha tayinlanadi."
  },
  {
    id: 41,
    category: "Jinoyat huquqi",
    question: "Og'ir jinoyatlar sodir etilgan kundan boshlab necha yil o'tsa, shaxs jinoiy javobgarlikdan ozod qilinadi?",
    answer: "8 yil o'tgach",
    reference: "Jinoyat kodeksi, 64-modda",
    note: "Ijtimoiy xavfi katta bo'lmaganda 2 yil, uncha og'ir bo'lmaganda 4 yil, o'ta og'irda 14 yil."
  },
  {
    id: 42,
    category: "Jinoyat protsessi",
    question: "Ushlangan gumon qilinuvchi shaxs ushlangan vaqtdan boshlab uzog'i bilan necha soat ichida so'roq qilinishi shart?",
    answer: "24 soatdan kechiktirmasdan",
    reference: "Jinoyat-protsessual kodeksi, 226-modda",
    note: "Qamoqqa olish ehtiyot chorasi qo'llanilganda sud qarori 48 soat ichida chiqarilishi kerak."
  },
  {
    id: 43,
    category: "Jinoyat protsessi",
    question: "Voyaga yetmagan shaxsni bir kunda so'roq qilishning umumiy va tanaffussiz vaqt me'yori?",
    answer: "Kuniga jami 4 soatdan, tanaffussiz 2 soatdan oshmasligi kerak",
    reference: "Jinoyat-protsessual kodeksi, 121-modda",
    note: "Pedagog yoki psixolog ishtiroki qonunan shart."
  },

  // ==================== MA'MURIY HUQUQ (11-sinf darsligi & MJtK) ====================
  {
    id: 44,
    category: "Ma'muriy huquq",
    question: "Ma'muriy javobgarlikka tortish yoshi necha yosh?",
    answer: "16 yosh",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 13-modda",
    note: "Huquqbuzarlik sodir etilgan paytda 16 yoshga to'lgan bo'lishi kerak."
  },
  {
    id: 45,
    category: "Ma'muriy huquq",
    question: "Ma'muriy qamoq jazosining umumiy eng ko'p muddati necha sutka?",
    answer: "15 sutkagacha (favqulodda holatda 30 sutkagacha)",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 29-modda",
    note: "Homilador ayollar, 12 yoshgacha bolasi borlar va 1-2 guruh nogironlariga qamoq qo'llanilmaydi."
  },
  {
    id: 46,
    category: "Ma'muriy huquq",
    question: "Tuzilgan ma'muriy bayonnoma ko'rib chiqish uchun vakolatli organga (sudga) necha vaqtda yuboriladi?",
    answer: "1 sutka (24 soat) ichida",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 282-modda",
    note: "Ish tushgan kundan e'tiboran 15 kun ichida ko'rib chiqiladi."
  },
  {
    id: 47,
    category: "Ma'muriy huquq",
    question: "Ma'muriy jazo qo'llash to'g'risidagi qaror ustidan shikoyat berish muddati necha kun?",
    answer: "10 kun ichida",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 315-modda",
    note: "Qaror nusxasi topshirilgan kundan e'tiboran 10 kun."
  },
  {
    id: 48,
    category: "Ma'muriy huquq",
    question: "Ixtiyoriy to'lov tizimida jarimaning 50 foizini to'lash muddati necha kun?",
    answer: "15 kun ichida (30 kunda to'lansa 70%)",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 332-1-modda",
    note: "Ushbu muddatda 50% to'lansa, jarimaning qolgan qismidan ozod qilinadi."
  },
  {
    id: 49,
    category: "Ma'muriy huquq",
    question: "Ma'muriy jazo chorasi huquqbuzarlik sodir etilgan kundan boshlab uzog'i bilan qancha muddatda qo'llanilishi mumkin?",
    answer: "1 yil ichida",
    reference: "Ma'muriy javobgarlik to'g'risidagi kodeks, 36-modda",
    note: "1 yil o'tgach ma'muriy ish qo'zg'atilishi mumkin emas."
  },

  // ==================== KONSTITUTSIYAVIY HUQUQ (9-sinf darsligi & Yangi Konstitutsiya) ====================
  {
    id: 50,
    category: "Konstitutsiyaviy huquq",
    question: "O'zbekiston Respublikasi Prezidenti necha yil muddatga saylanadi?",
    answer: "7 yil muddatga",
    reference: "O'zbekiston Respublikasi Konstitutsiyasi, 106-modda",
    note: "Ayni bir shaxs surunkasiga ikki muddatdan ortiq Prezident bo'lishi mumkin emas."
  },
  {
    id: 51,
    category: "Konstitutsiyaviy huquq",
    question: "O'zbekiston Respublikasi Prezidentligiga nomzod shaxs uchun yosh va muqim yashash mezonlari?",
    answer: "Kamida 35 yosh va kamida 10 yil muqim yashagan bo'lishi",
    reference: "Konstitutsiya, 106-modda",
    note: "Davlat tilini yaxshi biladigan O'zbekiston fuqarosi saylanishi mumkin."
  },
  {
    id: 52,
    category: "Konstitutsiyaviy huquq",
    question: "Oliy Majlis Qonunchilik palatasi va Senati a'zolarining soni va vakolat muddati?",
    answer: "150 deputat va 65 senator; vakolat muddati — 5 yil",
    reference: "Konstitutsiya, 91 va 92-moddalar",
    note: "Senatning 56 nafari hududlardan saylanadi, 9 nafari Prezident tomonidan tayinlanadi."
  },
  {
    id: 53,
    category: "Konstitutsiyaviy huquq",
    question: "Qonunchilik palatasi deputati va Senat a'zosi bo'lish uchun minimal yosh chegarasi?",
    answer: "25 yosh",
    reference: "Konstitutsiya, 93-modda",
    note: "Saylov kuni 25 yoshga to'lgan va kamida 5 yil doimiy yashagan fuqaro."
  },
  {
    id: 54,
    category: "Konstitutsiyaviy huquq",
    question: "Konstitutsiyaviy sud sudyalari necha yil muddatga saylanadi?",
    answer: "10 yil muddatga (qayta saylanish huquqisiz)",
    reference: "Konstitutsiya, 132-modda & Konstitutsiyaviy sud to'g'risidagi Qonun",
    note: "Yoshi 35 yoshdan kichik bo'lmagan yuqori malakali huquqshunoslar saylanadi."
  },
  {
    id: 55,
    category: "Konstitutsiyaviy huquq",
    question: "Qabul qilingan qonunni Prezident necha kun ichida imzolaydi yoki e'tiroz bilan qaytaradi (veto)?",
    answer: "60 kun ichida",
    reference: "Konstitutsiya, 99-modda",
    note: "Agar palatalar 2/3 ovoz bilan qonunni qayta ma'qullasa, Prezident 14 kun ichida imzolashi shart."
  },
  {
    id: 56,
    category: "Konstitutsiyaviy huquq",
    question: "Qonunchilik palatasi qabul qilgan qonun Senatga yuborilgach, Senat uni ko'rib chiqish muddati?",
    answer: "60 kun ichida",
    reference: "Konstitutsiya, 98-modda",
    note: "Agar Senat 60 kunda ko'rib chiqmasa, qonun to'g'ridan-to'g'ri Prezidentga imzolash uchun yuboriladi."
  },

  // ==================== MAXSUS QONUNLAR (Advokatura, Notariat, Sudlar, Iste'molchi, Mualliflik) ====================
  {
    id: 57,
    category: "Iste'molchilar huquqi",
    question: "Iste'molchi maqbul sifatli nooziq-ovqat tovarini necha kun ichida almashtirib olishga haqli?",
    answer: "14 kun ichida",
    reference: "Iste'molchilarning huquqlarini himoya qilish to'g'risidagi Qonun, 18-modda",
    note: "Tovar ishlatilmagan, qadoqlari va cheki saqlangan bo'lishi lozim."
  },
  {
    id: 58,
    category: "Iste'molchilar huquqi",
    question: "Nuqsonli tovar aniqlanganda sotuvchi uni uzog'i bilan necha kunda almashtirib berishi shart?",
    answer: "7 kun ichida (qo'shimcha tekshiruv bilan 20 kun)",
    reference: "Iste'molchilarning huquqlarini himoya qilish to'g'risidagi Qonun, 14-modda",
    note: "Tovar yo'q bo'lsa, iste'molchi bilan kelishilgan holda 1 oy ichida."
  },
  {
    id: 59,
    category: "Advokatura",
    question: "Advokat maqomini olish uchun talabgor oliy yuridik ma'lumot va kamida qancha yuridik stajga ega bo'lishi kerak?",
    answer: "Kamida 2 yillik yuridik staj",
    reference: "Advokatura to'g'risidagi Qonun, 3-modda",
    note: "Kamida 3 oylik advokatlik tuzilmasidagi stajirovkadan o'tish ham shart."
  },
  {
    id: 60,
    category: "Notariat",
    question: "Notarius lavozimiga tayinlanish uchun yosh chegarasi va yuridik staj me'yori?",
    answer: "Kamida 25 yosh va kamida 3 yillik yuridik staj",
    reference: "Notariat to'g'risidagi Qonun, 2-modda",
    note: "Notariat idorasida kamida 1 yillik stajirovkadan o'tgan bo'lishi shart."
  },
  {
    id: 61,
    category: "Sudlar to'g'risida",
    question: "Tuman (shahar) sudining sudyasi lavozimiga saylanish yoki tayinlanish uchun minimal yosh va staj?",
    answer: "Kamida 35 yosh va kamida 5 yillik yuridik staj",
    reference: "Sudlar to'g'risidagi Qonun, 62-modda",
    note: "Sudyalar birinchi marta 5 yil, keyin 10 yil, so'ngra muddatsiz davrga tayinlanadi."
  },
  {
    id: 62,
    category: "Intellektual mulk",
    question: "Ixtiro patenti va sanoat namunasi patentining amal qilish muddatlari?",
    answer: "Ixtiroga — 20 yil, sanoat namunasiga — 10 yil (5 yilga uzaytiriladi)",
    reference: "Ixtirolar, foydali modellar va sanoat namunalari to'g'risidagi Qonun",
    note: "Foydali model patenti 5 yil amal qiladi (3 yilga uzaytiriladi)."
  },
  {
    id: 63,
    category: "Intellektual mulk",
    question: "Mualliflik mulkiy huquqlari muallif vafotidan so'ng qancha muddat davomida amal qiladi?",
    answer: "70 yil davomida",
    reference: "Mualliflik huquqi va turdosh huquqlar to'g'risidagi Qonun, 35-modda",
    note: "Muddati tugagach, asar umumxalq boyligiga aylanadi."
  },
  {
    id: 64,
    category: "Davlat fuqarolik xizmati",
    question: "Davlat fuqarolik xizmatiga qabul qilinish uchun yosh chegarasi?",
    answer: "18 yoshga to'lgan bo'lishi",
    reference: "Davlat fuqarolik xizmati to'g'risidagi Qonun, 19-modda",
    note: "Davlat tilini biladigan fuqarolar ochiq tanlov asosida qabul qilinadi."
  }
];

if (typeof module !== 'undefined') {
  module.exports = FLASHCARDS_DATA;
}
