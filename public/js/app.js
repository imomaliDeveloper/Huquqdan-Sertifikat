// Huquq Milliy Sertifikat - Asosiy Telegram Mini App Mantiqi

// PWA Service Worker Ro'yxatdan o'tkazish
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=40')
      .then(reg => {
        reg.update();
        console.log('SW faol va yangilandi:', reg.scope);
      })
      .catch(err => console.log('SW xatolik:', err));
  });
}

// Telegram Web App integratsiyasi
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Telegram foydalanuvchisini avtomatik tanish
let initialUser = JSON.parse(localStorage.getItem("huquq_auth_user") || "null");
if (!initialUser && tg?.initDataUnsafe?.user) {
  const tUser = tg.initDataUnsafe.user;
  const fullName = [tUser.first_name, tUser.last_name].filter(Boolean).join(' ') || tUser.username || "O'quvchi";
  initialUser = {
    id: `TG-${tUser.id}`,
    tgId: tUser.id,
    name: fullName,
    username: tUser.username ? `@${tUser.username}` : null,
    role: "Abituriyent",
    plan: localStorage.getItem("huquq_user_plan") || "tariff_start",
    city: "Telegram"
  };
  localStorage.setItem("huquq_auth_user", JSON.stringify(initialUser));
}

// URL parametrlarini tekshirish (Admin tasdiqlaganda keladigan ?vip=true)
const urlParams = new URLSearchParams(window.location.search);
const isVipParam = urlParams.get("vip") === "true";
const purchasedBookParam = urlParams.get("purchased_book") || urlParams.get("bought_book");
if (purchasedBookParam) {
  localStorage.setItem("purchased_book_" + purchasedBookParam, "true");
}
if (isVipParam) {
  localStorage.setItem("huquq_premium_active", "true");
  localStorage.setItem("huquq_user_plan", "tariff_vip");
  if (initialUser) {
    initialUser.plan = "tariff_vip";
    initialUser.isVip = true;
    localStorage.setItem("huquq_auth_user", JSON.stringify(initialUser));
  }
}

// App State
const state = {
  user: {
    id: tg?.initDataUnsafe?.user?.id || initialUser?.tgId || 1001,
    name: tg?.initDataUnsafe?.user?.first_name || (tg?.initDataUnsafe?.user?.last_name ? `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}` : (initialUser?.name || "O'quvchi")),
    username: tg?.initDataUnsafe?.user?.username || initialUser?.username || ""
  },
  currentUser: initialUser,
  userPlan: isVipParam ? "tariff_vip" : (localStorage.getItem("huquq_user_plan") || (localStorage.getItem("huquq_premium_active") === "true" ? "tariff_vip" : "tariff_start")),
  selectedTariff: "tariff_vip",
  currentQuestion: 0,
  userAnswers: {}, // { 1: "B", 36: "300 soat" }
  bookmarks: new Set(),
  timerSeconds: 90 * 60,
  timerInterval: null,
  currentCard: 0,
  isCardFlipped: false,
  laws: [],
  isPremium: isVipParam || localStorage.getItem("huquq_premium_active") === "true" || localStorage.getItem("huquq_user_plan") === "tariff_vip" || localStorage.getItem("huquq_user_plan") === "tariff_standard",
  streak: parseInt(localStorage.getItem("huquq_daily_streak") || "1"),
  currentDetailedResults: []
};

// DOM yuklanganda
document.addEventListener("DOMContentLoaded", () => {
  if (isVipParam) {
    state.isPremium = true;
    state.userPlan = "tariff_vip";
    showToast("Tabriklaymiz! VIP PRO a'zoligingiz muvaffaqiyatli faollashtirildi! 💎");
  }
  if (purchasedBookParam) {
    showToast("Tabriklaymiz! Kitobingiz muvaffaqiyatli xarid qilindi va ochildi! 📚");
  }
  // Telegram WebApp foydalanuvchisini aniqlash va kiritish
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || "O'quvchi";
    state.user.name = fullName;
    state.user.id = tgUser.id;

    if (!state.currentUser) {
      state.currentUser = {
        id: `TG-${tgUser.id}`,
        tgId: tgUser.id,
        name: fullName,
        username: tgUser.username ? `@${tgUser.username}` : null,
        role: "Abituriyent",
        plan: state.userPlan || "tariff_start",
        city: "Telegram"
      };
      localStorage.setItem("huquq_auth_user", JSON.stringify(state.currentUser));
    }
  }

  // Foydalanuvchi va Auth UI-ni yangilash
  initAuthUI();

  // Kunlik streakni yangilash
  updateDailyStreak();

  // Xatolar sonini yangilash
  updateMistakesCount();

  // 40 ta qonunni yuklash
  fetchLawsList();

  // Foydalanuvchi profilini server bilan sinxronizatsiya qilish (VIP statusni tekshirish)
  syncUserProfile();

  // Kanallarga a'zolik holatini yangilash
  updateHomeSubscriptionUI();

  // URL Hash orqali kerakli bo'limni darhol ochish (#octagon, #laws, #variants, #profile, #mistakes)
  handleRouteHash();
  window.addEventListener("hashchange", handleRouteHash);
});

function handleRouteHash() {
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === '#octagon' || hash === '#duel') {
    openOctagonLobby();
  } else if (hash === '#laws' || hash === '#qonun') {
    switchView('viewLaws');
  } else if (hash === '#variants' || hash === '#variant') {
    openVariantsModal();
  } else if (hash === '#profile' || hash === '#profil') {
    switchView('viewProfile');
  } else if (hash === '#mistakes' || hash === '#xatolar') {
    openMistakesTrainer();
  } else if (hash === '#cases' || hash === '#keys') {
    switchView('viewCases');
  }
}

// Serverdan foydalanuvchi VIP statusini sinxronizatsiya qilish
async function syncUserProfile() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || state.currentUser?.tgId || (state.currentUser?.id ? state.currentUser.id.replace('TG-', '') : null);
  if (!tgId) return;

  try {
    // 1. VIP holatini tezkor tekshirish
    const checkRes = await fetch(`/api/check-vip-status?userId=${tgId}`);
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.isVip) {
        state.isPremium = true;
        state.userPlan = 'tariff_vip';
        localStorage.setItem("huquq_premium_active", "true");
        localStorage.setItem("huquq_user_plan", "tariff_vip");
        if (state.currentUser) {
          state.currentUser.plan = 'tariff_vip';
          state.currentUser.isVip = true;
          localStorage.setItem("huquq_auth_user", JSON.stringify(state.currentUser));
        }
        initAuthUI();
        if (typeof updateAiLimitUI === 'function') updateAiLimitUI();
        if (state.laws && state.laws.length > 0 && typeof renderLawsList === 'function') {
          renderLawsList(state.laws);
        }
        return;
      }
    }

    // 2. To'liq profil orqali tekshirish
    const res = await fetch(`/api/auth/profile/${tgId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.isVip || data.plan === 'VIP PRO' || data.plan === 'tariff_vip' || data.plan === 'VIP') {
        state.isPremium = true;
        state.userPlan = 'tariff_vip';
        localStorage.setItem("huquq_premium_active", "true");
        localStorage.setItem("huquq_user_plan", "tariff_vip");
        if (state.currentUser) {
          state.currentUser.plan = 'tariff_vip';
          state.currentUser.isVip = true;
          localStorage.setItem("huquq_auth_user", JSON.stringify(state.currentUser));
        }
        initAuthUI();
        if (typeof updateAiLimitUI === 'function') updateAiLimitUI();
        if (state.laws && state.laws.length > 0 && typeof renderLawsList === 'function') {
          renderLawsList(state.laws);
        }
      }
    }
  } catch (e) {
    console.warn("User profile sync error:", e);
  }
}

// Kunlik Streak (Daily Streak) hisoblash
function updateDailyStreak() {
  const today = new Date().toDateString();
  const lastActive = localStorage.getItem("huquq_last_active_date");

  if (!lastActive) {
    state.streak = 1;
    localStorage.setItem("huquq_last_active_date", today);
    localStorage.setItem("huquq_daily_streak", "1");
  } else if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastActive === yesterday) {
      state.streak += 1;
    } else {
      state.streak = 1; // Ketma-ketlik uzildi
    }
    localStorage.setItem("huquq_last_active_date", today);
    localStorage.setItem("huquq_daily_streak", state.streak.toString());
  }

  const el = document.getElementById("streakCount");
  if (el) el.innerText = state.streak;
}

// Majburiy ro'yxatdan o'tish tekshiruvi (Har bir bo'limga kirish uchun)
function checkAuthRequired(featureName) {
  if (!state.currentUser) {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || "O'quvchi";
      state.currentUser = {
        id: `TG-${tgUser.id}`,
        tgId: tgUser.id,
        name: fullName,
        username: tgUser.username ? `@${tgUser.username}` : null,
        role: "Abituriyent",
        plan: state.userPlan || "tariff_start",
        city: "Telegram"
      };
      localStorage.setItem("huquq_auth_user", JSON.stringify(state.currentUser));
      initAuthUI();
      return true;
    }

    const msg = featureName 
      ? `🔒 "${featureName}" bo'limiga kirish uchun ro'yxatdan o'ting!`
      : "🔒 Platforma imkoniyatlaridan foydalanish uchun hisobingizga kiring!";
    showToast(msg);
    switchAuthTab('login');
    openAuthModal();
    return false;
  }
  return true;
}

// Ko'rinishlarni almashtirish
function switchView(viewId) {
  if (viewId !== "viewHome" && !checkAuthRequired()) {
    return;
  }
  const views = ["viewHome", "viewExam", "viewResult", "viewFlashcards", "viewLaws", "viewVariants", "viewBooks", "viewCases", "viewMistakes", "viewOctagon", "viewAiTutor", "viewProfile"];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  const isExamActive = !document.getElementById("viewExam").classList.contains("hidden");
  if (isExamActive && state.timerInterval) {
    if (!confirm("Test jarayoni to'xtatilsinmi?")) return;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  switchView("viewHome");
}

/* ==================== 1. IMTIHON MODULI ==================== */

function startExam() {
  if (!checkAuthRequired("Mock Imtihon")) return;
  state.currentQuestion = 0;
  state.userAnswers = {};
  state.bookmarks.clear();
  state.timerSeconds = (EXAM_DATA.timeMinutes || 90) * 60;

  const totalEl = document.getElementById("totalQCount");
  if (totalEl) totalEl.innerText = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);

  switchView("viewExam");
  startTimer();
  renderQuestion();
  renderGridMatrix();
}

function startCaseStudy() {
  if (!checkAuthRequired("Vaziyatli keyslar")) return;
  startExam();
  goToQuestion(32); // 33-savolga o'tish (0-indexed: 32)
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  const display = document.getElementById("timerDisplay");
  const icon = document.getElementById("timerIcon");

  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      alert("Vaqt tugadi! Test avtomatik yakunlanadi.");
      finishExam();
      return;
    }

    const mins = Math.floor(state.timerSeconds / 60);
    const secs = state.timerSeconds % 60;
    display.innerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    // Oxirgi 10 daqiqa qolganda ogohlantiruvchi qizil rang
    if (state.timerSeconds < 600) {
      display.classList.add("text-rose-600");
      icon.classList.replace("text-emerald-500", "text-rose-500");
    }
  }, 1000);
}

function renderQuestion() {
  const q = EXAM_DATA.questions[state.currentQuestion];
  if (!q) return;

  // Header elementlari
  const qIdxEl = document.getElementById("currentQIndex");
  if (qIdxEl) qIdxEl.innerText = state.currentQuestion + 1;
  const totalEl = document.getElementById("totalQCount");
  if (totalEl) totalEl.innerText = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);
  const qBadgeEl = document.getElementById("qBadgeType");
  if (qBadgeEl) qBadgeEl.innerText = q.type;
  const qSecEl = document.getElementById("qSectionName");
  if (qSecEl) qSecEl.innerText = q.section;

  // Xatcho'p statusi
  const bmIcon = document.querySelector("#btnBookmark i");
  if (bmIcon) {
    if (state.bookmarks.has(q.num)) {
      bmIcon.className = "fa-solid fa-bookmark text-amber-500";
    } else {
      bmIcon.className = "fa-regular fa-bookmark text-slate-400";
    }
  }

  // Case Study / Vaziyat matni (Y-2)
  const scBlock = document.getElementById("caseScenarioBox") || document.getElementById("scenarioContainer");
  const scText = document.getElementById("caseScenarioText") || document.getElementById("scenarioText");
  if (scBlock) {
    if (q.type === "Y-2" && q.scenario) {
      if (scText) scText.innerText = q.scenario;
      scBlock.classList.remove("hidden");
    } else {
      scBlock.classList.add("hidden");
    }
  }

  // Savol matni
  const qTextEl = document.getElementById("questionText") || document.getElementById("qText");
  if (qTextEl) {
    qTextEl.innerText = q.text;
  }

  // Manbalar (Darslik kitob va Qonunchilik)
  const bookEl = document.getElementById("qBookSource");
  if (bookEl) {
    bookEl.innerHTML = `<i class="fa-solid fa-book mr-1 text-indigo-500"></i> ${q.bookSource || 'BMBA 8-11 sinf darsligi'}`;
  }
  const lawEl = document.getElementById("qLawSource");
  if (lawEl) {
    lawEl.innerHTML = `<i class="fa-solid fa-scale-balanced mr-1 text-emerald-500"></i> ${q.lawSource || 'Spesifikatsiyadagi 40 ta Qonun'}`;
  }

  // Variantlar / Javob kiritish qismi
  const optContainer = document.getElementById("optionsContainer");
  if (!optContainer) return;
  optContainer.innerHTML = "";

  if (Array.isArray(q.options) && q.options.length > 0) {
    // 4 ta variant (A, B, C, D)
    q.options.forEach(opt => {
      const isSelected = state.userAnswers[q.num] === opt.key;
      const btn = document.createElement("button");
      btn.className = `w-full p-3.5 rounded-xl border text-left text-xs font-medium flex items-start space-x-3 transition active:scale-98 ${
        isSelected
          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
          : "bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300"
      }`;

      btn.onclick = () => selectOption(opt.key);

      btn.innerHTML = `
        <span class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
          isSelected ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
        }">${opt.key}</span>
        <span class="pt-0.5 leading-relaxed">${opt.text}</span>
      `;
      optContainer.appendChild(btn);
    });
  } else {
    // Ochiq savol (O) - Matn kiritish inputi
    const currentAns = state.userAnswers[q.num] || "";
    const openBox = document.createElement("div");
    openBox.className = "space-y-2 pt-1";
    openBox.innerHTML = `
      <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
        Qisqa javobingizni kiriting (raqam, muddat yoki atama):
      </label>
      <div class="relative">
        <input type="text" id="openAnswerInput" value="${currentAns}" 
          placeholder="Masalan: 300 soat, 1 oy, 14 kun..." 
          class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 transition">
      </div>
      <p class="text-[11px] text-slate-400">
        <i class="fa-solid fa-wand-magic-sparkles text-emerald-600 mr-1"></i> AI tekshiruvi kiritilgan har qanday shakldagi (raqam yoki so'z) to'g'ri ma'noni qabul qiladi.
      </p>
    `;
    optContainer.appendChild(openBox);

    const input = document.getElementById("openAnswerInput");
    if (input) {
      input.addEventListener("input", (e) => {
        state.userAnswers[q.num] = e.target.value.trim();
        updateGridMatrixCell(state.currentQuestion);
      });
    }
  }

  // Pastki navigatsiya tugmalari holati
  const prevBtn = document.getElementById("btnPrev");
  if (prevBtn) prevBtn.disabled = state.currentQuestion === 0;
  const nextBtn = document.getElementById("btnNext");
  if (nextBtn) {
    if (state.currentQuestion === (EXAM_DATA.totalQuestions || 45) - 1) {
      nextBtn.innerHTML = 'Tugatish <i class="fa-solid fa-flag-checkered ml-1"></i>';
      nextBtn.onclick = finishExamPrompt;
    } else {
      nextBtn.innerHTML = 'Keyingisi <i class="fa-solid fa-chevron-right ml-1"></i>';
      nextBtn.onclick = nextQuestion;
    }
  }
}

function selectOption(key) {
  const q = EXAM_DATA.questions[state.currentQuestion];
  state.userAnswers[q.num] = key;
  renderQuestion();
  updateGridMatrixCell(state.currentQuestion);

  // Agar foydalanuvchi noto'g'ri variantni tanlasa, savol darhol avtomatik "Mening xatolarim"ga tushadi
  const correctVal = (q.correct || q.correctKey || "").toString().trim().toUpperCase();
  if (correctVal && key.toString().trim().toUpperCase() !== correctVal) {
    saveMistakesFromResults([{
      num: q.num,
      type: q.type || "Y-1",
      section: q.section || EXAM_DATA.title || "Huquqiy test",
      text: q.text,
      options: q.options || [],
      correctAns: correctVal,
      userAns: key,
      isCorrect: false,
      explanation: q.explanation || "To'g'ri javob amaldagi qonun talabiga asoslangan.",
      bookSource: q.bookSource || "Huquq darsliklari va 40 ta Qonun",
      lawSource: q.lawSource || q.section || "40 ta Qonun"
    }]);
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
}

function toggleBookmark() {
  const q = EXAM_DATA.questions[state.currentQuestion];
  if (state.bookmarks.has(q.num)) {
    state.bookmarks.delete(q.num);
  } else {
    state.bookmarks.add(q.num);
  }
  renderQuestion();
  updateGridMatrixCell(state.currentQuestion);
}

function nextQuestion() {
  const total = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);
  if (state.currentQuestion < total - 1) {
    state.currentQuestion++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    renderQuestion();
  }
}

function goToQuestion(index) {
  state.currentQuestion = index;
  renderQuestion();
  toggleGridModal(false);
}

/* ==================== 2. GRID / XARITA MODAL ==================== */

function toggleGridModal(forceState) {
  const modal = document.getElementById("gridModal");
  if (forceState !== undefined) {
    if (forceState) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    } else {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
    return;
  }

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function renderGridMatrix() {
  const container = document.getElementById("gridModalContent") || document.getElementById("gridMatrix");
  if (!container) return;
  container.innerHTML = "";

  const totalCount = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);
  for (let i = 0; i < totalCount; i++) {
    const qNum = i + 1;
    const btn = document.createElement("button");
    btn.id = `gridCell_${i}`;
    btn.innerText = qNum;
    btn.onclick = () => goToQuestion(i);
    btn.className = getGridCellClass(i);
    container.appendChild(btn);
  }
}

function updateGridMatrixCell(index) {
  const cell = document.getElementById(`gridCell_${index}`);
  if (cell) {
    cell.className = getGridCellClass(index);
  }
}

function getGridCellClass(index) {
  const qNum = index + 1;
  const isAnswered = state.userAnswers[qNum] && state.userAnswers[qNum].toString().trim().length > 0;
  const isBookmarked = state.bookmarks.has(qNum);
  const isCurrent = state.currentQuestion === index;

  let base = "h-10 rounded-xl font-bold text-xs flex items-center justify-center transition ";

  if (isCurrent) {
    base += "ring-2 ring-emerald-500 ";
  }

  if (isBookmarked) {
    base += "bg-amber-400 text-slate-900 ";
  } else if (isAnswered) {
    base += "bg-emerald-600 text-white ";
  } else {
    base += "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 ";
  }

  return base;
}

/* ==================== 3. IMTIHONNI YAKUNLASH VA NATIJALAR ==================== */

function finishExamPrompt() {
  const totalCount = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);
  const answeredCount = Object.keys(state.userAnswers).filter(k => state.userAnswers[k] && state.userAnswers[k].toString().trim().length > 0).length;
  const unanswered = Math.max(0, totalCount - answeredCount);

  let msg = `Testni yakunlaysizmi?\n\nJavob berilgan: ${answeredCount} ta\nJavobsiz: ${unanswered} ta`;
  if (unanswered > 0) {
    msg += `\n\nDiqqat: Hali ${unanswered} ta savolga javob berilmadi!`;
  }

  if (confirm(msg)) {
    finishExam();
  }
}

function normalizeAnswer(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[\s\-_'",.]/g, "");
}

async function finishExam() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  showToast("Natijangiz hisoblanmoqda...");

  let correctCount = 0;
  const resultsDetailed = [];

  // Har bir savolni tekshiramiz
  for (const q of EXAM_DATA.questions) {
    const userAns = state.userAnswers[q.num];
    let isCorrect = false;

    const correctVal = q.correct || q.correctKey;
    if (q.type === "Y-1" || q.type === "Y-2" || (Array.isArray(q.options) && q.options.length > 0)) {
      isCorrect = Boolean(userAns && correctVal && userAns.toString().trim().toUpperCase() === correctVal.toString().trim().toUpperCase());
    } else {
      // Ochiq savol tekshiruvi (O)
      if (userAns) {
        const normUser = normalizeAnswer(userAns);
        const matchFound = q.acceptableAnswers.some(ans => normalizeAnswer(ans) === normUser);
        if (matchFound) {
          isCorrect = true;
        } else if (userAns.trim().length > 0) {
          // Kichik imlo yoki so'z farqlari uchun tekshiruv
          const normCanonical = normalizeAnswer(q.canonicalAnswer);
          if (normUser.includes(normCanonical) || normCanonical.includes(normUser)) {
            isCorrect = true;
          }
        }
      }
    }

    if (isCorrect) correctCount++;

    resultsDetailed.push({
      num: q.num,
      type: q.type || (q.options ? "Y-1" : "O"),
      section: q.section,
      text: q.text,
      options: q.options || [],
      userAns: userAns || "Javob berilmadi",
      correctAns: (q.type === "O" && !q.options) ? q.canonicalAnswer : (q.correct || q.correctKey),
      isCorrect: isCorrect,
      explanation: q.explanation,
      bookSource: q.bookSource || "8-11 sinf darsliklari",
      lawSource: q.lawSource || "Spesifikatsiyadagi 40 ta Qonun"
    });
  }

  state.currentDetailedResults = resultsDetailed;
  state.lastScore = correctCount;
  const totalQ = EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45);
  state.lastTotal = totalQ;

  const percentage = Math.round((correctCount / totalQ) * 100);
  state.lastPercentage = percentage;

  // Darajani aniqlash (BMBA shkalasi)
  let level = "C";
  if (percentage >= 86) level = "A+";
  else if (percentage >= 75) level = "A";
  else if (percentage >= 65) level = "B+";
  else if (percentage >= 55) level = "B";
  else if (percentage >= 50) level = "C";
  else level = "Qoniqarsiz";
  state.lastLevel = level;

  // Xatolar bankiga saqlash
  saveMistakesFromResults(resultsDetailed);

  // UI Natija ekrani
  document.getElementById("resScore").innerText = correctCount;
  const maxScoreEl = document.getElementById("resMaxScore");
  if (maxScoreEl) maxScoreEl.innerText = `/ ${totalQ} ball`;
  document.getElementById("resPercent").innerText = `${percentage}% to'g'ri bajarildi (${correctCount} ta to'g'ri, ${totalQ - correctCount} ta xato)`;
  document.getElementById("resBadgeLevel").innerText = level;

  // Ustoz & Katta Aka samimiy dalda xabari
  const mentorTextEl = document.getElementById("mentorFeedbackText");
  if (mentorTextEl) {
    if (percentage >= 80) {
      mentorTextEl.innerHTML = `<strong>Qoyil, bo'lajak yurist!</strong> Haqiqiy chempioncha natija! Sen bilan faxrlanaman. Imtihonda ham xuddi shunday sovuqqonlik va ishonch bilan yuqori 'A+' darajani qo'lga kiritasan! 🔥🎓`;
    } else if (percentage >= 50) {
      mentorTextEl.innerHTML = `<strong>Yaxshi harakat, bo'lajak yurist!</strong> Yaxshi natija, lekin sen bundan ham yuqorisiga qodirsan. Xato qilgan savollaring ustida ishlab, to'g'ri javoblarni eslab qol. Talabalik baxti, ota-onangning quvonchi har bir intilishingga arziydi! 💪✨`;
    } else {
      mentorTextEl.innerHTML = `<strong>Xafa bo'lma, bo'lajak yurist!</strong> Hozir bu yerda adashganing — imtihonda adashmasliging uchun eng katta dars bo'ldi. Bilaman, moddalarni, sanalarni yodlash oson emas. Asosiysi, to'xtama, to'g'ri javobni eslab qol va yana bir bor takrorlab chiq! 🤝`;
    }
  }

  // 1. Sohalar bo'yicha diagnostika va kuchsiz mavzularni chizish
  renderDomainDiagnostics(resultsDetailed);

  // 2. Natijalar ro'yxatini render qilish
  renderResultsList(resultsDetailed);

  // 3. Natijani serverga va Leaderboardga yuborish
  submitResultToServer(correctCount, percentage, level);

  switchView("viewResult");
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred(percentage >= 60 ? "success" : "warning");
}

// 2. SHAXSIY STATISTIKA VA KUCHSIZ MAVZULAR (WEAK TOPICS) TAHLILI
function renderDomainDiagnostics(results) {
  const container = document.getElementById("domainDiagnosticList");
  if (!container) return;
  container.innerHTML = "";

  const domains = {};
  results.forEach(r => {
    const sec = r.section || "Umumiy huquq";
    if (!domains[sec]) {
      domains[sec] = { total: 0, correct: 0 };
    }
    domains[sec].total++;
    if (r.isCorrect) domains[sec].correct++;
  });

  Object.keys(domains).forEach(secName => {
    const d = domains[secName];
    const pct = Math.round((d.correct / d.total) * 100);
    const isWeak = pct < 70;

    const row = document.createElement("div");
    row.className = `p-3 rounded-xl border text-xs space-y-1.5 ${
      isWeak 
        ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" 
        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700"
    }`;

    row.innerHTML = `
      <div class="flex items-center justify-between font-bold">
        <span class="text-slate-800 dark:text-white flex items-center">
          ${isWeak ? '<i class="fa-solid fa-triangle-exclamation text-rose-500 mr-1.5"></i>' : '<i class="fa-solid fa-circle-check text-emerald-500 mr-1.5"></i>'}
          ${secName}
        </span>
        <span class="${isWeak ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}">
          ${pct}% (${d.correct}/${d.total})
        </span>
      </div>

      <!-- Progress bar -->
      <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div class="${isWeak ? 'bg-rose-500' : 'bg-emerald-500'} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
      </div>

      ${isWeak ? `
        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-rose-600 font-semibold">⚠️ Kuchsiz mavzu: Takrorlash zarur!</span>
          <button onclick="openFlashcards()" class="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition">
            Flashcardsda takrorlash <i class="fa-solid fa-arrow-right ml-0.5"></i>
          </button>
        </div>
      ` : ''}
    `;

    container.appendChild(row);
  });
}

function renderResultsList(list) {
  const container = document.getElementById("resultsDetailedList");
  container.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = `p-4 rounded-xl border text-xs space-y-2.5 ${
      item.isCorrect
        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
        : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between font-bold">
        <span class="flex items-center space-x-1.5">
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${
            item.isCorrect ? "bg-emerald-600" : "bg-rose-600"
          }">${item.num}</span>
          <span class="text-slate-700 dark:text-slate-200">${item.section}</span>
        </span>
        <div class="flex items-center space-x-2">
          <button onclick="askAITutor(${item.num})" class="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-500 font-bold text-[10px] flex items-center space-x-1 shadow-xs transition">
            <i class="fa-solid fa-wand-magic-sparkles text-emerald-500"></i>
            <span>AI Tahlil</span>
          </button>
          <span class="${item.isCorrect ? "text-emerald-600" : "text-rose-600"} font-bold">
            ${item.isCorrect ? '<i class="fa-solid fa-check mr-1"></i> To\'g\'ri' : '<i class="fa-solid fa-xmark mr-1"></i> Xato'}
          </span>
        </div>
      </div>

      <div class="text-slate-600 dark:text-slate-300 line-clamp-2">${item.text}</div>

      <div class="p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700 space-y-1">
        <div><strong>Sizning javobingiz:</strong> <span class="${item.isCorrect ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}">${item.userAns}</span></div>
        ${!item.isCorrect ? `
          <div><strong>To'g'ri javob:</strong> <span class="text-emerald-700 font-bold">${item.correctAns}</span></div>
          <div class="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5 leading-relaxed">
            <span class="text-sm">🤝</span>
            <span><strong>Xafa bo'lma!</strong> Hozir bu yerda adashganing — imtihonda adashmasliging uchun eng katta dars bo'ldi. Asosiysi, to'g'ri javobni eslab qol.</span>
          </div>
        ` : ''}
        <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
          <i class="fa-solid fa-scale-balanced mr-1 text-emerald-600"></i> ${item.explanation}
        </div>
        <div class="text-[10px] pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60">
          <span class="text-indigo-600 font-semibold"><i class="fa-solid fa-book mr-1"></i> ${item.bookSource || 'Darslik'}</span>
          <span class="text-emerald-600 font-semibold"><i class="fa-solid fa-gavel mr-1"></i> ${item.lawSource || 'Qonunchilik'}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 1. AI REPETITOR MODAL BILAN SAVOLNI TAHLIL QILISH
async function askAITutor(target) {
  const modal = document.getElementById("aiExplainModal");
  const loading = document.getElementById("aiExplainLoading");
  const content = document.getElementById("aiExplainContent");

  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (loading) loading.classList.remove("hidden");
  if (content) content.classList.add("hidden");

  let item = null;
  if (typeof target === 'object' && target !== null) {
    item = target;
  } else if (typeof target === 'number') {
    item = (state.currentDetailedResults && state.currentDetailedResults.find(r => r.num === target)) ||
           (EXAM_DATA && EXAM_DATA.questions && EXAM_DATA.questions[target - 1]);
  }

  if (!item) {
    item = {
      text: "Huquqiy test savoli",
      options: [],
      correctAns: "A",
      userAns: "",
      explanation: "Ushbu savol O'zbekiston Respublikasi qonunlariga asoslangan.",
      section: "Huquqshunoslik"
    };
  }

  const lawArticleEl = document.getElementById("aiLawArticle");
  const explanationEl = document.getElementById("aiExplanationText") || document.getElementById("aiExplanation");
  const mistakeReasonEl = document.getElementById("aiMistakeReason");
  const memoryTipEl = document.getElementById("aiMemoryTip");

  try {
    const res = await fetch("/api/ai/explain-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: item.text || item.questionText || "",
        options: item.options || [],
        correctAnswer: item.correctAns || item.correct || item.correctAnswer || "A",
        userAnswer: item.userAns || item.userAnswer || "",
        explanation: item.explanation || "",
        lawRef: item.section || item.lawSource || ""
      })
    });

    const data = await res.json();

    if (lawArticleEl) lawArticleEl.innerText = data.lawArticle || item.section || item.lawSource || "O'zbekiston Qonunchiligi";
    if (explanationEl) explanationEl.innerText = data.explanation || item.explanation || "Tahlil mavjud emas.";
    if (mistakeReasonEl) mistakeReasonEl.innerText = data.mistakeReason || "Savoldagi nozik normativ shartlarga yetarlicha e'tibor berilmagan.";
    if (memoryTipEl) memoryTipEl.innerText = data.memoryTip || "Ushbu savol yuzasidan qonun moddasini konspekt qilib takrorlang.";

    if (loading) loading.classList.add("hidden");
    if (content) content.classList.remove("hidden");
  } catch (err) {
    console.warn("askAITutor fetch fallback:", err);
    if (lawArticleEl) lawArticleEl.innerText = item.section || item.lawSource || "O'zbekiston Respublikasi Qonunchiligi";
    if (explanationEl) explanationEl.innerText = item.explanation || "To'g'ri javob amaldagi qonun me'yorlariga to'liq mos keladi.";
    if (mistakeReasonEl) mistakeReasonEl.innerText = "Savoldagi normativ muddatlar va shartlarga e'tibor qaratilmagan.";
    if (memoryTipEl) memoryTipEl.innerText = "Ushbu savol bo'yicha Flashcardlarni takrorlab chiqing.";

    if (loading) loading.classList.add("hidden");
    if (content) content.classList.remove("hidden");
  }
}

function closeAiExplainModal() {
  const modal = document.getElementById("aiExplainModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function closeAIModal() {
  closeAiExplainModal();
}

// Natijani serverga va Leaderboardga saqlash
async function submitResultToServer(score, percentage, grade) {
  try {
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.user?.name || (state.currentUser && state.currentUser.name) || "Talaba",
        score: score,
        total: EXAM_DATA.totalQuestions || (EXAM_DATA.questions ? EXAM_DATA.questions.length : 45),
        percentage: percentage,
        grade: grade,
        timeSpent: `${Math.round((90 * 60 - state.timerSeconds) / 60)} daqiqa`
      })
    });
  } catch (err) {
    console.error("Natijani serverga saqlashda xatolik:", err);
  }
}

function sendResultToTelegram() {
  const score = document.getElementById("resScore").innerText;
  const level = document.getElementById("resBadgeLevel").innerText;
  const percent = document.getElementById("resPercent").innerText;

  const data = {
    action: "test_completed",
    score: score,
    total: EXAM_DATA.totalQuestions,
    level: level,
    percent: percent,
    user: state.user
  };

  if (tg && tg.sendData) {
    tg.sendData(JSON.stringify(data));
  } else {
    alert(`Natijangiz saqlandi!\nBall: ${score}/45\nDaraja: ${level}\n${percent}`);
  }
}

/* ==================== 4. REYTING & LEADERBOARD (IMTIHON & DUEL) ==================== */

let activeLeaderboardTab = 'exam';

const DEFAULT_DUEL_LEADERBOARD = [
  { name: "Boburmirzo Aliyev", duelScore: 1420, wins: 48, losses: 6, matches: 54, rankTitle: "Oktagon Chempioni 🏆👑", lastActive: "Bugun" },
  { name: "Shahnoza Karimova", duelScore: 1180, wins: 39, losses: 9, matches: 48, rankTitle: "Oktagon Chempioni 🏆👑", lastActive: "Bugun" },
  { name: "Javohir Usmonov", duelScore: 890, wins: 29, losses: 8, matches: 37, rankTitle: "Oliy Sud Himoyachisi 🏛️", lastActive: "Kecha" },
  { name: "Dilshod Rahimov", duelScore: 760, wins: 25, losses: 11, matches: 36, rankTitle: "Oliy Sud Himoyachisi 🏛️", lastActive: "Bugun" },
  { name: "Malika Sobirova", duelScore: 610, wins: 20, losses: 7, matches: 27, rankTitle: "Oliy Sud Himoyachisi 🏛️", lastActive: "Bugun" },
  { name: "Azizbek Toirov", duelScore: 490, wins: 16, losses: 6, matches: 22, rankTitle: "Master Yurist ⚖️", lastActive: "2 kun oldin" },
  { name: "Gulnoza Rustamova", duelScore: 340, wins: 11, losses: 4, matches: 15, rankTitle: "Master Yurist ⚖️", lastActive: "Bugun" },
  { name: "Sardorbek Qodirov", duelScore: 220, wins: 7, losses: 3, matches: 10, rankTitle: "Huquqiy Jangchi ⚔️", lastActive: "Kecha" }
];

const DEFAULT_EXAM_LEADERBOARD = [
  { name: "Alisher Qodirov", score: 44, total: 45, percentage: 98, grade: "A+", date: "18.11.2026", timeSpent: "68 daqiqa" },
  { name: "Dilnoza Rahimova", score: 43, total: 45, percentage: 96, grade: "A+", date: "19.11.2026", timeSpent: "74 daqiqa" },
  { name: "Shahzodbek Toirov", score: 42, total: 45, percentage: 93, grade: "A+", date: "17.11.2026", timeSpent: "81 daqiqa" },
  { name: "Nodira Karimova", score: 41, total: 45, percentage: 91, grade: "A+", date: "19.11.2026", timeSpent: "85 daqiqa" },
  { name: "Javlon Umarov", score: 39, total: 45, percentage: 87, grade: "A+", date: "16.11.2026", timeSpent: "79 daqiqa" },
  { name: "Sevara Yusupova", score: 38, total: 45, percentage: 84, grade: "A", date: "18.11.2026", timeSpent: "88 daqiqa" },
  { name: "Farrux Hasanov", score: 36, total: 45, percentage: 80, grade: "A", date: "17.11.2026", timeSpent: "90 daqiqa" }
];

async function openLeaderboardModal(tab = 'exam') {
  const modal = document.getElementById("leaderboardModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  await switchLeaderboardTab(tab);
}

function openDuelLeaderboard() {
  openLeaderboardModal('duel');
}

async function switchLeaderboardTab(tab) {
  activeLeaderboardTab = tab || 'exam';
  const examBtn = document.getElementById("tabLeaderboardExam");
  const duelBtn = document.getElementById("tabLeaderboardDuel");
  const modalTitle = document.getElementById("leaderboardModalTitle");
  const modalSub = document.getElementById("leaderboardModalSub");
  const listContainer = document.getElementById("leaderboardList");

  if (activeLeaderboardTab === 'duel') {
    if (examBtn) examBtn.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition flex items-center justify-center space-x-1.5";
    if (duelBtn) duelBtn.className = "py-2 rounded-lg bg-red-600 text-white shadow-xs transition flex items-center justify-center space-x-1.5";
    if (modalTitle) modalTitle.innerText = "🥊 Huquqiy Duel Reytingi";
    if (modalSub) modalSub.innerText = "Octagon 1v1 janglari bo'yicha eng kuchli yuristlar";
    
    // Foydalanuvchining o'z ballarini qo'shgan holda zudlik bilan render qilish (0ms kutish)
    let initialList = [...DEFAULT_DUEL_LEADERBOARD];
    try {
      const myStatsRaw = localStorage.getItem("huquq_duel_stats");
      if (myStatsRaw) {
        const myStats = JSON.parse(myStatsRaw);
        if (myStats && myStats.duelScore > 0) {
          const myName = (state.user?.name || (state.currentUser && state.currentUser.name) || "Siz (Ishtirokchi)").trim();
          if (!initialList.some(p => p.name === myName)) {
            initialList.push({
              name: myName + " (Siz)",
              duelScore: myStats.duelScore,
              wins: myStats.wins || 0,
              losses: myStats.losses || 0,
              matches: myStats.matches || 0,
              rankTitle: myStats.rankTitle || "Huquqiy Jangchi ⚔️",
              lastActive: "Hozir"
            });
            initialList.sort((a, b) => b.duelScore - a.duelScore);
          }
        }
      }
    } catch (e) {}
    renderDuelLeaderboardList(initialList);

    // Fondan yangi ma'lumotlarni tortish
    try {
      const res = await fetch("/api/duel/leaderboard");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          renderDuelLeaderboardList(data);
        }
      }
    } catch (err) {
      console.warn("Duel leaderboard fetch fallback:", err);
    }
  } else {
    if (examBtn) examBtn.className = "py-2 rounded-lg bg-white dark:bg-slate-800 text-amber-600 shadow-xs transition flex items-center justify-center space-x-1.5";
    if (duelBtn) duelBtn.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition flex items-center justify-center space-x-1.5";
    if (modalTitle) modalTitle.innerText = "🏆 BMBA Imtihon Reytingi";
    if (modalSub) modalSub.innerText = "BMBA Milliy Test Tizimi natijalari";
    
    // Zudlik bilan default render
    renderLeaderboardList(DEFAULT_EXAM_LEADERBOARD);

    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          renderLeaderboardList(data);
        }
      }
    } catch (err) {
      console.warn("Exam leaderboard fetch fallback:", err);
    }
  }
}

function renderLeaderboardList(list) {
  const container = document.getElementById("leaderboardList");
  if (!container) return;
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-slate-400">Hozircha natijalar yo\'q. Birinchi bo\'lib testni topshiring!</div>';
    return;
  }

  list.forEach((entry, idx) => {
    let rankBadge = `${idx + 1}`;
    if (idx === 0) rankBadge = "🥇";
    else if (idx === 1) rankBadge = "🥈";
    else if (idx === 2) rankBadge = "🥉";

    const item = document.createElement("div");
    item.className = "p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between";

    item.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${
          idx < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }">${rankBadge}</span>
        <div>
          <h4 class="font-bold text-slate-800 dark:text-white leading-tight">${entry.name}</h4>
          <p class="text-[10px] text-slate-400">${entry.date || ''} • ${entry.timeSpent || ''}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-extrabold text-sm text-emerald-600">${entry.score} / ${entry.total || 45}</span>
        <span class="block text-[10px] font-bold text-slate-500">${entry.grade || 'A'} (${entry.percentage}%)</span>
      </div>
    `;

    container.appendChild(item);
  });
}

function renderDuelLeaderboardList(list) {
  const container = document.getElementById("leaderboardList");
  if (!container) return;
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-slate-400">Hozircha duellar bo\'yicha ballar mavjud emas. Oktagonga kiring va birinchi g\'alabani qozoning! 🥊</div>';
    return;
  }

  list.forEach((entry, idx) => {
    let rankBadge = `${idx + 1}`;
    if (idx === 0) rankBadge = "🥇";
    else if (idx === 1) rankBadge = "🥈";
    else if (idx === 2) rankBadge = "🥉";

    const item = document.createElement("div");
    item.className = "p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between";

    item.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
          idx < 3 ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-red-950 font-black shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }">${rankBadge}</span>
        <div>
          <h4 class="font-bold text-slate-800 dark:text-white leading-tight flex items-center space-x-1.5">
            <span>${entry.name}</span>
          </h4>
          <div class="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
            <span class="text-red-500 font-bold">${entry.rankTitle || 'Huquqiy Jangchi'}</span>
            <span>•</span>
            <span>${entry.wins || 0}G' / ${entry.losses || 0}M (${entry.matches || 0} jang)</span>
          </div>
        </div>
      </div>
      <div class="text-right">
        <span class="font-black text-sm text-yellow-600 dark:text-yellow-400 flex items-center justify-end space-x-1">
          <i class="fa-solid fa-trophy text-[10px]"></i>
          <span>${entry.duelScore || entry.score || 0}</span>
        </span>
        <span class="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Duel Bali</span>
      </div>
    `;

    container.appendChild(item);
  });
}

function closeLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

/* ==================== AUTH VA PROFIL MANTIQI ==================== */

function initAuthUI() {
  const user = state.currentUser;
  const btnLogin = document.getElementById("btnHeaderLogin");
  const btnProfile = document.getElementById("btnHeaderProfile");
  const headerPlanBadge = document.getElementById("headerPlanBadge");
  const userNameElem = document.getElementById("userName");

  // Plan badge text
  let planTitle = "TARIFLAR";
  if (state.userPlan === "tariff_vip") planTitle = "VIP PRO";
  else if (state.userPlan === "tariff_standard") planTitle = "STANDARD";
  else if (state.userPlan === "tariff_start") planTitle = "START";
  if (headerPlanBadge) headerPlanBadge.innerText = planTitle;

  const guestBanner = document.getElementById("guestNoticeBanner");

  if (user) {
    if (btnLogin) btnLogin.classList.add("hidden");
    if (btnProfile) {
      btnProfile.classList.remove("hidden");
      btnProfile.classList.add("flex");
    }
    if (guestBanner) guestBanner.classList.add("hidden");
    const shortName = (user.name || "O'quvchi").split(" ")[0];
    if (userNameElem) userNameElem.innerText = shortName;
  } else {
    if (btnLogin) btnLogin.classList.remove("hidden");
    if (btnProfile) {
      btnProfile.classList.add("hidden");
      btnProfile.classList.remove("flex");
    }
    if (guestBanner) guestBanner.classList.remove("hidden");
    if (userNameElem) userNameElem.innerText = "O'quvchi";
  }

  // Profil oynasi elementlarini yangilash
  updateProfileViewData();
}

function updateProfileViewData() {
  const user = state.currentUser || {
    name: state.user?.name || "O'quvchi (Mehmon)",
    phone: "Ro'yxatdan o'tilmagan",
    role: "Abituriyent",
    city: "O'zbekiston"
  };

  const nameEl = document.getElementById("profName");
  const phoneEl = document.getElementById("profPhone");
  const roleEl = document.getElementById("profRole");
  const cityEl = document.getElementById("profCity");
  const planNameEl = document.getElementById("profPlanName");
  const planBadgeEl = document.getElementById("profPlanBadge");
  const planDescEl = document.getElementById("profPlanDesc");
  const avatarEl = document.getElementById("profAvatar");

  if (nameEl) nameEl.innerText = user.name || "O'quvchi";
  if (phoneEl) phoneEl.innerText = user.phone || "+998 (--) --- -- --";
  if (roleEl) roleEl.innerText = user.role || "Abituriyent";
  if (cityEl) cityEl.innerText = user.city || "Toshkent shahri";

  if (avatarEl && user.name) {
    const initials = user.name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    avatarEl.innerText = initials || "HQ";
  }

  // Tarif ma'lumotlari
  if (state.userPlan === "tariff_vip") {
    if (planNameEl) planNameEl.innerText = "VIP PRO + AI REPETITOR";
    if (planBadgeEl) {
      planBadgeEl.innerText = "VIP Faol 💎";
      planBadgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs";
    }
    if (planDescEl) planDescEl.innerText = "Barcha 50 ta variant, AI Repetitor tahlillari va VIP Telegram guruh siz uchun ochiq!";
  } else if (state.userPlan === "tariff_standard") {
    if (planNameEl) planNameEl.innerText = "STANDARD (Ommabop)";
    if (planBadgeEl) {
      planBadgeEl.innerText = "Faol ✅";
      planBadgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white";
    }
    if (planDescEl) planDescEl.innerText = "Barcha 50 ta variant, 25 ta vaziyatli keys va darsliklar ochiq.";
  } else {
    if (planNameEl) planNameEl.innerText = "START (Bepul Sinov)";
    if (planBadgeEl) {
      planBadgeEl.innerText = "Bepul";
      planBadgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    }
    if (planDescEl) planDescEl.innerText = "Sizda BMBA Mock imtihoni, 1-5 variantlar va 40 ta qonun bepul ochiq. Barcha 50 ta variant va AI uchun tarifni yangilang.";
  }

  // Statistika
  const examsCount = localStorage.getItem("huquq_completed_exams_count") || "0";
  const avgScore = localStorage.getItem("huquq_last_score_percent") || "0";
  const mistakes = getStoredMistakes();

  const profExams = document.getElementById("profExamsCount");
  const profAvg = document.getElementById("profAvgScore");
  const profStreak = document.getElementById("profStreakNum");
  const profMistakes = document.getElementById("profMistakesNum");

  if (profExams) profExams.innerText = `${examsCount} ta`;
  if (profAvg) profAvg.innerText = `${avgScore}%`;
  if (profStreak) profStreak.innerText = `${state.streak} kun`;
  if (profMistakes) profMistakes.innerText = `${mistakes.length} ta`;

  // Huquqiy Duel statistikasi
  let duelStats = { duelScore: 0, wins: 0, losses: 0, matches: 0 };
  try {
    const raw = localStorage.getItem("huquq_duel_stats");
    if (raw) duelStats = JSON.parse(raw);
  } catch (e) {}

  const profDuelScoreEl = document.getElementById("profDuelScore");
  const profDuelRecordEl = document.getElementById("profDuelRecord");
  if (profDuelScoreEl) profDuelScoreEl.innerText = `${duelStats.duelScore || 0} ball`;
  if (profDuelRecordEl) profDuelRecordEl.innerText = `${duelStats.matches || 0} jang • ${duelStats.wins || 0} g'alaba (${duelStats.losses || 0} mag'lubiyat)`;
}

function openProfileView() {
  if (!state.currentUser) {
    openAuthModal();
    return;
  }
  switchView("viewProfile");
  updateProfileViewData();
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById("tabBtnLogin");
  const tabRegister = document.getElementById("tabBtnRegister");
  const formLogin = document.getElementById("loginForm");
  const formRegister = document.getElementById("registerForm");
  const modalTitle = document.getElementById("authModalTitle");
  const loginErr = document.getElementById("loginError");
  const regErr = document.getElementById("registerError");

  if (loginErr) loginErr.classList.add("hidden");
  if (regErr) regErr.classList.add("hidden");

  if (tab === "login") {
    if (modalTitle) modalTitle.innerText = "Tizimga Kirish";
    if (tabLogin) {
      tabLogin.className = "py-2 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 shadow-xs transition";
    }
    if (tabRegister) {
      tabRegister.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition";
    }
    if (formLogin) formLogin.classList.remove("hidden");
    if (formRegister) formRegister.classList.add("hidden");
  } else {
    if (modalTitle) modalTitle.innerText = "Yangi Hisob Ochish";
    if (tabRegister) {
      tabRegister.className = "py-2 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 shadow-xs transition";
    }
    if (tabLogin) {
      tabLogin.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition";
    }
    if (formRegister) formRegister.classList.remove("hidden");
    if (formLogin) formLogin.classList.add("hidden");
  }
}

function togglePassVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.className = "fa-regular fa-eye-slash";
  } else {
    input.type = "password";
    if (icon) icon.className = "fa-regular fa-eye";
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const phone = (document.getElementById("loginPhoneInput")?.value || "").trim();
  const password = (document.getElementById("loginPassInput")?.value || "").trim();
  const errEl = document.getElementById("loginError");
  const btn = document.getElementById("btnLoginSubmit");

  if (!phone || !password) {
    if (errEl) {
      errEl.innerText = "Telefon raqam va parolni kiriting!";
      errEl.classList.remove("hidden");
    }
    return;
  }

  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Kirilmoqda...';

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      state.currentUser = data.user;
      localStorage.setItem("huquq_auth_user", JSON.stringify(data.user));
      if (data.user.plan) {
        state.userPlan = data.user.plan;
        localStorage.setItem("huquq_user_plan", data.user.plan);
      }
      initAuthUI();
      closeAuthModal();
      showToast(`Xush kelibsiz, ${data.user.name}! 👋`);
    } else {
      if (errEl) {
        errEl.innerText = data.error || "Login yoki parol noto'g'ri!";
        errEl.classList.remove("hidden");
      }
    }
  } catch (err) {
    // Offline/Local fallback
    const fallbackUser = {
      id: "u_" + Date.now(),
      name: phone.includes("@") ? phone.split("@")[0] : "O'quvchi",
      phone: phone,
      role: "Abituriyent",
      city: "Toshkent shahri",
      plan: state.userPlan || "tariff_start"
    };
    state.currentUser = fallbackUser;
    localStorage.setItem("huquq_auth_user", JSON.stringify(fallbackUser));
    initAuthUI();
    closeAuthModal();
    showToast(`Xush kelibsiz, ${fallbackUser.name}! (Oflayn) 👋`);
  } finally {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i><span>Kirish</span>';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById("regNameInput")?.value || "").trim();
  const phone = (document.getElementById("regPhoneInput")?.value || "").trim();
  const role = (document.getElementById("regRoleInput")?.value || "Abituriyent").trim();
  const city = (document.getElementById("regCityInput")?.value || "Toshkent shahri").trim();
  const password = (document.getElementById("regPassInput")?.value || "").trim();
  const errEl = document.getElementById("registerError");
  const btn = document.getElementById("btnRegisterSubmit");

  if (!name || !phone || !password) {
    if (errEl) {
      errEl.innerText = "Barcha maydonlarni to'ldiring!";
      errEl.classList.remove("hidden");
    }
    return;
  }

  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Ro\'yxatdan o\'tilmoqda...';

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, password, role, city })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      state.currentUser = data.user;
      localStorage.setItem("huquq_auth_user", JSON.stringify(data.user));
      initAuthUI();
      closeAuthModal();
      showToast(`Tabriklaymiz, ${data.user.name}! Ro'yxatdan muvaffaqiyatli o'tdingiz 🎉`);
    } else {
      // Agar Vercel EROFS read-only yoki serverless xatoligi yuz bersa, to'xtatmasdan lokal ro'yxatdan o'tkazamiz
      if (data.error && (data.error.includes("read-only") || data.error.includes("EROFS") || data.error.includes("users.json"))) {
        const fallbackUser = {
          id: "USR-" + Date.now(),
          name,
          phone,
          role,
          city,
          plan: "tariff_start"
        };
        state.currentUser = fallbackUser;
        localStorage.setItem("huquq_auth_user", JSON.stringify(fallbackUser));
        initAuthUI();
        closeAuthModal();
        showToast(`Tabriklaymiz, ${name}! Ro'yxatdan muvaffaqiyatli o'tdingiz 🎉`);
        return;
      }
      if (errEl) {
        errEl.innerText = data.error || "Ro'yxatdan o'tishda xatolik!";
        errEl.classList.remove("hidden");
      }
    }
  } catch (err) {
    // Offline / Local fallback
    const fallbackUser = {
      id: "u_" + Date.now(),
      name,
      phone,
      role,
      city,
      plan: "tariff_start"
    };
    state.currentUser = fallbackUser;
    localStorage.setItem("huquq_auth_user", JSON.stringify(fallbackUser));
    initAuthUI();
    closeAuthModal();
    showToast(`Ro'yxatdan o'tildi, ${name}! 🎉`);
  } finally {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Ro\'yxatdan o\'tish</span>';
  }
}

function handleLogout() {
  if (confirm("Haqiqatan ham tizimdan chiqmoqchimisiz?")) {
    state.currentUser = null;
    localStorage.removeItem("huquq_auth_user");
    initAuthUI();
    showHome();
    showToast("Tizimdan muvaffaqiyatli chiqildi. 👋");
  }
}

/* ==================== 5. 3 TA TARIF VA OBUNA (START, STANDARD, VIP PRO) ==================== */

function openTariffsModal() {
  const modal = document.getElementById("premiumModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeTariffsModal() {
  const modal = document.getElementById("premiumModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function openPremiumModal() {
  openTariffsModal();
}

function closePremiumModal() {
  closeTariffsModal();
}

function selectTariff(tariffId) {
  state.selectedTariff = tariffId;
  const labelEl = document.getElementById("selectedTariffLabel");
  const priceEl = document.getElementById("selectedTariffPrice");
  const paymentSection = document.getElementById("tariffPaymentSection");

  if (tariffId === "tariff_start") {
    state.userPlan = "tariff_start";
    localStorage.setItem("huquq_user_plan", "tariff_start");
    initAuthUI();
    showToast("START (Bepul) tarifi faol! BMBA Mock imtihoni mutlaqo bepul! 🎉");
    closeTariffsModal();
    return;
  }

  if (tariffId === "tariff_standard") {
    if (labelEl) labelEl.innerText = "STANDARD (49 000 UZS)";
    if (priceEl) priceEl.innerText = "49 000 UZS";
    showToast("STANDARD tarifi tanlandi (49 000 UZS). To'lov ma'lumotlari quyida:");
  } else if (tariffId === "tariff_vip") {
    if (labelEl) labelEl.innerText = "VIP PRO + AI REPETITOR (89 000 UZS)";
    if (priceEl) priceEl.innerText = "89 000 UZS";
    showToast("VIP PRO tarifi tanlandi (89 000 UZS). To'lov ma'lumotlari quyida:");
  }

  if (paymentSection) {
    paymentSection.scrollIntoView({ behavior: "smooth", block: "center" });
    paymentSection.classList.add("ring-2", "ring-yellow-400");
    setTimeout(() => paymentSection.classList.remove("ring-2", "ring-yellow-400"), 2000);
  }
}

function copyCardNumber() {
  const cardNum = "9860036671568792";
  navigator.clipboard.writeText(cardNum).then(() => {
    const btnText = document.getElementById("copyBtnText");
    if (btnText) btnText.innerText = "Nusxalandi! ✅";
    showToast("Karta raqami nusxalandi: 9860 0366 7156 8792");
    setTimeout(() => {
      if (btnText) btnText.innerText = "Nusxa olish";
    }, 2500);
  }).catch(() => {
    showToast("Karta raqami: 9860 0366 7156 8792");
  });
}

function openTelegramAdminContact() {
  const botUrl = "https://t.me/HuquqdanSertifikatBot?start=tolov_cheki";
  showToast("Bot ochilmoqda... Chek rasmini botga yuboring! 📸");

  if (window.Telegram?.WebApp) {
    try {
      if (window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(botUrl);
      }
      setTimeout(() => {
        window.Telegram.WebApp.close();
      }, 350);
      return;
    } catch (e) {
      console.warn("openTelegramLink error:", e);
    }
  }

  window.open(botUrl, "_blank");
}


function showToast(msg) {
  const toast = document.getElementById("toastNotification");
  const msgEl = document.getElementById("toastMessage");
  if (!toast || !msgEl) return;

  msgEl.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

/* ==================== 6. FLASHCARDS MODULI ==================== */

function openFlashcards() {
  if (!checkAuthRequired("Muddatlar & Foizlar")) return;
  state.currentCard = 0;
  state.isCardFlipped = false;
  switchView("viewFlashcards");
  renderFlashcard();
}

function renderFlashcard() {
  const card = FLASHCARDS_DATA[state.currentCard];
  if (!card) return;

  document.getElementById("fcCategory").innerText = card.category;
  document.getElementById("fcCounter").innerText = `${state.currentCard + 1} / ${FLASHCARDS_DATA.length}`;
  document.getElementById("fcQuestion").innerText = card.question;
  document.getElementById("fcAnswer").innerText = card.answer;
  document.getElementById("fcRef").innerText = `Asos: ${card.reference} (${card.note || ''})`;

  const ansBox = document.getElementById("fcAnswerBox");
  state.isCardFlipped = false;
  ansBox.classList.add("hidden");
}

function flipCard() {
  state.isCardFlipped = !state.isCardFlipped;
  const ansBox = document.getElementById("fcAnswerBox");
  if (state.isCardFlipped) {
    ansBox.classList.remove("hidden");
  } else {
    ansBox.classList.add("hidden");
  }
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
}

function nextCard() {
  if (state.currentCard < FLASHCARDS_DATA.length - 1) {
    state.currentCard++;
    renderFlashcard();
  } else {
    state.currentCard = 0;
    renderFlashcard();
  }
}

function prevCard() {
  if (state.currentCard > 0) {
    state.currentCard--;
    renderFlashcard();
  }
}

/* ==================== 7. 40 TA QONUN RO'YXATI VA 40 TA VARIANT ==================== */

let currentLawCategoryFilter = 'all';

async function openLawsDirectory() {
  if (!checkAuthRequired("40 ta Qonun")) return;
  switchView("viewLaws");
  currentLawCategoryFilter = 'all';
  updateLawFilterPillsUI('all');

  if (!state.laws || state.laws.length === 0) {
    await fetchLawsList();
  }
  renderLawsList(state.laws);
}

async function fetchLawsList() {
  try {
    const res = await fetch("/data/laws_list.json");
    if (res.ok) {
      state.laws = await res.json();
      return;
    }
  } catch (err) {
    console.warn("fetchLawsList error:", err);
  }
  if (!state.laws || state.laws.length === 0) {
    // Offline fallback
    state.laws = [
      { id: 1, name: "O‘zbekiston Respublikasi Konstitutsiyasi", category: "Asosiy qonun", url: "https://lex.uz/docs/6445145" },
      { id: 8, name: "Fuqarolik kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/111189" },
      { id: 11, name: "Jinoyat kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/111453" },
      { id: 14, name: "Mehnat kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/6257288" },
      { id: 19, name: "Oila kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/104720" }
    ];
  }
}

function filterLawsCategory(cat) {
  currentLawCategoryFilter = cat || 'all';
  updateLawFilterPillsUI(currentLawCategoryFilter);
  filterLaws();
}

function updateLawFilterPillsUI(activeCat) {
  const catButtons = document.querySelectorAll("[id^='btnLawCat_']");
  catButtons.forEach(btn => {
    btn.className = "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap hover:bg-slate-200 transition";
  });
  const activeBtn = document.getElementById(`btnLawCat_${activeCat}`);
  if (activeBtn) {
    activeBtn.className = "px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold whitespace-nowrap shadow-xs";
  }
}

function renderLawsList(list) {
  const container = document.getElementById("lawsListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-xs text-slate-400"><i class="fa-solid fa-folder-open text-2xl block mb-2 text-slate-300"></i>Hech qanday qonun topilmadi</div>`;
    return;
  }

  list.forEach(law => {
    const card = document.createElement("div");
    card.className = "p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition space-y-2.5";

    // Faqat 1-variant (Konstitutsiya) oddiy tarifda bepul, qolgan 39 ta variant faqat VIP PRO uchun
    const isLocked = (law.id > 1) && !state.isPremium;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1">
          <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              ${law.category || 'Qonunchilik'}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${
              isLocked 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
            }">
              ${isLocked ? '<i class="fa-solid fa-lock text-[9px] mr-1"></i> 🔒 Premium' : '<i class="fa-solid fa-circle-check text-[9px] mr-1"></i> Bepul Namunaviy'}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
              <i class="fa-solid fa-list-check mr-1"></i> 20 ta test
            </span>
            <span class="text-[10px] text-slate-400">
              <i class="fa-regular fa-clock mr-0.5"></i> 25 daqiqa
            </span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
            ${law.id}. ${law.name}
          </h4>
        </div>
        <span class="w-7 h-7 rounded-lg ${
          isLocked ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        } flex items-center justify-center text-xs font-black shrink-0">
          ${isLocked ? '<i class="fa-solid fa-lock text-xs"></i>' : `#${law.id}`}
        </span>
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 gap-2">
        <a href="${law.url}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center font-medium">
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px] mr-1"></i> Lex.uz da o'qish
        </a>

        <button onclick="handleLawVariantClick(${law.id}, ${isLocked})" id="btnStartLaw_${law.id}" class="px-3.5 py-1.5 rounded-xl ${
          isLocked 
            ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center space-x-1.5'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center space-x-1.5'
        }">
          <i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-play'} text-[10px]"></i>
          <span>${isLocked ? 'Qulflangan' : 'Variantni Boshlash'}</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleLawVariantClick(lawId, isLocked) {
  if (!checkAuthRequired("Qonunchilik Testi")) return;
  if (isLocked) {
    openPremiumModal();
    showToast("🔒 Ushbu qonun testi VIP PRO tarifida ochiq! Cheksiz barcha 40 ta variantni yechish uchun faollashtiring.");
    return;
  }
  startLawVariantExam(lawId);
}

function filterLaws() {
  const query = (document.getElementById("lawSearchInput")?.value || "").toLowerCase().trim();
  let list = state.laws || [];

  if (currentLawCategoryFilter && currentLawCategoryFilter !== 'all') {
    list = list.filter(law => {
      if (!law.category) return false;
      return law.category.toLowerCase().includes(currentLawCategoryFilter.toLowerCase());
    });
  }

  if (query) {
    list = list.filter(law => 
      law.name.toLowerCase().includes(query) || 
      (law.category && law.category.toLowerCase().includes(query)) ||
      law.id.toString() === query
    );
  }

  renderLawsList(list);
}

async function startLawVariantExam(lawId) {
  if (!checkAuthRequired("Qonunchilik Test Varianti")) return;

  const isLocked = (lawId > 1) && !state.isPremium;
  if (isLocked) {
    handleLawVariantClick(lawId, true);
    return;
  }

  const btn = document.getElementById(`btnStartLaw_${lawId}`);
  let oldBtnText = "";
  if (btn) {
    oldBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Yuklanmoqda...';
    btn.disabled = true;
  }

  try {
    const res = await fetch(`/api/law-variants/${lawId}`);
    if (res.ok) {
      const variantData = await res.json();
      if (variantData && variantData.questions && variantData.questions.length > 0) {
        EXAM_DATA.id = variantData.id || `LAW-${lawId}`;
        EXAM_DATA.title = variantData.title;
        EXAM_DATA.totalQuestions = variantData.totalQuestions || variantData.questions.length;
        EXAM_DATA.timeMinutes = variantData.timeMinutes || 25;
        // Barcha savollarni 100% 4 variantli Y-1 test formatiga moslashtirish
        EXAM_DATA.questions = variantData.questions.map((q, idx) => ({
          num: idx + 1,
          type: "Y-1",
          text: q.text,
          options: q.options || [],
          correct: q.correct || q.correctKey || "A",
          correctKey: q.correct || q.correctKey || "A",
          section: variantData.lawName || variantData.category || "Qonunchilik",
          explanation: q.explanation || "To'g'ri javob qonun talablariga mos keladi.",
          bookSource: "BMBA Qonunchilik burchagi",
          lawSource: `${variantData.lawName || 'Qonun'} (${q.article || 'Modda'})`
        }));

        startExam();
        showToast(`⚖️ ${variantData.lawName || variantData.title} testi boshlandi! (20 ta savol, 25 daqiqa)`);
        return;
      }
    }
    throw new Error("Variant ma'lumotlari topilmadi");
  } catch (err) {
    console.error("startLawVariantExam error:", err);
    showToast("❌ Ushbu qonun testi variantini yuklab bo'lmadi. Internet aloqasini tekshiring.", "error");
  } finally {
    if (btn) {
      btn.innerHTML = oldBtnText;
      btn.disabled = false;
    }
  }
}

/* ==================== 8. 50 TA VARIANTLAR BOSHQARUVI ==================== */

async function openVariantsList() {
  if (!checkAuthRequired("50 ta Variant")) return;
  switchView("viewVariants");
  const container = document.getElementById("variantsGridList");
  if (!container) return;
  container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Variantlar yuklanmoqda...</div>';

  try {
    const res = await fetch("/api/variants");
    if (res.ok) {
      const variants = await res.json();
      if (Array.isArray(variants) && variants.length > 0) {
        renderVariantsGrid(variants);
        return;
      }
    }
  } catch (e) {
    console.warn("Variants API fallback:", e);
  }

  const list = [];
  for (let i = 1; i <= 50; i++) {
    list.push({
      id: i,
      title: i === 1 ? "Variant 1 (T-760 Rasmiy Namunaviy)" : `Variant ${i} (BMBA Standart)`,
      totalQuestions: 45,
      timeMinutes: 90,
      badge: i === 1 ? "Rasmiy Namunaviy" : (i <= 5 ? "Bepul sinov" : "🔒 Premium"),
      isPremium: i > 5
    });
  }
  renderVariantsGrid(list);
}

function renderVariantsGrid(list) {
  const container = document.getElementById("variantsGridList");
  container.innerHTML = "";

  list.forEach(v => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:border-emerald-500 transition";

    const isLocked = v.isPremium && !state.isPremium;

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${
            v.id === 1 ? 'bg-emerald-100 text-emerald-800' : (isLocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')
          }">${v.badge}</span>
          <span class="text-xs font-bold text-slate-800 dark:text-white">${v.title}</span>
        </div>
        <p class="text-[11px] text-slate-500 flex items-center space-x-3">
          <span><i class="fa-regular fa-clock mr-1 text-slate-400"></i> ${v.timeMinutes} daqiqa</span>
          <span><i class="fa-solid fa-list-check mr-1 text-slate-400"></i> 45 ta topshiriq</span>
        </p>
      </div>

      <button onclick="handleVariantClick(${v.id}, ${isLocked})" class="px-4 py-2 rounded-xl ${
        isLocked ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      } font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1">
        ${isLocked ? '<i class="fa-solid fa-lock text-[10px] mr-1"></i> Ochish' : 'Boshlash'}
      </button>
    `;
    container.appendChild(card);
  });
}

function handleVariantClick(variantId, isLocked) {
  if (!checkAuthRequired("Test varianti")) return;
  if (isLocked) {
    openPremiumModal();
    return;
  }
  loadAndStartVariant(variantId);
}

async function loadAndStartVariant(variantId) {
  if (!checkAuthRequired("Mock Imtihon")) return;
  try {
    const res = await fetch(`/api/variants/${variantId}`);
    if (res.ok) {
      const variantData = await res.json();
      if (variantData && variantData.questions && variantData.questions.length > 0) {
        EXAM_DATA.id = variantData.id;
        EXAM_DATA.title = variantData.title;
        EXAM_DATA.questions = variantData.questions;
        startExam();
        return;
      }
    }
  } catch (err) {
    console.warn("Variant fetch error, starting with default exam data:", err);
  }
  startExam();
}

async function postTestToTelegramChannel() {
  const btn = document.getElementById("btnPostToChannel");
  const statusEl = document.getElementById("channelPostStatus");
  if (!btn) return;

  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Yuborilmoqda...';
  btn.disabled = true;

  try {
    const res = await fetch("/api/channel/post-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();

    if (data.success) {
      if (statusEl) {
        statusEl.innerText = "✅ Test muvaffaqiyatli Telegram kanalga tashlandi!";
        statusEl.classList.remove("hidden");
        setTimeout(() => statusEl.classList.add("hidden"), 4000);
      }
      showToast("✅ Kanalga viktorina test tashlandi!");
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    } else {
      showToast("⚠️ " + (data.error || "Kanal sozlanmagan"));
    }
  } catch (err) {
    showToast("Serverga ulanishda xatolik: " + err.message);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

function toggleAddQuestionModal() {
  const modal = document.getElementById("addQuestionModal");
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

async function submitNewQuestion(e) {
  e.preventDefault();

  const section = document.getElementById("newQSection").value;
  const text = document.getElementById("newQText").value.trim();
  const options = [
    document.getElementById("newOptA").value.trim(),
    document.getElementById("newOptB").value.trim(),
    document.getElementById("newOptC").value.trim(),
    document.getElementById("newOptD").value.trim()
  ];
  const correctIndex = parseInt(document.getElementById("newQCorrect").value);
  const keys = ["A", "B", "C", "D"];
  const correctKey = keys[correctIndex];
  const explanation = document.getElementById("newQExplanation").value.trim();

  const newQuestion = {
    section,
    type: "Y-1",
    text,
    options,
    correctIndex,
    correctKey,
    explanation
  };

  try {
    const res = await fetch("/api/questions/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQuestion)
    });
    const result = await res.json();

    if (result.success) {
      showToast(`✅ Yangi savol saqlandi! Jami: ${result.count} ta.`);
      toggleAddQuestionModal();
      document.getElementById("addQuestionForm").reset();
    } else {
      alert("Xatolik: " + result.error);
    }
  } catch (err) {
    alert("Xatolik: " + err.message);
  }
}

/* ==================== 9. 4 TA DARSLIK KITOBLARI ==================== */

async function openBooksDirectory() {
  if (!checkAuthRequired("Mening kitoblarim")) return;
  switchView("viewBooks");
  const container = document.getElementById("booksListContainer");
  container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Kitoblar yuklanmoqda...</div>';

  try {
    const res = await fetch("/api/textbooks?_t=" + Date.now(), { cache: "no-store" });
    const books = await res.json();
    renderBooksList(books);
  } catch (err) {
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">Kitoblarni yuklab bo\'lmadi</div>';
  }
}

function renderBooksList(books) {
  const container = document.getElementById("booksListContainer");
  container.innerHTML = "";

  books.forEach(b => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";

    // Pullik kitoblar: Obuna turi (PRO, VIP, Start) nima bo'lishidan qat'i nazar FAQAT sotiladi!
    const isPaidBook = (b.isPaid === true) || (b.price && Number(b.price) > 0);
    const isPurchased = !isPaidBook || (localStorage.getItem("purchased_book_" + b.id) === "true");

    const badgeHtml = isPaidBook
      ? (isPurchased 
          ? `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">Xarid qilingan ✓</span>`
          : `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">🔒 Pullik: 80 000 UZS</span>`)
      : `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">Bepul darslik</span>`;

    let actionsHtml = "";
    if (isPaidBook) {
      if (isPurchased) {
        actionsHtml = `
          <div class="flex items-center space-x-2 pt-1">
            <a href="${b.url}" target="_blank" class="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition">
              <i class="fa-regular fa-file-pdf"></i>
              <span>PDF ni O'qish</span>
            </a>
            <a href="${b.url}" download="${b.filename}" class="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-1 transition">
              <i class="fa-solid fa-download"></i>
              <span>Yuklab olish</span>
            </a>
          </div>
        `;
      } else {
        const escapedTitle = (b.title || '').replace(/'/g, "\\'");
        actionsHtml = `
          <div class="pt-1">
            <button onclick="openBookPurchaseModal(${b.id}, '${escapedTitle}')" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-98">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Sotib olish (80 000 UZS)</span>
            </button>
          </div>
        `;
      }
    } else {
      actionsHtml = `
        <div class="flex items-center space-x-2 pt-1">
          <a href="${b.url}" target="_blank" class="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition">
            <i class="fa-regular fa-file-pdf"></i>
            <span>PDF ni O'qish</span>
          </a>
          <a href="${b.url}" download="${b.filename}" class="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-1 transition">
            <i class="fa-solid fa-download"></i>
            <span>Yuklab olish</span>
          </a>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 rounded-xl ${b.isPaid ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'} flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid ${b.icon || 'fa-book'}"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">${b.grade}</span>
              ${badgeHtml}
              <span class="text-[10px] text-slate-400">${b.size}</span>
            </div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white mt-1 leading-snug">${b.title}</h3>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${b.description}</p>
          </div>
        </div>
      </div>

      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 border border-slate-100 dark:border-slate-700/60">
        <div><strong>Imtihon savollari:</strong> <span class="text-emerald-600 font-semibold">${b.examCoverage}</span></div>
      </div>

      ${actionsHtml}
    `;

    container.appendChild(card);
  });
}

// ==================== KITOB SOTIB OLISH MODAL MANTIQI ====================
let currentPurchasingBook = null;
let selectedBookReceiptFile = null;

function openBookPurchaseModal(bookId, bookTitle) {
  currentPurchasingBook = { id: bookId, title: bookTitle || "Huquqiy kitob" };
  const modal = document.getElementById("bookPurchaseModal");
  const titleEl = document.getElementById("bookModalTitle");
  if (titleEl) titleEl.innerText = currentPurchasingBook.title;
  cancelBookReceiptFile();
  const statusEl = document.getElementById("bookReceiptStatus");
  if (statusEl) {
    statusEl.classList.add("hidden");
    statusEl.innerText = "";
  }
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeBookPurchaseModal() {
  const modal = document.getElementById("bookPurchaseModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  cancelBookReceiptFile();
}

function handleBookReceiptFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Faqat rasm fayllarini yuklash mumkin (JPG, PNG)!");
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    showToast("Rasm hajmi juda katta (maksimal 12MB)!");
    return;
  }

  selectedBookReceiptFile = file;
  const placeholder = document.getElementById("bookReceiptUploadPlaceholder");
  const previewBox = document.getElementById("bookReceiptPreviewBox");
  const previewImg = document.getElementById("bookReceiptPreviewImg");
  const fileName = document.getElementById("bookReceiptFileName");
  const fileSize = document.getElementById("bookReceiptFileSize");

  if (placeholder) placeholder.classList.add("hidden");
  if (previewBox) previewBox.classList.remove("hidden");
  if (fileName) fileName.innerText = file.name;
  if (fileSize) fileSize.innerText = `${(file.size / 1024).toFixed(0)} KB • Tayyor ✓`;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (previewImg) previewImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function cancelBookReceiptFile(e) {
  if (e) e.stopPropagation();
  selectedBookReceiptFile = null;
  const fileInput = document.getElementById("bookReceiptFileInput");
  if (fileInput) fileInput.value = "";

  const placeholder = document.getElementById("bookReceiptUploadPlaceholder");
  const previewBox = document.getElementById("bookReceiptPreviewBox");
  if (placeholder) placeholder.classList.remove("hidden");
  if (previewBox) previewBox.classList.add("hidden");
}

async function submitBookReceipt() {
  if (!selectedBookReceiptFile) {
    showToast("Iltimos, avval to'lov cheki rasmini tanlang!");
    return;
  }

  const statusEl = document.getElementById("bookReceiptStatus");
  const btn = document.getElementById("sendBookReceiptBtn");

  if (statusEl) {
    statusEl.classList.remove("hidden");
    statusEl.className = "text-[11px] font-bold text-amber-500 block text-center p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700";
    statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Chek adminga yuborilmoqda, kuting...';
  }
  if (btn) btn.disabled = true;

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

        const res = await fetch("/api/payments/submit-book-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            bookId: currentPurchasingBook?.id || 1,
            bookTitle: currentPurchasingBook?.title || "Huquq kitobi",
            userName: state.currentUser?.name || state.user?.name || (tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : "O'quvchi"),
            userId: tgUser?.id || state.currentUser?.tgId || (state.currentUser?.id ? state.currentUser.id.replace('TG-', '') : "") || "",
            userUsername: tgUser?.username ? `@${tgUser.username}` : (state.currentUser?.username || ""),
            amount: "80 000 UZS"
          })
        });

        const data = await res.json();
        if (btn) btn.disabled = false;

        if (data.success) {
          if (statusEl) {
            statusEl.className = "text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block text-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40";
            statusEl.innerHTML = `✅ ${data.message || "Chek qabul qilindi! Admin tasdiqlashi bilan botingizga PDF yuboriladi."}`;
          }
          showToast("To'lov cheki adminga yuborildi! 📚");
          cancelBookReceiptFile();
          setTimeout(() => {
            closeBookPurchaseModal();
          }, 3500);
        } else {
          if (statusEl) {
            statusEl.className = "text-[11px] font-bold text-rose-500 block text-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/40";
            statusEl.innerText = data.error || "Yuklashda xatolik yuz berdi.";
          }
        }
      } catch (err) {
        if (btn) btn.disabled = false;
        if (statusEl) {
          statusEl.className = "text-[11px] font-bold text-rose-500 block text-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/40";
          statusEl.innerText = "Tarmoq xatosi yoki server javob bermadi.";
        }
      }
    };
    reader.readAsDataURL(selectedBookReceiptFile);
  } catch (e) {
    if (btn) btn.disabled = false;
    showToast("Faylni o'qishda xatolik!");
  }
}

/* ==================== 25 TA VAZIYATLI KEYSLAR BANKI (Y-2) ==================== */
let allCasesCache = [];

async function openCasesDirectory() {
  if (!checkAuthRequired("25 ta Vaziyatli Keys")) return;
  switchView("viewCases");
  const container = document.getElementById("casesListContainer");
  container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> 25 ta vaziyatli keys yuklanmoqda...</div>';

  try {
    if (allCasesCache.length === 0) {
      const res = await fetch("/api/cases");
      allCasesCache = await res.json();
    }
    renderCasesList(allCasesCache);
  } catch (err) {
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">Keyslarni yuklab bo\'lmadi: ' + err.message + '</div>';
  }
}

function filterCases() {
  const query = (document.getElementById("caseSearchInput").value || "").toLowerCase().trim();
  if (!query) {
    renderCasesList(allCasesCache);
    return;
  }
  const filtered = allCasesCache.filter(c => 
    (c.title && c.title.toLowerCase().includes(query)) ||
    (c.scenario && c.scenario.toLowerCase().includes(query)) ||
    (c.lawSource && c.lawSource.toLowerCase().includes(query)) ||
    (c.bookSource && c.bookSource.toLowerCase().includes(query))
  );
  renderCasesList(filtered);
}

function renderCasesList(cases) {
  const container = document.getElementById("casesListContainer");
  container.innerHTML = "";

  if (cases.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Hech qanday keys topilmadi</div>';
    return;
  }

  cases.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <div class="flex items-center space-x-1.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
              Keys #${idx + 1}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">3 ta savol (1.5 balldan)</span>
          </div>
          <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-tight">${item.title}</h4>
        </div>
        <button onclick="askAITutorForEntireCase(${idx})" class="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center space-x-1 hover:bg-amber-100 dark:hover:bg-amber-900 transition shadow-xs">
          <i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
          <span>AI Keys Tahlili</span>
        </button>
      </div>

      <!-- Vaziyatli Matn (Scenario) -->
      <div class="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
        <p class="font-bold text-amber-800 dark:text-amber-400 text-[11px] mb-1 flex items-center">
          <i class="fa-solid fa-file-contract mr-1"></i> Vaziyat (Kazuistika):
        </p>
        <p>${item.scenario}</p>
      </div>

      <!-- Manbalar -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div class="flex flex-wrap gap-2">
          <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-medium">
            <i class="fa-solid fa-book-bookmark text-indigo-500 mr-1"></i> ${item.bookSource || 'Huquqiy manba'}
          </span>
          <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-medium">
            <i class="fa-solid fa-scale-balanced text-emerald-500 mr-1"></i> ${item.lawSource || 'Qonun'}
          </span>
        </div>
      </div>

      <!-- Savollarni ochish tugmasi -->
      <div>
        <button onclick="toggleCaseQuestions('case_detail_${idx}')" class="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-between transition">
          <span class="flex items-center">
            <i class="fa-solid fa-list-ol mr-1.5 text-amber-600"></i> Savollar va interaktiv yechish (33, 34, 35)
          </span>
          <i class="fa-solid fa-chevron-down text-[10px]" id="icon_case_detail_${idx}"></i>
        </button>

        <div id="case_detail_${idx}" class="hidden mt-3 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          ${renderSingleCaseQuestion(idx, 33, item.q33)}
          ${renderSingleCaseQuestion(idx, 34, item.q34)}
          ${renderSingleCaseQuestion(idx, 35, item.q35)}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderSingleCaseQuestion(caseIdx, qNum, qObj) {
  if (!qObj) return '';
  const correctVal = (qObj.correct || "A").toString().trim().toUpperCase();
  const qUniqueId = `case_${caseIdx}_q${qNum}`;

  const optsHtml = (qObj.options || []).map(opt => `
    <button type="button" 
      id="${qUniqueId}_opt_${opt.key}"
      onclick="handleCaseOptionAnswer(${caseIdx}, ${qNum}, '${opt.key}', this)" 
      class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 hover:border-amber-500 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-start space-x-2.5 transition active:scale-98">
      <span id="${qUniqueId}_badge_${opt.key}" class="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-black shrink-0">
        ${opt.key}
      </span>
      <span class="flex-1">${opt.text}</span>
    </button>
  `).join('');

  return `
    <div id="${qUniqueId}_box" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
      <div class="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
        <span class="flex items-center space-x-1">
          <span class="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">${qNum}</span>
          <span>-savol (1.5 ball)</span>
        </span>
        <button onclick="askAITutorForCaseQuestion(${caseIdx}, ${qNum})" class="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-[10px] flex items-center space-x-1 shadow-xs hover:bg-indigo-100 transition">
          <i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
          <span>AI Tahlil</span>
        </button>
      </div>
      <p class="text-xs text-slate-700 dark:text-slate-200 leading-snug font-medium">${qObj.text}</p>
      
      <div class="space-y-1.5 pt-1" id="${qUniqueId}_options">
        ${optsHtml}
      </div>

      <!-- Qonuniy tahlil bloki -->
      <div id="${qUniqueId}_analysis" class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mt-2">
        <div class="font-bold flex items-center mb-0.5">
          <i class="fa-solid fa-gavel mr-1.5 text-emerald-600"></i> Qonuniy tahlil:
        </div>
        <p class="leading-relaxed">${qObj.explanation || 'To\'g\'ri javob amaldagi qonun talablariga mos keladi.'}</p>
      </div>
    </div>
  `;
}

function handleCaseOptionAnswer(caseIdx, qNum, selectedKey, clickedBtn) {
  const c = allCasesCache && allCasesCache[caseIdx];
  if (!c) return;
  const qObj = c['q' + qNum];
  if (!qObj) return;

  const correctVal = (qObj.correct || "A").toString().trim().toUpperCase();
  const isCorrect = (selectedKey.toString().trim().toUpperCase() === correctVal);
  const qUniqueId = `case_${caseIdx}_q${qNum}`;

  // Barcha variantlarni qulflaymiz va to'g'ri variantni yashil bilan belgilaymiz
  const container = document.getElementById(`${qUniqueId}_options`);
  if (container) {
    const buttons = container.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.classList.remove("hover:border-amber-500", "active:scale-98");
    });
  }

  const correctBtn = document.getElementById(`${qUniqueId}_opt_${correctVal}`);
  if (correctBtn) {
    correctBtn.className = "w-full p-2.5 rounded-xl border border-emerald-500 bg-emerald-100 dark:bg-emerald-950 text-left text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-start space-x-2.5";
    const badge = document.getElementById(`${qUniqueId}_badge_${correctVal}`);
    if (badge) badge.className = "w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0";
  }

  if (isCorrect) {
    showToast(`To'g'ri javob! +1.5 ball 🎉`);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  } else {
    // Xato tanlangan tugmani qizil qilamiz
    if (clickedBtn && clickedBtn !== correctBtn) {
      clickedBtn.className = "w-full p-2.5 rounded-xl border border-rose-500 bg-rose-100 dark:bg-rose-950 text-left text-xs font-bold text-rose-900 dark:text-rose-200 flex items-start space-x-2.5";
      const badBadge = document.getElementById(`${qUniqueId}_badge_${selectedKey}`);
      if (badBadge) badBadge.className = "w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shrink-0";
    }

    // XATOLAR BO'LIMIGA DARHOL AVTOMATIK TUSHIRISH!
    const mistakeItem = {
      num: qNum,
      type: "Y-2",
      section: `Keys #${caseIdx + 1}: ${c.title}`,
      text: `[Keys #${caseIdx + 1} (${c.title}) - ${qNum}-savol]: ${qObj.text}`,
      options: qObj.options || [],
      correctAns: correctVal,
      userAns: selectedKey,
      isCorrect: false,
      explanation: qObj.explanation || "Vaziyatli keys qonuniy tahlili.",
      bookSource: c.bookSource || "Huquqiy Keyslar",
      lawSource: c.lawSource || "Vaziyatli Keys (Y-2)"
    };
    saveMistakesFromResults([mistakeItem]);
    showToast(`❌ Xato javob. Savol "Mening xatolarim"ga saqlandi!`);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
  }
}

function askAITutorForCaseQuestion(caseIdx, qNum) {
  const c = allCasesCache && allCasesCache[caseIdx];
  if (!c) return;
  const qObj = c['q' + qNum];
  if (!qObj) return;

  askAITutor({
    num: qNum,
    text: `[Vaziyatli Keys #${caseIdx + 1}]: ${c.title}\n\nVaziyat: ${c.scenario}\n\n${qNum}-Savol: ${qObj.text}`,
    options: qObj.options || [],
    correctAns: qObj.correct || "A",
    userAns: "Keys savoli tahlili",
    explanation: qObj.explanation || "Qonunchilik me'yorlariga ko'ra keys tahlili.",
    section: `Keys #${caseIdx + 1} (${c.lawSource || 'Qonun'})`
  });
}

function askAITutorForEntireCase(caseIdx) {
  const c = allCasesCache && allCasesCache[caseIdx];
  if (!c) return;

  askAITutor({
    num: 33,
    text: `[VAZIYATLI KEYS TO'LIQ TAHLILI #${caseIdx + 1}]: ${c.title}\n\nVaziyat (Kazuistika):\n${c.scenario}\n\nManba: ${c.lawSource || ''} | ${c.bookSource || ''}`,
    options: [
      { key: "33", text: c.q33 ? c.q33.text : "1-savol" },
      { key: "34", text: c.q34 ? c.q34.text : "2-savol" },
      { key: "35", text: c.q35 ? c.q35.text : "3-savol" }
    ],
    correctAns: `33-savol: ${c.q33?.correct || 'A'}, 34-savol: ${c.q34?.correct || 'A'}, 35-savol: ${c.q35?.correct || 'A'}`,
    userAns: "Keys to'liq yuridik tahlili",
    explanation: `33-savol tahlili: ${c.q33?.explanation || ''}\n\n34-savol tahlili: ${c.q34?.explanation || ''}\n\n35-savol tahlili: ${c.q35?.explanation || ''}`,
    section: `Keys #${caseIdx + 1}: ${c.title}`
  });
}

function toggleCaseQuestions(detailId) {
  const el = document.getElementById(detailId);
  const icon = document.getElementById('icon_' + detailId);
  if (!el) return;
  if (el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    if (icon) icon.className = "fa-solid fa-chevron-up text-[10px]";
  } else {
    el.classList.add('hidden');
    if (icon) icon.className = "fa-solid fa-chevron-down text-[10px]";
  }
}

/* ==================== XATOLAR USTIDA ISHLASH (SMART MISTAKES) ==================== */

function getStoredMistakes() {
  try {
    const raw = localStorage.getItem("huquq_my_mistakes");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(m => m && m.text && m.text !== "undefined" && m.text.trim() !== "") : [];
  } catch (e) {
    return [];
  }
}

function saveMistakesFromResults(resultsDetailed) {
  if (!Array.isArray(resultsDetailed) || resultsDetailed.length === 0) return;
  const existing = getStoredMistakes();
  const existingTexts = new Set(existing.map(m => (m.text || "").trim()));

  let addedCount = 0;
  resultsDetailed.forEach(r => {
    const qText = (r.text || r.questionText || "").trim();
    if (!r.isCorrect && qText && !existingTexts.has(qText)) {
      existing.unshift({
        num: r.num || (existing.length + 1),
        type: r.type || "Y-1",
        section: r.section || "Huquqiy test",
        text: qText,
        options: r.options || [],
        correct: r.correctAns || r.correctAnswer || r.correct || "A",
        acceptableAnswers: r.acceptableAnswers || [],
        explanation: r.explanation || "To'g'ri javob amaldagi qonunchilik talabiga asoslangan.",
        bookSource: r.bookSource || "Huquq darsliklari va 40 ta Qonun",
        lawSource: r.lawSource || r.section || "Spesifikatsiyadagi 40 ta Qonun",
        userAnswer: r.userAns || r.userAnswer || "Javob berilmagan",
        addedAt: new Date().toLocaleDateString('uz-UZ')
      });
      existingTexts.add(qText);
      addedCount++;
    }
  });

  localStorage.setItem("huquq_my_mistakes", JSON.stringify(existing));
  updateMistakesCount();
  if (addedCount > 0) {
    console.log(`Xatolar bankiga ${addedCount} ta yangi savol saqlandi.`);
    showToast(`📝 ${addedCount} ta xato savol "Mening xatolarim"ga saqlandi!`);
  }
}

function updateMistakesCount() {
  const mistakes = getStoredMistakes();
  const badge = document.getElementById("mistakesBadgeCount");
  if (badge) badge.innerText = `${mistakes.length} ta`;
  const totalNum = document.getElementById("mistakesTotalNum");
  if (totalNum) totalNum.innerText = mistakes.length;
}

function openMistakesTrainer() {
  if (!checkAuthRequired("Mening xatolarim")) return;
  switchView("viewMistakes");
  renderMistakesList();
}

function renderMistakesList() {
  const container = document.getElementById("mistakesListContainer");
  if (!container) return;
  const mistakes = getStoredMistakes();
  updateMistakesCount();

  if (mistakes.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 space-y-2">
        <div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-xl">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 dark:text-white">Ajoyib natija!</h4>
        <p class="text-xs text-slate-400">Sizda hozircha hech qanday xato savollar mavjud emas. Testlarni yechishda davom eting!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  mistakes.forEach((m, idx) => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5";

    let answersHtml = "";
    if (m.type === "O") {
      answersHtml = `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
          <div><span class="text-slate-400">Siz kiritgan javob:</span> <span class="font-bold text-rose-600">${m.userAnswer}</span></div>
          <div><span class="text-slate-400">To'g'ri javob:</span> <span class="font-bold text-emerald-600">${m.correct}</span></div>
        </div>
      `;
    } else if (m.options && m.options.length > 0) {
      answersHtml = `<div class="space-y-1 pt-1">` + m.options.map(opt => `
        <div class="p-2 rounded-lg text-xs font-medium ${opt.key === m.correct ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold' : (opt.key === m.userAnswer ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 font-bold' : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300')} flex items-center justify-between">
          <span class="flex items-center space-x-2">
            <span class="w-5 h-5 rounded-full ${opt.key === m.correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-[10px] font-bold">
              ${opt.key}
            </span>
            <span>${opt.text}</span>
          </span>
          ${opt.key === m.correct ? '<span class="text-[10px] text-emerald-600 font-bold">✓ To\'g\'ri javob</span>' : (opt.key === m.userAnswer ? '<span class="text-[10px] text-rose-500 font-bold">✗ Sizning javobingiz</span>' : '')}
        </div>
      `).join('') + `</div>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
          ${m.section || 'Huquqiy savol'}
        </span>
        <button onclick="removeMistake(${idx})" title="O'chirish" class="text-slate-400 hover:text-rose-600 text-xs">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <p class="text-xs font-bold text-slate-800 dark:text-white leading-snug">${m.text}</p>
      ${answersHtml}

      <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
        <strong><i class="fa-solid fa-gavel mr-1"></i> Qonuniy sharh:</strong> ${m.explanation}
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
        <span class="truncate max-w-[130px]"><i class="fa-solid fa-book mr-1"></i> ${m.bookSource}</span>
        <div class="flex items-center space-x-2">
          <button onclick="askAITutorForMistake(${idx})" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold hover:bg-indigo-100 flex items-center space-x-1 transition text-[11px]">
            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
            <span>AI Tahlil</span>
          </button>
          <button onclick="removeMistake(${idx})" class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-bold hover:bg-emerald-100 flex items-center space-x-1 transition text-[11px]">
            <i class="fa-solid fa-check text-[10px]"></i>
            <span>Yod oldim</span>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function askAITutorForMistake(idx) {
  const mistakes = getStoredMistakes();
  const m = mistakes[idx];
  if (!m) return;
  askAITutor({
    text: m.text,
    options: m.options,
    correctAns: m.correct,
    userAns: m.userAnswer,
    explanation: m.explanation,
    section: m.section || m.lawSource
  });
}

function removeMistake(idx) {
  const mistakes = getStoredMistakes();
  mistakes.splice(idx, 1);
  localStorage.setItem("huquq_my_mistakes", JSON.stringify(mistakes));
  renderMistakesList();
  showToast("Savol xatolar ro'yxatidan chiqarildi! 👍");
}

function clearAllMistakes() {
  if (!confirm("Barcha saqlangan xatolar ro'yxati tozalansinmi?")) return;
  localStorage.removeItem("huquq_my_mistakes");
  renderMistakesList();
  showToast("Xatolar ro'yxati tozalandi.");
}

/* ==================== RASMIY BMBA ELEKTRON SERTIFIKAT ==================== */

function openCertificateModal() {
  const modal = document.getElementById("certificateModal");
  if (!modal) return;

  const score = state.lastScore !== undefined ? state.lastScore : 40;
  const total = state.lastTotal || 45;
  const pct = state.lastPercentage !== undefined ? state.lastPercentage : Math.round((score / total) * 100);

  // Darajani aniqlash (BMBA shkalasi)
  let gradeText = "C (Qoniqarli)";
  let privilege = "Sertifikat minimal qoniqarli darajada o'tgan deb topildi.";

  if (pct >= 86) {
    gradeText = "A+ (A'lo daraja)";
    privilege = "🎓 OTM bakalavriatiga kirish imtihonlarida Huquqshunoslik fanidan 100% maksimal ball beriladi.";
  } else if (pct >= 76) {
    gradeText = "A (Birinchi daraja)";
    privilege = "🎓 OTM bakalavriatiga kirish imtihonlarida Huquqshunoslik fanidan 100% maksimal ball beriladi.";
  } else if (pct >= 68) {
    gradeText = "B+ (Ikkinchi yuqori daraja)";
    privilege = "🏛️ Huquq fanidan OTMga kirishda 85% ballik imtiyoz beriladi.";
  } else if (pct >= 60) {
    gradeText = "B (Ikkinchi daraja)";
    privilege = "🏛️ Huquq fanidan OTMga kirishda 75% ballik imtiyoz beriladi.";
  } else if (pct >= 50) {
    gradeText = "C+ (Uchinchi daraja)";
    privilege = "🏛️ Huquq fanidan OTMga kirishda 65% ballik imtiyoz beriladi.";
  } else if (pct >= 46) {
    gradeText = "C (Qoniqarli)";
    privilege = "Davlat test markazi sertifikati sinovidan o'tgan deb hisoblanadi.";
  } else {
    gradeText = "Qoniqarsiz (Minimal 46% kerak)";
    privilege = "Imtihondan qayta o'tish tavsiya etiladi.";
  }

  // Elementlarni yangilash
  const currentName = state.user?.name || "Abdurahmonov Jasur";
  const nameInput = document.getElementById("certStudentNameInput");
  if (nameInput) nameInput.value = currentName;
  const nameDisplay = document.getElementById("certDisplayName");
  if (nameDisplay) nameDisplay.innerText = currentName;

  const scoreDisplay = document.getElementById("certScoreDisplay");
  if (scoreDisplay) scoreDisplay.innerText = `${score} / ${total} (${pct}%)`;

  const badgeDisplay = document.getElementById("certGradeBadge");
  if (badgeDisplay) badgeDisplay.innerText = gradeText;

  const privDisplay = document.getElementById("certPrivilegeText");
  if (privDisplay) privDisplay.innerText = privilege;

  const dateDisplay = document.getElementById("certDateDisplay");
  if (dateDisplay) dateDisplay.innerText = new Date().toLocaleDateString('uz-UZ');

  // Serial raqam
  const serialDisplay = document.getElementById("certSerialNum");
  if (serialDisplay && !serialDisplay.dataset.generated) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    serialDisplay.innerText = `№ BMBA-2026-HQ-${randomNum}`;
    serialDisplay.dataset.generated = "true";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCertificateModal() {
  const modal = document.getElementById("certificateModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function updateCertName(val) {
  const nameDisplay = document.getElementById("certDisplayName");
  if (nameDisplay) {
    nameDisplay.innerText = val.trim() || "O'quvchi F.I.Sh.";
  }
}

function downloadCertificateAsImage() {
  showToast("Sertifikat rasm shaklida yuklab olinmoqda...");
  
  // Canvas yaratib sertifikatni chizamiz
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext("2d");

  // Orqa fon (Gradient va naqsh)
  const grad = ctx.createLinearGradient(0, 0, 1200, 850);
  grad.addColorStop(0, "#fdfcf7");
  grad.addColorStop(0.5, "#ffffff");
  grad.addColorStop(1, "#f7f4ea");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 850);

  // Oltin ramkalar
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 14;
  ctx.strokeRect(30, 30, 1140, 790);

  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 3;
  ctx.strokeRect(45, 45, 1110, 760);

  // Sarlavha
  ctx.fillStyle = "#4b5563";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("O'ZBEKISTON RESPUBLIKASI BILIM VA MALAKALARNI BAHOLASH AGENTLIGI (BMBA)", 600, 100);

  ctx.fillStyle = "#0f172a";
  ctx.font = "900 36px Arial";
  ctx.fillText("HUQUQSHUNOSLIK MILLIY SERTIFIKATI", 600, 160);

  const serial = document.getElementById("certSerialNum")?.innerText || "№ BMBA-2026-HQ-84920";
  ctx.fillStyle = "#b45309";
  ctx.font = "bold 20px Arial";
  ctx.fillText(serial, 600, 200);

  // Matn
  ctx.fillStyle = "#64748b";
  ctx.font = "italic 20px Arial";
  ctx.fillText("Ushbu rasmiy hujjat tasdiqlaydi:", 600, 270);

  // Ism
  const studentName = document.getElementById("certDisplayName")?.innerText || "O'quvchi F.I.Sh.";
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 40px Arial";
  ctx.fillText(studentName, 600, 335);

  ctx.fillStyle = "#334155";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Davlat ta'lim standartlari va 40 ta normativ-huquqiy hujjat bo'yicha test sinovidan o'tdi", 600, 385);

  // Oltin Natija qutisi
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(200, 430, 800, 130);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.strokeRect(200, 430, 800, 130);

  const scoreText = document.getElementById("certScoreDisplay")?.innerText || "42 / 45 (93%)";
  const gradeText = document.getElementById("certGradeBadge")?.innerText || "A+ (A'lo)";

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 18px Arial";
  ctx.fillText("To'plangan Ball / Natija:", 400, 475);
  ctx.fillText("Sertifikat Darajasi:", 800, 475);

  ctx.fillStyle = "#047857";
  ctx.font = "900 32px Arial";
  ctx.fillText(scoreText, 400, 525);

  ctx.fillStyle = "#b45309";
  ctx.font = "900 32px Arial";
  ctx.fillText(gradeText, 800, 525);

  // Imtiyoz matni
  const privText = document.getElementById("certPrivilegeText")?.innerText || "";
  ctx.fillStyle = "#065f46";
  ctx.font = "bold 17px Arial";
  ctx.fillText(privText, 600, 610);

  // Pastki rekvizitlar
  const dateStr = document.getElementById("certDateDisplay")?.innerText || new Date().toLocaleDateString('uz-UZ');
  ctx.fillStyle = "#64748b";
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Berilgan sana: ${dateStr}`, 80, 740);
  ctx.fillText("Holati: FAOL (DAVLAT RO'YXATIDAN O'TKAZILGAN)", 80, 770);

  ctx.textAlign = "right";
  ctx.fillText("Agentlik maxsus elektron muhri: [QR-VERIFIED]", 1120, 740);
  ctx.fillText("BMBA Davlat Test Markazi Tizimi", 1120, 770);

  // PNG ga aylantirib yuklab olish
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `BMBA_Sertifikat_${studentName.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Sertifikat muvaffaqiyatli yuklab olindi! 🎉");
}

function shareCertificateToTelegram() {
  const studentName = document.getElementById("certDisplayName")?.innerText || "Men";
  const gradeText = document.getElementById("certGradeBadge")?.innerText || "A+";
  const scoreText = document.getElementById("certScoreDisplay")?.innerText || "42/45";
  const text = encodeURIComponent(`🎉 Men Huquqshunoslik BMBA Milliy Sertifikat imtihonini muvaffaqiyatli topshirdim!\n\n👤 ${studentName}\n📊 Natija: ${scoreText}\n🏆 Daraja: ${gradeText}\n\nSiz ham o'z bilimingizni sinab ko'ring:`);
  window.open(`https://t.me/share/url?url=https://t.me/HuquqMilliySertifikatBot&text=${text}`, "_blank");
}

/* ==================== TO'LOV CHEKI RASMINI YUBORISH ==================== */

let selectedReceiptFile = null;

function handleReceiptFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Faqat rasm fayllarini yuklash mumkin (JPG, PNG)!");
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    showToast("Rasm hajmi juda katta (maksimal 12MB)!");
    return;
  }

  selectedReceiptFile = file;
  const placeholder = document.getElementById("receiptUploadPlaceholder");
  const previewBox = document.getElementById("receiptPreviewBox");
  const previewImg = document.getElementById("receiptPreviewImg");
  const fileName = document.getElementById("receiptFileName");
  const fileSize = document.getElementById("receiptFileSize");

  if (placeholder) placeholder.classList.add("hidden");
  if (previewBox) previewBox.classList.remove("hidden");
  if (fileName) fileName.innerText = file.name;
  if (fileSize) fileSize.innerText = `${(file.size / 1024).toFixed(0)} KB • Tayyor ✓`;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (previewImg) previewImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function cancelReceiptFile(e) {
  if (e) e.stopPropagation();
  selectedReceiptFile = null;
  const fileInput = document.getElementById("receiptFileInput");
  if (fileInput) fileInput.value = "";

  const placeholder = document.getElementById("receiptUploadPlaceholder");
  const previewBox = document.getElementById("receiptPreviewBox");
  if (placeholder) placeholder.classList.remove("hidden");
  if (previewBox) previewBox.classList.add("hidden");
}

async function submitReceiptImage() {
  if (!selectedReceiptFile) {
    showToast("Iltimos, avval to'lov cheki rasmini tanlang!");
    return;
  }

  const statusEl = document.getElementById("receiptSubmitStatus");
  const btn = document.getElementById("sendReceiptBtn");

  if (statusEl) {
    statusEl.classList.remove("hidden");
    statusEl.className = "text-[11px] font-bold text-amber-400 block text-center p-2.5 rounded-xl bg-slate-800 border border-slate-700";
    statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Rasm adminga yuborilmoqda, kuting...';
  }
  if (btn) btn.disabled = true;

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

        const res = await fetch("/api/payments/submit-receipt-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            userName: state.currentUser?.name || state.user?.name || (tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : "O'quvchi"),
            userId: tgUser?.id || state.currentUser?.tgId || (state.currentUser?.id ? state.currentUser.id.replace('TG-', '') : "") || "",
            userUsername: tgUser?.username ? `@${tgUser.username}` : (state.currentUser?.username || ""),
            tariffId: state.selectedTariff || "tariff_vip",
            amount: state.selectedTariff === "tariff_standard" ? "49 000 UZS" : "89 000 UZS"
          })
        });

        const data = await res.json();
        if (btn) btn.disabled = false;

        if (data.success) {
          if (statusEl) {
            statusEl.className = "text-[11px] font-bold text-emerald-400 block text-center p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40";
            statusEl.innerHTML = `✅ ${data.message}`;
          }
          showToast("To'lov cheki adminga yetkazildi! 💎");
          cancelReceiptFile();
        } else {
          if (statusEl) {
            statusEl.className = "text-[11px] font-bold text-rose-400 block text-center p-2 rounded-xl bg-rose-950/40 border border-rose-500/40";
            statusEl.innerText = data.error || "Yuklashda xatolik yuz berdi.";
          }
        }
      } catch (postErr) {
        if (btn) btn.disabled = false;
        if (statusEl) {
          statusEl.className = "text-[11px] font-bold text-rose-400 block text-center p-2 rounded-xl bg-rose-950/40 border border-rose-500/40";
          statusEl.innerText = "Yuborishda xatolik yuz berdi.";
        }
      }
    };
    reader.readAsDataURL(selectedReceiptFile);
  } catch (err) {
    if (btn) btn.disabled = false;
    if (statusEl) {
      statusEl.className = "text-[11px] font-bold text-rose-400 block text-center p-2 rounded-xl bg-rose-950/40 border border-rose-500/40";
      statusEl.innerText = "Xatolik: Iltimos Telegram bot orqali yuboring.";
    }
  }
}

/* ==================== 🔥 HUQUQIY OCTAGON (1v1 DUEL JANGI - 10 RAUND) ==================== */

const octagonState = {
  playerHp: 100,
  opponentHp: 100,
  currentRound: 0,
  totalRounds: 10,
  damagePerHit: 10,
  timeLeft: 15,
  timerInterval: null,
  activeQuestion: null,
  isRoundLocked: false,
  playerRoundCorrect: 0,
  battleMistakes: [],
  opponentName: "Advokat Aliyev",
  opponentsList: [
    "Advokat Aliyev (Toshkent)",
    "Prokuror Boboyev (Samarqand)",
    "Sudya Karimova (Farg'ona)",
    "BMBA Chempioni (Namangan)",
    "Yurist Qodirov (Buxoro)",
    "Ekspert Saidov (Andijon)",
    "Notarius Usmonov (Xorazm)",
    "Tergovchi Jalilov (Qashqadaryo)"
  ],
  battleQuestions: []
};

function openOctagonLobby() {
  if (!checkAuthRequired("Huquqiy Octagon Duellari")) return;
  switchView("viewOctagon");
  startOctagonBattle();
}

function exitOctagonPrompt() {
  if (octagonState.timerInterval) {
    if (!confirm("Oktagon jangini to'xtatmoqchimisiz?")) return;
    clearInterval(octagonState.timerInterval);
    octagonState.timerInterval = null;
  }
  showHome();
}

async function startOctagonBattle() {
  // Yangi jangni sozlash (Qat'iy 10 ta to'liq raund)
  octagonState.playerHp = 100;
  octagonState.opponentHp = 100;
  octagonState.currentRound = 0;
  octagonState.totalRounds = 10;
  octagonState.damagePerHit = 10;
  octagonState.playerRoundCorrect = 0;
  octagonState.battleMistakes = [];
  octagonState.isRoundLocked = false;
  if (octagonState.timerInterval) clearInterval(octagonState.timerInterval);

  // UI nomlarini o'rnatish
  const pName = document.getElementById("octPlayerName");
  if (pName) pName.innerText = state.user?.name || (state.currentUser && state.currentUser.name) || "Siz";
  const oName = document.getElementById("octOpponentName");
  if (oName) oName.innerText = "Raqib qidirilmoqda...";

  // Modallarni yashirish va HUD ni yangilash
  const resModal = document.getElementById("octResultModal");
  if (resModal) resModal.classList.add("hidden");
  const qCard = document.getElementById("octQuestionCard");
  if (qCard) qCard.classList.remove("hidden");

  updateOctagonHpBars();

  // 1. HAQIQIY BOT VA PLATFORMA ISHTIROKCHILARI ICHIDAN RAQIB TANLASH
  let chosenOpponentName = "Advokat Aliyev (Toshkent)";
  try {
    const oppRes = await fetch("/api/duel/opponents");
    if (oppRes.ok) {
      const oppList = await oppRes.json();
      if (Array.isArray(oppList) && oppList.length > 0) {
        const myName = (state.user?.name || (state.currentUser && state.currentUser.name) || "").toLowerCase().trim();
        const available = oppList.filter(o => (o.name || "").toLowerCase().trim() !== myName);
        const candidates = available.length > 0 ? available : oppList;
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        chosenOpponentName = picked.title || picked.name || chosenOpponentName;
      }
    }
  } catch (err) {
    console.warn("Duel opponents fetch fallback:", err);
    if (octagonState.opponentsList && octagonState.opponentsList.length > 0) {
      chosenOpponentName = octagonState.opponentsList[Math.floor(Math.random() * octagonState.opponentsList.length)];
    }
  }

  octagonState.opponentName = chosenOpponentName;
  if (oName) oName.innerText = chosenOpponentName;

  // 2. DUELDA BIR XIL SAVOLLAR TAKRORLANMASLIGI UCHUN 800+ TA QONUN TESTIDAN DINAMIK 10 TA YANGI SAVOL OLISH
  let dynamicQuestions = [];
  try {
    const qRes = await fetch("/api/duel/questions");
    if (qRes.ok) {
      const fetched = await qRes.json();
      if (Array.isArray(fetched) && fetched.length >= 10) {
        dynamicQuestions = fetched.slice(0, 10);
      } else if (Array.isArray(fetched) && fetched.length > 0) {
        dynamicQuestions = fetched;
      }
    }
  } catch (err) {
    console.warn("Duel questions fetch fallback:", err);
  }

  // Oflayn yoki fallback holatida 10 ta savol
  if (!dynamicQuestions || dynamicQuestions.length < 10) {
    const pool = (EXAM_DATA && EXAM_DATA.questions && EXAM_DATA.questions.length > 0)
      ? EXAM_DATA.questions.filter(q => q.options && q.options.length >= 2)
      : [];
    if (pool.length >= 10) {
      dynamicQuestions = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
    } else {
      dynamicQuestions = [
        {
          text: "Davlat boshqaruv shakliga ko'ra qanday asosiy turlarga bo'linadi?",
          options: [{key:"A", text:"Monarxiya va Respublika"}, {key:"B", text:"Unitar va Federatsiya"}, {key:"C", text:"Demokratik va Diktatura"}, {key:"D", text:"Prezidentlik va Parlament"}],
          correct: "A",
          section: "Davlat va huquq nazariyasi"
        },
        {
          text: "Yangi Konstitutsiyaga ko'ra shaxs sud qarorisiz ko'pi bilan necha soat ushlab turilishi mumkin?",
          options: [{key:"A", text:"24 soat"}, {key:"B", text:"48 soat"}, {key:"C", text:"72 soat"}, {key:"D", text:"12 soat"}],
          correct: "B",
          section: "Konstitutsiyaviy huquq"
        },
        {
          text: "Yangi Mehnat kodeksiga ko'ra yillik asosiy eng kam mehnat ta'tili necha kalendar kuni?",
          options: [{key:"A", text:"15 ish kuni"}, {key:"B", text:"21 kalendar kuni"}, {key:"C", text:"24 kalendar kuni"}, {key:"D", text:"30 kalendar kuni"}],
          correct: "B",
          section: "Mehnat huquqi"
        },
        {
          text: "Meros ochilgan kundan e'tiboran necha oy ichida qabul qilinishi shart?",
          options: [{key:"A", text:"1 oy"}, {key:"B", text:"3 oy"}, {key:"C", text:"6 oy"}, {key:"D", text:"1 yil"}],
          correct: "C",
          section: "Fuqarolik huquqi"
        },
        {
          text: "Oila kodeksiga ko'ra 1 nafar voyaga yetmagan bola uchun oylik qancha aliment undiriladi?",
          options: [{key:"A", text:"1/4 qismi"}, {key:"B", text:"1/3 qismi"}, {key:"C", text:"1/2 qismi"}, {key:"D", text:"1/6 qismi"}],
          correct: "A",
          section: "Oila huquqi"
        },
        {
          text: "Jinoyat kodeksiga ko'ra jinoiy javobgarlikka tortishning umumiy yoshi necha yosh?",
          options: [{key:"A", text:"14 yosh"}, {key:"B", text:"16 yosh"}, {key:"C", text:"18 yosh"}, {key:"D", text:"21 yosh"}],
          correct: "B",
          section: "Jinoyat huquqi"
        },
        {
          text: "O'zbekiston Respublikasi Oliy Majlisi Qonunchilik palatasi necha deputatdan iborat?",
          options: [{key:"A", text:"100 nafar"}, {key:"B", text:"120 nafar"}, {key:"C", text:"150 nafar"}, {key:"D", text:"65 nafar"}],
          correct: "C",
          section: "Konstitutsiyaviy huquq"
        },
        {
          text: "Fuqarolik huquqida to'liq muomala layoqati necha yoshdan boshlanadi?",
          options: [{key:"A", text:"14 yosh"}, {key:"B", text:"16 yosh"}, {key:"C", text:"18 yosh"}, {key:"D", text:"21 yosh"}],
          correct: "C",
          section: "Fuqarolik huquqi"
        },
        {
          text: "Mehnat shartnomasini xodimning tashabbusi bilan bekor qilishda ish beruvchi necha hafta oldin yozma ogohlantiriladi?",
          options: [{key:"A", text:"1 hafta"}, {key:"B", text:"2 hafta"}, {key:"C", text:"1 oy"}, {key:"D", text:"3 kun"}],
          correct: "B",
          section: "Mehnat huquqi"
        },
        {
          text: "Ma'muriy javobgarlik to'g'risidagi kodeksga ko'ra ma'muriy qamoq jazosining eng yuqori muddati necha sutka?",
          options: [{key:"A", text:"10 sutka"}, {key:"B", text:"15 sutka"}, {key:"C", text:"30 sutka"}, {key:"D", text:"60 sutka"}],
          correct: "B",
          section: "Ma'muriy huquq"
        }
      ];
    }
  }

  octagonState.battleQuestions = dynamicQuestions;
  octagonState.totalRounds = dynamicQuestions.length;

  showToast(`🥊 10 raundlik duel boshlandi! Raqib: ${chosenOpponentName}`);
  loadOctagonRound(0);
}

function updateOctagonHpBars() {
  const pBar = document.getElementById("octPlayerHpBar");
  const pText = document.getElementById("octPlayerHpText");
  const oBar = document.getElementById("octOpponentHpBar");
  const oText = document.getElementById("octOpponentHpText");

  const pVal = Math.max(0, octagonState.playerHp);
  const oVal = Math.max(0, octagonState.opponentHp);

  if (pBar) {
    pBar.style.width = pVal + "%";
    pBar.className = pVal > 40 
      ? "bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
      : "bg-gradient-to-r from-rose-600 to-red-500 h-full transition-all duration-300 animate-pulse";
  }
  if (pText) pText.innerText = pVal + " HP";

  if (oBar) {
    oBar.style.width = oVal + "%";
    oBar.className = oVal > 40
      ? "bg-gradient-to-l from-rose-500 to-red-600 h-full transition-all duration-300 ml-auto"
      : "bg-gradient-to-l from-amber-500 to-rose-600 h-full transition-all duration-300 ml-auto animate-pulse";
  }
  if (oText) oText.innerText = oVal + " HP";
}

function loadOctagonRound(roundIdx) {
  // Qat'iy 10 ta raund: faqat 10 ta raund to'liq o'ynalgach yakunlanadi
  if (roundIdx >= octagonState.totalRounds) {
    finishOctagonBattle();
    return;
  }

  octagonState.currentRound = roundIdx;
  octagonState.isRoundLocked = false;
  octagonState.timeLeft = 15;

  const roundInd = document.getElementById("octRoundIndicator");
  if (roundInd) roundInd.innerText = `Raund ${roundIdx + 1} / ${octagonState.totalRounds}`;

  const impact = document.getElementById("octCombatImpact");
  if (impact) impact.classList.add("hidden");

  // Savolni chiqarish
  const q = octagonState.battleQuestions[roundIdx];
  octagonState.activeQuestion = q;

  const qCat = document.getElementById("octQCategory");
  if (qCat) qCat.innerHTML = `<i class="fa-solid fa-gavel mr-1 text-red-500"></i> ${q.section || 'Huquqiy Duel'}`;

  const qText = document.getElementById("octQuestionText");
  if (qText) qText.innerText = q.text;

  const container = document.getElementById("octOptionsContainer");
  if (container) {
    container.innerHTML = "";
    (q.options || []).forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-red-500 text-left text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-2 transition active:scale-98";
      btn.onclick = () => handleOctagonAnswer(opt.key, btn);
      btn.innerHTML = `
        <span class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-black shrink-0">
          ${opt.key}
        </span>
        <span class="flex-1">${opt.text}</span>
      `;
      container.appendChild(btn);
    });
  }

  // Timer start
  startOctagonTimer();
}

function startOctagonTimer() {
  if (octagonState.timerInterval) clearInterval(octagonState.timerInterval);
  const timerVal = document.getElementById("octTimerVal");
  const timerBox = document.getElementById("octTimerBox");

  octagonState.timerInterval = setInterval(() => {
    octagonState.timeLeft--;
    if (timerVal) timerVal.innerText = octagonState.timeLeft;

    if (octagonState.timeLeft <= 5) {
      if (timerBox) timerBox.className = "w-8 h-8 rounded-full bg-red-600 border-2 border-yellow-300 flex items-center justify-center font-black text-xs text-white animate-bounce";
    } else {
      if (timerBox) timerBox.className = "w-8 h-8 rounded-full bg-red-950 border-2 border-yellow-400 flex items-center justify-center font-black text-xs text-yellow-300";
    }

    if (octagonState.timeLeft <= 0) {
      clearInterval(octagonState.timerInterval);
      handleOctagonTimeout();
    }
  }, 1000);
}

function handleOctagonAnswer(selectedKey, clickedBtn) {
  if (octagonState.isRoundLocked) return;
  octagonState.isRoundLocked = true;
  if (octagonState.timerInterval) clearInterval(octagonState.timerInterval);

  const q = octagonState.activeQuestion;
  const correctVal = (q.correct || q.correctKey || "A").toString().trim().toUpperCase();
  const isCorrect = (selectedKey.toString().trim().toUpperCase() === correctVal);
  const impact = document.getElementById("octCombatImpact");

  // Variantlarni ranglash
  const container = document.getElementById("octOptionsContainer");
  if (container) {
    const buttons = container.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.disabled = true;
      const keySpan = btn.querySelector("span");
      if (keySpan && keySpan.innerText.trim().toUpperCase() === correctVal) {
        btn.classList.add("bg-emerald-100", "dark:bg-emerald-950", "border-emerald-500", "text-emerald-800", "dark:text-emerald-200");
      }
    });
  }

  if (isCorrect) {
    // Foydalanuvchi to'g'ri topdi -> Raqibga zarba!
    octagonState.opponentHp -= octagonState.damagePerHit;
    octagonState.playerRoundCorrect++;
    updateOctagonHpBars();

    if (impact) {
      impact.classList.remove("hidden");
      impact.className = "text-center text-xs font-black py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse";
      impact.innerHTML = `💥 ANIQ VA KUCHLI ZARBA! Raqib -${octagonState.damagePerHit} HP yo'qotdi!`;
    }
    showToast("To'g'ri javob! Raqib jarohatlandi! 🥊");
  } else {
    // Foydalanuvchi xato qildi -> Foydalanuvchiga zarba!
    octagonState.playerHp -= octagonState.damagePerHit;
    updateOctagonHpBars();

    // Xatolikni saqlash ro'yxatiga olamiz va DARHOL "Mening xatolarim"ga saqlaymiz!
    const mistakeItem = {
      num: octagonState.currentRound + 1,
      type: "Y-1",
      section: q.section || "Huquqiy Duel",
      text: q.text,
      options: q.options || [],
      correctAns: correctVal,
      userAns: selectedKey,
      isCorrect: false,
      explanation: q.explanation || "Huquqiy duel savoli bo'yicha to'g'ri javob me'yoriy asosga ega.",
      bookSource: "Huquqiy Octagon Arena",
      lawSource: q.section || "40 ta Qonun"
    };

    octagonState.battleMistakes.push(mistakeItem);
    saveMistakesFromResults([mistakeItem]);

    if (clickedBtn) {
      clickedBtn.classList.add("bg-rose-100", "dark:bg-rose-950", "border-rose-500", "text-rose-800", "dark:text-rose-200");
    }

    if (impact) {
      impact.classList.remove("hidden");
      impact.className = "text-center text-xs font-black py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse";
      impact.innerHTML = `🥊 RAQIB SIZGA QARSHI ZARBA BERDI! -${octagonState.damagePerHit} HP!`;
    }
    showToast("Noto'g'ri javob! Zarba qabul qildingiz! 💥");
  }

  // 1.5 soniyadan keyin keyingi raund
  setTimeout(() => {
    loadOctagonRound(octagonState.currentRound + 1);
  }, 1500);
}

function handleOctagonTimeout() {
  if (octagonState.isRoundLocked) return;
  octagonState.isRoundLocked = true;

  const q = octagonState.activeQuestion;
  octagonState.playerHp -= octagonState.damagePerHit;
  updateOctagonHpBars();

  if (q) {
    const mistakeItem = {
      num: octagonState.currentRound + 1,
      type: "Y-1",
      section: q.section || "Huquqiy Duel",
      text: q.text,
      options: q.options || [],
      correctAns: q.correct || q.correctKey || "A",
      userAns: "Vaqt tugadi (Javobsiz)",
      isCorrect: false,
      explanation: q.explanation || "Vaqt belgilangan 15 soniya ichida tugadi.",
      bookSource: "Huquqiy Octagon Arena",
      lawSource: q.section || "40 ta Qonun"
    };
    octagonState.battleMistakes.push(mistakeItem);
    saveMistakesFromResults([mistakeItem]);
  }

  const impact = document.getElementById("octCombatImpact");
  if (impact) {
    impact.classList.remove("hidden");
    impact.className = "text-center text-xs font-black py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40";
    impact.innerHTML = `⏰ VAQT TUGADI! Raqib sizga hujum qildi (-${octagonState.damagePerHit} HP)!`;
  }
  showToast("Vaqt tugadi! Zarba yetkazildi! 💥");

  setTimeout(() => {
    loadOctagonRound(octagonState.currentRound + 1);
  }, 1500);
}

function finishOctagonBattle() {
  if (octagonState.timerInterval) clearInterval(octagonState.timerInterval);

  const qCard = document.getElementById("octQuestionCard");
  if (qCard) qCard.classList.add("hidden");

  const resModal = document.getElementById("octResultModal");
  if (!resModal) return;
  resModal.classList.remove("hidden");

  const titleEl = document.getElementById("octResultTitle");
  const descEl = document.getElementById("octResultDesc");
  const iconEl = document.getElementById("octResultIcon");

  const pWon = (octagonState.playerHp > octagonState.opponentHp);
  const isDraw = (octagonState.playerHp === octagonState.opponentHp);
  const isKnockout = (octagonState.opponentHp <= 0 || octagonState.playerHp <= 0);

  // Duel ballarini hisoblash
  let scoreGained = octagonState.playerRoundCorrect * 10; // Har bir to'g'ri javob uchun 10 ball
  if (pWon) {
    scoreGained += 50; // G'alaba bonusi
    if (isKnockout) scoreGained += 25; // Noqaud bonusi
  } else if (isDraw) {
    scoreGained += 25; // Durang bonusi
  } else {
    scoreGained += 10; // Ishtirok uchun rag'bat
  }

  // 1. Jangdagi xatolarni "Mening xatolarim" bankiga saqlash
  if (octagonState.battleMistakes && octagonState.battleMistakes.length > 0) {
    saveMistakesFromResults(octagonState.battleMistakes);
  }

  // 2. Mahalliy statistikani yangilash
  let duelStats = { duelScore: 0, wins: 0, losses: 0, matches: 0 };
  try {
    const raw = localStorage.getItem("huquq_duel_stats");
    if (raw) duelStats = JSON.parse(raw);
  } catch (e) {}

  duelStats.duelScore = (duelStats.duelScore || 0) + scoreGained;
  duelStats.matches = (duelStats.matches || 0) + 1;
  if (pWon) duelStats.wins = (duelStats.wins || 0) + 1;
  else if (!isDraw) duelStats.losses = (duelStats.losses || 0) + 1;
  localStorage.setItem("huquq_duel_stats", JSON.stringify(duelStats));

  // 3. UI ballarini aks ettirish
  const scoreGainedEl = document.getElementById("octScoreGained");
  const totalScoreEl = document.getElementById("octTotalDuelScore");
  if (scoreGainedEl) scoreGainedEl.innerText = `+${scoreGained} Reyting Bali Qozonildi! (${octagonState.playerRoundCorrect}/${octagonState.totalRounds} to'g'ri)`;
  if (totalScoreEl) totalScoreEl.innerText = `Jami duel bali: ${duelStats.duelScore} ball | ${duelStats.wins} ta g'alaba`;

  // 4. Serverga va alohida Duel Reytingiga natijani yuborish
  const currentUserName = state.user?.name || (state.currentUser && state.currentUser.name) || "Talaba";
  const currentUserId = state.user?.id || (state.currentUser && state.currentUser.id) || null;

  fetch("/api/duel/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUserId,
      userName: currentUserName,
      scoreGained: scoreGained,
      won: pWon,
      isKnockout: isKnockout,
      correctCount: octagonState.playerRoundCorrect,
      totalRounds: octagonState.totalRounds,
      opponentName: octagonState.opponentName
    })
  }).catch(e => console.warn("Duel result save fallback:", e));

  if (pWon) {
    if (iconEl) {
      iconEl.className = "w-16 h-16 mx-auto rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-3xl border-2 border-yellow-400 shadow-lg";
      iconEl.innerHTML = `<i class="fa-solid fa-trophy"></i>`;
    }
    if (titleEl) {
      titleEl.innerText = isKnockout ? "🏆 NOQAUD G'ALABA!" : "🏆 OCHKO BO'YICHA G'ALABA!";
      titleEl.className = "text-lg font-black uppercase text-yellow-300";
    }
    if (descEl) {
      descEl.innerText = `Siz 10 raundlik shiddatli jangda ${octagonState.opponentName} ustidan to'liq ustun keldingiz! Octagon kamari sizga nasib etdi!`;
    }
    showToast("TABRIKLAYMIZ! OCTAGON G'OLIBI BO'LDINGIZ! 🥊🏆");
  } else if (isDraw) {
    if (iconEl) {
      iconEl.className = "w-16 h-16 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-3xl border-2 border-blue-400 shadow-lg";
      iconEl.innerHTML = `<i class="fa-solid fa-scale-balanced"></i>`;
    }
    if (titleEl) {
      titleEl.innerText = "🤝 DURANG NATIJA!";
      titleEl.className = "text-lg font-black uppercase text-blue-300";
    }
    if (descEl) {
      descEl.innerText = `10 raund yakunida har ikki tomon teng kuchli bilim namoyish etdi!`;
    }
    showToast("Jang durang bilan yakunlandi! ⚖️");
  } else {
    if (iconEl) {
      iconEl.className = "w-16 h-16 mx-auto rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-3xl border-2 border-rose-500 shadow-lg";
      iconEl.innerHTML = `<i class="fa-solid fa-hand-fist"></i>`;
    }
    if (titleEl) {
      titleEl.innerText = isKnockout ? "💥 TEXNIK MAG'LUBIYAT!" : "💥 OCHKO BO'YICHA MAG'LUBIYAT";
      titleEl.className = "text-lg font-black uppercase text-rose-400";
    }
    if (descEl) {
      descEl.innerText = `Bu safar ${octagonState.opponentName} tajribasi ustun keldi. Flashcards va xatolar bankini takrorlab qayta jangga chiqing!`;
    }
    showToast("Jang yakunlandi. Xatolaringiz saqlandi, qayta urinib ko'ring! 💪");
  }
}

// ==================== 11. FOYDALI KANALLAR VA MAJBURIY A'ZOLIK (@Huquq_study & @General_Huquq) ====================

let allChannelsCache = [];
let currentChannelCategory = 'all';

function isUserSubscribedToChannel() {
  const sub1 = localStorage.getItem('huquq_study_subscribed') === 'true';
  const sub2 = localStorage.getItem('general_huquq_subscribed') === 'true';
  return sub1 && sub2;
}

function updateHomeSubscriptionUI() {
  const isSub = isUserSubscribedToChannel();
  const badge = document.getElementById("homeSubBadge");
  const statusText = document.getElementById("homeSubStatusText");
  const statusBtn = document.getElementById("homeSubStatusBtn");
  const detailBadge = document.getElementById("channelSubscribedBadge");

  if (isSub) {
    if (badge) {
      badge.className = "text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold";
      badge.innerText = "✅ 2 ta Kanal Faol";
    }
    if (statusText) statusText.innerText = "@Huquq_study va @General_Huquq a'zoligingiz tasdiqlangan";
    if (statusBtn) {
      statusBtn.className = "px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px] shadow-xs";
      statusBtn.innerText = "Tasdiqlangan";
    }
    if (detailBadge) detailBadge.classList.remove("hidden");
  } else {
    if (badge) {
      badge.className = "text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold";
      badge.innerText = "2 ta Majburiy Kanal";
    }
    if (statusText) statusText.innerText = "To'liq imkoniyatlar uchun 2 ta rasmiy kanalga a'zo bo'ling";
    if (statusBtn) {
      statusBtn.className = "px-2.5 py-1 rounded-xl bg-sky-600 text-white font-bold text-[10px] shadow-xs";
      statusBtn.innerText = "Tekshirish";
    }
    if (detailBadge) detailBadge.classList.add("hidden");
  }
}

function openSubscriptionModal() {
  const modal = document.getElementById("subscriptionModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeSubscriptionModal() {
  const modal = document.getElementById("subscriptionModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function markChannelOpened(channelId) {
  if (channelId === 'general_huquq') {
    localStorage.setItem('general_huquq_visited', 'true');
    showToast("@General_Huquq kanali ochilmoqda...");
  } else {
    localStorage.setItem('huquq_study_visited', 'true');
    showToast("@Huquq_study kanali ochilmoqda...");
  }
}

async function verifyChannelSubscription(showAlert = true) {
  try {
    let userId = state.currentUser?.id || state.user?.id || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || null;
    
    // Server orqali a'zolikni tekshirish
    const res = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    const data = await res.json();

    const visited1 = localStorage.getItem('huquq_study_visited') === 'true';
    const visited2 = localStorage.getItem('general_huquq_visited') === 'true';

    if (data.subscribed || (visited1 && visited2) || !userId) {
      localStorage.setItem('huquq_study_subscribed', 'true');
      localStorage.setItem('general_huquq_subscribed', 'true');
      updateHomeSubscriptionUI();
      closeSubscriptionModal();
      if (showAlert) {
        showToast("🎉 @Huquq_study va @General_Huquq kanallariga a'zoligingiz tasdiqlandi!");
      }
      return true;
    } else {
      if (data.missing && data.missing.length > 0) {
        const missingNames = data.missing.join(" va ");
        if (showAlert) {
          showToast(`⚠️ Iltimos, ${missingNames} kanaliga ham a'zo bo'ling!`);
        }
      } else if (!visited1 && !visited2) {
        if (showAlert) showToast("⚠️ Iltimos, ikkala kanalga ham a'zo bo'ling!");
      } else if (!visited1) {
        if (showAlert) showToast("⚠️ Iltimos, 1-kanal (@Huquq_study)ga a'zo bo'ling!");
      } else {
        if (showAlert) showToast("⚠️ Iltimos, 2-kanal (@General_Huquq)ga a'zo bo'ling!");
      }
      return false;
    }
  } catch (err) {
    localStorage.setItem('huquq_study_subscribed', 'true');
    localStorage.setItem('general_huquq_subscribed', 'true');
    updateHomeSubscriptionUI();
    closeSubscriptionModal();
    if (showAlert) {
      showToast("✅ A'zoligingiz muvaffaqiyatli tasdiqlandi!");
    }
    return true;
  }
}

/* ==================== 11. AI USTOZ (CHATGPT KABI UNIVERSAL AI) ==================== */

let aiTutorHistory = [];
const FREE_AI_QUESTION_LIMIT = 2;

function getAiUserKey() {
  if (state.currentUser && state.currentUser.phone) return state.currentUser.phone;
  if (state.currentUser && state.currentUser.id) return state.currentUser.id;
  return "guest_user";
}

function getAiQuestionsUsed() {
  const key = "huquq_ai_used_" + getAiUserKey();
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function incrementAiQuestionsUsed() {
  const key = "huquq_ai_used_" + getAiUserKey();
  const current = getAiQuestionsUsed() + 1;
  localStorage.setItem(key, current.toString());
  updateAiLimitUI();
  return current;
}

function isAiUnlimited() {
  return state.userPlan === "tariff_vip" || 
         state.isPremium === true || 
         localStorage.getItem("huquq_premium_active") === "true";
}

function updateAiLimitUI() {
  const badgeText = document.getElementById("aiLimitText");
  const badgeContainer = document.getElementById("aiLimitBadge");
  if (!badgeText) return;

  if (isAiUnlimited()) {
    badgeText.innerHTML = `<span class="text-amber-500 font-black flex items-center"><i class="fa-solid fa-crown mr-1.5 text-xs"></i> VIP PRO: Cheksiz Savollar</span>`;
    if (badgeContainer) {
      badgeContainer.className = "flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-[11px] shadow-xs";
    }
  } else {
    const used = getAiQuestionsUsed();
    const remaining = Math.max(0, FREE_AI_QUESTION_LIMIT - used);
    if (remaining > 0) {
      badgeText.innerHTML = `<span class="text-indigo-700 dark:text-indigo-300 font-bold flex items-center"><i class="fa-solid fa-gift text-amber-500 mr-1.5 text-xs"></i> Bepul savollar: <strong class="ml-1">${remaining}/${FREE_AI_QUESTION_LIMIT} ta qoldi</strong></span>`;
      if (badgeContainer) {
        badgeContainer.className = "flex items-center justify-between px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] shadow-xs";
      }
    } else {
      badgeText.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-black flex items-center"><i class="fa-solid fa-lock text-rose-500 mr-1.5 text-xs"></i> 2 ta bepul limit tugadi</span>`;
      if (badgeContainer) {
        badgeContainer.className = "flex items-center justify-between px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] shadow-xs";
      }
    }
  }
}

function openAiLimitModal() {
  const m = document.getElementById("aiLimitModal");
  if (m) m.classList.remove("hidden");
}

function closeAiLimitModal() {
  const m = document.getElementById("aiLimitModal");
  if (m) m.classList.add("hidden");
}

function openAiTutorView() {
  if (!checkAuthRequired("AI Ustoz")) return;
  switchView("viewAiTutor");
  updateAiLimitUI();
  const container = document.getElementById("aiTutorMessages");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
  const input = document.getElementById("aiTutorInput");
  if (input) {
    input.focus();
  }
}

function openChannelsDirectory() {
  // Kanallar o'rniga rasmiy @Huquq_study kanalini ochish
  window.open("https://t.me/Huquq_study", "_blank");
}

function clearAiInput() {
  const input = document.getElementById("aiTutorInput");
  const clearBtn = document.getElementById("btnAiClear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.classList.add("hidden");
}

function clearAiTutorChat() {
  if (confirm("AI Ustoz bilan suhbat tarixini tozalashni xohlaysizmi?")) {
    aiTutorHistory = [];
    const container = document.getElementById("aiTutorMessages");
    if (container) {
      container.innerHTML = `
        <div class="flex items-start space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="space-y-1.5 max-w-[85%]">
            <div class="p-3.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs leading-relaxed">
              <p class="font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center">
                <i class="fa-solid fa-sparkles mr-1.5"></i> Assalomu alaykum!
              </p>
              Men sizning universal <strong>AI Ustozingizman</strong> (xuddi ChatGPT kabi ishlayman).
              <br><br>
              Huquqshunoslik, BMBA imtihoni, <strong>40 ta qonun</strong>, vaziyatli keyslar, darsliklar yoki istalgan boshqa mavzuda savolingizni bering. Men barchasiga to'liq, mukammal va tushunarli javob beraman!
            </div>
            <span class="text-[9px] text-slate-400 pl-1">AI Ustoz (ChatGPT) · Yangi suhbat</span>
          </div>
        </div>
      `;
    }
    showToast("Suhbat tarixi tozalandi.");
  }
}

function askAiQuick(questionText) {
  if (!checkAuthRequired("AI Ustoz")) return;
  const input = document.getElementById("aiTutorInput");
  if (input) {
    input.value = questionText;
  }
  handleAiTutorSubmit(new Event("submit"));
}

async function handleAiTutorSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!checkAuthRequired("AI Ustoz")) return;
  const input = document.getElementById("aiTutorInput");
  const sendBtn = document.getElementById("btnAiSend");
  const container = document.getElementById("aiTutorMessages");

  if (!input || !container) return;
  const question = input.value.trim();
  if (!question) return;

  // 0. Bepul limitni tekshirish (Faqat 2 ta bepul savol)
  if (!isAiUnlimited()) {
    const used = getAiQuestionsUsed();
    if (used >= FREE_AI_QUESTION_LIMIT) {
      openAiLimitModal();
      showToast("⚠️ 2 ta bepul savol limitingiz tugagan. Cheksiz foydalanish uchun VIP PRO ga ulaning!");
      return;
    }
  }

  const nowTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  // 1. Foydalanuvchi xabarini ekranga chiqarish
  const userBubble = document.createElement("div");
  userBubble.className = "flex items-start justify-end space-x-2";
  userBubble.innerHTML = `
    <div class="space-y-1 max-w-[85%] text-right">
      <div class="p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs leading-relaxed text-left font-medium shadow-xs">
        ${escapeHtml(question)}
      </div>
      <span class="text-[9px] text-slate-400 pr-1">${nowTime}</span>
    </div>
  `;
  container.appendChild(userBubble);
  input.value = "";
  container.scrollTop = container.scrollHeight;

  // 2. Loading indikatori
  const loadingId = "aiLoading_" + Date.now();
  const loadingBubble = document.createElement("div");
  loadingBubble.id = loadingId;
  loadingBubble.className = "flex items-start space-x-2.5 animate-pulse";
  loadingBubble.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="space-y-1.5 max-w-[85%]">
      <div class="p-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-500 text-xs flex items-center space-x-2">
        <i class="fa-solid fa-spinner fa-spin text-emerald-500"></i>
        <span>ChatGPT kabi javob tayyorlanmoqda...</span>
      </div>
    </div>
  `;
  container.appendChild(loadingBubble);
  container.scrollTop = container.scrollHeight;

  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch("/api/ai/tutor-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: aiTutorHistory
      })
    });

    const data = await res.json();
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    const replyText = data.reply || "Savolingiz bo'yicha javob topilmadi. Qayta urinib ko'ring.";
    const replySource = data.source || "AI Ustoz (ChatGPT)";
    const replyTime = data.timestamp || nowTime;

    // Tarixga qo'shish
    aiTutorHistory.push({ role: "user", text: question });
    aiTutorHistory.push({ role: "model", text: replyText });

    // AI Ustoz javob xabari
    const aiBubble = document.createElement("div");
    aiBubble.className = "flex items-start space-x-2.5 animate-fade-in";
    
    // Markdown-ga o'xshash qatorlarni chiroyli HTML-ga o'girish (ChatGPT uslubi)
    const formattedReply = replyText
      .replace(/```([\s\S]*?)```/g, '<pre class="p-2.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto my-1.5">$1</pre>')
      .replace(/^### (.*$)/gim, '<h4 class="font-bold text-emerald-600 dark:text-emerald-400 mt-2 mb-1">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1">$1</h3>')
      .replace(/^---$/gim, '<hr class="my-2 border-slate-200 dark:border-slate-700">')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n•/g, '<br>•')
      .replace(/\n\*\s/g, '<br>• ')
      .replace(/\n-\s/g, '<br>• ')
      .replace(/\n(\d+)\.\s/g, '<br><strong>$1.</strong> ')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    aiBubble.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="space-y-1.5 max-w-[88%]">
        <div class="p-3.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs leading-relaxed shadow-xs">
          ${formattedReply}
        </div>
        <div class="flex items-center space-x-2 text-[9px] text-slate-400 pl-1">
          <span>${replySource} · ${replyTime}</span>
          <button onclick="copyAiAnswer(this)" class="hover:text-emerald-500 font-semibold flex items-center ml-2">
            <i class="fa-regular fa-copy mr-0.5"></i> Nusxa
          </button>
        </div>
      </div>
    `;
    container.appendChild(aiBubble);
    container.scrollTop = container.scrollHeight;

    // 3. Agar foydalanuvchi VIP bo'lmasa, limitni oshiramiz va xabar beramiz
    if (!isAiUnlimited()) {
      const usedNow = incrementAiQuestionsUsed();
      const remainingNow = Math.max(0, FREE_AI_QUESTION_LIMIT - usedNow);
      if (remainingNow > 0) {
        showToast(`💡 Yana ${remainingNow} ta bepul AI savoli qoldi.`);
      } else {
        showToast("⚠️ 2 ta bepul savol limitingiz tugadi! Cheksiz foydalanish uchun VIP PRO ga ulaning.");
      }
    }

  } catch (err) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    const errBubble = document.createElement("div");
    errBubble.className = "flex items-start space-x-2.5";
    errBubble.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <div class="p-3 rounded-2xl rounded-tl-sm bg-rose-50 text-rose-700 text-xs">
        Serverga ulanishda xatolik yuz berdi. Internet aloqasini tekshiring yoki birozdan so'ng qayta urinib ko'ring.
      </div>
    `;
    container.appendChild(errBubble);
    container.scrollTop = container.scrollHeight;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function copyAiAnswer(btn) {
  const bubble = btn.closest(".space-y-1.5")?.querySelector(".p-3.5");
  if (!bubble) return;
  const text = bubble.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<i class="fa-solid fa-check text-emerald-500 mr-0.5"></i> Nusxalandi!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-regular fa-copy mr-0.5"></i> Nusxa';
    }, 2000);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
