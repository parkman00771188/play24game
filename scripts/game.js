const toast = document.querySelector(".toast");
const historyText = document.querySelector(".js-history");
const timeText = document.querySelector(".js-time");
const timeTrack = document.querySelector(".js-time-track");
const numberBoard = document.querySelector(".js-number-board");
const calculateButton = document.querySelector(".js-calculate");
const targetText = document.querySelector(".js-target-value");
const settingsDialog = document.querySelector("#gameSettingsDialog");
const targetInput = document.querySelector(".js-target-input");
const cardCountButtons = document.querySelectorAll(".js-card-count");
const timerChoiceButtons = document.querySelectorAll(".js-timer-choice");
const chatDock = document.querySelector(".js-chat-dock");
const chatToggle = document.querySelector(".js-chat-toggle");
const chatPanel = document.querySelector(".js-chat-panel");
const chatClose = document.querySelector(".js-chat-close");
const chatScrim = document.querySelector(".js-chat-scrim");
const chatForm = document.querySelector(".js-chat-form");
const chatInput = document.querySelector(".js-chat-input");
const chatMessages = document.querySelector(".js-chat-messages");
const chatPhraseButtons = document.querySelectorAll(".js-chat-phrase");
const mascotSpeech = document.querySelector(".js-mascot-speech");

const defaultSettings = Object.freeze({
  cardCount: 4,
  target: 24,
  timer: 10,
});

const timerOptions = [10, 15, 20];
const targetRange = Object.freeze({
  min: 1,
  max: 999,
});
const randomCardRange = Object.freeze({
  min: 1,
  max: 9,
  maxDuplicate: 2,
});

let settings = loadSettings();
let draftSettings = { ...settings };
let selectedOperator = null;
let selectedCardIds = [];
let cards = [];
let lastPuzzleSignature = "";
let cardId = 0;
let toastTimer;
let feedbackTimer;
let mascotSpeechTimer;
let remaining = settings.timer;
let isResolving = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInteger(min, max) {
  const range = max - min + 1;

  if (window.crypto?.getRandomValues) {
    const bucket = Math.floor(0xffffffff / range) * range;
    const buffer = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(buffer);
    } while (buffer[0] >= bucket);

    return min + (buffer[0] % range);
  }

  return Math.floor(Math.random() * range) + min;
}

function cardSignature(values) {
  return [...values].sort((left, right) => left - right).join(",");
}

function normalizeTarget(value) {
  return clamp(Math.round(Number(value) || defaultSettings.target), targetRange.min, targetRange.max);
}

function createRandomCardValues(count) {
  const values = [];
  const counts = new Map();

  while (values.length < count) {
    const value = randomInteger(randomCardRange.min, randomCardRange.max);
    const used = counts.get(value) || 0;

    if (used >= randomCardRange.maxDuplicate) {
      continue;
    }

    counts.set(value, used + 1);
    values.push(value);
  }

  return values;
}

function randomCardValues(count) {
  let values = createRandomCardValues(count);
  let signature = cardSignature(values);
  let attempts = 0;

  while (signature === lastPuzzleSignature && attempts < 50) {
    values = createRandomCardValues(count);
    signature = cardSignature(values);
    attempts += 1;
  }

  lastPuzzleSignature = signature;
  return values;
}

function normalizeSettings(value = {}) {
  const cardCount = [4, 5, 6].includes(Number(value.cardCount)) ? Number(value.cardCount) : defaultSettings.cardCount;
  const target = normalizeTarget(value.target);
  const timerValue = Math.round(Number(value.timer) || defaultSettings.timer);
  const timer = timerOptions.includes(timerValue) ? timerValue : defaultSettings.timer;
  return { cardCount, target, timer };
}

function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(window.localStorage.getItem("play24gameSettings") || "{}"));
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  try {
    window.localStorage.setItem("play24gameSettings", JSON.stringify(settings));
  } catch {
    // Storage can be blocked in private browsing; the game still works for this session.
  }
}

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1900);
}

function setGameStatus(message) {
  if (historyText) {
    historyText.textContent = message;
  }
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);

  const rounded = Math.round(value * 100) / 100;
  const cleanRounded = Math.abs(rounded) < 0.000001 ? 0 : rounded;
  const hasLongDecimal = Math.abs(value - rounded) > 0.000001;
  return `${Number(cleanRounded.toFixed(2))}${hasLongDecimal ? ".." : ""}`;
}

function formatTime(seconds) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  if (timeText) {
    timeText.textContent = formatTime(remaining);
  }
  if (timeTrack) {
    const percent = settings.timer > 0 ? (remaining / settings.timer) * 100 : 0;
    timeTrack.style.width = `${clamp(percent, 8, 100)}%`;
  }
}

function resetTimer() {
  remaining = settings.timer;
  updateTimerDisplay();
}

function updateSettingsControls() {
  if (targetText) {
    targetText.textContent = settings.target;
  }
  if (targetInput) {
    targetInput.value = draftSettings.target;
  }
  cardCountButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.count) === draftSettings.cardCount);
  });

  timerChoiceButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.timer) === draftSettings.timer);
  });
}

function selectedCards() {
  return selectedCardIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
}

function updateHistory() {
  const picked = selectedCards();
  if (picked.length === 0) {
    setGameStatus("카드 2장과 연산자를 선택하세요");
    return;
  }

  if (picked.length === 1) {
    setGameStatus(`${formatNumber(picked[0].value)} 선택됨 · 한 장 더 고르세요`);
    return;
  }

  const [left, right] = picked;
  if (!selectedOperator) {
    setGameStatus(`${formatNumber(left.value)}, ${formatNumber(right.value)} 선택됨 · 연산자를 고르세요`);
    return;
  }

  setGameStatus(`${formatNumber(left.value)} ${selectedOperator} ${formatNumber(right.value)} → 연산하기`);
}

function setCalculateState() {
  if (!calculateButton) return;
  calculateButton.disabled = selectedCardIds.length !== 2 || !selectedOperator || isResolving;
}

function renderCards({ resultId } = {}) {
  if (!numberBoard) return;

  numberBoard.className = `number-board js-number-board card-count-${cards.length}`;
  numberBoard.innerHTML = cards
    .map((card) => {
      const label = formatNumber(card.value);
      const selected = selectedCardIds.includes(card.id) ? " selected" : "";
      const result = card.id === resultId ? " result-pop" : "";
      const longValue = label.length > 4 ? " long-value" : "";
      return `<button class="number-card js-number-card${selected}${result}${longValue}" type="button" data-id="${card.id}" aria-label="숫자 ${label}">${label}</button>`;
    })
    .join("");

  numberBoard.querySelectorAll(".js-number-card").forEach((button) => {
    button.addEventListener("click", () => toggleCard(Number(button.dataset.id)));
  });

  updateHistory();
  setCalculateState();
}

function startPuzzle() {
  cards = randomCardValues(settings.cardCount).map((value) => ({ id: ++cardId, value }));
  selectedCardIds = [];
  selectedOperator = null;
  isResolving = false;
  document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
  numberBoard?.classList.remove("correct", "wrong");
  resetTimer();
  updateSettingsControls();
  renderCards();
}

function toggleCard(id) {
  if (isResolving) return;

  if (selectedCardIds.includes(id)) {
    selectedCardIds = selectedCardIds.filter((item) => item !== id);
    renderCards();
    return;
  }

  if (selectedCardIds.length >= 2) {
    showToast("카드는 두 장만 선택할 수 있어요.");
    return;
  }

  selectedCardIds = [...selectedCardIds, id];
  renderCards();
}

function calculate(left, right, operator) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "×") return left * right;
  if (operator === "÷") {
    if (right === 0) return null;
    return left / right;
  }
  return null;
}

function showRoundFeedback(type, message) {
  if (!numberBoard) return;

  window.clearTimeout(feedbackTimer);
  window.play24PlaySound?.(type === "correct" ? "success" : "wrong");
  numberBoard.classList.remove("correct", "wrong");
  requestAnimationFrame(() => numberBoard.classList.add(type));
  showToast(message);

  feedbackTimer = window.setTimeout(() => {
    numberBoard.classList.remove(type);
    startPuzzle();
  }, 980);
}

function finishRound(result, expression) {
  isResolving = true;
  selectedCardIds = [];
  selectedOperator = null;
  document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
  cards = [{ id: ++cardId, value: result }];
  renderCards({ resultId: cardId });

  const isCorrect = Math.abs(result - settings.target) < 0.000001;
  setGameStatus(isCorrect ? `${expression} · 목표 ${settings.target} 달성!` : `${expression} · 목표 ${settings.target}가 아니에요`);
  showRoundFeedback(
    isCorrect ? "correct" : "wrong",
    isCorrect ? "정답입니다! 다음 문제로 넘어가요." : "아쉽지만 틀렸어요. 새 문제를 드릴게요."
  );
}

function applyCalculation() {
  if (isResolving) return;
  const picked = selectedCards();

  if (picked.length !== 2) {
    showToast("카드 2장을 선택한 다음 연산하기를 눌러주세요.");
    return;
  }

  if (!selectedOperator) {
    showToast("연산자를 선택해주세요.");
    return;
  }

  const [left, right] = picked;
  const result = calculate(left.value, right.value, selectedOperator);

  if (result === null || !Number.isFinite(result)) {
    selectedOperator = null;
    document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
    updateHistory();
    setCalculateState();
    showToast("0으로는 나눌 수 없어요.");
    return;
  }

  const expression = `${formatNumber(left.value)} ${selectedOperator} ${formatNumber(right.value)} = ${formatNumber(result)}`;

  if (cards.length === 2) {
    finishRound(result, expression);
    return;
  }

  const resultCard = { id: ++cardId, value: result };
  cards = cards.filter((card) => !selectedCardIds.includes(card.id));
  cards.push(resultCard);
  selectedCardIds = [];
  selectedOperator = null;
  document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
  setGameStatus(`${expression} · 남은 카드 ${cards.length}장`);
  renderCards({ resultId: resultCard.id });
}

function handleTimeout() {
  if (isResolving) return;
  isResolving = true;
  selectedCardIds = [];
  setCalculateState();
  setGameStatus("시간 종료 · 새 문제로 넘어갑니다");
  showRoundFeedback("wrong", "시간이 끝났어요. 새 문제로 넘어가요.");
}

function setChatOpen(open) {
  if (!chatDock || !chatToggle || !chatPanel || !chatScrim) return;
  chatDock.classList.toggle("open", open);
  chatToggle.setAttribute("aria-expanded", String(open));
  chatPanel.setAttribute("aria-hidden", String(!open));
  chatScrim.hidden = !open;
  document.body.classList.toggle("chat-open", open);

  if (open) {
    window.setTimeout(() => chatPhraseButtons[0]?.focus(), 180);
    chatMessages?.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }
}

function showMascotSpeech(message) {
  if (!mascotSpeech) return;
  window.clearTimeout(mascotSpeechTimer);
  mascotSpeech.textContent = message;
  mascotSpeech.hidden = false;
  mascotSpeech.classList.remove("show");
  requestAnimationFrame(() => mascotSpeech.classList.add("show"));
  mascotSpeechTimer = window.setTimeout(() => {
    mascotSpeech.classList.remove("show");
    window.setTimeout(() => {
      mascotSpeech.hidden = true;
    }, 180);
  }, 3000);
}

document.querySelectorAll(".js-operator").forEach((button) => {
  button.addEventListener("click", () => {
    if (isResolving) return;
    document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedOperator = button.dataset.operator || button.textContent.trim();
    updateHistory();
    setCalculateState();
  });
});

calculateButton?.addEventListener("click", applyCalculation);

document.querySelector(".js-hand")?.addEventListener("click", (event) => {
  window.play24PlaySound?.("hand");
  event.currentTarget.classList.add("raised");
  showToast("다음 도전권 대기열에 등록되었습니다.");
});

chatToggle?.addEventListener("click", () => {
  setChatOpen(!chatDock?.classList.contains("open"));
});

chatClose?.addEventListener("click", () => {
  setChatOpen(false);
});

chatScrim?.addEventListener("click", () => {
  setChatOpen(false);
});

chatPhraseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showMascotSpeech(button.textContent.trim());
    setChatOpen(false);
    showToast("추천 문구를 보냈습니다.");
  });
});

if (window.location.hash === "#chat") {
  window.setTimeout(() => setChatOpen(true), 250);
}

document.querySelector(".js-game-settings")?.addEventListener("click", () => {
  draftSettings = { ...settings };
  updateSettingsControls();
  openDialog(settingsDialog);
});

document.querySelector(".js-close-game-settings")?.addEventListener("click", () => {
  closeDialog(settingsDialog);
});

settingsDialog?.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    closeDialog(settingsDialog);
  }
});

cardCountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    draftSettings.cardCount = Number(button.dataset.count);
    updateSettingsControls();
  });
});

targetInput?.addEventListener("input", () => {
  draftSettings.target = normalizeTarget(targetInput.value);
  if (Number(targetInput.value) > targetRange.max) {
    targetInput.value = draftSettings.target;
  }
});

document.querySelector(".js-target-minus")?.addEventListener("click", () => {
  draftSettings.target = clamp(draftSettings.target - 1, targetRange.min, targetRange.max);
  updateSettingsControls();
});

document.querySelector(".js-target-plus")?.addEventListener("click", () => {
  draftSettings.target = clamp(draftSettings.target + 1, targetRange.min, targetRange.max);
  updateSettingsControls();
});

timerChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    draftSettings.timer = Number(button.dataset.timer) || defaultSettings.timer;
    updateSettingsControls();
  });
});

document.querySelector(".js-reset-game-settings")?.addEventListener("click", () => {
  draftSettings = { ...defaultSettings };
  updateSettingsControls();
});

document.querySelector(".js-apply-game-settings")?.addEventListener("click", () => {
  if (targetInput) {
    draftSettings.target = normalizeTarget(targetInput.value);
  }

  settings = normalizeSettings(draftSettings);
  draftSettings = { ...settings };
  saveSettings();
  updateSettingsControls();
  closeDialog(settingsDialog);
  showToast("새 설정으로 게임을 시작합니다.");
  startPuzzle();
});

window.setInterval(() => {
  if (isResolving) return;
  remaining -= 1;
  if (remaining <= 0) {
    remaining = 0;
    updateTimerDisplay();
    handleTimeout();
    return;
  }
  updateTimerDisplay();
}, 1000);

startPuzzle();
