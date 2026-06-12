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

document.querySelector(".js-create-room")?.addEventListener("click", () => {
  showToast("나만의 방 만들기 화면을 준비 중입니다.");
});
