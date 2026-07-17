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
  let projectiles = [];
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
    if (m === null) { monster = null; return; }
    // Merge so approach animation owns x while battleView updates hpPct independently
    monster = monster ? { ...monster, ...m } : m;
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

  // Spawn a projectile flying from player toward the monster.
  // type: 'arrow' | 'spell'
  function addProjectile(type) {
    const width = canvasHandle.width();
    const height = canvasHandle.height();
    const groundY = height * GROUND_Y_RATIO;
    const charH = height * CHAR_HEIGHT_RATIO;

    // Launch point: right side of player sprite, at mid-chest
    const fromX = width * playerX + charH * 0.55;
    const fromY = groundY - charH * 0.62;

    // Target: center of monster silhouette
    const mx = width * (monster ? (monster.x ?? 0.40) : 0.40);
    const mh = charH * 0.9;
    const toX = mx + mh * 0.35;
    const toY = groundY - mh * 0.55;

    projectiles.push({
      type,
      fromX, fromY, toX, toY,
      progress: 0,
      duration: type === 'arrow' ? 320 : 420,
    });
  }

  function update(dtMs) {
    parallax.update(dtMs, speedFactor);
    animator?.update(dtMs);
    for (const ft of floatingTexts) ft.age += dtMs;
    floatingTexts = floatingTexts.filter((ft) => ft.age < ft.life);
    for (const p of projectiles) p.progress += dtMs / p.duration;
    projectiles = projectiles.filter((p) => p.progress <= 1);
  }

  function drawHpBar(ctx, x, y, w, pct, color) {
    ctx.fillStyle = '#00000080';
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, pct), 6);
  }

  function drawProjectile(ctx, proj) {
    const t = proj.progress;
    const x = proj.fromX + (proj.toX - proj.fromX) * t;
    // Slight upward arc: peaks at t=0.5
    const arcHeight = Math.min(Math.abs(proj.toY - proj.fromY) * 0.4, 18);
    const y = proj.fromY + (proj.toY - proj.fromY) * t - Math.sin(t * Math.PI) * arcHeight;

    ctx.save();

    if (proj.type === 'arrow') {
      // Arrow pointing along travel direction (tangent of the arc)
      const dx = proj.toX - proj.fromX;
      // dy = straight component - arc derivative: d/dt[-sin(t*PI)*h] = -cos(t*PI)*PI*h
      const dy = (proj.toY - proj.fromY) - Math.cos(t * Math.PI) * Math.PI * arcHeight;
      const angle = Math.atan2(dy, dx);

      ctx.translate(x, y);
      ctx.rotate(angle);

      // Shaft
      ctx.strokeStyle = '#a0784a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#d4c060';
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(5, -3);
      ctx.lineTo(5, 3);
      ctx.closePath();
      ctx.fill();

      // Fletching
      ctx.strokeStyle = '#c8b090';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(-18, -4);
      ctx.moveTo(-14, 0); ctx.lineTo(-18,  4);
      ctx.stroke();

    } else {
      // Spell orb — glowing trail then bright core
      const trailCount = 4;
      for (let i = trailCount; i >= 1; i--) {
        const trailT = Math.max(0, t - i * 0.07);
        const tx = proj.fromX + (proj.toX - proj.fromX) * trailT;
        const ty = proj.fromY + (proj.toY - proj.fromY) * trailT
                 - Math.sin(trailT * Math.PI) * arcHeight;
        ctx.globalAlpha = (0.5 / i) * (1 - t * 0.6);
        ctx.fillStyle = '#7b2fbe';
        ctx.beginPath();
        ctx.arc(tx, ty, 5 - i * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer glow
      ctx.globalAlpha = 0.9 - t * 0.3;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 14);
      grd.addColorStop(0,   'rgba(240, 200, 255, 0.9)');
      grd.addColorStop(0.35,'rgba(170,  80, 255, 0.7)');
      grd.addColorStop(1,   'rgba(100,  30, 200, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
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
      const mx = width * (monster.x ?? 0.40);
      const mh = charH * 0.9;
      const my = groundY - mh + (monster.yOffset ?? 0);
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

    // Projectiles drawn above characters
    for (const proj of projectiles) {
      drawProjectile(ctx, proj);
    }

    for (const ft of floatingTexts) {
      const baseX = ft.target === 'monster' ? width * (monster?.x ?? 0.40) + 20 : px + charH * 0.3;
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
    setSpeedFactor, addFloatingText, addProjectile, update, draw, destroy,
  };
}
