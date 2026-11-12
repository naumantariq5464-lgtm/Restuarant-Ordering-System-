// ========================================================
// RestoBot Luxury Triple Service Bell Chime (Ding-Ding-Dong)
// High-Fidelity Dual-Engine (HTML5 Audio + Web Audio API)
// ========================================================

let cachedWavUrl = null;
let globalAudioElement = null;
let isAudioPrimed = false;

// 1. Generate a crystal-clear 16-bit PCM WAV Bell in memory
const getBellAudioUrl = () => {
  if (cachedWavUrl) return cachedWavUrl;

  try {
    const sampleRate = 44100;
    const duration = 1.7; // 1.7 seconds rich sustain
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(numSamples);

    // 3 Distinct Chime Notes: D5 (587Hz) -> A5 (880Hz) -> D6 (1175Hz)
    const notes = [
      { freq: 587.33, start: 0.00, end: 0.50 },
      { freq: 880.00, start: 0.20, end: 0.75 },
      { freq: 1174.66, start: 0.42, end: 1.65 }
    ];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      for (const note of notes) {
        if (t >= note.start && t < note.end) {
          const noteT = t - note.start;
          const noteDuration = note.end - note.start;
          const envelope = Math.exp(-4.2 * (noteT / noteDuration));
          
          // Rich metallic harmonics for hotel service bell
          const tone = Math.sin(2 * Math.PI * note.freq * noteT)
                     + 0.55 * Math.sin(2 * Math.PI * note.freq * 2 * noteT)
                     + 0.25 * Math.sin(2 * Math.PI * note.freq * 3.01 * noteT);
                     
          sample += tone * envelope * 0.45;
        }
      }

      sample = Math.max(-1, Math.min(1, sample));
      buffer[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }

    // Build standard 44-byte WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (offset, str) => {
      for (let j = 0; j < str.length; j++) view.setUint8(offset + j, str.charCodeAt(j));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + buffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, buffer.byteLength, true);

    const blob = new Blob([header, buffer], { type: 'audio/wav' });
    cachedWavUrl = URL.createObjectURL(blob);

    if (typeof window !== 'undefined') {
      globalAudioElement = new Audio(cachedWavUrl);
      globalAudioElement.preload = 'auto';
      globalAudioElement.volume = 1.0;
    }

    return cachedWavUrl;
  } catch (err) {
    console.warn('WAV generation error:', err);
    return null;
  }
};

// 2. Prime & Unlock Audio on ANY user interaction
export const unlockAudio = () => {
  try {
    const url = getBellAudioUrl();
    if (globalAudioElement) {
      // Prime the audio element silently
      const playPromise = globalAudioElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          globalAudioElement.pause();
          globalAudioElement.currentTime = 0;
          isAudioPrimed = true;
        }).catch(() => {});
      }
    }

    // Also prime Web Audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!window.__restoAudioCtx) {
        window.__restoAudioCtx = new AudioContextClass();
      }
      if (window.__restoAudioCtx.state === 'suspended') {
        window.__restoAudioCtx.resume().catch(() => {});
      }
    }
  } catch (e) {
    // Ignore
  }
};

// Auto-register listener for initial user click/touch to unlock audio
if (typeof window !== 'undefined') {
  const autoUnlock = () => {
    unlockAudio();
    window.removeEventListener('click', autoUnlock);
    window.removeEventListener('touchstart', autoUnlock);
    window.removeEventListener('keydown', autoUnlock);
  };
  window.addEventListener('click', autoUnlock, { once: true });
  window.addEventListener('touchstart', autoUnlock, { once: true });
  window.addEventListener('keydown', autoUnlock, { once: true });
}

// 3. Play Order Notification Sound (Dual Engine)
export const playOrderNotificationSound = () => {
  console.log('🔔 Attempting to play Order Bell Notification...');
  let played = false;

  // Engine 1: HTML5 Audio Element (Works in background if primed)
  try {
    getBellAudioUrl();
    if (globalAudioElement) {
      globalAudioElement.currentTime = 0;
      globalAudioElement.volume = 1.0;
      const promise = globalAudioElement.play();
      if (promise !== undefined) {
        promise.then(() => {
          played = true;
          console.log('✅ Bell chime successfully played via HTML5 Audio!');
        }).catch(err => {
          console.warn('HTML5 Audio playback note:', err.message);
        });
      }
    }
  } catch (err) {
    console.warn('Engine 1 fallback error:', err);
  }

  // Engine 2: Web Audio API Oscillator (High-resonance fallback)
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!window.__restoAudioCtx) {
        window.__restoAudioCtx = new AudioContextClass();
      }
      const ctx = window.__restoAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Note 1: 587Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.5, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Note 2: 880Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.18);
      gain2.gain.setValueAtTime(0, now + 0.18);
      gain2.gain.linearRampToValueAtTime(0.6, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.75);

      // Note 3: 1175Hz (D6)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1174.66, now + 0.38);
      gain3.gain.setValueAtTime(0, now + 0.38);
      gain3.gain.linearRampToValueAtTime(0.7, now + 0.42);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.38);
      osc3.stop(now + 1.4);
    }
  } catch (err) {
    console.warn('Engine 2 fallback error:', err);
  }
};
