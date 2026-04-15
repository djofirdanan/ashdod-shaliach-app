// ─── Web Audio sound generator ───────────────────────────────
// No external files needed — pure Web Audio API tones.
// A single AudioContext is reused; it is resumed on user interaction.

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

// Resume audio context on any user gesture (required by browsers)
if (typeof window !== 'undefined') {
  const resume = () => { getCtx(); };
  window.addEventListener('click', resume, { once: false, passive: true });
  window.addEventListener('touchstart', resume, { once: false, passive: true });
  window.addEventListener('keydown', resume, { once: false, passive: true });
}

export function getMuted(): boolean {
  return localStorage.getItem('app_sounds_muted') === 'true';
}
export function setMuted(val: boolean): void {
  localStorage.setItem('app_sounds_muted', val ? 'true' : 'false');
}

/** Happy ascending arpeggio — new delivery arrived (courier) */
export function playNewDelivery(): void {
  if (getMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    master.connect(ctx.destination);

    // C5 E5 G5 C6 — major arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(master);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.32);
    });
  } catch {}
}

/** Soft double ping — new chat message received */
export function playNewMessage(): void {
  if (getMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [0, 0.18].forEach((delay) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
      g.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1318.51; // E6
      osc.connect(g);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
  } catch {}
}

/** Three rising tones — delivery status updated */
export function playStatusUpdate(): void {
  if (getMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    g.connect(ctx.destination);
    [440, 587.33, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(g);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.22);
    });
  } catch {}
}

/** Support reply sound */
export function playSupportReply(): void {
  if (getMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    g.connect(ctx.destination);
    [659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.25);
    });
  } catch {}
}
