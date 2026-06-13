const toast = document.querySelector(".toast");
const settingsDialog = document.querySelector("#settingsDialog");
const profileDialog = document.querySelector("#profileDialog");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2100);
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

document.querySelector(".js-settings")?.addEventListener("click", () => {
  openDialog(settingsDialog);
});

document.querySelector(".js-close-settings")?.addEventListener("click", () => {
  closeDialog(settingsDialog);
});

document.querySelector(".js-tutorial")?.addEventListener("click", () => {
  showToast("튜토리얼 화면을 준비 중입니다.");
});

document.querySelectorAll(".js-profile").forEach((button) => {
  button.addEventListener("click", () => openDialog(profileDialog));
});

document.querySelector(".js-close-profile")?.addEventListener("click", () => {
  closeDialog(profileDialog);
});

document.querySelectorAll(".game-dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });
});

document.querySelectorAll(".join-button").forEach((button, index) => {
  button.addEventListener("click", () => {
    const roomNames = ["초보 환영 방", "24의 달인 방", "두뇌 풀가동 방"];
    button.textContent = "입장중";
    button.disabled = true;
    showToast(`${roomNames[index]}에 입장합니다.`);
    window.setTimeout(() => {
      button.textContent = "입장";
      button.disabled = false;
    }, 1400);
  });
});

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
    const label = item.querySelector("span")?.textContent || "메뉴";
    showToast(`${label} 메뉴를 선택했습니다.`);
  });
});
