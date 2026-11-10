import { getSettings } from "./progress";

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (getSettings().muted) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

function noise(dur: number, vol: number, freq: number) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  whoosh: () => noise(0.12, 0.25, 1800),
  light: () => {
    noise(0.08, 0.4, 2500);
    tone(520, 0.08, "triangle", 0.12, 260);
  },
  heavy: () => {
    tone(140, 0.25, "sine", 0.5, 45);
    noise(0.15, 0.4, 600);
  },
  block: () => tone(320, 0.1, "square", 0.08, 200),
  parry: () => {
    tone(1200, 0.4, "sine", 0.18);
    tone(1800, 0.3, "sine", 0.08);
  },
  grab: () => tone(90, 0.3, "sawtooth", 0.2, 50),
  super: () => {
    tone(60, 0.9, "sawtooth", 0.25, 220);
    tone(880, 0.6, "sine", 0.1, 1760);
  },
  ability: () => tone(660, 0.25, "triangle", 0.15, 1320),
  ko: () => {
    tone(110, 1.4, "sine", 0.4, 70);
    tone(165, 1.4, "sine", 0.2, 100);
  },
  round: () => tone(440, 0.35, "square", 0.08, 880),
  click: () => tone(700, 0.05, "triangle", 0.06),
  worm: () => {
    tone(44, 1.3, "sawtooth", 0.4, 28);
    noise(0.7, 0.35, 260);
  },
};
