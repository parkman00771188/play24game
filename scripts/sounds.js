(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let audioContext;
  let masterGain;
  let lastSoundAt = 0;
  let ignorePointerUntil = 0;
  let unlocked = false;

  function ensureAudio() {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.18;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      const resumePromise = audioContext.resume();
      resumePromise?.catch?.(() => {});
    }

    return audioContext;
  }

  function unlockAudio() {
    const context = ensureAudio();

    if (!unlocked) {
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(masterGain);
      source.start(0);
      unlocked = true;
    }

    return context;
  }

  function beep({ frequency, endFrequency, duration = 0.08, delay = 0, type = "sine", gain = 0.12 }) {
    const context = unlockAudio();
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(name) {
    const now = performance.now();
    if (now - lastSoundAt < 42) return;
    lastSoundAt = now;

    const sounds = {
      back: () => {
        beep({ frequency: 440, endFrequency: 260, duration: 0.11, type: "triangle", gain: 0.1 });
      },
      card: () => {
        beep({ frequency: 360, endFrequency: 520, duration: 0.055, type: "triangle", gain: 0.1 });
        beep({ frequency: 720, duration: 0.045, delay: 0.035, type: "sine", gain: 0.045 });
      },
      coin: () => {
        beep({ frequency: 988, duration: 0.055, type: "sine", gain: 0.08 });
        beep({ frequency: 1320, duration: 0.08, delay: 0.045, type: "sine", gain: 0.06 });
      },
      create: () => {
        beep({ frequency: 523, duration: 0.07, type: "triangle", gain: 0.09 });
        beep({ frequency: 659, duration: 0.07, delay: 0.055, type: "triangle", gain: 0.08 });
        beep({ frequency: 880, duration: 0.11, delay: 0.11, type: "sine", gain: 0.07 });
      },
      hand: () => {
        beep({ frequency: 660, endFrequency: 990, duration: 0.075, type: "triangle", gain: 0.1 });
        beep({ frequency: 1320, duration: 0.07, delay: 0.07, type: "sine", gain: 0.055 });
      },
      join: () => {
        beep({ frequency: 494, duration: 0.06, type: "triangle", gain: 0.085 });
        beep({ frequency: 740, duration: 0.09, delay: 0.055, type: "triangle", gain: 0.075 });
      },
      nav: () => {
        beep({ frequency: 420, endFrequency: 630, duration: 0.07, type: "sine", gain: 0.075 });
      },
      operator: () => {
        beep({ frequency: 560, duration: 0.045, type: "square", gain: 0.045 });
        beep({ frequency: 840, duration: 0.055, delay: 0.035, type: "square", gain: 0.035 });
      },
      panel: () => {
        beep({ frequency: 520, endFrequency: 650, duration: 0.065, type: "triangle", gain: 0.07 });
      },
      rank: () => {
        beep({ frequency: 587, duration: 0.055, type: "triangle", gain: 0.075 });
        beep({ frequency: 784, duration: 0.07, delay: 0.045, type: "triangle", gain: 0.065 });
        beep({ frequency: 1175, duration: 0.09, delay: 0.095, type: "sine", gain: 0.05 });
      },
      tab: () => {
        beep({ frequency: 620, duration: 0.05, type: "sine", gain: 0.065 });
      },
      toggle: () => {
        beep({ frequency: 520, endFrequency: 760, duration: 0.075, type: "triangle", gain: 0.07 });
      },
      warm: () => {
        beep({ frequency: 392, duration: 0.055, type: "triangle", gain: 0.08 });
        beep({ frequency: 659, duration: 0.085, delay: 0.045, type: "triangle", gain: 0.065 });
      },
    };

    (sounds[name] || sounds.panel)();
  }

  function findSoundTarget(eventTarget) {
    return eventTarget.closest?.("button, a, input, [role='button']");
  }

  function getSoundName(target) {
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return null;
    if (target.matches("input[type='range']")) return null;

    if (target.matches("input[type='checkbox']")) return "toggle";
    if (target.matches(".back-button, .ranking-back, .rooms-circle-button:first-child, .leave-icon")) return "back";
    if (target.matches(".mini-add, .wallet-pill button")) return "coin";
    if (target.matches(".js-number-card, .number-card")) return "card";
    if (target.matches(".js-operator, .operator-button")) return "operator";
    if (target.matches(".js-hand, .hand-button")) return "hand";
    if (target.matches(".lobby-join-button, .join-button, .js-quick-start, .action-blue")) return "join";
    if (target.matches(".js-create-room, .create-room-button")) return "create";
    if (target.matches(".action-purple, .js-my-rank, .js-ranking-help")) return "rank";
    if (target.matches(".room-tab, .js-room-tab, .js-time-filter, .time-filters button")) return "tab";
    if (target.matches(".js-settings, .action-yellow, .logout-button")) return "warm";
    if (target.matches(".nav-item, .nav-mascot, .avatar-button, .js-profile")) return "nav";

    return "panel";
  }

  function playFromEvent(event) {
    const target = findSoundTarget(event.target);
    const sound = getSoundName(target);
    if (sound) playSound(sound);
  }

  document.addEventListener(
    "touchstart",
    (event) => {
      ignorePointerUntil = performance.now() + 450;
      playFromEvent(event);
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.pointerType === "touch" && performance.now() < ignorePointerUntil) return;
      playFromEvent(event);
    },
    { capture: true }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      playFromEvent(event);
    },
    { capture: true }
  );
})();
