import { Howler } from "howler";

const MASTER_GAIN = 0.48;
const MIN_THOCK_INTERVAL_MS = 14;

let masterNode: GainNode | null = null;
let masterOutputNode: AudioNode | null = null;
let fallbackContext: AudioContext | null = null;
let lastThockAt = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getFallbackContext(): AudioContext | null {
  if (fallbackContext) return fallbackContext;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  fallbackContext = new AudioContextCtor();
  return fallbackContext;
}

function getHowlerMasterGain(): GainNode | null {
  const maybeHowler = Howler as unknown as { masterGain?: GainNode };
  return maybeHowler.masterGain ?? null;
}

function getContext(): AudioContext | null {
  // Triggers Howler audio setup in browsers where context is lazy-created.
  Howler.volume(Howler.volume());

  const ctx = Howler.ctx ?? getFallbackContext();
  if (!ctx) return null;

  const targetNode = getHowlerMasterGain() ?? ctx.destination;

  if (!masterNode || masterOutputNode !== targetNode) {
    if (masterNode) {
      masterNode.disconnect();
    }
    masterNode = ctx.createGain();
    masterNode.gain.value = MASTER_GAIN;
    masterNode.connect(targetNode);
    masterOutputNode = targetNode;
  }

  return ctx;
}

function cleanupNodes(
  oscillator: OscillatorNode,
  filter: BiquadFilterNode,
  gainNode: GainNode
): void {
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    gainNode.disconnect();
  };
}

function createVoice(
  ctx: AudioContext,
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  startTime: number,
  attackSec: number,
  releaseSec: number,
  gainPeak: number,
  filterFreq: number
): void {
  if (!masterNode) return;

  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFreq, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + releaseSec);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFreq, startTime);
  filter.Q.value = 0.8;

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainPeak), startTime + attackSec);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseSec);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterNode);
  cleanupNodes(oscillator, filter, gainNode);

  oscillator.start(startTime);
  oscillator.stop(startTime + releaseSec + 0.02);
}

export function primeGameAudio(): void {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    void ctx.resume();
  }
}

export function playLetterThock(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "closed") return;
  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    void ctx.resume();
  }

  const nowMs = performance.now();
  if (nowMs - lastThockAt < MIN_THOCK_INTERVAL_MS) return;
  lastThockAt = nowMs;

  const now = ctx.currentTime + 0.008;
  createVoice(
    ctx,
    "triangle",
    145,
    88,
    now,
    0.007,
    0.09,
    0.11,
    900
  );
}

export function playPerfectWordAccent(ampLevel: number, cleanChain: number): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "closed") return;
  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    void ctx.resume();
  }

  const now = ctx.currentTime + 0.01;
  const streakLevel = Math.max(0, cleanChain - 1);
  const ampInfluence = streakLevel > 0 ? clamp((ampLevel - 1) * 8, 0, 160) : 0;

  const root = 760 + streakLevel * 8 + ampInfluence;
  createVoice(
    ctx,
    "triangle",
    root,
    root * 1.04,
    now,
    0.005,
    0.16,
    0.09,
    2800
  );
  createVoice(
    ctx,
    "sine",
    root * 1.5,
    root * 1.55,
    now + 0.012,
    0.005,
    0.14,
    0.06,
    3200
  );
}
