type SoundType =
  | 'correct'
  | 'wrong'
  | 'click'
  | 'levelUp'
  | 'stageComplete'
  | 'bossDefeat'
  | 'combo'
  | 'achievement'
  | 'countdown';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playMelody(notes: number[], noteDuration: number, type: OscillatorType = 'sine', volume = 0.12) {
  const ctx = getCtx();
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * noteDuration);
    gain.gain.setValueAtTime(volume, ctx.currentTime + i * noteDuration);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * noteDuration + noteDuration * 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * noteDuration);
    osc.stop(ctx.currentTime + i * noteDuration + noteDuration);
  });
}

const sounds: Record<SoundType, () => void> = {
  correct: () => {
    playMelody([523, 659, 784], 0.1, 'sine', 0.13);
  },

  wrong: () => {
    playTone(200, 0.3, 'sawtooth', 0.08);
  },

  click: () => {
    playTone(800, 0.05, 'sine', 0.06);
  },

  levelUp: () => {
    playMelody([523, 587, 659, 784, 880, 1047], 0.1, 'sine', 0.12);
  },

  stageComplete: () => {
    playMelody([523, 659, 784, 1047], 0.15, 'triangle', 0.14);
  },

  bossDefeat: () => {
    playMelody([392, 523, 659, 784, 1047, 1319], 0.12, 'square', 0.1);
  },

  combo: () => {
    playTone(880, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.1), 60);
  },

  achievement: () => {
    playMelody([659, 784, 988, 1319], 0.12, 'sine', 0.12);
  },

  countdown: () => {
    playTone(440, 0.08, 'square', 0.06);
  },
};

let muted = false;

export function playSound(type: SoundType) {
  if (muted) return;
  try {
    sounds[type]();
  } catch {
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}
