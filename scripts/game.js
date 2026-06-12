const toast = document.querySelector(".toast");
const historyText = document.querySelector(".js-history");
const timeText = document.querySelector(".js-time");
const timeTrack = document.querySelector(".js-time-track");
let selectedOperator = "+";
let selectedNumbers = [];
let toastTimer;
let remaining = 6;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1900);
}

function updateHistory() {
  if (!historyText) return;
  if (selectedNumbers.length < 2) {
    historyText.textContent =
      selectedNumbers.length === 1 ? `${selectedNumbers[0]} 선택됨 · 다음 숫자를 고르세요` : "아직 적용된 연산이 없습니다";
    return;
  }

  const [left, right] = selectedNumbers;
  historyText.textContent = `${left} ${selectedOperator} ${right} 적용 대기`;
}

document.querySelectorAll(".js-operator").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".js-operator").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedOperator = button.dataset.operator || button.textContent.trim();
    updateHistory();
  });
});

document.querySelectorAll(".js-number-card").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    const values = [...document.querySelectorAll(".js-number-card.selected")].map((item) => item.textContent.trim());
    selectedNumbers = values.slice(0, 2);

    if (values.length > 2) {
      button.classList.remove("selected");
      showToast("숫자는 두 장씩 선택할 수 있어요.");
    }

    updateHistory();
  });
});

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
