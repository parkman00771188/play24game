const toast = document.querySelector(".toast");
const historyText = document.querySelector(".js-history");
const timeText = document.querySelector(".js-time");
const timeTrack = document.querySelector(".js-time-track");
const numberBoard = document.querySelector(".js-number-board");
const calculateButton = document.querySelector(".js-calculate");

const puzzles = [
  [7, 4, 6, 2],
  [8, 8, 3, 5],
  [9, 6, 4, 1],
  [10, 2, 8, 4],
  [5, 5, 5, 1],
  [12, 3, 7, 2],
];

let selectedOperator = "+";
let selectedCardIds = [];
let cards = [];
let puzzleIndex = 0;
let cardId = 0;
let toastTimer;
let feedbackTimer;
let remaining = 6;
let isResolving = false;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1900);
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);

  const rounded = Math.round(value * 100) / 100;
  const text = String(rounded);
  const hasLongDecimal = Math.abs(value - rounded) > 0.000001;
  return `${text.replace(/\.?0+$/, "")}${hasLongDecimal ? ".." : ""}`;
}

function selectedCards() {
  return selectedCardIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
}

function updateHistory() {
  if (!historyText) return;

  const picked = selectedCards();
  if (picked.length === 0) {
    historyText.textContent = "카드 2장과 연산자를 선택하세요";
    return;
  }

  if (picked.length === 1) {
    historyText.textContent = `${formatNumber(picked[0].value)} 선택됨 · 한 장 더 고르세요`;
    return;
  }

  const [left, right] = picked;
  historyText.textContent = `${formatNumber(left.value)} ${selectedOperator} ${formatNumber(right.value)} → 연산하기`;
}

function setCalculateState() {
  if (!calculateButton) return;
  calculateButton.disabled = selectedCardIds.length !== 2 || isResolving;
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

function startPuzzle(index = puzzleIndex) {
  puzzleIndex = index % puzzles.length;
  cards = puzzles[puzzleIndex].map((value) => ({ id: ++cardId, value }));
  selectedCardIds = [];
  isResolving = false;
  numberBoard?.classList.remove("correct", "wrong");
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
  numberBoard.classList.remove("correct", "wrong");
  requestAnimationFrame(() => numberBoard.classList.add(type));
  showToast(message);

  feedbackTimer = window.setTimeout(() => {
    numberBoard.classList.remove(type);
    startPuzzle(puzzleIndex + 1);
  }, 980);
}

function applyCalculation() {
  if (isResolving) return;
  const picked = selectedCards();

  if (picked.length !== 2) {
    showToast("카드 2장을 선택한 다음 연산하기를 눌러주세요.");
    return;
  }

  const [left, right] = picked;
  const result = calculate(left.value, right.value, selectedOperator);

  if (result === null || !Number.isFinite(result)) {
    showToast("0으로는 나눌 수 없어요.");
    return;
  }

  const expression = `${formatNumber(left.value)} ${selectedOperator} ${formatNumber(right.value)} = ${formatNumber(result)}`;

  if (cards.length === 2) {
    isResolving = true;
    selectedCardIds = [];
    cards = [{ id: ++cardId, value: result }];
    renderCards({ resultId: cardId });

    const isCorrect = Math.abs(result - 24) < 0.000001;
    historyText.textContent = isCorrect ? `${expression} · 정답!` : `${expression} · 24가 아니에요`;
    showRoundFeedback(isCorrect ? "correct" : "wrong", isCorrect ? "정답입니다! 다음 문제로 넘어가요." : "아쉽지만 틀렸어요. 새 문제를 드릴게요.");
    return;
  }

  const resultCard = { id: ++cardId, value: result };
  cards = cards.filter((card) => !selectedCardIds.includes(card.id));
  cards.push(resultCard);
  selectedCardIds = [];
  historyText.textContent = `${expression} · 남은 카드 ${cards.length}장`;
  renderCards({ resultId: resultCard.id });
}

document.querySelectorAll(".js-operator").forEach((button) => {
  button.addEventListener("click", () => {
    if (isResolving) return;
    document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedOperator = button.dataset.operator || button.textContent.trim();
    updateHistory();
  });
});

calculateButton?.addEventListener("click", applyCalculation);

document.querySelector(".js-hand")?.addEventListener("click", (event) => {
  event.currentTarget.classList.add("raised");
  showToast("다음 도전권 대기열에 등록되었습니다.");
});

document.querySelector(".js-fit")?.addEventListener("click", () => {
  showToast("게임 화면을 현재 기기에 맞췄습니다.");
});

window.setInterval(() => {
  remaining = remaining > 0 ? remaining - 1 : 6;
  if (timeText) {
    timeText.textContent = `00:0${remaining}`;
  }
  if (timeTrack) {
    timeTrack.style.width = `${Math.max(10, (remaining / 6) * 72)}%`;
  }
}, 1000);

startPuzzle();
