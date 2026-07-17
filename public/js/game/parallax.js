// Image-based parallax renderer.
// Each dungeon maps to a location folder; layers stack with independent scroll speeds.
// SOURCE_GROUND_Y is the normalised Y of the "ground line" in the source 1920×1080 art.
// We scale every layer so that line lands exactly at GROUND_Y_RATIO of the canvas height.

const GROUND_Y_RATIO = 0.90;
const SOURCE_GROUND_Y = 0.60; // ground platform line in source images ≈ 60% from top

// Scroll speed multiplier per layer index (0 = farthest/slowest, last = nearest/fastest)
const LAYER_SPEEDS = [0.01, 0.04, 0.08, 0.15, 0.24, 0.36, 0.52, 0.70];

const LOCATION_LAYERS = {
  '01': ['l1_sky.png', 'l2_clouds.png', 'l3_pyramid.png',
         'l4_bg-ground01.png', 'l5_bg-ground02.png', 'l6_bg-ground03.png', 'l7_ground.png'],
  '02': ['l1_sky.png', 'l2_mountains.png', 'l3_clouds.png',
         'l4_bg-ground01.png', 'l5_bg-ground02.png', 'l6_ground.png'],
  '03': ['l1_wall.png', 'l2_prop01.png', 'l3_prop02.png',
         'l4_stones.png', 'l5_crystals.png', 'l6_ground.png'],
  '04': ['l1_sky.png', 'l2_stars.png', 'l3_clouds01.png', 'l4_clouds02.png',
         'l5_mountains.png', 'l6_ground01.png', 'l7_ground02.png', 'l8_ground.png'],
};

const DUNGEON_LOCATION = {
  whispering_forest: '02',
  sunken_crypt:      '03',
  ashen_wastes:      '01',
  frozen_citadel:    '04',
};

// Dark gradient fallbacks used before images load or for dungeons without art
const FALLBACK_GRADIENT = {
  abyssal_rift: ['#150c1f', '#291736', '#4c2c6b', '#2a1a40'],
  default:      ['#0e1118', '#1a1f2e', '#242a3a'],
};

export function createParallax(colors, dungeonKey) {
  const locationId = DUNGEON_LOCATION[dungeonKey];
  let layers = [];
  let scrollX = 0;

  if (locationId) {
    const names = LOCATION_LAYERS[locationId] || [];
    layers = names.map((name, i) => {
      const img = new Image();
      img.src = `/images/locations/${locationId}/layers/${name}`;
      return { img, speed: LAYER_SPEEDS[i] ?? 0.5 };
    });
  }

  function update(dtMs, speedFactor) {
    scrollX += dtMs * 0.08 * speedFactor;
  }

  function drawFallback(ctx, width, height) {
    const stops = FALLBACK_GRADIENT[dungeonKey] || colors || FALLBACK_GRADIENT.default;
    const grad = ctx.createLinearGradient(0, 0, 0, height * GROUND_Y_RATIO);
    stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, stops.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(ctx, width, height) {
    if (layers.length === 0) {
      drawFallback(ctx, width, height);
      return;
    }

    // Show fallback until at least the first layer (sky/wall) is loaded
    if (!layers[0].img.complete || layers[0].img.naturalWidth === 0) {
      drawFallback(ctx, width, height);
      return;
    }

    // Scale all layers uniformly so the source ground line meets GROUND_Y_RATIO
    const scale = (height * GROUND_Y_RATIO) / (1080 * SOURCE_GROUND_Y);
    const iw = Math.round(1920 * scale); // tile width on canvas
    const ih = Math.round(1080 * scale); // tile height (may extend below canvas — that's fine)

    for (const { img, speed } of layers) {
      if (!img.complete || img.naturalWidth === 0) continue;
      const offset = (scrollX * speed) % iw;
      // Fill canvas width with tiled copies
      for (let x = -offset; x < width; x += iw) {
        ctx.drawImage(img, x, 0, iw, ih);
      }
    }
  }

  return { update, draw };
}
