const toast = document.querySelector(".toast");
const createRoomButton = document.querySelector(".js-create-room");
const createRoomDialog = document.querySelector("#createRoomDialog");
const createRoomForm = document.querySelector(".js-create-room-form");
const roomList = document.querySelector(".lobby-room-list");
const roomNameInput = document.querySelector(".js-create-room-name");
const targetInput = document.querySelector(".js-create-target-input");
const targetIcon = document.querySelector(".js-create-preview-target-icon");
const previewTitle = document.querySelector(".js-create-preview-title");
const previewTarget = document.querySelector(".js-create-preview-target");
const previewTime = document.querySelector(".js-create-preview-time");
const previewCards = document.querySelector(".js-create-preview-cards");
const previewMax = document.querySelector(".js-create-preview-max");
const timeButtons = document.querySelectorAll(".js-create-time");
const cardCountButtons = document.querySelectorAll(".js-create-card-count");
const maxPlayerButtons = document.querySelectorAll(".js-create-max-player");
let toastTimer;
let nextRoomId = 2412;

const defaultRoomDraft = Object.freeze({
  name: "나만의 24 도전방",
  target: 24,
  time: 10,
  cardCount: 4,
  maxPlayers: 10,
});

let roomDraft = { ...defaultRoomDraft };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function roomName() {
  return roomNameInput?.value.trim() || defaultRoomDraft.name;
}

function setActive(buttons, value) {
  buttons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.value) === value);
  });
}

function syncRoomDraft() {
  roomDraft.name = roomName();
  roomDraft.target = clamp(Math.round(Number(targetInput?.value) || defaultRoomDraft.target), 1, 1000);
}

function updateCreateRoomPreview() {
  syncRoomDraft();

  if (roomNameInput && roomNameInput.value.trim() === "") {
    roomNameInput.value = "";
  }

  if (targetInput) {
    targetInput.value = roomDraft.target;
  }

  if (previewTitle) {
    previewTitle.textContent = roomDraft.name;
  }
  if (previewTarget) {
    previewTarget.textContent = roomDraft.target;
  }
  if (previewTime) {
    previewTime.textContent = `${roomDraft.time}분`;
  }
  if (previewCards) {
    previewCards.textContent = `${roomDraft.cardCount}장`;
  }
  if (previewMax) {
    previewMax.textContent = roomDraft.maxPlayers;
  }
  if (targetIcon) {
    targetIcon.classList.toggle("violet", roomDraft.target !== 24);
  }

  setActive(timeButtons, roomDraft.time);
  setActive(cardCountButtons, roomDraft.cardCount);
  setActive(maxPlayerButtons, roomDraft.maxPlayers);
}

function resetCreateRoomForm() {
  roomDraft = { ...defaultRoomDraft };
  if (roomNameInput) {
    roomNameInput.value = roomDraft.name;
  }
  if (targetInput) {
    targetInput.value = roomDraft.target;
  }
  updateCreateRoomPreview();
}

function createdRoomMarkup() {
  const safeName = escapeHTML(roomDraft.name);
  const roomId = nextRoomId++;
  const targetClass = roomDraft.target === 24 ? "" : " violet";

  return `
    <article class="lobby-room-card created-room" data-title="${safeName}" data-time="${roomDraft.time}분" data-tag="내 방">
      <div class="lobby-room-info">
        <h2><span class="crown-icon" aria-hidden="true"></span>${safeName}</h2>
        <p>#${roomId}</p>
        <div class="room-chip-row">
          <span><i class="target-mini${targetClass}" aria-hidden="true"></i>목표 <b>${roomDraft.target}</b></span>
          <span><i class="clock-chip" aria-hidden="true"></i>시간 <b>${roomDraft.time}분</b></span>
          <span><i class="card-chip" aria-hidden="true"></i>카드 <b>${roomDraft.cardCount}장</b></span>
        </div>
      </div>
      <div class="lobby-room-players">
        <strong><i class="player-dot" aria-hidden="true"></i>1/${roomDraft.maxPlayers}</strong>
        <div class="face-stack wide" aria-label="참가자 아바타">
          <span class="face face-a"></span>
          <span class="face ghost"></span>
          <span class="face ghost"></span>
          <span class="face ghost"></span>
        </div>
      </div>
      <a class="lobby-join-button" href="./game.html">입장</a>
    </article>
  `;
}

createRoomButton?.addEventListener("click", () => {
  resetCreateRoomForm();
  openDialog(createRoomDialog);
  window.setTimeout(() => roomNameInput?.focus(), 120);
});

document.querySelectorAll(".js-close-create-room").forEach((button) => {
  button.addEventListener("click", () => {
    closeDialog(createRoomDialog);
  });
});

createRoomDialog?.addEventListener("click", (event) => {
  if (event.target === createRoomDialog) {
    closeDialog(createRoomDialog);
  }
});

roomNameInput?.addEventListener("input", updateCreateRoomPreview);

targetInput?.addEventListener("input", updateCreateRoomPreview);

document.querySelector(".js-create-target-minus")?.addEventListener("click", () => {
  roomDraft.target = clamp(roomDraft.target - 1, 1, 1000);
  if (targetInput) targetInput.value = roomDraft.target;
  updateCreateRoomPreview();
});

document.querySelector(".js-create-target-plus")?.addEventListener("click", () => {
  roomDraft.target = clamp(roomDraft.target + 1, 1, 1000);
  if (targetInput) targetInput.value = roomDraft.target;
  updateCreateRoomPreview();
});

timeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    roomDraft.time = Number(button.dataset.value) || defaultRoomDraft.time;
    updateCreateRoomPreview();
  });
});

cardCountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    roomDraft.cardCount = Number(button.dataset.value) || defaultRoomDraft.cardCount;
    updateCreateRoomPreview();
  });
});

maxPlayerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    roomDraft.maxPlayers = Number(button.dataset.value) || defaultRoomDraft.maxPlayers;
    updateCreateRoomPreview();
  });
});

createRoomForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  updateCreateRoomPreview();

  if (!roomList) return;
  roomList.insertAdjacentHTML("afterbegin", createdRoomMarkup());
  closeDialog(createRoomDialog);
  showToast("새 방을 만들었어요. 바로 입장할 수 있어요.");
});
