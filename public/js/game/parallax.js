// Rich canvas-drawn parallax — unique living scene per dungeon theme.
// Purely functional: all animation driven by `offset` (no mutable particle state).

function p(n) { // deterministic pseudo-random [0, 1]
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---- shared primitives ----

function skyGrad(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [pos, col] of stops) g.addColorStop(pos, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, w, h, off, count, color) {
  // Single path for all stars — one fill() call instead of N
  const tile = w * 2;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45 + Math.sin(off * 0.018) * 0.1;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = ((p(i) * tile - off * 0.004) % tile + tile) % tile;
    if (x > w) continue;
    const y = p(i + 77) * h * 0.58;
    const r = p(i + 155) * 1.1 + 0.3;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.28);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function moon(ctx, x, y, r, color) {
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.1, r * 0.85, 0, 6.28); ctx.fill();
  ctx.globalAlpha = 1;
}

function mtnLayer(ctx, w, h, baseYR, ampR, color, off, spd, peaks) {
  const baseY = h * baseYR, amp = h * ampR, tile = w;
  const shift = (off * spd) % tile;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-shift - 2, h);
  for (let rep = -1; rep <= 2; rep++) {
    const ox = rep * tile - shift;
    for (let i = 0; i <= peaks; i++) {
      const x = ox + (i / peaks) * tile;
      const y = baseY - p(i + rep * 13 + 47) * amp - p(i * 3 + rep * 7) * amp * 0.3;
      ctx.lineTo(x, y);
    }
  }
  ctx.lineTo(w + 2, h); ctx.closePath(); ctx.fill();
}

function pineTrees(ctx, w, h, baseYR, hR, c1, c2, off, spd, count) {
  // Batch all same-colour geometry into 3 fill() calls instead of count×4
  const baseY = h * baseYR, tH = h * hR, tile = w * 1.6;
  const shift = (off * spd) % tile;

  const trees = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < count; i++) {
      const x = rep * tile - shift + p(i + rep * 31 + 7) * tile;
      if (x < -tH || x > w + tH) continue;
      trees.push({ x, hv: tH * (0.72 + p(i + rep * 17) * 0.56) });
    }
  }

  ctx.fillStyle = '#1a0e06';
  ctx.beginPath();
  for (const { x, hv } of trees) {
    const tw = ~~(hv * 0.08) || 1, th = ~~(hv * 0.28) || 1;
    ctx.rect(~~(x - hv * 0.04), ~~(baseY - hv * 0.28), tw, th);
  }
  ctx.fill();

  ctx.fillStyle = c1;
  ctx.beginPath();
  for (const { x, hv } of trees) {
    const tw = hv * 0.44;
    for (const t of [0, 2]) {
      const ty = baseY - hv * (0.28 + t * 0.23), tw2 = tw * (1 - t * 0.24);
      ctx.moveTo(x, ty - hv * 0.23); ctx.lineTo(x - tw2 / 2, ty); ctx.lineTo(x + tw2 / 2, ty);
    }
  }
  ctx.fill();

  ctx.fillStyle = c2;
  ctx.beginPath();
  for (const { x, hv } of trees) {
    const tw2 = hv * 0.44 * 0.76, ty = baseY - hv * 0.51;
    ctx.moveTo(x, ty - hv * 0.23); ctx.lineTo(x - tw2 / 2, ty); ctx.lineTo(x + tw2 / 2, ty);
  }
  ctx.fill();
}

function deadTrees(ctx, w, h, baseYR, hR, color, off, spd, count) {
  const baseY = h * baseYR, tH = h * hR, tile = w * 1.6;
  const shift = (off * spd) % tile;
  ctx.save(); ctx.strokeStyle = color;
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < count; i++) {
      const x = rep * tile - shift + p(i + rep * 29 + 13) * tile;
      if (x < -tH || x > w + tH) continue;
      const hv = tH * (0.55 + p(i + rep * 11) * 0.9);
      const tw = Math.max(1, hv * 0.055);
      ctx.lineWidth = tw;
      ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - hv); ctx.stroke();
      for (let b = 0; b < 5; b++) {
        const by = baseY - hv * (0.3 + b * 0.14);
        const dir = b % 2 === 0 ? 1 : -1;
        const bl = hv * (0.12 + p(b * 7 + i * 3) * 0.18);
        ctx.lineWidth = tw * 0.45;
        ctx.beginPath(); ctx.moveTo(x, by);
        ctx.lineTo(x + dir * bl, by - bl * 0.5); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function iceSpires(ctx, w, h, baseYR, hR, c1, c2, off, spd, count) {
  const baseY = h * baseYR, sH = h * hR, tile = w * 1.6;
  const shift = (off * spd) % tile;
  const spires = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < count; i++) {
      const x = rep * tile - shift + p(i + rep * 23 + 5) * tile;
      if (x < -sH || x > w + sH) continue;
      spires.push({ x, hv: sH * (0.38 + p(i + rep * 19) * 0.95) });
    }
  }
  ctx.fillStyle = c1;
  ctx.beginPath();
  for (const { x, hv } of spires) {
    const sw = hv * 0.2;
    ctx.moveTo(x, baseY - hv); ctx.lineTo(x - sw, baseY); ctx.lineTo(x + sw, baseY);
  }
  ctx.fill();
  ctx.globalAlpha = 0.4; ctx.fillStyle = c2;
  ctx.beginPath();
  for (const { x, hv } of spires) {
    const sw = hv * 0.2;
    ctx.moveTo(x, baseY - hv); ctx.lineTo(x, baseY); ctx.lineTo(x + sw, baseY);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function voidRocks(ctx, w, h, baseYR, rockHR, color, off, spd, count) {
  const baseY = h * baseYR, rH = h * rockHR, tile = w * 1.6;
  const shift = (off * spd) % tile;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < count; i++) {
      const x = rep * tile - shift + p(i + rep * 41 + 11) * tile;
      if (x < -rH * 1.5 || x > w + rH * 1.5) continue;
      const hv = rH * (0.28 + p(i + rep * 17) * 0.75);
      const rw = hv * (0.9 + p(i + 50) * 0.6);
      const floatY = baseY - hv * 0.5 - Math.sin(off * 0.018 + i * 1.7) * 10;
      ctx.moveTo(x + rw / 2, floatY);
      ctx.ellipse(x, floatY, rw / 2, hv / 2, p(i) * 0.6, 0, 6.28);
    }
  }
  ctx.fill();
}

function crystals(ctx, w, h, baseYR, hR, c1, c2, off, spd, count) {
  const baseY = h * baseYR, cH = h * hR, tile = w * 1.6;
  const shift = (off * spd) % tile;
  const crys = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < count; i++) {
      const x = rep * tile - shift + p(i + rep * 37 + 9) * tile;
      if (x < -cH || x > w + cH) continue;
      crys.push({ x, hv: cH * (0.28 + p(i + rep * 13) * 0.95) });
    }
  }
  ctx.fillStyle = c1; ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (const { x, hv } of crys) {
    const cw = hv * 0.2;
    ctx.moveTo(x, baseY - hv);
    ctx.lineTo(x - cw, baseY - hv * 0.32); ctx.lineTo(x - cw * 0.45, baseY);
    ctx.lineTo(x + cw * 0.45, baseY); ctx.lineTo(x + cw, baseY - hv * 0.32);
  }
  ctx.fill();
  const pulse = 0.5 + Math.sin(off * 0.04) * 0.15;
  ctx.fillStyle = c2; ctx.globalAlpha = pulse * 0.55;
  ctx.beginPath();
  for (const { x, hv } of crys) {
    const cw = hv * 0.2;
    ctx.moveTo(x, baseY - hv);
    ctx.lineTo(x + cw, baseY - hv * 0.32); ctx.lineTo(x + cw * 0.45, baseY);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function dustParticles(ctx, w, h, off, count, color, spd, maxYR) {
  // All particles in one path — one fill() call
  const tile = w * 2, maxY = h * maxYR;
  ctx.fillStyle = color; ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = ((p(i * 3) * tile - off * spd) % tile + tile) % tile;
    if (x > w) continue;
    const y = p(i * 3 + 1) * maxY + Math.sin(off * 0.02 + i * 1.9) * 9;
    const r = p(i * 3 + 2) * 1.6 + 0.4;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.28);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function groundGrad(ctx, w, h, baseYR, c1, c2) {
  const y = h * baseYR;
  const g = ctx.createLinearGradient(0, y, 0, h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h - y);
}

// ---- per-dungeon draw functions ----

function drawForest(ctx, w, h, off) {
  skyGrad(ctx, w, h, [[0, '#060e08'], [0.5, '#0e2012'], [0.82, '#1a3820'], [1, '#233d28']]);
  stars(ctx, w, h, off, 45, '#8fc8a0');
  moon(ctx, w * 0.78, h * 0.1, h * 0.075, '#c8e6d0');
  mtnLayer(ctx, w, h, 0.58, 0.16, '#091809', off, 0.015, 7);
  mtnLayer(ctx, w, h, 0.67, 0.11, '#0f2212', off, 0.04, 9);
  pineTrees(ctx, w, h, 0.83, 0.30, '#1a4828', '#122e18', off, 0.09, 15);
  pineTrees(ctx, w, h, 0.90, 0.38, '#0d2410', '#091608', off, 0.21, 9);
  groundGrad(ctx, w, h, 0.90, '#18381c', '#08100a');
}

function drawCrypt(ctx, w, h, off) {
  skyGrad(ctx, w, h, [[0, '#050710'], [0.4, '#0a0f1e'], [0.75, '#101828'], [1, '#162030']]);
  // stalactites
  const tile = w, sOff = (off * 0.012) % tile;
  ctx.fillStyle = '#0a1020';
  for (let i = 0; i < 22; i++) {
    const x = ((p(i * 2) * tile - sOff) % tile + tile) % tile;
    const sh = h * (0.07 + p(i * 2 + 1) * 0.14);
    const sw = h * 0.028;
    ctx.beginPath(); ctx.moveTo(x - sw, 0); ctx.lineTo(x + sw, 0); ctx.lineTo(x, sh); ctx.closePath(); ctx.fill();
  }
  // broken pillars
  const tile2 = w * 1.5, sOff2 = (off * 0.035) % tile2;
  for (let i = 0; i < 6; i++) {
    const x = ((p(i * 7 + 3) * tile2 - sOff2) % tile2 + tile2) % tile2;
    if (x > w + 50) continue;
    const ph = h * (0.22 + p(i * 7) * 0.22), pw = h * 0.07;
    const baseY = h * 0.90;
    ctx.fillStyle = '#10192e'; ctx.strokeStyle = '#1e2e48'; ctx.lineWidth = 1.5;
    ctx.fillRect(x - pw / 2, baseY - ph, pw, ph);
    ctx.strokeRect(x - pw / 2, baseY - ph, pw, ph);
    ctx.fillStyle = '#0d1525';
    ctx.beginPath(); ctx.arc(x, baseY - ph, pw / 2, Math.PI, 0); ctx.fill();
  }
  // small rubble rocks
  const tile3 = w * 1.2, sOff3 = (off * 0.1) % tile3;
  ctx.fillStyle = '#131d30';
  for (let i = 0; i < 14; i++) {
    const x = ((p(i * 5 + 11) * tile3 - sOff3) % tile3 + tile3) % tile3;
    if (x > w + 20) continue;
    const rh = h * (0.03 + p(i * 5) * 0.04), rw = rh * (1.2 + p(i * 5 + 2) * 0.8);
    ctx.beginPath(); ctx.ellipse(x, h * 0.89, rw, rh, p(i) * 0.8, 0, 6.28); ctx.fill();
  }
  dustParticles(ctx, w, h, off, 28, '#3a60a0', 0.08, 0.7);
  groundGrad(ctx, w, h, 0.90, '#141e34', '#07091a');
}

function drawAshen(ctx, w, h, off) {
  skyGrad(ctx, w, h, [[0, '#0d0404'], [0.3, '#220a0a'], [0.6, '#3d1010'], [0.85, '#5a1a1a'], [1, '#6e2020']]);
  // ember sun glow
  const sg = ctx.createRadialGradient(w * 0.18, h * 0.2, 0, w * 0.18, h * 0.2, w * 0.22);
  sg.addColorStop(0, '#ff5520'); sg.addColorStop(0.4, '#b82200'); sg.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.55; ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.5); ctx.globalAlpha = 1;
  // sun disc
  ctx.globalAlpha = 0.7; ctx.fillStyle = '#cc3300';
  ctx.beginPath(); ctx.arc(w * 0.18, h * 0.2, h * 0.065, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
  // ash smoke wisps
  for (let i = 0; i < 5; i++) {
    const wx = w * (0.05 + i * 0.2) + Math.sin(off * 0.008 + i * 1.3) * w * 0.05;
    const wg = ctx.createRadialGradient(wx, h * 0.1, 0, wx, h * 0.1, w * 0.18);
    wg.addColorStop(0, '#3a1a1a'); wg.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.18 + Math.sin(off * 0.01 + i) * 0.07;
    ctx.fillStyle = wg; ctx.fillRect(0, 0, w, h * 0.45);
  }
  ctx.globalAlpha = 1;
  mtnLayer(ctx, w, h, 0.63, 0.12, '#200808', off, 0.015, 6);
  mtnLayer(ctx, w, h, 0.73, 0.09, '#300c0c', off, 0.04, 8);
  deadTrees(ctx, w, h, 0.90, 0.32, '#160404', off, 0.1, 13);
  deadTrees(ctx, w, h, 0.90, 0.22, '#0e0303', off, 0.22, 8);
  dustParticles(ctx, w, h, off, 55, '#907060', 0.12, 0.82);
  groundGrad(ctx, w, h, 0.90, '#240c0c', '#0d0404');
}

function drawFrozen(ctx, w, h, off) {
  skyGrad(ctx, w, h, [[0, '#04090e'], [0.35, '#0a1825'], [0.7, '#12283c'], [1, '#1a3550']]);
  stars(ctx, w, h, off, 60, '#a0c8e0');
  moon(ctx, w * 0.72, h * 0.12, h * 0.08, '#d0eaf8');
  // aurora bands
  for (let i = 0; i < 3; i++) {
    const ax = w * (0.2 + i * 0.3) + Math.sin(off * 0.009 + i * 1.5) * w * 0.14;
    const ag = ctx.createRadialGradient(ax, h * 0.22, 0, ax, h * 0.22, w * 0.38);
    const pal = ['#20c8b0', '#8020c0', '#20a8e0'][i];
    ag.addColorStop(0, pal); ag.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.1 + Math.sin(off * 0.014 + i * 1.1) * 0.055;
    ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h * 0.55);
  }
  ctx.globalAlpha = 1;
  mtnLayer(ctx, w, h, 0.55, 0.22, '#0b1c2c', off, 0.012, 5);
  mtnLayer(ctx, w, h, 0.65, 0.14, '#122438', off, 0.033, 7);
  iceSpires(ctx, w, h, 0.90, 0.33, '#1a3a55', '#60b0d0', off, 0.085, 15);
  iceSpires(ctx, w, h, 0.90, 0.22, '#0e2238', '#3888b8', off, 0.2, 10);
  dustParticles(ctx, w, h, off, 65, '#c8e4f8', 0.09, 0.88);
  groundGrad(ctx, w, h, 0.90, '#183048', '#08121e');
}

function drawAbyss(ctx, w, h, off) {
  skyGrad(ctx, w, h, [[0, '#030108'], [0.4, '#0c0622'], [0.75, '#160a36'], [1, '#200f48']]);
  stars(ctx, w, h, off, 50, '#9060c8');
  // void rift cracks
  const riftCols = ['#7040e0', '#5025b0', '#8050f0', '#4018a0', '#9060d8', '#6030c0'];
  for (let i = 0; i < 6; i++) {
    const rx = w * p(i * 5 + 3);
    const pulse = 0.25 + Math.sin(off * 0.035 + i * 2.3) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = riftCols[i]; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx, 0);
    const mid1x = rx + (p(i * 5) - 0.5) * 30, mid1y = h * 0.25;
    const mid2x = rx + (p(i * 5 + 1) - 0.5) * 50, mid2y = h * 0.5;
    ctx.quadraticCurveTo(mid1x, mid1y, mid2x, mid2y); ctx.stroke();
    // glow
    ctx.lineWidth = 4; ctx.globalAlpha = pulse * 0.2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  voidRocks(ctx, w, h, 0.60, 0.2, '#180c30', off, 0.018, 10);
  voidRocks(ctx, w, h, 0.74, 0.13, '#110820', off, 0.055, 8);
  crystals(ctx, w, h, 0.90, 0.3, '#3a1868', '#a060e8', off, 0.1, 13);
  crystals(ctx, w, h, 0.90, 0.2, '#26103a', '#7840c0', off, 0.22, 9);
  dustParticles(ctx, w, h, off, 45, '#8050d0', 0.11, 0.82);
  groundGrad(ctx, w, h, 0.90, '#180830', '#060214');
}

const THEMES = {
  whispering_forest: drawForest,
  sunken_crypt: drawCrypt,
  ashen_wastes: drawAshen,
  frozen_citadel: drawFrozen,
  abyssal_rift: drawAbyss,
};

export function createParallax(colors, dungeonKey) {
  let offset = 0;
  const drawFn = THEMES[dungeonKey] || drawForest;
  void colors; // kept in signature for future image-layer swap

  return {
    update(dtMs, speedFactor = 1) {
      offset += dtMs * 0.055 * speedFactor;
    },
    draw(ctx, width, height) {
      drawFn(ctx, width, height, offset);
    },
  };
}
