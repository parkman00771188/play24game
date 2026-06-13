const toast = document.querySelector(".toast");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1900);
}

document.querySelector(".js-ranking-help")?.addEventListener("click", () => {
  showToast("포인트, 승률, 연승 기록을 기준으로 순위가 계산됩니다.");
});

document.querySelector(".js-my-rank")?.addEventListener("click", () => {
  showToast("도전 방으로 이동합니다.");
  window.setTimeout(() => {
    window.location.href = "./game.html";
  }, 260);
});
