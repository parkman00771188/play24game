const toast = document.querySelector(".toast");
const gradeGuideDialog = document.querySelector("#gradeGuideDialog");
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
  openDialog(gradeGuideDialog);
});

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

document.querySelector(".js-close-grade-guide")?.addEventListener("click", () => {
  closeDialog(gradeGuideDialog);
});

gradeGuideDialog?.addEventListener("click", (event) => {
  if (event.target === gradeGuideDialog) {
    closeDialog(gradeGuideDialog);
  }
});

document.querySelector(".js-my-rank")?.addEventListener("click", () => {
  showToast("도전 방으로 이동합니다.");
  window.setTimeout(() => {
    window.location.href = "./game.html";
  }, 260);
});
