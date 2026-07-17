// Placeholder parallax: flat gradient bands scrolling at different speeds per layer,
// swappable for real background art later without touching the renderer's call site.

export function createParallax(colors) {
  let offset = 0;

  return {
    update(dtMs, speedFactor = 1) {
      offset += dtMs * 0.03 * speedFactor;
    },
    draw(ctx, width, height) {
      const bandCount = colors.length;
      for (let i = 0; i < bandCount; i++) {
        const layerSpeed = (i + 1) / bandCount;
        const bandHeight = height / bandCount;
        const y = i * bandHeight;
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, y, width, bandHeight + 1);

        // subtle scrolling texture stripes for a sense of motion
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#ffffff';
        const stripeW = 40;
        const shift = (offset * layerSpeed) % stripeW;
        for (let x = -stripeW + shift; x < width; x += stripeW * 2) {
          ctx.fillRect(x, y, stripeW, bandHeight);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}
