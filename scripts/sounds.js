(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass && typeof Audio === "undefined") return;

  let audioContext;
  let masterGain;
  const toneDataUris = new Map();
  let lastSoundAt = 0;
  let ignorePointerUntil = 0;
  let unlocked = false;
  let resumePromise = Promise.resolve();

  function ensureAudio() {
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.88;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      resumePromise = audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function unlockAudio() {
    const context = ensureAudio();
    if (!context) return null;

    if (!unlocked) {
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(masterGain);
      source.start(context.currentTime);
      unlocked = true;
    }

    return context;
  }

  function resumeAudio() {
    const context = ensureAudio();
    if (!context) return Promise.resolve(null);
    if (context.state === "suspended") {
      resumePromise = context.resume().catch(() => {});
    }
    return resumePromise.then(() => context);
  }

  function beep({ frequency, endFrequency, duration = 0.08, delay = 0, type = "sine", gain = 0.12 }) {
    const context = unlockAudio();
    if (!context || !masterGain) return;
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

  function writeString(view, offset, string) {
    for (let index = 0; index < string.length; index += 1) {
      view.setUint8(offset + index, string.charCodeAt(index));
    }
  }

  function makeToneUri({ frequency = 720, endFrequency, duration = 0.1, volume = 0.55 }) {
    const sampleRate = 22050;
    const sampleCount = Math.max(1, Math.floor(sampleRate * duration));
    const bytes = new Uint8Array(44 + sampleCount * 2);
    const view = new DataView(bytes.buffer);
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, sampleCount * 2, true);

    let phase = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount;
      const freq = endFrequency ? frequency + (endFrequency - frequency) * progress : frequency;
      phase += (Math.PI * 2 * freq) / sampleRate;
      const attack = Math.min(1, progress / 0.12);
      const release = Math.min(1, (1 - progress) / 0.22);
      const envelope = Math.max(0, Math.min(attack, release));
      const sample = Math.sin(phase) * volume * envelope;
      view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
    }

    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  }

  function toneProfile(name) {
    const profiles = {
      back: { frequency: 420, endFrequency: 260, duration: 0.12, volume: 0.62 },
      card: { frequency: 620, endFrequency: 880, duration: 0.08, volume: 0.56 },
      coin: { frequency: 1050, endFrequency: 1320, duration: 0.1, volume: 0.58 },
      create: { frequency: 520, endFrequency: 920, duration: 0.13, volume: 0.6 },
      hand: { frequency: 700, endFrequency: 1200, duration: 0.13, volume: 0.62 },
      join: { frequency: 560, endFrequency: 820, duration: 0.11, volume: 0.58 },
      nav: { frequency: 430, endFrequency: 650, duration: 0.09, volume: 0.55 },
      operator: { frequency: 650, endFrequency: 940, duration: 0.075, volume: 0.52 },
      panel: { frequency: 520, endFrequency: 690, duration: 0.09, volume: 0.56 },
      rank: { frequency: 620, endFrequency: 1180, duration: 0.14, volume: 0.58 },
      success: { frequency: 780, endFrequency: 1280, duration: 0.16, volume: 0.62 },
      tab: { frequency: 610, endFrequency: 720, duration: 0.07, volume: 0.52 },
      toggle: { frequency: 520, endFrequency: 760, duration: 0.09, volume: 0.55 },
      warm: { frequency: 440, endFrequency: 720, duration: 0.12, volume: 0.56 },
      wrong: { frequency: 260, endFrequency: 150, duration: 0.17, volume: 0.62 },
    };
    return profiles[name] || profiles.panel;
  }

  function playElementSound(name) {
    if (typeof Audio === "undefined") return false;
    const profile = toneProfile(name);
    const key = `${profile.frequency}-${profile.endFrequency || ""}-${profile.duration}-${profile.volume}`;
    if (!toneDataUris.has(key)) {
      toneDataUris.set(key, makeToneUri(profile));
    }
    const audio = new Audio(toneDataUris.get(key));
    audio.preload = "auto";
    audio.volume = 1;
    audio.play().catch(() => {});
    return true;
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
      success: () => {
        beep({ frequency: 784, duration: 0.07, type: "triangle", gain: 0.12 });
        beep({ frequency: 1175, duration: 0.11, delay: 0.06, type: "sine", gain: 0.08 });
      },
      wrong: () => {
        beep({ frequency: 260, endFrequency: 140, duration: 0.16, type: "sawtooth", gain: 0.08 });
      },
    };

    const run = sounds[name] || sounds.panel;
    playElementSound(name);
    const context = ensureAudio();
    if (!context) return;
    if (context.state === "suspended") {
      resumeAudio().then(run).catch(() => {});
      return;
    }

    run();
  }

  function findSoundTarget(eventTarget) {
    return eventTarget.closest?.("button, a, input, [role='button']");
  }

  function getSoundName(target) {
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return null;
    if (target.matches("input[type='range']")) return null;
    if (target.matches("input[type='text'], input[type='number']")) return null;

    if (target.matches("input[type='checkbox']")) return "toggle";
    if (target.matches(".back-button, .ranking-back, .rooms-circle-button:first-child, .leave-icon")) return "back";
    if (target.matches(".dialog-close-button")) return "panel";
    if (target.matches(".mini-add, .wallet-pill button")) return "coin";
    if (target.matches(".js-number-card, .number-card")) return "card";
    if (target.matches(".js-calculate, .calculate-button, .js-apply-game-settings")) return "create";
    if (target.matches(".js-operator, .operator-button")) return "operator";
    if (target.matches(".js-hand, .hand-button")) return "hand";
    if (target.matches(".js-chat-toggle, .js-chat-close")) return "panel";
    if (target.matches(".js-chat-phrase")) return "join";
    if (target.matches(".chat-form button")) return "join";
    if (target.matches(".lobby-join-button, .join-button, .js-quick-start, .action-blue, .action-practice")) return "join";
    if (target.matches(".js-create-room, .create-room-button")) return "create";
    if (target.matches(".action-purple, .js-my-rank, .js-ranking-help")) return "rank";
    if (target.matches(".js-card-count, .js-timer-minus, .js-timer-plus, .js-reset-game-settings")) return "toggle";
    if (target.matches(".room-tab, .js-room-tab, .js-time-filter, .time-filters button")) return "tab";
    if (target.matches(".js-settings, .js-game-settings, .action-yellow, .logout-button, .js-tutorial, .action-tutorial, .extra-action-card")) return "warm";
    if (target.matches(".nav-item, .nav-mascot, .avatar-button, .js-profile")) return "nav";

    return "panel";
  }

  function playFromEvent(event) {
    const target = findSoundTarget(event.target);
    const sound = getSoundName(target);
    if (sound) playSound(sound);
  }

  function getDelayableLink(target) {
    const link = target?.closest?.("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return null;
    if (link.origin !== window.location.origin) return null;
    return link;
  }

  function isPlainPrimaryClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  document.addEventListener(
    "touchstart",
    (event) => {
      ignorePointerUntil = performance.now() + 450;
      resumeAudio();
      playFromEvent(event);
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.pointerType === "touch" && performance.now() < ignorePointerUntil) return;
      resumeAudio();
      playFromEvent(event);
    },
    { capture: true }
  );

  document.addEventListener(
    "mousedown",
    (event) => {
      if (!isPlainPrimaryClick(event)) return;
      resumeAudio();
      if (performance.now() - lastSoundAt > 90) playFromEvent(event);
    },
    { capture: true }
  );

  document.addEventListener(
    "click",
    (event) => {
      const target = findSoundTarget(event.target);
      const sound = getSoundName(target);
      if (!sound) return;

      const now = performance.now();
      if (now >= ignorePointerUntil && now - lastSoundAt > 90) {
        resumeAudio();
        playSound(sound);
      } else {
        resumePromise.catch(() => {});
      }

      const link = getDelayableLink(target);
      if (!link || !isPlainPrimaryClick(event) || link.dataset.soundDelayHandled === "true") return;

      event.preventDefault();
      link.dataset.soundDelayHandled = "true";
      window.setTimeout(() => {
        window.location.assign(link.href);
      }, 120);
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

  window.play24PlaySound = playSound;
})();
