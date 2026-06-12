const toast = document.querySelector(".toast");
const roomCards = [...document.querySelectorAll(".lobby-room-card")];
const searchInput = document.querySelector(".js-room-search");
let activeTab = "전체";
let activeTime = "전체";
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

function applyRoomFilters() {
  const query = (searchInput?.value || "").trim().toLowerCase();

  roomCards.forEach((card) => {
    const title = (card.dataset.title || "").toLowerCase();
    const tag = card.dataset.tag || "";
    const time = card.dataset.time || "";
    const id = card.querySelector(".lobby-room-info p")?.textContent.toLowerCase() || "";
    const matchesTab = activeTab === "전체" || tag.includes(activeTab);
    const matchesTime = activeTime === "전체" || time === activeTime;
    const matchesQuery = !query || title.includes(query) || id.includes(query);

    card.classList.toggle("hidden", !(matchesTab && matchesTime && matchesQuery));
  });
}

document.querySelectorAll(".js-room-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".js-room-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeTab = button.textContent.trim();
    applyRoomFilters();
  });
});

document.querySelectorAll(".js-time-filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".js-time-filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeTime = button.textContent.trim();
    applyRoomFilters();
  });
});

searchInput?.addEventListener("input", applyRoomFilters);

document.querySelector(".js-filter")?.addEventListener("click", () => {
  showToast("조건에 맞는 방만 보여드릴게요.");
});

document.querySelector(".js-create-room")?.addEventListener("click", () => {
  showToast("나만의 방 만들기 화면을 준비 중입니다.");
});
