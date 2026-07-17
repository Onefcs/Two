export function createLoop(onFrame) {
  let rafId = null;
  let lastTime = null;

  function frame(time) {
    if (lastTime === null) lastTime = time;
    const dt = Math.min(100, time - lastTime);
    lastTime = time;
    onFrame(dt);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (rafId !== null) return;
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
