const petToast = document.querySelector(".pet-toast");
const reaction = document.querySelector(".js-pet-reaction");
let petToastTimer;
let reactionTimer;

const reactions = {
  feed: {
    toast: "배고픔이 줄었어요!",
    bubble: "냠냠! 힘이 나요!",
    sound: "coin",
  },
  play: {
    toast: "기분이 좋아졌어요!",
    bubble: "공놀이 최고!",
    sound: "join",
  },
  clean: {
    toast: "반짝반짝 깨끗해졌어요!",
    bubble: "상쾌해요!",
    sound: "success",
  },
};

function showPetToast(message) {
  if (!petToast) return;
  window.clearTimeout(petToastTimer);
  petToast.textContent = message;
  petToast.classList.add("show");
  petToastTimer = window.setTimeout(() => {
    petToast.classList.remove("show");
  }, 1900);
}

function showReaction(message) {
  if (!reaction) return;
  window.clearTimeout(reactionTimer);
  reaction.textContent = message;
  reaction.classList.add("show");
  reactionTimer = window.setTimeout(() => {
    reaction.classList.remove("show");
  }, 1800);
}

document.querySelectorAll(".js-pet-action").forEach((button) => {
  button.addEventListener("click", () => {
    const action = reactions[button.dataset.action];
    if (!action) return;
    window.play24PlaySound?.(action.sound);
    button.classList.add("pet-action-pop");
    showPetToast(action.toast);
    showReaction(action.bubble);
    window.setTimeout(() => button.classList.remove("pet-action-pop"), 360);
  });
});

document.querySelectorAll(".js-pet-locked").forEach((button) => {
  button.addEventListener("click", () => {
    window.play24PlaySound?.("panel");
    showPetToast("곧 사용할 수 있는 메뉴입니다.");
  });
});

document.querySelectorAll(".pet-bottom-nav a[href='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPetToast(`${link.textContent.trim()} 메뉴를 준비 중입니다.`);
  });
});
