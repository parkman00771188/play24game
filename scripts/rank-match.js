const toast = document.querySelector(".toast");
const guideDialog = document.querySelector("#rankMatchGuideDialog");
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

document.querySelector(".js-rank-match-help")?.addEventListener("click", () => {
  openDialog(guideDialog);
});

document.querySelector(".js-close-rank-guide")?.addEventListener("click", () => {
  closeDialog(guideDialog);
});

guideDialog?.addEventListener("click", (event) => {
  if (event.target === guideDialog) {
    closeDialog(guideDialog);
  }
});

document.querySelector(".js-rank-info")?.addEventListener("click", () => {
  showToast("내 랭킹 정보를 준비 중입니다.");
});

document.querySelector(".js-rank-reward")?.addEventListener("click", () => {
  showToast("시즌 보상을 준비 중입니다.");
});

document.querySelector(".js-rank-season")?.addEventListener("click", () => {
  showToast("시즌 종료까지 12일 남았습니다.");
});
