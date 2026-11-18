// Huquqshunoslik fanidan Milliy Test Tizimi (BMBA) - T-760 Varianti
const EXAM_DATA = {
  id: "T-760",
  title: "Huquqshunoslik fanlari (BMBA) - Namunaviy variant T-760",
  totalQuestions: 45,
  timeMinutes: 90,
  description: "Milliy sertifikat test varianti tafsilotiga to'liq mos: 32 ta yopiq (Y-1), 3 ta vaziyatli (Y-2), 10 ta qisqa javobli ochiq (O) topshiriq.",
  sections: [
    { id: 1, name: "Davlat va huquq nazariyasi (asoslari)", range: [1, 6] },
    { id: 2, name: "Konstitutsiyaviy huquq asoslari", range: [7, 17] },
    { id: 3, name: "Huquq sohalari", range: [18, 35] },
    { id: 4, name: "Ochiq topshiriqlar (qisqa javob)", range: [36, 45] }
  ],
  questions: [
    {
      num: 1,
      type: "Y-1",
      section: "Davlat va huquq nazariyasi",
      text: "Biror bir mamlakat ichida amalga oshiriladigan funksiyalar davlatning ichki funksiyalari hisoblanadi.\n\nQuyidagilardan davlatning iqtisodiy (a) va ijtimoiy (b) sohadagi ichki funksiyalarini aniqlang.\n1) iqtisodiy siyosatni ishlab chiqish va iqtisodiyotga ta’sir o‘tkazish;\n2) mulk daxlsizligini ta’minlash;\n3) aholining yordamga muhtoj qismini himoyalash;\n4) pul aylanmasi ustidan nazorat;\n5) aholini ijtimoiy ne’matlar bilan ta’minlash;\n6) bozor munosabatlarining huquqiy asoslari va narx siyosatini yo‘lga qo‘yish.",
      options: [
        { key: "A", text: "a-1, 6; b-2, 5" },
        { key: "B", text: "a-1, 6; b-3, 5" },
        { key: "C", text: "a-1, 4; b-2, 3" },
        { key: "D", text: "a-3, 5; b-2, 4" }
      ],
      correct: "B",
      explanation: "Iqtisodiy sohadagi ichki funksiyalar: 1 (iqtisodiy siyosat ishlab chiqish) va 6 (bozor munosabatlari va narx siyosati). Ijtimoiy sohadagi ichki funksiyalar: 3 (aholining muhtoj qismini himoyalash) va 5 (ijtimoiy ne'matlar bilan ta'minlash). To'g'ri javob: B."
    },
    {
      num: 2,
      type: "Y-1",
      section: "Davlat va huquq nazariyasi",
      text: "Quyidagi jadvalning qaysi qatorlaridagi ma’lumotlar bir-biriga mos ravishda to‘g‘ri berilgan?\n\n№ | Davlatlar | Boshqaruv shakli | Tuzilishi\n1 | Italiya | Parlamentar respublika | Unitar\n2 | Gretsiya | Prezidentlik respublikasi | Federativ\n3 | Boliviya | Prezidentlik respublikasi | Unitar\n4 | Portugaliya | Prezidentlik respublikasi | Federativ\n5 | Finlandiya | Parlamentar respublika | Unitar\n6 | Germaniya | Parlamentar respublika | Federativ",
      options: [
        { key: "A", text: "2, 3, 4, 6" },
        { key: "B", text: "1, 3, 4, 5" },
        { key: "C", text: "1, 3, 5, 6" },
        { key: "D", text: "2, 4, 5, 6" }
      ],
      correct: "C",
      explanation: "1 - Italiya (Parlamentar, unitar) to'g'ri; 3 - Boliviya (Prezidentlik, unitar) to'g'ri; 5 - Finlandiya (Parlamentar, unitar) to'g'ri; 6 - Germaniya (Parlamentar, federativ) to'g'ri. Gretsiya va Portugaliya unitar davlatlardir. To'g'ri javob: C (1, 3, 5, 6)."
    },
    {
      num: 3,
      type: "Y-1",
      section: "Jinoyat huquqi",
      text: "Jinoyat Kodeksi, 148-modda:\nBila turib, g‘ayriqonuniy ravishda ishdan bo‘shatish, shunday qilmishlar uchun ma’muriy jazo qo‘llanilganidan keyin sodir etilsa, «bazaviy hisoblash miqdorining yigirma besh baravarigacha miqdorda jarima yoki uch yilgacha muayyan huquqdan mahrum qilish yoki uch yilgacha axloq tuzatish ishlari bilan jazolanadi».\n\nUshbu moddaning ajratib ko‘rsatilgan qismi huquq normasining qaysi tarkibiy qismi (elementi)ga oid?",
      options: [
        { key: "A", text: "dispozitsiya" },
        { key: "B", text: "gipoteza" },
        { key: "C", text: "promulgatsiya" },
        { key: "D", text: "sanksiya" }
      ],
      correct: "D",
      explanation: "Huquq normasi uch qismdan iborat: Gipoteza (shart), Dispozitsiya (xulq-atvor qoidasi) va Sanksiya (jazo chorasi). Ajratilgan qismda jazo choralari sanab o'tilganligi sababli bu sanksiyadir."
    },
    {
      num: 4,
      type: "Y-1",
      section: "Fuqarolik huquqi",
      text: "Quyidagi vaziyatni tahlil qiling va qo‘yilgan savolga javob bering.\n\n\"Yashil Makon\" MCHJ va fuqaro Alimov B.A. o‘rtasida oldi-sotdi shartnomasi tuzildi. Shartnomaga ko‘ra, Alimov B.A. MCHJga 100 tup mevali daraxt ko‘chatini yetkazib berishi, MCHJ esa buning uchun 5 million so‘m to‘lashi kerak.\n\nUshbu vaziyatda \"100 tup mevali daraxt ko‘chatini yetkazib berish\" huquqiy munosabatlarning qaysi tarkibiy elementiga oid hisoblanadi?",
      options: [
        { key: "A", text: "obyekt" },
        { key: "B", text: "yuridik majburiyat" },
        { key: "C", text: "subyekt" },
        { key: "D", text: "subyektiv huquq" }
      ],
      correct: "A",
      explanation: "Huquqiy munosabatlarning subyektlari - MCHJ va Alimov B.A. Yuridik majburiyat - harakat qilish burchi. Subyektiv huquq - talab qilish imkoniyati. Obyekt esa munosabat nimaga qaratilgan bo'lsa (moddiy yoki nomoddiy ne'mat, bu yerda daraxt ko'chatlari va uni yetkazib berish) shudir."
    },
    {
      num: 5,
      type: "Y-1",
      section: "Davlat va huquq nazariyasi",
      text: "Huquqbuzarlikning ijtimoiy xavflilik (a) va ayblilik (b) belgilari to‘g‘ri ko‘rsatilgan javobni aniqlang.\n1) huquqbuzarning qonun normalari belgilab qo‘ygan majburiy talablarni buzishi;\n2) ijtimoiy hayot ishtirokchilari bo‘lgan turli shaxslar, jamiyat, davlatning qonuniy huquq va manfaatlariga huquqbuzarlik oqibatida zarar yetkazish;\n3) huquqbuzarlik sodir etgan shaxsning vakolatli davlat organi tomonidan javobgarlikka tortilishi;\n4) ijtimoiy xavfli qilmishni qasddan yoki ehtiyotsizlikdan sodir etish.",
      options: [
        { key: "A", text: "a-1, b-4" },
        { key: "B", text: "a-1, b-3" },
        { key: "C", text: "a-2, b-4" },
        { key: "D", text: "a-2, b-3" }
      ],
      correct: "C",
      explanation: "Ijtimoiy xavflilik (a) - shaxslar, jamiyat va davlat manfaatlariga zarar yetkazish (2). Ayblilik (b) - qasddan yoki ehtiyotsizlikdan sodir etilganlik (4). To'g'ri javob: C."
    },
    {
      num: 6,
      type: "Y-1",
      section: "Jinoyat huquqi",
      text: "Nuqtalar o‘rniga mos keluvchi javobni aniqlang.\n(Jinoyat kodeksi, 45-1-modda)\nMajburiy jamoat ishlari bir yuz yigirma soatdan to‘rt yuz sakson soatgacha bo‘lgan muddatga tayinlanadi va (a). . . davomida kuniga to‘rt soatdan ko‘p bo‘lmagan vaqtda, mahkumga bog‘liq bo‘lmagan holatlar yuzaga kelgan taqdirda esa, (b). . . gacha bo‘lgan muhlatda kuniga to‘rt soatdan ko‘p bo‘lmagan vaqtda o‘taladi.\n1) olti oy; 2) bir yil; 3) uch yil; 4) besh yil.",
      options: [
        { key: "A", text: "a-2, b-3" },
        { key: "B", text: "a-1, b-2" },
        { key: "C", text: "a-1, b-4" },
        { key: "D", text: "a-3, b-4" }
      ],
      correct: "A",
      explanation: "JK 45-1-moddasiga ko'ra, majburiy jamoat ishlari bir yil (2) davomida, mahkumga bog'liq bo'lmagan holatlar yuzaga kelgan taqdirda esa uch yilgacha (3) bo'lgan muhlatda o'taladi. Javob: A (a-2, b-3)."
    },
    {
      num: 7,
      type: "Y-1",
      section: "Oila huquqi",
      text: "Oila kodeksining 67-moddasiga ko‘ra, \"bolaning himoyaga bo‘lgan huquqi\"ga oid to‘g‘ri ma’lumotlarni aniqlang.\n1) bolaning huquqi va qonuniy manfaatlarini himoya qilish uning ota-onasi (ularning o‘rnini bosuvchi shaxslar) tomonidan amalga oshiriladi;\n2) voyaga yetmagan bola qonunga muvofiq to‘la muomala layoqatiga ega deb e’tirof etilsa ham u o‘z huquq va majburiyatlarini, shu jumladan himoya huquqini mustaqil amalga oshirishga haqli emas;\n3) bolaning hayoti yoki sog‘lig‘iga xavf tug‘ilganligidan, uning huquq va qonuniy manfaatlari buzilganligidan xabardor bo‘lgan shaxslar bu haqda bola ayni paytda yashab turgan joydagi vasiylik va homiylik organiga ma’lum qilishi shart;\n4) bolaning huquq va qonuniy manfaatlari buzilganda bola o‘z huquq va qonuniy manfaatlari himoya qilinishini so‘rab vasiylik va homiylik organiga, o‘n yoshga to‘lgandan keyin esa mustaqil ravishda sudga murojaat qilish huquqiga ega.",
      options: [
        { key: "A", text: "1, 3" },
        { key: "B", text: "2, 3" },
        { key: "C", text: "2, 4" },
        { key: "D", text: "1, 4" }
      ],
      correct: "A",
      explanation: "Oila kodeksi 67-moddasiga asosan: 1 va 3 to'g'ri. 4-band xato, chunki bola 14 yoshga to'lgandan keyin mustaqil sudga murojaat qilishi mumkin (10 yosh emas). To'g'ri javob: A."
    },
    {
      num: 8,
      type: "Y-1",
      section: "Mehnat huquqi",
      text: "O‘quv yili davomida o‘qishdan bo‘sh vaqtida ishlayotgan o‘n oltidan o‘n sakkiz yoshgacha bo‘lgan xodimlar (a) va o‘n beshdan o‘n olti yoshgacha bo‘lgan shaxslar (b) uchun ish vaqtining davomiyligi haftasiga necha soatdan oshmaydigan qilib belgilanadi?\n(Mehnat Kodeksi, 415-modda)\n1) 24 soat; 2) 18 soat; 3) 16 soat; 4) 12 soat",
      options: [
        { key: "A", text: "a-2, b-4" },
        { key: "B", text: "a-1, b-4" },
        { key: "C", text: "a-2, b-3" },
        { key: "D", text: "a-1, b-3" }
      ],
      correct: "A",
      explanation: "Mehnat kodeksining 415-moddasiga binoan, o'qishdan bo'sh vaqtida ishlayotgan 16 dan 18 yoshgacha bo'lganlar uchun haftasiga 18 soatdan (2), 15 dan 16 yoshgacha bo'lganlar uchun esa 12 soatdan (4) oshmasligi kerak. To'g'ri javob: A (a-2, b-4)."
    },
    {
      num: 9,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq",
      text: "Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to‘g‘ri/noto‘g‘ri) keltirilgan javobni aniqlang.\n(O‘zbekiston Respublikasi Konstitutsiyasi)\nI. Davlat NNTlar huquqlari va manfaatlariga rioya etilishini ta’minlaydi, biroq ularga teng huquqiy imkoniyatlar yaratilmaydi;\nII. Davlat organlari va NNTlarning bir-birining faoliyatiga aralashishiga yo‘l qo‘yilmaydi;\nIII. Tadbirkorlar har qanday faoliyatni amalga oshirishga va yo‘nalishlarni mustaqil tanlashga haqli emas;\nIV. O‘zbekiston hududida iqtisodiy makon birligi, tovarlar, xizmatlar, mehnat resurslari va moliyaviy mablag‘larning erkin harakatlanishi kafolatlanadi;\nV. Siyosiy partiyalar moliyalashtirish bo‘yicha Oliy Majlis Senatiga hisobot taqdim etadilar.",
      options: [
        { key: "A", text: "I-noto‘g‘ri; II-to‘g‘ri; III-noto‘g‘ri; IV-to‘g‘ri; V-noto‘g‘ri" },
        { key: "B", text: "I-to‘g‘ri; II-noto‘g‘ri; III-noto‘g‘ri; IV-to‘g‘ri; V-to‘g‘ri" },
        { key: "C", text: "I-noto‘g‘ri; II-to‘g‘ri; III-to‘g‘ri; IV-noto‘g‘ri; V-noto‘g‘ri" },
        { key: "D", text: "I-to‘g‘ri; II-to‘g‘ri; III-noto‘g‘ri; IV-noto‘g‘ri; V-to‘g‘ri" }
      ],
      correct: "A",
      explanation: "I-noto'g'ri (teng imkoniyat yaratiladi); II-to'g'ri (aralashuv taqiqlanadi); III-noto'g'ri (tadbirkorlar erkin tanlashga haqli); IV-to'g'ri (erkin harakatlanish kafolatlanadi); V-noto'g'ri (Senatga emas, Qonunchilik palatasiga yoki belgilangan organga beriladi). To'g'ri javob: A."
    },
    {
      num: 10,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq",
      text: "O‘zbekiston Respublikasining Davlat bayrog‘i to‘g‘risida\"gi qonunning 5-moddasiga ko‘ra, Davlat bayrog‘i doimiy ravishda . . . binosida ko‘tariladi.\n1) ijro etuvchi hokimiyat organlarining;\n2) O‘zbekiston Respublikasining diplomatik vakolatxonalarining;\n3) O‘zbekiston Respublikasining konsullik muassasalarining;\n4) mahalliy davlat hokimiyati organlarining.",
      options: [
        { key: "A", text: "2, 3" },
        { key: "B", text: "1, 3" },
        { key: "C", text: "1, 4" },
        { key: "D", text: "2, 4" }
      ],
      correct: "A",
      explanation: "Qonunning 5-moddasiga ko'ra, chet ellardagi diplomatik vakolatxonalar va konsullik muassasalari binolarida bayroq doimiy ravishda ko'tariladi. To'g'ri javob: A (2, 3)."
    },
    {
      num: 11,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq",
      text: "To‘g‘ri berilgan ma’lumotlarni aniqlang.\n(\"O‘zbekiston Respublikasining fuqaroligi to‘g‘risida\"gi qonun, 42-, 44-, 45-moddalar)\n1) Fuqarolik masalalari bo‘yicha takroriy murojaat materiallarni ko‘rib chiqishni tugatish haqida qaror qabul qilinganidan so‘ng bir yil o‘tgach qabul qilinadi;\n2) Fuqarolikka mansub emaslik haqidagi so‘rovnomani ko‘rib chiqish muddati uch oyni tashkil etadi;\n3) Fuqaroligi bo‘lmagan shaxsni fuqaro deb tan olish to‘g‘risidagi ariza olti oyni tashkil etadi;\n4) Fuqarolik masalalariga oid materiallarni ko‘rib chiqish tugatilgan taqdirda to‘langan davlat boji yoki konsullik yig‘imi qaytarib berilmaydi.",
      options: [
        { key: "A", text: "2, 4" },
        { key: "B", text: "1, 4" },
        { key: "C", text: "2, 3" },
        { key: "D", text: "1, 3" }
      ],
      correct: "B",
      explanation: "1-band (bir yil o'tgach qabul qilinadi) va 4-band (davlat boji qaytarilmaydi) to'g'ri. To'g'ri javob: B (1, 4)."
    },
    {
      num: 12,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq",
      text: "Nuqtalar o‘rniga mos keluvchi javobni aniqlang.\nO‘zbekiston Respublikasi Konstitutsiyasi\nInson va fuqaroning asosiy huquqlari, erkinliklari va burchlari\n• har kim uy-joyli bo‘lish huquqiga ega;\n• har kim qulay atrof-muhitga, uning holati to‘g‘risidagi ishonchli axborotga ega bo‘lish huquqiga ega;\n• . . .",
      options: [
        { key: "A", text: "davlat Internet jahon axborot tarmog‘idan foydalanishni ta’minlash uchun shart-sharoitlar yaratadi" },
        { key: "B", text: "fuqarolar o‘z ijtimoiy faolliklarini O‘zbekiston Respublikasi qonunlariga muvofiq mitinglar, yig‘ilishlar va namoyishlar shaklida amalga oshirish huquqiga ega" },
        { key: "C", text: "har kimga ilmiy, texnikaviy va badiiy ijod erkinligi, madaniyat yutuqlaridan foydalanish huquqi kafolatlanadi" },
        { key: "D", text: "hech kim rasmiy e’lon qilinmagan qonun asosida hukm qilinishi, jazoga tortilishi, mol-mulkidan yoki biron-bir huquqidan mahrum etilishi mumkin emas" }
      ],
      correct: "C",
      explanation: "Madaniy va ijtimoiy huquqlar turkumiga kiruvchi norma C variantda keltirilgan (har kimga ilmiy, texnikaviy va badiiy ijod erkinligi...). To'g'ri javob: C."
    },
    {
      num: 13,
      type: "Y-1",
      section: "Inson huquqlari",
      text: "Oliy Majlisning Inson huquqlari bo‘yicha vakili (ombudsman) to‘g‘risidagi qonunning 12-moddasiga ko‘ra, \"ombudsmanning huquqlari\"ga oid to‘g‘ri ma’lumotlarni aniqlang.\n1) inson huquqlari va erkinliklari buzilishiga yo‘l qo‘ymaslik haqida tashkilotlar va mansabdor shaxslarga yozma ogohlantirish yuborish;\n2) buzilishlarni, ularga imkon beruvchi sabablar va shart-sharoitlarni bartaraf etish haqida ko‘rib chiqilishi majburiy bo‘lgan taqdimnomalar kiritish;\n3) shaxslarni javobgarlikka tortish to‘g‘risida tegishli tashkilotlarga ariza bilan murojaat qilish;\n4) sudning vakolatlari doirasiga kiradigan masalalarni ko‘rib chiqish.",
      options: [
        { key: "A", text: "1, 2" },
        { key: "B", text: "3, 4" },
        { key: "C", text: "2, 3" },
        { key: "D", text: "1, 4" }
      ],
      correct: "A",
      explanation: "Ombudsman ogohlantirish (1) va taqdimnoma (2) kiritish huquqiga ega. Sud vakolatiga kiradigan masalalarni ko'rib chiqishga haqli emas (4-band xato). To'g'ri javob: A (1, 2)."
    },
    {
      num: 14,
      type: "Y-1",
      section: "Fuqarolik jamiyati",
      text: "To‘g‘ri berilgan ma’lumotlarni aniqlang.\n(\"Jamoat birlashmalari to‘g‘risida\"gi qonun, 8-, 11-, 12-moddalar)\n1) jamoat birlashmasi kamida o‘n nafar fuqaroning tashabbusi bilan tuziladi;\n2) O‘zbekistonda amal qiluvchi xalqaro, jumhuriyat, viloyatlararo birlashmalar ustavlari Adliya vazirligi tomonidan ro‘yxatga olinadi;\n3) Qoraqalpog‘istonda ustavni ro‘yxatga olish tartibi faqat O‘zbekiston Respublikasi qonunchiligi bilan belgilanadi;\n4) ustav qabul qilingan kundan boshlab bir oy muddat ichida ariza topshiriladi;\n5) ariza u topshirilgan kundan boshlab uch oy muddatda ko‘rib chiqiladi;\n6) ro‘yxatdan o‘tkazganlik uchun Vazirlar Mahkamasi tomonidan belgilanadigan miqdorda davlat boji undiriladi;\n7) rad etilishi ustidan faqat viloyat sudiga shikoyat qilish mumkin.",
      options: [
        { key: "A", text: "1, 2, 4, 6" },
        { key: "B", text: "2, 4, 5, 7" },
        { key: "C", text: "1, 3, 4, 7" },
        { key: "D", text: "2, 3, 5, 6" }
      ],
      correct: "A",
      explanation: "1 (kamida 10 nafar), 2 (Adliya vazirligi ro'yxatga oladi), 4 (bir oy muddatda topshiriladi) va 6 (Vazirlar Mahkamasi belgilagan davlat boji) to'g'ri. Ko'rib chiqish muddati 1 oy (3 oy emas). To'g'ri javob: A."
    },
    {
      num: 15,
      type: "Y-1",
      section: "Konstitutsiyaviy huquq",
      text: "O‘zbekiston Respublikasi Vazirlar Mahkamasining ijtimoiy sohadagi vakolatlarini aniqlang.\n(\"Vazirlar Mahkamasi to‘g‘risida\"gi qonun, 12-modda)\n1) bozor munosabatlarini rivojlantirish, halol raqobat uchun shart-sharoitlar yaratish;\n2) oila, onalik, otalik va bolalik muhofaza qilinishini ta’minlaydi, yoshlarga oid davlat siyosatini amalga oshirish choralarini ko‘radi;\n3) turizm industriyasini rivojlantirish va turizm infratuzilmasini kengaytirish;\n4) ijtimoiy yordam ko‘rsatish bo‘yicha davlat dasturlarining ishlab chiqilishi va amalga oshirilishini ta’minlaydi, aholining uy-joy sharoitlarini yaxshilash choralarini ko‘radi.",
      options: [
        { key: "A", text: "2, 3" },
        { key: "B", text: "1, 4" },
        { key: "C", text: "2, 4" },
        { key: "D", text: "1, 3" }
      ],
      correct: "C",
      explanation: "1-iqtisodiy soha, 3-madaniy-gumanitar/iqtisodiy soha. 2 va 4 esa aniq ijtimoiy sohadagi vakolatlar hisoblanadi. To'g'ri javob: C (2, 4)."
    },
    {
      num: 16,
      type: "Y-1",
      section: "Sud hokimiyati",
      text: "Sudyaning daxlsizligiga oid to‘g‘ri ma’lumotlarni aniqlang.\n(\"Sudlar to‘g‘risida\"gi qonun, 64-modda)\n1) Sudyalar daxlsizligini buzganlik faktlari bo‘yicha taqdimnoma prokuratura organlari tomonidan uch oy muddatda ko‘rib chiqiladi;\n2) sudyani guvoh yoki gumon qilinuvchi sifatida so‘roq qilish uchun chaqirishga faqat tegishli sudyalar malaka hay’atining roziligi bilan yo‘l qo‘yiladi;\n3) sudya ushlab turilgan taqdirda Sudyalar oliy kengashiga yigirma to‘rt soatdan kechiktirmasdan xabar qilinishi shart;\n4) Sudyaning turar joyiga kirish, tintuv o‘tkazish faqat sudning qaroriga binoan yoki O‘zbekiston Respublikasi Bosh prokurorining ruxsati bilan amalga oshirilishi mumkin.",
      options: [
        { key: "A", text: "1, 4" },
        { key: "B", text: "2, 4" },
        { key: "C", text: "2, 3" },
        { key: "D", text: "1, 3" }
      ],
      correct: "B",
      explanation: "Sudlar to'g'risidagi qonunning 64-moddasiga binoan 2 va 4-qoidalar to'g'ri. Xabar qilish muddati darhol/qisqa muddat. To'g'ri javob: B (2, 4)."
    },
    {
      num: 17,
      type: "Y-1",
      section: "Xalqaro huquq",
      text: "BMT tomonidan qabul qilingan qaysi xalqaro huquq hujjatlari Inson huquqlari Xartiyasini tashkil qiladi?\n1) Inson huquqlari umumjahon deklaratsiyasi;\n2) Bola huquqlari haqidagi Konvensiya;\n3) Iqtisodiy, ijtimoiy va madaniy huquqlar to‘g‘risidagi xalqaro pakt;\n4) \"Xalqaro madaniy hamkorlik prinsiplari\" deklaratsiyasi;\n5) Fuqarolik va siyosiy huquqlar to‘g‘risidagi xalqaro pakt;\n6) Xotin-qizlarning siyosiy huquqlari to‘g‘risidagi konvensiya.",
      options: [
        { key: "A", text: "4, 5, 6" },
        { key: "B", text: "2, 4, 6" },
        { key: "C", text: "1, 3, 5" },
        { key: "D", text: "1, 2, 3" }
      ],
      correct: "C",
      explanation: "Inson huquqlari Xartiyasi (International Bill of Human Rights) uchta asosiy hujjatdan iborat: 1) Umumjahon deklaratsiyasi (1948), 3) Iqtisodiy, ijtimoiy va madaniy pakt (1966), 5) Fuqarolik va siyosiy huquqlar pakti (1966). To'g'ri javob: C (1, 3, 5)."
    },
    {
      num: 18,
      type: "Y-1",
      section: "Oila huquqi",
      text: "Ota-ona hamda bolalarning aliment huquqi va majburiyatlariga oid NOTO‘G‘RI ma’lumotni aniqlang.\n(Oila kodeksi, 96-, 98-, 99-, 110-moddalar)",
      options: [
        { key: "A", text: "ota-ona voyaga yetmagan bolalariga ta’minot berish uchun aliment to‘lash tartibini o‘zaro kelishgan holda belgilashga haqlidirlar" },
        { key: "B", text: "voyaga yetgan, mehnatga layoqatli bolalardan undirilayotgan aliment miqdori qonunchilikda belgilangan mehnatga haq to‘lash eng kam miqdorining 11,75 foizidan kam bo‘lmasligi kerak" },
        { key: "C", text: "ota-ona va bola alohida-alohida yashagan taqdirda, vasiylik va homiylik organlari, shuningdek o‘n to‘rt yoshga to‘lgan bola bir vaqtning o‘zida ota va onadan voyaga yetmagan bolalarning ta’minoti uchun aliment undirish to‘g‘risida da’vo qo‘zg‘atishga haqli" },
        { key: "D", text: "har bir bola uchun undiriladigan aliment miqdori qonunchilik bilan belgilangan mehnatga haq to‘lash eng kam miqdorining 28,6 foizidan kam bo‘lmasligi kerak" }
      ],
      correct: "C",
      explanation: "Oila kodeksiga ko'ra o'n to'rt yoshga to'lgan bolaning o'zi bir vaqtning o'zida ota va onadan aliment undirish to'g'risida da'vo qo'zg'atish huquqiga ega emas (bu vasiylik organi yoki qonuniy vakillar orqali amalga oshiriladi). Noto'g'ri fikr: C."
    },
    {
      num: 19,
      type: "Y-1",
      section: "Fuqarolik huquqi",
      text: "Vorislik huquqiga oid to‘g‘ri ma’lumotlarni aniqlang.\n(O‘zbekiston Respublikasi Fuqarolik kodeksi, 1151-1153-moddalar)\n1) agar hozir bo‘lmagan merosxo‘r xabar qilingan paytdan e’tiboran olti oy ichida qolgan merosxo‘rlarni merosni taqsimlash haqidagi kelishuvda ishtirok etish istagi to‘g‘risida xabardor qilmasa, qolgan merosxo‘rlar hozir bo‘lmagan merosxo‘rga tegishli ulushni ajratib, o‘zaro kelishuvga ko‘ra meros taqsimotini amalga oshirishga haqlidirlar;\n2) agar homila holida bo‘lgan merosxo‘r tirik tug‘ilsa, qolganlar unga tegishli ulushni ajratgan holdagina taqsimlashni amalga oshirishga haqlidirlar;\n3) agar hozir bo‘lmagan merosxo‘rning turgan joyi meros ochilgan kundan e’tiboran bir yil mobaynida aniqlanmasa, qolganlar taqsimotni fuqarolik kodeksi bo‘yicha amalga oshirishga haqli emas;\n4) meros ochilgunga qadar uch yil mobaynida meros qoldiruvchi bilan yashaganlar imtiyozli huquqqa ega bo‘ladilar.",
      options: [
        { key: "A", text: "3, 4" },
        { key: "B", text: "2, 4" },
        { key: "C", text: "1, 2" },
        { key: "D", text: "1, 3" }
      ],
      correct: "D",
      explanation: "FK 1151-1153-moddalariga binoan 1 va 3-bandlar to'g'ri. Homila tug'ilmaguncha meros taqsimoti to'xtatib turiladi (2-band xato). To'g'ri javob: D (1, 3)."
    },
    {
      num: 20,
      type: "Y-1",
      section: "Fuqarolik huquqi",
      text: "Sug‘urta shartnomasiga oid to‘g‘ri ma’lumotlarni aniqlang.\n(Fuqarolik kodeksi, 916-922-moddalar)\n1) lotereyalar va garov o‘yinlarida ishtirok etishda ko‘riladigan zararni sug‘urtalashga yo‘l qo‘yiladi;\n2) sug‘urtalangan deb hisoblanmaydigan shaxs foydasiga shaxsiy sug‘urta shartnomasi faqat sug‘urtalangan shaxsning yozma roziligi bilangina tuzilishi mumkin;\n3) naf oluvchi foydasiga mol-mulkni sug‘urta qilish shartnomasi naf oluvchining nomi ko‘rsatilmasdan tuzilishi mumkin emas;\n4) fuqaroga o‘z hayoti yoki sog‘lig‘ini sug‘urtalash majburiyati qonun bilan yuklatilishi mumkin emas.",
      options: [
        { key: "A", text: "2, 4" },
        { key: "B", text: "1, 3" },
        { key: "C", text: "2, 3" },
        { key: "D", text: "1, 4" }
      ],
      correct: "A",
      explanation: "FK 916-922-moddalarga muvofiq qimor va garov o'yinlari sug'urta qilinmaydi (1 xato). Naf oluvchi ko'rsatilmasdan (taqdim etuvchiga) tuzilishi mumkin (3 xato). 2 va 4-qoidalar to'g'ri. Javob: A (2, 4)."
    },
    {
      num: 21,
      type: "Y-1",
      section: "Iste'molchilar huquqi",
      text: "Tovar nuqsonlarini bepul bartaraf etish tartibiga oid to‘g‘ri ma’lumotlarni aniqlang.\n(\"Iste’molchilarning huquqlarini himoya qilish to‘g‘risida\"gi qonun, 15-modda)\n1) kafolat muddatidagi nuqsonlarni sotuvchi o‘ttiz kun, ishlab chiqaruvchi yigirma kun ichida bartaraf etishi lozim;\n2) uzoq muddat davomida foydalaniladigan tovarni ta’mirlash davrida foydalanib turish uchun 3 kun ichida ayni shunday tovar bepul berib turiladi;\n3) talabni bajarish yoki nuqsonni bartaraf etish kechiktirilgan har bir kun uchun tovar narxining 1 foizi miqdorida neustoyka (penya) to‘laydi;\n4) iste’molchi kafolat muddati tugaganidan keyin nuqsonlarni bartaraf etish to‘g‘risida ishlab chiqaruvchiga talab qo‘yishga haqli emas.",
      options: [
        { key: "A", text: "2, 4" },
        { key: "B", text: "1, 4" },
        { key: "C", text: "1, 3" },
        { key: "D", text: "2, 3" }
      ],
      correct: "D",
      explanation: "15-moddaga muvofiq, ta'mirlash davrida 3 kun ichida vaqtincha foydalanishga tovar beriladi (2) va har kechiktirilgan kun uchun 1% penya undiriladi (3). Nuqson bartaraf etish muddati esa 20 kun. Javob: D (2, 3)."
    },
    {
      num: 22,
      type: "Y-1",
      section: "Intellektual mulk",
      text: "Quyida berilganlardan qaysilari turdosh huquqlar obyektlari (a) va subyektlari (b) hisoblanadi?\n(\"Mualliflik huquqi va turdosh huquqlar to‘g‘risida\"gi qonun, 44-45-moddalar)\n1) ijrolar; 2) fonogrammalarni tayyorlovchilar;\n3) efir yoki kabel orqali ko‘rsatuv beruvchi tashkilotning ko‘rsatuvlari;\n4) Ijrochilar; 5) fonogrammalar;\n6) efir yoki kabel orqali ko‘rsatuv beruvchi tashkilotlar.",
      options: [
        { key: "A", text: "a-1, 3, 5; b-2, 4, 6" },
        { key: "B", text: "a-1, 5, 6; b-2, 3, 4" },
        { key: "C", text: "a-2, 3, 4; b-1, 5, 6" },
        { key: "D", text: "a-2, 4, 6; b-1, 3, 5" }
      ],
      correct: "A",
      explanation: "Obyektlar: 1 (ijrolar), 3 (ko'rsatuvlar/eshittirishlar), 5 (fonogrammalar). Subyektlar: 2 (fonogramma tayyorlovchilar), 4 (ijrochilar), 6 (efir/kabel tashkilotlari). To'g'ri javob: A."
    },
    {
      num: 23,
      type: "Y-1",
      section: "Mehnat huquqi",
      text: "Yakka tartibdagi mehnatga oid munosabatlarni va ular bilan bevosita bog‘liq bo‘lgan ijtimoiy munosabatlarni huquqiy jihatdan tartibga solishning asosiy prinsiplaridan qaysi biri xodimlarning va ish beruvchilarning vakillikni ta’minlash hamda o‘z manfaatlarini himoya qilish uchun birlashishga bo‘lgan huquqini kafolatlaydi?\n(Mehnat kodeksi, 6-modda)",
      options: [
        { key: "A", text: "mehnat huquqlari ta’minlanishining va mehnat majburiyatlari bajarilishining kafolatlanganligi" },
        { key: "B", text: "mehnat huquqlarining tengligi, mehnat va mashg‘ulotlar sohasida kamsitishni taqiqlash" },
        { key: "C", text: "mehnat erkinligi va majburiy mehnatni taqiqlash" },
        { key: "D", text: "mehnat sohasidagi ijtimoiy sheriklik" }
      ],
      correct: "D",
      explanation: "Mehnat kodeksining 6-moddasiga ko'ra, xodimlar va ish beruvchilarning birlashish hamda ijtimoiy muloqot qilish huquqi «Mehnat sohasidagi ijtimoiy sheriklik» prinsipi doirasida ta'minlanadi. To'g'ri javob: D."
    },
    {
      num: 24,
      type: "Y-1",
      section: "Mehnat huquqi",
      text: "Quyida keltirilganlardan qaysi biri xodimning majburiyati HISOBLANMAYDI?\n(Mehnat kodeksi, 21-22-moddalar)",
      options: [
        { key: "A", text: "mehnat shartnomasi bilan o‘z zimmasiga yuklatilgan mehnat majburiyatlarini vijdonan bajarish" },
        { key: "B", text: "mehnatni muhofaza qilish talablariga, texnologiya intizomiga, mehnat xavfsizligi va ishlab chiqarish sanitariyasi qoidalariga rioya etish" },
        { key: "C", text: "mehnat to‘g‘risidagi qonunchilikka muvofiq kasbga tayyorlash, qayta tayyorlash va malakasini oshirish" },
        { key: "D", text: "ish beruvchining mol-mulkiga nisbatan ehtiyotkorona munosabatda bo‘lish" }
      ],
      correct: "C",
      explanation: "Kasbga tayyorlash, qayta tayyorlash va malakasini oshirish xodimning MAJBURIYATI emas, balki Mehnat kodeksining 21-moddasida ko'rsatilgan HUQUQI hisoblanadi. To'g'ri javob: C."
    },
    {
      num: 25,
      type: "Y-1",
      section: "Ma'muriy huquq",
      text: "To‘g‘ri moslashtirilgan javobni toping.\nI. Ma’muriy huquq; II. Ma’muriy javobgarlik;\na) yo‘lovchining transportda chiptasiz yurishi;\nb) yakka tartibda tadbirkorlik bilan shug‘ullanish uchun ruxsatnoma olish;\nc) haqorat qilish, shaxsning sha’ni va qadr-qimmatini qasddan kamsitish;\nd) o‘z transportida yo‘lovchi tashishga litsenziya olish;\ne) topib olingan mol-mulkni yashirish;\nf) fuqarolik javobgarligini majburiy sug‘urta qilish bo‘yicha sug‘urta polislarini olishi.",
      options: [
        { key: "A", text: "I-a, c, e; II-b, d, f" },
        { key: "B", text: "I-a, b, c; II-d, e, f" },
        { key: "C", text: "I-a, d, e; II-b, c, f" },
        { key: "D", text: "I-b, d, f; II-a, c, e" }
      ],
      correct: "D",
      explanation: "I. Ma'muriy huquqiy munosabatlar (ruxsatnomalar, litsenziyalar, davlat tartibi): b, d, f. II. Ma'muriy javobgarlik (huquqbuzarliklar): a (chiptasiz yurish), c (haqorat qilish), e (topilmani yashirish). To'g'ri javob: D."
    },
    {
      num: 26,
      type: "Y-1",
      section: "Ma'muriy huquq",
      text: "Quyida berilgan ma’muriy jazo turlaridan qaysilari ham asosiy, ham qo‘shimcha jazo tariqasida qo‘llanilishi mumkin?\n(Ma’muriy javobgarlik to‘g‘risidagi kodeks, 23-24-moddalar)\n1) ma’muriy ogohlantirish;\n2) jarima;\n3) ashyoni haqini to‘lash sharti bilan olib qo‘yish;\n4) ashyoni musodara qilish;\n5) maxsus huquqdan (transport boshqarish, ov qilish) mahrum etish;\n6) haq to‘lanadigan jamoat ishlariga majburiy ravishda jalb etish;\n7) ma’muriy qamoqqa olish;\n8) chet el fuqarolarini chiqarib yuborish.",
      options: [
        { key: "A", text: "3, 6, 8" },
        { key: "B", text: "2, 5, 7" },
        { key: "C", text: "1, 2, 6" },
        { key: "D", text: "3, 4, 5" }
      ],
      correct: "D",
      explanation: "MJtK 24-moddasiga ko'ra, haqini to'lash sharti bilan olib qo'yish (3), musodara qilish (4) hamda maxsus huquqdan mahrum etish (5) ham asosiy, ham qo'shimcha jazo tariqasida qo'llanilishi mumkin. To'g'ri javob: D (3, 4, 5)."
    },
    {
      num: 27,
      type: "Y-1",
      section: "Jinoyat huquqi",
      text: "O‘zbekiston Respublikasi Jinoyat kodeksining 48-1-moddasiga ko‘ra, ozodlikni cheklash jazosi kimlarga nisbatan TAYINLANMAYDI?\n1) pensiya yoshiga yetgan shaxslar;\n2) harbiy xizmatchilar;\n3) chet el fuqarolari;\n4) o‘n sakkiz yoshga to‘lmagan shaxslar;\n5) uch yoshga to‘lmagan bolalari bor ayollar;\n6) O‘zbekiston Respublikasida doimiy yashash joyiga ega bo‘lmagan shaxslar.",
      options: [
        { key: "A", text: "2, 3, 6" },
        { key: "B", text: "4, 5, 6" },
        { key: "C", text: "1, 4, 5" },
        { key: "D", text: "1, 2, 3" }
      ],
      correct: "A",
      explanation: "JK 48-1-moddasining 4-qismiga ko'ra, ozodlikni cheklash jazosi harbiy xizmatchilarga (2), chet el fuqarolariga (3) hamda O'zbekistonda doimiy yashash joyiga ega bo'lmagan shaxslarga (6) nisbatan tayinlanmaydi. To'g'ri javob: A (2, 3, 6)."
    },
    {
      num: 28,
      type: "Y-1",
      section: "Jinoyat-protsessual huquqi",
      text: "Jinoyat ishlari bo‘yicha surishtiruv o‘tkazishni amalga oshiruvchi organlar to‘g‘ri ko‘rsatilgan javobni aniqlang.\n(Jinoyat protsessual kodeksi, 38-modda)\n1) Majburiy ijro byurosi va uning joylardagi bo‘linmalari;\n2) Davlat bojxona qo‘mitasi va uning joylardagi bo‘linmalari;\n3) Davlat Soliq qo‘mitasi va uning joylardagi bo‘linmalari;\n4) Davlat xavfsizlik xizmati organlari va uning joylardagi bo‘linmalari.",
      options: [
        { key: "A", text: "1, 3" },
        { key: "B", text: "3, 4" },
        { key: "C", text: "2, 4" },
        { key: "D", text: "1, 2" }
      ],
      correct: "D",
      explanation: "JPK 38-moddasiga asosan surishtiruv organlari qatoriga MIB (1) va Davlat bojxona organlari (2) kiradi. To'g'ri javob: D (1, 2)."
    },
    {
      num: 29,
      type: "Y-1",
      section: "Ekologiya huquqi",
      text: "Tabiatdan maxsus foydalanganlik va atrof-muhitni ifloslantirganlik uchun to‘lovlarga oid to‘g‘ri ma’lumotlarni aniqlang.\n(\"Tabiatni muhofaza qilish to‘g‘risida\"gi qonun, 34-modda)\n1) tabiiy resurslarni muhofaza qilganlik va qayta tiklaganlik uchun to‘lovlarning miqdorlari Vazirlar Mahkamasi tomonidan belgilanadi;\n2) to‘lov Ekologiya jamg‘armasiga tushadi;\n3) kompensatsiya to‘lovlari summalari davlat budjetiga tushadi;\n4) tabiiy resurslardan foydalanganlik uchun to‘lovlar tabiatdan foydalanuvchi korxonalar mahsulotlarining tannarxiga qo‘shiladi.",
      options: [
        { key: "A", text: "2, 3" },
        { key: "B", text: "1, 3" },
        { key: "C", text: "1, 4" },
        { key: "D", text: "2, 4" }
      ],
      correct: "C",
      explanation: "34-moddaga muvofiq, to'lovlar miqdorini Vazirlar Mahkamasi belgilaydi (1) va bu to'lovlar korxona mahsulotlarining tannarxiga qo'shiladi (4). To'g'ri javob: C (1, 4)."
    },
    {
      num: 30,
      type: "Y-1",
      section: "Jinoyat huquqi",
      text: "Nuqtalar o‘rniga mos keluvchi javobni aniqlang.\n(Jinoyat kodeksi, 46-modda)\nAgar shaxs sud tomonidan tayinlangan . . . muddatining jami o‘ttiz kundan ko‘prog‘ini o‘tashdan uzrli sabablarsiz bo‘yin tovlasa yoki O‘zbekiston Respublikasidan tashqariga chiqib ketsa, sud ushbu jazoning o‘talmagan muddatini xuddi shu muddatga ozodlikni cheklash yoki ozodlikdan mahrum qilish tariqasidagi jazo bilan almashtiradi.",
      options: [
        { key: "A", text: "xizmat bo‘yicha cheklash" },
        { key: "B", text: "axloq tuzatish ishlari" },
        { key: "C", text: "majburiy jamoat ishlari" },
        { key: "D", text: "intizomiy qismga jo‘natish" }
      ],
      correct: "B",
      explanation: "JK 46-moddasi aynan «Axloq tuzatish ishlari» jazosiga bag'ishlangan bo'lib, uning 4-qismida ushbu norma so'zma-so'z bayon etilgan. To'g'ri javob: B."
    },
    {
      num: 31,
      type: "Y-1",
      section: "Jinoyat huquqi (Diagramma)",
      text: "Quyida berilgan ma’lumotlarni tahlil qilib, Eyler-Venn diagrammasiga mos keladigan to‘g‘ri javobni aniqlang.\n(Jinoyat kodeksi, 47-, 49-moddalar)\nI: Xizmat bo‘yicha cheklash | II: Intizomiy qismga jo‘natish | III: Umumiy belgilari\n\na) kontrakt bo‘yicha harbiy xizmatchiga, pul ta’minotining 10-30% davlat daromadiga ushlab qolinadi;\nb) muddatli harbiy xizmatchini maxsus qismga joylashtirish orqali huquq va imtiyozlardan mahrum etish;\nc) ikki oydan uch yilgacha muddatga qo‘llaniladi;\nd) uch oydan bir yilgacha muddatga qo‘llaniladi;\ne) faqat harbiy xizmatchilarga nisbatan qo‘llaniladi;\nf) asosiy va qo‘shimcha jazo tariqasida qo‘llanishi mumkin;\ng) sud 3 yildan ko‘p bo‘lmagan ozodlikdan mahrum qilish o‘rniga shu muddatga ushbu jazoni qo‘llashi mumkin.",
      options: [
        { key: "A", text: "I-b, c; II-a, d; III-e, g" },
        { key: "B", text: "I-a, c; II-b, d; III-e, g" },
        { key: "C", text: "I-d, e; II-a, c; III-f, g" },
        { key: "D", text: "I-a, d; II-b, c; III-f, g" }
      ],
      correct: "B",
      explanation: "I (Xizmat bo'yicha cheklash): a (kontrakt xizmatchisi, 10-30% ushlash) va c (2 oydan 3 yilgacha). II (Intizomiy qism): b (muddatli xizmatchi) va d (3 oydan 1 yilgacha). III (Umumiy): e (faqat harbiylarga) va g (3 yildan oshmagan ozodlikdan mahrum qilish o'rniga tayinlanishi). Javob: B."
    },
    {
      num: 32,
      type: "Y-1",
      section: "Huquqiy atamalar",
      text: "Atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.\n1. Replika | 2. Yuridik akt | 3. Kvorum | 4. Diskriminatsiya | 5. Senzura\n\na) sud jarayonida oqlovchi bilan qoralovchi o‘rtasidagi e’tirozlar;\nb) tergovda, surishtiruvda ko‘rsatma olish vositasi;\nc) davlat organlari tomonidan o‘z vakolatlari doirasida chiqariladigan farmoyish;\nd) jazoga tortish sanksiyalarini qo‘llash;\ne) yig‘ilish qatnashchilarining qaror haqiqiy deb tan olinadigan eng kam soni;\nf) huquq yoki vakolat qonuniyligini tasdiqlash;\ng) huquq va imtiyozlarni boshqalarga nisbatan cheklash, kamsitish;\nh) xorijiy shaxsni fuqarolikka qabul qilish;\ni) nashrlar mazmuni ustidan davlat nazorati.",
      options: [
        { key: "A", text: "1-b, 2-d, 3-e, 4-g, 5-h" },
        { key: "B", text: "1-a, 2-c, 3-e, 4-g, 5-i" },
        { key: "C", text: "1-a, 2-c, 3-f, 4-h, 5-i" },
        { key: "D", text: "1-b, 2-e, 3-d, 4-i, 5-h" }
      ],
      correct: "B",
      explanation: "1-Replika: a (sud muzokarasidagi e'tirozlar). 2-Yuridik akt: c (vakolat doirasidagi rasmiy farmoyish). 3-Kvorum: e (qaror qabul qilish uchun yetarli eng kam son). 4-Diskriminatsiya: g (kamsitish, cheklash). 5-Senzura: i (axborot va nashrlar ustidan nazorat). To'g'ri javob: B."
    },
    {
      num: 33,
      type: "Y-2",
      section: "Mehnat huquqi (Vaziyatli keys)",
      scenario: "\"Texno-Line\" MChJ shtatlar qisqarishi munosabati bilan muhandis Abdullayev B.A. bilan tuzilgan mehnat shartnomasini Mehnat kodeksining 161-moddasi 2-qismi 2-bandi bo‘yicha bekor qilishni rejalashtirdi. Abdullayev B.A. ushbu korxonada 7 yil davomida uzluksiz ishlab kelgan. Korxona direktori Abdullayev B.A.ni 2 hafta oldin yozma ravishda ogohlantirgan va keyinchalik shartnomani bekor qilib, unga 1 oylik o‘rtacha ish haqi miqdorida ishdan bo‘shatish nafaqasi to‘lagan. Abdullayev B.A. ogohlantirish muddati va to‘lovlardan norozi bo‘lib sudga murojaat qildi.",
      text: "Shtat qisqarishi munosabati bilan mehnat shartnomasini bekor qilish niyati haqida ish beruvchi xodimni kamida qancha vaqt oldin yozma ravishda ogohlantirishi shart?\n(Mehnat kodeksining 165-moddasi 1-qismi 1-bandi)",
      options: [
        { key: "A", text: "bir oy" },
        { key: "B", text: "ikki hafta" },
        { key: "C", text: "uch kun" },
        { key: "D", text: "ikki oy" }
      ],
      correct: "D",
      explanation: "Mehnat kodeksining 165-moddasi 1-qismi 1-bandiga asosan texnologiyadagi, ishlab chiqarish va mehnatni tashkil etishdagi o'zgarishlar, xodimlar soni (shtati) qisqarganligi munosabati bilan kamida IKKI OY oldin yozma ravishda ogohlantirilishi shart. To'g'ri javob: D."
    },
    {
      num: 34,
      type: "Y-2",
      section: "Mehnat huquqi (Vaziyatli keys)",
      scenario: "\"Texno-Line\" MChJ shtatlar qisqarishi munosabati bilan muhandis Abdullayev B.A. bilan tuzilgan mehnat shartnomasini Mehnat kodeksining 161-moddasi 2-qismi 2-bandi bo‘yicha bekor qilishni rejalashtirdi. Abdullayev B.A. ushbu korxonada 7 yil davomida uzluksiz ishlab kelgan. Korxona direktori Abdullayev B.A.ni 2 hafta oldin yozma ravishda ogohlantirgan va keyinchalik shartnomani bekor qilib, unga 1 oylik o‘rtacha ish haqi miqdorida ishdan bo‘shatish nafaqasi to‘lagan. Abdullayev B.A. ogohlantirish muddati va to‘lovlardan norozi bo‘lib sudga murojaat qildi.",
      text: "Ushbu korxonada 7 yil uzluksiz ish stajiga ega bo‘lgan Abdullayev B.A.ga to‘lanadigan ishdan bo‘shatish nafaqasi o‘rtacha oylik ish haqining qancha miqdorida bo‘lishi kerak?\n(Mehnat kodeksi 173-modda)",
      options: [
        { key: "A", text: "100 foizidan kam bo‘lmagan" },
        { key: "B", text: "200 foizidan kam bo‘lmagan" },
        { key: "C", text: "150 foizidan kam bo‘lmagan" },
        { key: "D", text: "75 foizidan kam bo‘lmagan" }
      ],
      correct: "C",
      explanation: "Yangi Mehnat kodeksining 173-moddasiga ko'ra ish stajiga qarab ishdan bo'shatish nafaqasi: 5 yildan 10 yilgacha staj bo'lsa - o'rtacha oylik ish haqining 150 FOIZIDAN kam bo'lmasligi kerak. Abdullayevda staj 7 yil bo'lganligi sababli 150 foiz to'lanishi lozim. To'g'ri javob: C."
    },
    {
      num: 35,
      type: "Y-2",
      section: "Mehnat huquqi (Vaziyatli keys)",
      scenario: "\"Texno-Line\" MChJ shtatlar qisqarishi munosabati bilan muhandis Abdullayev B.A. bilan tuzilgan mehnat shartnomasini Mehnat kodeksining 161-moddasi 2-qismi 2-bandi bo‘yicha bekor qilishni rejalashtirdi. Abdullayev B.A. ushbu korxonada 7 yil davomida uzluksiz ishlab kelgan. Korxona direktori Abdullayev B.A.ni 2 hafta oldin yozma ravishda ogohlantirgan va keyinchalik shartnomani bekor qilib, unga 1 oylik o‘rtacha ish haqi miqdorida ishdan bo‘shatish nafaqasi to‘lagan. Abdullayev B.A. ogohlantirish muddati va to‘lovlardan norozi bo‘lib sudga murojaat qildi.",
      text: "Mehnat kodeksining 161-moddasi 2-qismi 2-bandi bo‘yicha mehnat shartnomasi bekor qilinganda ishda qoldirishga doir imtiyozli huquq malakasi va mehnat unumdorligi yuqoriroq bo‘lgan xodimlarga beriladi. Malakasi va mehnat unumdorligi bir xil bo‘lgan taqdirda, qaysi xodimlar ishda qolishda afzallik huquqiga ega bo‘ladi?\n(Mehnat kodeksi, 167-modda)",
      options: [
        { key: "A", text: "kasaba uyushmasiga a’zo bo‘lmagan xodimlar" },
        { key: "B", text: "pensiya yoshiga yetgan xodimlar" },
        { key: "C", text: "qaramog‘ida ikki yoki undan ortiq kishi bo‘lgan xodimlar" },
        { key: "D", text: "korxonada eng kam maosh oladigan xodimlar" }
      ],
      correct: "C",
      explanation: "Mehnat kodeksining 167-moddasi 2-qismiga ko'ra, malakasi va unumdorligi teng bo'lganda afzallik beriladigan birinchi toifa - qaramog'ida ikki yoki undan ortiq kishi bo'lgan xodimlardir. To'g'ri javob: C."
    },
    {
      num: 36,
      type: "O",
      section: "Oila huquqi",
      text: "Ayolning nikoh tuzilgandan keyin yoki erining o‘limi, nikohdan ajratilganligi yoxud nikoh haqiqiy emas deb topilganligi tufayli nikoh tugaganidan so‘ng necha kun ichida tug‘ilgan bolasi nikohda tug‘ilgan bola hisoblanadi?\n(Oila kodeksi, 60-modda)",
      acceptableAnswers: ["300", "300 kun", "uch yuz kun", "uch yuz"],
      canonicalAnswer: "300 kun",
      explanation: "Oila kodeksining 60-moddasiga binoan, nikoh tugaganidan so'ng 300 kun ichida tug'ilgan bola nikohda tug'ilgan hisoblanadi va uning otasi deb sobiq er tan olinadi."
    },
    {
      num: 37,
      type: "O",
      section: "Fuqarolik huquqi",
      text: "Uy-joyni ijaraga berish shartnomasi taraflarning kelishuvi bilan bekor qilinadi. Uy-joyni ijaraga oluvchi o‘zi bilan birga doimiy yashaydigan boshqa fuqarolarning roziligi bilan ijaraga beruvchini necha oy avval yozma ravishda ogohlantirib, istalgan vaqtda ijara shartnomasini bekor qilishga haqli?\n(Fuqarolik kodeksi, 615-modda)",
      acceptableAnswers: ["3", "uch", "3 oy", "uch oy"],
      canonicalAnswer: "3 oy",
      explanation: "FK 615-moddasiga ko'ra, ijaraga oluvchi ijaraga beruvchini 3 oy avval yozma ravishda ogohlantirib shartnomani bekor qilishi mumkin."
    },
    {
      num: 38,
      type: "O",
      section: "Fuqarolik huquqi",
      text: "Agar fuqaroning qayerdaligi haqida uning yashash joyida qancha muddat davomida ma’lumotlar bo‘lmasa, manfaatdor shaxslarning arizasiga muvofiq sud bu fuqaroni bedarak yo‘qolgan deb topishi mumkin?\n(Fuqarolik kodeksi, 33-modda)",
      acceptableAnswers: ["1 yil", "bir yil", "1", "bir", "12 oy"],
      canonicalAnswer: "1 yil",
      explanation: "Fuqarolik kodeksining 33-moddasiga binoan, agar fuqaroning qayerdaligi haqida uning yashash joyida 1 yil davomida ma'lumotlar bo'lmasa, sud uni bedarak yo'qolgan deb topishi mumkin."
    },
    {
      num: 39,
      type: "O",
      section: "Iste'molchilar huquqi",
      text: "Iste’molchi tovarning ishlab chiqarilishiga, tuzilishiga, tarkibiga doir kamchiliklarni yoki boshqa nuqsonlarni aniqlagan taqdirda sotuvchi (ishlab chiqaruvchi) uni ayni shunday markali (modelli, artikulli) tovarga qancha muddatda almashtirib berishi shart?\n(\"Iste’molchilarning huquqlarini himoya qilish to‘g‘risida\"gi qonun, 14-modda)",
      acceptableAnswers: ["7 kun", "yetti kun", "7", "yetti", "7 kun ichida"],
      canonicalAnswer: "7 kun",
      explanation: "Qonunning 14-moddasiga binoan, nuqsonli tovar iste'molchi talab qo'ygan paytdan boshlab 7 kun ichida (qo'shimcha tekshirish zarur bo'lsa 20 kun ichida) almashtirib berilishi shart."
    },
    {
      num: 40,
      type: "O",
      section: "Intellektual mulk",
      text: "Tasviriy san’at asarini oldingi narxdan kamida yigirma foiz yuqori narx bo‘yicha oshkora qayta sotishning har bir holatida muallif sotuvchidan qayta sotish narxining necha foizi miqdorida haq olish huquqiga ega (ergashma huquq)?\n(\"Mualliflik huquqi va turdosh huquqlar to‘g‘risida\"gi qonun, 23-modda)",
      acceptableAnswers: ["5", "5 foiz", "5%", "besh", "besh foiz"],
      canonicalAnswer: "5 foiz",
      explanation: "Qonunning 23-moddasiga binoan muallif har bir qayta sotish holatida sotish narxining 5 foizi miqdorida haq olish huquqiga (ergashma huquqqa) egadir."
    },
    {
      num: 41,
      type: "O",
      section: "Mehnat huquqi",
      text: "Ish beruvchi kasaba uyushmasi qo‘mitasi tomonidan xodim bilan mehnat shartnomasini bekor qilishga rozilik berish to‘g‘risidagi qarori qabul qilingan kundan e’tiboran necha oydan kechiktirmay mehnat shartnomasini bekor qilishga haqli?\n(Mehnat kodeksi, 164-modda)",
      acceptableAnswers: ["1", "bir", "1 oy", "bir oy", "bir oydan"],
      canonicalAnswer: "1 oy",
      explanation: "Mehnat kodeksining 164-moddasiga muvofiq, ish beruvchi kasaba uyushmasining rozilik qarori qabul qilingan kundan e'tiboran 1 oydan kechiktirmay shartnomani bekor qilishga haqlidir."
    },
    {
      num: 42,
      type: "O",
      section: "Ma'muriy huquq",
      text: "Nuqtalar o‘rniga mos keluvchi javobni yozing.\nBasharti ma’muriy jazoga tortilgan shaxs shu jazoni o‘tash muddati tugagan kundan boshlab . . . mobaynida yangi ma’muriy huquqbuzarlik sodir etmagan bo‘lsa, mazkur shaxs ma’muriy jazoga tortilmagan deb hisoblanadi.\n(Ma’muriy javobgarlik to‘g‘risidagi kodeks, 37-modda)",
      acceptableAnswers: ["bir yil", "1 yil", "bir", "1", "12 oy"],
      canonicalAnswer: "bir yil",
      explanation: "MJtK 37-moddasiga binoan, jazo o'tab bo'lingan kundan boshlab bir yil mobaynida yangi ma'muriy huquqbuzarlik sodir etilmasa, shaxs jazoga tortilmagan deb hisoblanadi."
    },
    {
      num: 43,
      type: "O",
      section: "Jinoyat huquqi",
      text: "Fuqaro A. O‘zbekiston Respublikasi Jinoyat kodeksining tegishli moddasi bilan aybli deb topilib, unga bazaviy hisoblash miqdorining 200 baravari miqdorida jarima jazosi tayinlandi. Fuqaro A. jarimaning 50 baravarini to‘lashga muvaffaq bo‘ldi, biroq qolgan qismini to‘lash imkoniyati yo‘qligi sababli sudga murojaat qildi. Sud jarimaning to‘lanmagan miqdorini majburiy jamoat ishlari jazosi bilan almashtirdi. Jinoyat kodeksining 44-moddasiga asosan, jarimaning to‘lanmagan qismi majburiy jamoat ishlariga aylantirilganda fuqaro A. necha soat majburiy jamoat ishlarini o‘tashi kerak?\n(Jinoyat kodeksi, 44-modda)",
      acceptableAnswers: ["300", "300 soat", "uch yuz", "uch yuz soat"],
      canonicalAnswer: "300 soat",
      explanation: "JK 44-moddasiga binoan, jarimaning to'lanmagan qismining har bir BHM baravari 2 soat majburiy jamoat ishlariga to'g'ri keladi. Fuqaro A. 200 - 50 = 150 baravar to'lamagan. 150 * 2 soat = 300 soat majburiy jamoat ishlari tayinlanadi."
    },
    {
      num: 44,
      type: "O",
      section: "Jinoyat-protsessual huquqi",
      text: "Voyaga yetmagan guvohni yoki jabrlanuvchini so‘roq qilishning bir kun mobaynidagi umumiy davomiyligi voyaga yetmaganning yoshidan va holatidan kelib chiqishi hamda 14 yoshdan 18 yoshgacha bo‘lganlarga nisbatan jami necha soatdan oshmasligi kerak?\n(Jinoyat protsessual kodeksi, 121-modda)",
      acceptableAnswers: ["4", "to'rt", "4 soat", "to'rt soat"],
      canonicalAnswer: "4 soat",
      explanation: "JPK 121-moddasiga ko'ra, 14 yoshdan 18 yoshgacha bo'lgan voyaga yetmaganlarni so'roq qilishning bir kunlik umumiy davomiyligi 4 soatdan oshmasligi kerak (tanaffussiz esa 2 soatdan oshmasligi lozim)."
    },
    {
      num: 45,
      type: "O",
      section: "Ekologiya huquqi",
      text: "Nuqtalar o‘rniga mos keluvchi javobni yozing.\nYuridik va jismoniy shaxslar atrof tabiiy muhitga, inson salomatligi va odamlarning mol-mulkiga, xalq xo‘jaligiga ziyon yetkazayotgan ekologiya jihatidan zararli faoliyatni to‘xtatish to‘g‘risida . . . da’vo bilan murojaat qilishga haqli.\n(\"Tabiatni muhofaza qilish to‘g‘risida\"gi qonun, 52-modda)",
      acceptableAnswers: ["sudga", "sud", "sud organlariga"],
      canonicalAnswer: "sudga",
      explanation: "\"Tabiatni muhofaza qilish to'g'risida\"gi qonunning 52-moddasiga asosan ziyon yetkazayotgan faoliyatni to'xtatish to'g'risida SUDGA da'vo bilan murojaat qilishga haqli."
    }
  ]
};

if (typeof module !== 'undefined') {
  module.exports = EXAM_DATA;
}
