/** Soft pop after a user gesture. Fails silently if audio is blocked. */
export function playSupportPop(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    window.setTimeout(() => {
      void ctx.close();
    }, 200);
  } catch {
    /* ignore */
  }
}
