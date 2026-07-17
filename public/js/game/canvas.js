export function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    ctx,
    width: () => canvas.getBoundingClientRect().width,
    height: () => canvas.getBoundingClientRect().height,
    destroy: () => observer.disconnect(),
  };
}
