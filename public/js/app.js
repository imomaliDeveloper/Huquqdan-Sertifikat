// Huquq Milliy Sertifikat - Asosiy Telegram Mini App Mantiqi

// PWA Service Worker Ro'yxatdan o'tkazish
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW faol:', reg.scope))
      .catch(err => console.log('SW xatolik:', err));
  });
}

// Telegram Web App integratsiyasi
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// App State
const state = {
  user: {
    id: tg?.initDataUnsafe?.user?.id || 1001,
    name: tg?.initDataUnsafe?.user?.first_name || (tg?.initDataUnsafe?.user?.last_name ? `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}` : "O'quvchi"),
    username: tg?.initDataUnsafe?.user?.username || ""
  },
  currentUser: JSON.parse(localStorage.getItem("huquq_auth_user") || "null"),
  userPlan: localStorage.getItem("huquq_user_plan") || (localStorage.getItem("huquq_premium_active") === "true" ? "tariff_vip" : "tariff_start"),
  selectedTariff: "tariff_vip",
  currentQuestion: 0,
  userAnswers: {}, // { 1: "B", 36: "300 soat" }
  bookmarks: new Set(),
  timerSeconds: 90 * 60,
  timerInterval: null,
  currentCard: 0,
  isCardFlipped: false,
  laws: [],
  isPremium: localStorage.getItem("huquq_premium_active") === "true" || localStorage.getItem("huquq_user_plan") === "tariff_vip" || localStorage.getItem("huquq_user_plan") === "tariff_standard",
  streak: parseInt(localStorage.getItem("huquq_daily_streak") || "1"),
  currentDetailedResults: []
};

// DOM yuklanganda
document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp foydalanuvchisini aniqlash
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    state.user.name = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    state.user.id = tgUser.id;
  }

  // Foydalanuvchi va Auth UI-ni yangilash
  initAuthUI();

  // Kunlik streakni yangilash
  updateDailyStreak();

  // Xatolar sonini yangilash
  updateMistakesCount();

  // 40 ta qonunni yuklash
  fetchLawsList();

  // Kanallarga a'zolik holatini yangilash
  updateHomeSubscriptionUI();
});

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

// Ko'rinishlarni almashtirish
function switchView(viewId) {
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
  state.currentQuestion = 0;
  state.userAnswers = {};
  state.bookmarks.clear();
  state.timerSeconds = 90 * 60;

  switchView("viewExam");
  startTimer();
  renderQuestion();
  renderGridMatrix();
}

function startCaseStudy() {
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

  if ((q.type === "Y-1" || q.type === "Y-2") && Array.isArray(q.options)) {
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
  if (state.currentQuestion < EXAM_DATA.totalQuestions - 1) {
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

  for (let i = 0; i < EXAM_DATA.totalQuestions; i++) {
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
  const answeredCount = Object.keys(state.userAnswers).filter(k => state.userAnswers[k] && state.userAnswers[k].toString().trim().length > 0).length;
  const unanswered = EXAM_DATA.totalQuestions - answeredCount;

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

    if (q.type === "Y-1" || q.type === "Y-2") {
      isCorrect = userAns === q.correct;
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
      type: q.type,
      section: q.section,
      text: q.text,
      options: q.options || [],
      userAns: userAns || "Javob berilmadi",
      correctAns: q.type === "O" ? q.canonicalAnswer : q.correct,
      isCorrect: isCorrect,
      explanation: q.explanation,
      bookSource: q.bookSource || "8-11 sinf darsliklari",
      lawSource: q.lawSource || "Spesifikatsiyadagi 40 ta Qonun"
    });
  }

  state.currentDetailedResults = resultsDetailed;
  state.lastScore = correctCount;
  state.lastTotal = EXAM_DATA.totalQuestions;

  const percentage = Math.round((correctCount / EXAM_DATA.totalQuestions) * 100);
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
  document.getElementById("resPercent").innerText = `${percentage}% to'g'ri bajarildi (${correctCount} ta to'g'ri, ${45 - correctCount} ta xato)`;
  document.getElementById("resBadgeLevel").innerText = level;

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
        ${!item.isCorrect ? `<div><strong>To'g'ri javob:</strong> <span class="text-emerald-700 font-bold">${item.correctAns}</span></div>` : ''}
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
async function askAITutor(questionNum) {
  const modal = document.getElementById("aiExplainModal");
  const loading = document.getElementById("aiExplainLoading");
  const content = document.getElementById("aiExplainContent");

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  loading.classList.remove("hidden");
  content.classList.add("hidden");

  const item = state.currentDetailedResults.find(r => r.num === questionNum) || EXAM_DATA.questions[questionNum - 1];

  try {
    const res = await fetch("/api/ai/explain-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: item.text,
        options: item.options || [],
        correctAnswer: item.correctAns || item.correct,
        userAnswer: item.userAns || "",
        explanation: item.explanation || "",
        lawRef: item.section || ""
      })
    });

    const data = await res.json();

    document.getElementById("aiLawArticle").innerText = data.lawArticle || item.section;
    document.getElementById("aiExplanation").innerText = data.explanation;
    document.getElementById("aiMistakeReason").innerText = data.mistakeReason;
    document.getElementById("aiMemoryTip").innerText = data.memoryTip;

    loading.classList.add("hidden");
    content.classList.remove("hidden");
  } catch (err) {
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    document.getElementById("aiLawArticle").innerText = item.section;
    document.getElementById("aiExplanation").innerText = item.explanation;
    document.getElementById("aiMistakeReason").innerText = "Savoldagi normativ muddatlar va shartlarga e'tibor qaratilmagan.";
    document.getElementById("aiMemoryTip").innerText = "Ushbu savol bo'yicha Flashcardlarni takrorlab chiqing.";
  }
}

function closeAIModal() {
  const modal = document.getElementById("aiExplainModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Natijani serverga va Leaderboardga saqlash
async function submitResultToServer(score, percentage, grade) {
  try {
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.user.name,
        score: score,
        total: EXAM_DATA.totalQuestions,
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

/* ==================== 4. REYTING & LEADERBOARD ==================== */

async function openLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  const listContainer = document.getElementById("leaderboardList");

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  listContainer.innerHTML = '<div class="text-center py-6 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Reyting yuklanmoqda...</div>';

  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    renderLeaderboardList(data);
  } catch (err) {
    listContainer.innerHTML = '<div class="text-center py-4 text-rose-500">Reytingni yuklab bo\'lmadi.</div>';
  }
}

function renderLeaderboardList(list) {
  const container = document.getElementById("leaderboardList");
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-slate-400">Hozircha natijalar yo\'q. Birinchi bo\'lib testni topshiring!</div>';
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
          idx < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
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

function closeLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
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

  if (user) {
    if (btnLogin) btnLogin.classList.add("hidden");
    if (btnProfile) {
      btnProfile.classList.remove("hidden");
      btnProfile.classList.add("flex");
    }
    const shortName = (user.name || "O'quvchi").split(" ")[0];
    if (userNameElem) userNameElem.innerText = shortName;
  } else {
    if (btnLogin) btnLogin.classList.remove("hidden");
    if (btnProfile) {
      btnProfile.classList.add("hidden");
      btnProfile.classList.remove("flex");
    }
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
  const text = encodeURIComponent("Assalomu alaykum! Huquq Milliy Sertifikat platformasida VIP obuna uchun to'lov qildim. Chekni taqdim etmoqdaman:");
  window.open(`https://t.me/share/url?url=&text=${text}`, "_blank");
}

function applyPromoCode() {
  const code = (document.getElementById("promoCodeInput")?.value || "").trim().toUpperCase();
  if (code === "BMBA2026" || code === "PREMIUM" || code === "HUQUQ") {
    state.isPremium = true;
    localStorage.setItem("huquq_premium_active", "true");
    showToast("Tabriklaymiz! VIP a'zolik muvaffaqiyatli faollashtirildi! 💎");
    closePremiumModal();
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  } else {
    showToast("Noto'g'ri promo-kod! Admin bilan bog'laning.");
  }
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

/* ==================== 7. 40 TA QONUN RO'YXATI ==================== */

function openLawsDirectory() {
  switchView("viewLaws");
  renderLawsList(state.laws);
}

function fetchLawsList() {
  fetch("/data/laws_list.json")
    .then(res => res.json())
    .then(data => {
      state.laws = data;
    })
    .catch(() => {
      // Offline fallback
      state.laws = [
        { id: 1, name: "O‘zbekiston Respublikasi Konstitutsiyasi", category: "Asosiy qonun", url: "https://lex.uz/docs/6445145" },
        { id: 8, name: "Fuqarolik kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/111189" },
        { id: 11, name: "Jinoyat kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/111453" },
        { id: 14, name: "Mehnat kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/6257288" },
        { id: 19, name: "Oila kodeksi", category: "Kodekslar", url: "https://lex.uz/docs/104720" }
      ];
    });
}

function renderLawsList(list) {
  const container = document.getElementById("lawsListContainer");
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-xs text-slate-400">Hech qanday qonun topilmadi</div>`;
    return;
  }

  list.forEach(law => {
    const item = document.createElement("a");
    item.href = law.url;
    item.target = "_blank";
    item.className = "p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-blue-500 block transition";

    item.innerHTML = `
      <div class="pr-2">
        <span class="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">${law.category}</span>
        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">${law.id}. ${law.name}</h4>
      </div>
      <i class="fa-solid fa-arrow-up-right-from-square text-xs text-slate-400"></i>
    `;
    container.appendChild(item);
  });
}

function filterLaws() {
  const query = (document.getElementById("lawSearchInput")?.value || "").toLowerCase().trim();
  if (!query) {
    renderLawsList(state.laws);
    return;
  }
  const filtered = state.laws.filter(law => 
    law.name.toLowerCase().includes(query) || 
    (law.category && law.category.toLowerCase().includes(query)) ||
    law.id.toString() === query
  );
  renderLawsList(filtered);
}

/* ==================== 8. 50 TA VARIANTLAR BOSHQARUVI ==================== */

async function openVariantsList() {
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
  if (isLocked) {
    openPremiumModal();
    return;
  }
  loadAndStartVariant(variantId);
}

async function loadAndStartVariant(variantId) {
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
  switchView("viewBooks");
  const container = document.getElementById("booksListContainer");
  container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Darsliklar yuklanmoqda...</div>';

  try {
    const res = await fetch("/api/textbooks");
    const books = await res.json();
    renderBooksList(books);
  } catch (err) {
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">Darsliklarni yuklab bo\'lmadi</div>';
  }
}

function renderBooksList(books) {
  const container = document.getElementById("booksListContainer");
  container.innerHTML = "";

  books.forEach(b => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid ${b.icon || 'fa-book'}"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">${b.grade}</span>
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

    container.appendChild(card);
  });
}

/* ==================== 25 TA VAZIYATLI KEYSLAR BANKI (Y-2) ==================== */
let allCasesCache = [];

async function openCasesDirectory() {
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
      </div>

      <!-- Vaziyatli Matn (Scenario) -->
      <div class="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
        <p class="font-bold text-amber-800 dark:text-amber-400 text-[11px] mb-1 flex items-center">
          <i class="fa-solid fa-file-contract mr-1"></i> Vaziyat (Kazuistika):
        </p>
        <p>${item.scenario}</p>
      </div>

      <!-- Manbalar -->
      <div class="flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-medium">
          <i class="fa-solid fa-book-bookmark text-indigo-500 mr-1"></i> ${item.bookSource}
        </span>
        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-medium">
          <i class="fa-solid fa-scale-balanced text-emerald-500 mr-1"></i> ${item.lawSource}
        </span>
      </div>

      <!-- Savollarni ochish tugmasi -->
      <div>
        <button onclick="toggleCaseQuestions('case_detail_${idx}')" class="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-between transition">
          <span class="flex items-center">
            <i class="fa-solid fa-list-ol mr-1.5 text-amber-600"></i> Savollar va qonuniy tahlilni ko'rish (33, 34, 35)
          </span>
          <i class="fa-solid fa-chevron-down text-[10px]" id="icon_case_detail_${idx}"></i>
        </button>

        <div id="case_detail_${idx}" class="hidden mt-3 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          ${renderSingleCaseQuestion(33, item.q33)}
          ${renderSingleCaseQuestion(34, item.q34)}
          ${renderSingleCaseQuestion(35, item.q35)}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderSingleCaseQuestion(qNum, qObj) {
  if (!qObj) return '';
  const optsHtml = qObj.options.map(opt => `
    <div class="p-2 rounded-lg text-xs font-medium ${opt.key === qObj.correct ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'} flex items-start space-x-2">
      <span class="w-5 h-5 rounded-full ${opt.key === qObj.correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-[10px] font-bold shrink-0">
        ${opt.key}
      </span>
      <span>${opt.text}</span>
      ${opt.key === qObj.correct ? '<span class="ml-auto text-[10px] text-emerald-600 font-extrabold">✓ To\'g\'ri javob</span>' : ''}
    </div>
  `).join('');

  return `
    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
      <div class="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
        <span>${qNum}-savol (1.5 ball)</span>
      </div>
      <p class="text-xs text-slate-700 dark:text-slate-200 leading-snug">${qObj.text}</p>
      <div class="space-y-1.5 pt-1">
        ${optsHtml}
      </div>
      <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 mt-2">
        <strong><i class="fa-solid fa-gavel mr-1"></i> Qonuniy tahlil:</strong> ${qObj.explanation}
      </div>
    </div>
  `;
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
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMistakesFromResults(resultsDetailed) {
  const existing = getStoredMistakes();
  const existingTexts = new Set(existing.map(m => m.text));

  let addedCount = 0;
  resultsDetailed.forEach(r => {
    if (!r.isCorrect && !existingTexts.has(r.questionText)) {
      existing.unshift({
        num: r.num,
        type: r.type,
        section: r.section,
        text: r.questionText,
        options: r.options || [],
        correct: r.correctAnswer,
        acceptableAnswers: r.acceptableAnswers || [],
        explanation: r.explanation,
        bookSource: r.bookSource,
        lawSource: r.lawSource,
        userAnswer: r.userAnswer || "Javob berilmagan",
        addedAt: new Date().toLocaleDateString('uz-UZ')
      });
      existingTexts.add(r.questionText);
      addedCount++;
    }
  });

  localStorage.setItem("huquq_my_mistakes", JSON.stringify(existing));
  updateMistakesCount();
  if (addedCount > 0) {
    console.log(`Xatolar bankiga ${addedCount} ta savol qo'shildi.`);
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
        <span><i class="fa-solid fa-book mr-1"></i> ${m.bookSource}</span>
        <button onclick="removeMistake(${idx})" class="text-emerald-600 font-bold hover:underline">
          <i class="fa-solid fa-check mr-0.5"></i> Yod oldim
        </button>
      </div>
    `;

    container.appendChild(card);
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

/* ==================== TO'LOV CHEKINI YUBORISH ==================== */

async function submitPaymentReceipt() {
  const input = document.getElementById("receiptTxInput");
  const statusEl = document.getElementById("receiptSubmitStatus");
  const val = (input?.value || "").trim();

  if (!val) {
    alert("Iltimos, Click/Payme tranzaksiya raqamini yoki Telegram @username profilingizni kiriting!");
    return;
  }

  statusEl.classList.remove("hidden");
  statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Chek yuborilmoqda...';

  try {
    const res = await fetch("/api/payments/submit-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: val,
        userContact: val,
        userName: state.currentUser?.name || state.user?.name || "O'quvchi",
        userPhone: state.currentUser?.phone || "",
        tariffId: state.selectedTariff || "tariff_vip",
        amount: state.selectedTariff === "tariff_standard" ? "49 000 UZS" : "89 000 UZS"
      })
    });

    const data = await res.json();
    if (data.success) {
      statusEl.className = "text-[11px] font-bold text-emerald-600 block";
      statusEl.innerHTML = `✓ ${data.message} (Raqam: ${data.receiptId})`;
      input.value = "";
      showToast("To'lov ma'lumoti muvaffaqiyatli qabul qilindi! 💎");
    } else {
      statusEl.className = "text-[11px] font-bold text-rose-500 block";
      statusEl.innerText = data.error || "Xatolik yuz berdi.";
    }
  } catch (err) {
    statusEl.className = "text-[11px] font-bold text-rose-500 block";
    statusEl.innerText = "Yuborishda xatolik: " + err.message;
  }
}

/* ==================== 🔥 HUQUQIY OCTAGON (1v1 DUEL JANGI) ==================== */

const octagonState = {
  playerHp: 100,
  opponentHp: 100,
  currentRound: 0,
  totalRounds: 5,
  timeLeft: 15,
  timerInterval: null,
  activeQuestion: null,
  isRoundLocked: false,
  opponentName: "Advokat Aliyev",
  opponentsList: [
    "Advokat Aliyev (Toshkent)",
    "Prokuror Boboyev (Samarqand)",
    "Sudya Karimova (Farg'ona)",
    "BMBA Chempioni (Namangan)",
    "Yurist Qodirov (Buxoro)",
    "Ekspert Saidov (Andijon)"
  ],
  battleQuestions: []
};

function openOctagonLobby() {
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

function startOctagonBattle() {
  // Yangi jangni sozlash
  octagonState.playerHp = 100;
  octagonState.opponentHp = 100;
  octagonState.currentRound = 0;
  octagonState.isRoundLocked = false;
  if (octagonState.timerInterval) clearInterval(octagonState.timerInterval);

  // Tasodifiy raqib
  const randOpp = octagonState.opponentsList[Math.floor(Math.random() * octagonState.opponentsList.length)];
  octagonState.opponentName = randOpp;

  // UI nomlarini o'rnatish
  const pName = document.getElementById("octPlayerName");
  if (pName) pName.innerText = state.user?.name || "Siz";
  const oName = document.getElementById("octOpponentName");
  if (oName) oName.innerText = randOpp;

  // Modallarni yashirish va HUD ni yangilash
  const resModal = document.getElementById("octResultModal");
  if (resModal) resModal.classList.add("hidden");
  const qCard = document.getElementById("octQuestionCard");
  if (qCard) qCard.classList.remove("hidden");

  updateOctagonHpBars();

  // EXAM_DATA dan 5 ta savol saralab olish
  const pool = (EXAM_DATA && EXAM_DATA.questions && EXAM_DATA.questions.length > 0)
    ? EXAM_DATA.questions.filter(q => q.options && q.options.length >= 2)
    : [];

  // Agar mavjud bo'lmasa, namunaviy tezkor savollar
  if (pool.length >= 5) {
    octagonState.battleQuestions = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
  } else {
    octagonState.battleQuestions = [
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
      }
    ];
  }

  showToast(`🥊 Jang boshlandi! Raqib: ${randOpp}`);
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
  if (roundIdx >= octagonState.totalRounds || octagonState.playerHp <= 0 || octagonState.opponentHp <= 0) {
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
  const isCorrect = (selectedKey === q.correct);
  const impact = document.getElementById("octCombatImpact");

  // Variantlarni ranglash
  const container = document.getElementById("octOptionsContainer");
  if (container) {
    const buttons = container.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.innerText.includes(q.correct)) {
        btn.classList.add("bg-emerald-100", "dark:bg-emerald-950", "border-emerald-500", "text-emerald-800", "dark:text-emerald-200");
      }
    });
  }

  if (isCorrect) {
    // Foydalanuvchi to'g'ri topdi -> Raqibga zarba!
    octagonState.opponentHp -= 25;
    updateOctagonHpBars();

    if (impact) {
      impact.classList.remove("hidden");
      impact.className = "text-center text-xs font-black py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse";
      impact.innerHTML = `💥 ANIQ VA KUCHLI ZARBA! Raqib -25 HP yo'qotdi!`;
    }
    showToast("To'g'ri javob! Raqib jarohatlandi! 🥊");
  } else {
    // Foydalanuvchi xato qildi -> Foydalanuvchiga zarba!
    octagonState.playerHp -= 25;
    updateOctagonHpBars();

    if (clickedBtn) {
      clickedBtn.classList.add("bg-rose-100", "dark:bg-rose-950", "border-rose-500", "text-rose-800", "dark:text-rose-200");
    }

    if (impact) {
      impact.classList.remove("hidden");
      impact.className = "text-center text-xs font-black py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse";
      impact.innerHTML = `🥊 RAQIB SIZGA QARSHI ZARBA BERDI! -25 HP!`;
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

  octagonState.playerHp -= 25;
  updateOctagonHpBars();

  const impact = document.getElementById("octCombatImpact");
  if (impact) {
    impact.classList.remove("hidden");
    impact.className = "text-center text-xs font-black py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40";
    impact.innerHTML = `⏰ VAQT TUGADI! Raqib sizga hujum qildi (-25 HP)!`;
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
  const isKnockout = (octagonState.opponentHp <= 0 || octagonState.playerHp <= 0);

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
      descEl.innerText = `Siz ${octagonState.opponentName} ustidan qonuniy dalillar bilan to'liq ustun keldingiz! Octagon kamari sizga nasib etdi!`;
    }
    showToast("TABRIKLAYMIZ! OCTAGON G'OLIBI BO'LDINGIZ! 🥊🏆");
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
      descEl.innerText = `Bu safar ${octagonState.opponentName} tajribasi ustun keldi. Flashcards va qonunlarni takrorlab qayta jangga chiqing!`;
    }
    showToast("Jang yakunlandi. Qayta urinib ko'ring! 💪");
  }
}

// ==================== 11. FOYDALI KANALLAR VA MAJBURIY A'ZOLIK (@Huquq_study) ====================

let allChannelsCache = [];
let currentChannelCategory = 'all';

function isUserSubscribedToChannel() {
  return localStorage.getItem('huquq_study_subscribed') === 'true';
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
      badge.innerText = "✅ A'zolik Faol";
    }
    if (statusText) statusText.innerText = "@Huquq_study a'zoligingiz tasdiqlangan";
    if (statusBtn) {
      statusBtn.className = "px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px] shadow-xs";
      statusBtn.innerText = "Tasdiqlangan";
    }
    if (detailBadge) detailBadge.classList.remove("hidden");
  } else {
    if (badge) {
      badge.className = "text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold";
      badge.innerText = "Majburiy A'zolik";
    }
    if (statusText) statusText.innerText = "To'liq imkoniyatlar uchun kanalga a'zo bo'ling";
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

function markChannelOpened() {
  localStorage.setItem('huquq_study_visited', 'true');
  showToast("Kanal ochilmoqda. Qaytganingizda 'Tasdiqlash' tugmasini bosing!");
}

async function verifyChannelSubscription(showAlert = true) {
  try {
    let userId = state.user.id || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || null;
    
    // Server orqali a'zolikni tekshirish
    const res = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, channel: '@Huquq_study' })
    });
    const data = await res.json();

    if (data.subscribed || localStorage.getItem('huquq_study_visited') === 'true' || !userId) {
      localStorage.setItem('huquq_study_subscribed', 'true');
      updateHomeSubscriptionUI();
      closeSubscriptionModal();
      if (showAlert) {
        showToast("🎉 @Huquq_study kanaliga a'zoligingiz tasdiqlandi!");
      }
      return true;
    } else {
      if (showAlert) {
        showToast("⚠️ Iltimos, avval @Huquq_study kanaliga a'zo bo'ling!");
      }
      return false;
    }
  } catch (err) {
    localStorage.setItem('huquq_study_subscribed', 'true');
    updateHomeSubscriptionUI();
    closeSubscriptionModal();
    if (showAlert) {
      showToast("✅ A'zoligingiz muvaffaqiyatli tasdiqlandi!");
    }
    return true;
  }
}

/* ==================== 11. AI USTOZ (CHAT & HUQUQIY REPETITOR) ==================== */

let aiTutorHistory = [];

function openAiTutorView() {
  switchView("viewAiTutor");
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
          <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="space-y-1.5 max-w-[85%]">
            <div class="p-3.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs leading-relaxed">
              <p class="font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center">
                <i class="fa-solid fa-sparkles mr-1.5"></i> Assalomu alaykum!
              </p>
              Men sizning BMBA Huquqshunoslik Milliy Sertifikati bo'yicha shaxsiy <strong>AI Ustozingizman</strong>.
              <br><br>
              Spesifikatsiyadagi <strong>40 ta qonun</strong>, 8, 9, 10, 11-sinf darsliklari, vaziyatli keyslar va qonun moddalari bo'yicha istalgan savolingizni bering. Men sizga darhol asosli qonuniy javob beraman!
            </div>
            <span class="text-[9px] text-slate-400 pl-1">AI Ustoz · Yangi suhbat</span>
          </div>
        </div>
      `;
    }
    showToast("Suhbat tarixi tozalandi.");
  }
}

function askAiQuick(questionText) {
  const input = document.getElementById("aiTutorInput");
  if (input) {
    input.value = questionText;
  }
  handleAiTutorSubmit(new Event("submit"));
}

async function handleAiTutorSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById("aiTutorInput");
  const sendBtn = document.getElementById("btnAiSend");
  const container = document.getElementById("aiTutorMessages");

  if (!input || !container) return;
  const question = input.value.trim();
  if (!question) return;

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
    <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="space-y-1.5 max-w-[85%]">
      <div class="p-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-500 text-xs flex items-center space-x-2">
        <i class="fa-solid fa-spinner fa-spin text-indigo-500"></i>
        <span>AI Ustoz qonun moddalarini tahlil qilmoqda...</span>
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
    const replySource = data.source || "AI Ustoz";
    const replyTime = data.timestamp || nowTime;

    // Tarixga qo'shish
    aiTutorHistory.push({ role: "user", text: question });
    aiTutorHistory.push({ role: "model", text: replyText });

    // AI Ustoz javob xabari
    const aiBubble = document.createElement("div");
    aiBubble.className = "flex items-start space-x-2.5 animate-fade-in";
    
    // Markdown-ga o'xshash qatorlarni chiroyli HTML-ga o'girish
    const formattedReply = replyText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n•/g, '<br>•')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    aiBubble.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="space-y-1.5 max-w-[88%]">
        <div class="p-3.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs leading-relaxed shadow-xs">
          ${formattedReply}
        </div>
        <div class="flex items-center space-x-2 text-[9px] text-slate-400 pl-1">
          <span>${replySource} · ${replyTime}</span>
          <button onclick="copyAiAnswer(this)" class="hover:text-indigo-500 font-semibold flex items-center ml-2">
            <i class="fa-regular fa-copy mr-0.5"></i> Nusxa
          </button>
        </div>
      </div>
    `;
    container.appendChild(aiBubble);
    container.scrollTop = container.scrollHeight;

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
