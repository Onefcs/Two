const imageCache = new Map();

function loadImage(src) {
  const encoded = encodeURI(src);
  if (imageCache.has(encoded)) return imageCache.get(encoded);
  const img = new Image();
  img.src = encoded;
  imageCache.set(encoded, img);
  return img;
}

export function createAnimator(spriteSet) {
  const images = {};
  for (const [state, def] of Object.entries(spriteSet)) {
    images[state] = { img: loadImage(def.src), def };
  }

  let state = 'idle';
  let frameIndex = 0;
  let elapsed = 0;

  return {
    setState(next) {
      if (state === next) return;
      state = next;
      frameIndex = 0;
      elapsed = 0;
    },
    getState: () => state,
    update(dtMs) {
      const { def } = images[state];
      elapsed += dtMs;
      const frameDuration = 1000 / def.fps;
      while (elapsed >= frameDuration) {
        elapsed -= frameDuration;
        frameIndex = (frameIndex + 1) % def.frames;
      }
    },
    draw(ctx, x, y, drawH, flip = false) {
      const { img, def } = images[state];
      if (!img.complete || img.naturalWidth === 0) return;
      const scale = drawH / def.frameH;
      const drawW = def.frameW * scale;
      ctx.save();
      if (flip) {
        ctx.translate(x + drawW, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frameIndex * def.frameW, 0, def.frameW, def.frameH, 0, 0, drawW, drawH);
      } else {
        ctx.drawImage(img, frameIndex * def.frameW, 0, def.frameW, def.frameH, x, y, drawW, drawH);
      }
      ctx.restore();
      return { width: drawW, height: drawH };
    },
  };
}
