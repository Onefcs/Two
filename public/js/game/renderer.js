import { createParallax } from './parallax.js';
import { createAnimator } from './spriteAnimator.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';

const GROUND_Y_RATIO = 0.90;
const CHAR_HEIGHT_RATIO = 0.10;

export function createRenderer(canvasHandle, dungeon) {
  const parallax = createParallax(
    dungeon.backgroundLayers?.colors || ['#1a1a2a'],
    dungeon.key || 'whispering_forest',
  );
  let animator = null;
  let playerX = 0.12;
  let monster = null;
  let floatingTexts = [];
  let playerHpPct = 1;
  let speedFactor = 1;

  // OffscreenCanvas: parallax drawn at 30fps, blitted every frame
  let bgCanvas = null;
  let bgCtx = null;
  let bgTick = 0;

  function setPlayerClass(cls) {
    animator = createAnimator(CHARACTER_SPRITES[cls]);
  }

  function setPlayerState(state) {
    animator?.setState(state);
  }

  function setPlayerX(fraction) {
    playerX = fraction;
  }

  function setMonster(m) {
    monster = m;
  }

  function setPlayerHpPct(pct) {
    playerHpPct = Math.max(0, Math.min(1, pct));
  }

  function setSpeedFactor(f) {
    speedFactor = f;
  }

  function addFloatingText(text, color, target) {
    floatingTexts.push({ text, color, target, life: 900, age: 0 });
  }

  function update(dtMs) {
    parallax.update(dtMs, speedFactor);
    animator?.update(dtMs);
    for (const ft of floatingTexts) ft.age += dtMs;
    floatingTexts = floatingTexts.filter((ft) => ft.age < ft.life);
  }

  function drawHpBar(ctx, x, y, w, pct, color) {
    ctx.fillStyle = '#00000080';
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, pct), 6);
  }

  function draw() {
    const ctx = canvasHandle.ctx;
    const width = canvasHandle.width();
    const height = canvasHandle.height();

    // Sync offscreen canvas size
    if (!bgCanvas || bgCanvas.width !== width || bgCanvas.height !== height) {
      bgCanvas = new OffscreenCanvas(width, height);
      bgCtx = bgCanvas.getContext('2d');
      bgTick = 0;
    }
    // Render parallax at 30fps (every other frame)
    if (bgTick % 2 === 0) {
      parallax.draw(bgCtx, width, height);
      bgCtx.fillStyle = '#00000030';
      bgCtx.fillRect(0, height * GROUND_Y_RATIO, width, height - height * GROUND_Y_RATIO);
    }
    bgTick++;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bgCanvas, 0, 0);

    const groundY = height * GROUND_Y_RATIO;

    const charH = height * CHAR_HEIGHT_RATIO;
    const px = width * playerX;
    const py = groundY - charH;
    if (animator) {
      animator.draw(ctx, px, py, charH, false);
      drawHpBar(ctx, px, py - 12, charH * 0.8, playerHpPct, '#e0453f');
    }

    if (monster) {
      const mx = width * (monster.x ?? 0.68);
      const mh = charH * 0.9;
      const my = groundY - mh;
      ctx.fillStyle = '#2a2f3d';
      ctx.strokeStyle = '#5a6478';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mx, my, mh * 0.7, mh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8e8ec';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(monster.name, mx + (mh * 0.7) / 2, my - 16);
      drawHpBar(ctx, mx, my - 10, mh * 0.7, monster.hpPct, '#f2716c');
    }

    for (const ft of floatingTexts) {
      const baseX = ft.target === 'monster' ? width * (monster?.x ?? 0.68) + 20 : px + charH * 0.3;
      const baseY = (ft.target === 'monster' ? groundY - charH * 0.9 : py) - (ft.age / ft.life) * 30;
      ctx.globalAlpha = 1 - ft.age / ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, baseX, baseY);
      ctx.globalAlpha = 1;
    }
  }

  function destroy() {
    canvasHandle.destroy();
  }

  return {
    setPlayerClass, setPlayerState, setPlayerX, setMonster, setPlayerHpPct,
    setSpeedFactor, addFloatingText, update, draw, destroy,
  };
}
