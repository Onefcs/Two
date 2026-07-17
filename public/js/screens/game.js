import { el, mount } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { getState, setCharacter } from '../state.js';
import { toast } from '../ui/modal.js';
import { setupCanvas } from '../game/canvas.js';
import { createRenderer } from '../game/renderer.js';
import { createLoop } from '../game/loop.js';
import { playBattleLog } from '../game/battleView.js';
import { simulateBattle } from '../game/battleSim.js';
import { formatNumber } from '../utils/format.js';

const RUN_DURATION_MS = 3000;
const APPROACH_DURATION_MS = 1200;

export const gameScreen = {
  container: null,
  loop: null,
  rendererHandle: null,
  canvasHandle: null,
  destroyed: false,
  phaseTimer: null,
  battleHandle: null,
  dungeons: [],
  // Pre-fetched monster data so approach starts instantly when run ends
  pendingBattle: null,
  pendingBattlePromise: null,

  async mount(container) {
    this.container = container;
    this.destroyed = false;
    mount(container, el('div', { class: 'screen' }, 'Загрузка...'));

    try {
      const { dungeons } = await api.get('/dungeons');
      if (this.destroyed) return;
      this.dungeons = dungeons;
      this.render();
    } catch (err) {
      if (this.destroyed) return;
      mount(container, el('div', { class: 'screen' }, 'Не удалось загрузить подземелья.'));
      void err;
    }
  },

  unmount() {
    this.destroyed = true;
    this.loop?.stop();
    this.battleHandle?.cancel();
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.rendererHandle?.destroy();
  },

  render() {
    const { character } = getState();
    const currentDungeon = this.dungeons.find((d) => d.id === character.currentDungeonId) || null;

    const bossRow = el('div', { class: 'game-hud-bottom' });
    const canvasWrap = el('div', { class: 'game-canvas-wrap' }, [
      el('canvas', { id: 'gameCanvas' }),
      el('div', { class: 'game-hud-top' }, [
        el('span', { class: 'game-hud-label' }, currentDungeon ? `📍 ${currentDungeon.name}` : 'Подземелье не выбрано'),
        el('button', { class: 'btn small', onClick: () => this.renderDungeonPicker() }, 'Сменить'),
      ]),
      bossRow,
    ]);

    mount(this.container, el('div', { class: 'game-screen' }, [canvasWrap]));
    this.bossRow = bossRow;

    if (!currentDungeon) {
      this.renderDungeonPicker();
      return;
    }

    this.startCanvas(currentDungeon, character);
  },

  renderDungeonPicker() {
    const { character } = getState();
    const list = el('div', { class: 'screen' }, [
      el('h2', { style: 'margin:4px 0 12px' }, 'Выберите подземелье'),
      ...this.dungeons.map((d) =>
        el('div', {
          class: `dungeon-card${d.unlocked ? '' : ' locked'}${d.id === character.currentDungeonId ? ' active' : ''}`,
          onClick: async () => {
            if (!d.unlocked) { toast(`Откроется на уровне ${d.minCharacterLevel}`); return; }
            try {
              await api.post(`/dungeons/${d.id}/enter`);
              const updatedChar = await api.get('/character');
              setCharacter(updatedChar);
              this.render();
            } catch (err) {
              toast('Не удалось войти в подземелье.');
              void err;
            }
          },
        }, [
          el('div', { class: 'swatch', style: `background:${d.backgroundLayers?.colors?.[1] || '#333'}` }),
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, d.name),
            el('div', { class: 'meta' }, d.unlocked
              ? (d.bossDefeated ? 'Босс повержен' : `Требуется уровень ${d.minCharacterLevel}`)
              : `🔒 Уровень ${d.minCharacterLevel}`),
          ]),
        ])
      ),
    ]);
    mount(this.container, list);
  },

  startCanvas(dungeon, character) {
    const canvas = this.container.querySelector('#gameCanvas') || document.getElementById('gameCanvas');
    if (!canvas) return;
    this.canvasHandle = setupCanvas(canvas);
    this.rendererHandle = createRenderer(this.canvasHandle, dungeon);
    this.rendererHandle.setPlayerClass(character.class);
    this.rendererHandle.setPlayerX(0.2);
    this.rendererHandle.setPlayerState('run');

    this.loop = createLoop((dt) => {
      this.rendererHandle.update(dt);
      this.rendererHandle.draw();
    });
    this.loop.start();

    this.bossRow.appendChild(
      el('button', {
        class: 'btn danger',
        style: dungeon.bossUnlocked ? '' : 'display:none',
        onClick: () => this.fightBoss(dungeon),
      }, dungeon.bossDefeated ? '👑 Босс повержен (повторить)' : '👑 Бой с боссом')
    );

    this.runPhase(dungeon);
  },

  runPhase(dungeon) {
    if (this.destroyed) return;
    this.rendererHandle.setPlayerState('run');
    this.rendererHandle.setMonster(null);
    this.rendererHandle.setSpeedFactor(1);

    // Pre-fetch monster data during run so it's ready the moment the run ends
    this.pendingBattle = null;
    this.pendingBattlePromise = api.post('/battles/start', { dungeonId: dungeon.id })
      .then((data) => { this.pendingBattle = data; return data; })
      .catch(() => null);

    this.phaseTimer = setTimeout(() => this.startBattle(dungeon, { boss: false }), RUN_DURATION_MS);
  },

  async fightBoss(dungeon) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.battleHandle?.cancel();
    this.pendingBattle = null;
    this.pendingBattlePromise = null;
    this.startBattle(dungeon, { boss: true });
  },

  // Monster runs from off-screen right toward battle position with a running bounce
  animateMonsterApproach(monsterName) {
    return new Promise((resolve) => {
      if (this.destroyed) { resolve(); return; }
      const startTime = performance.now();
      const fromX = 1.5;
      const toX = 0.68;

      const tick = () => {
        if (this.destroyed) { resolve(); return; }
        const t = Math.min(1, (performance.now() - startTime) / APPROACH_DURATION_MS);
        // ease-out quad — fast start, slows as monster reaches position
        const ease = 1 - (1 - t) * (1 - t);
        const x = fromX + (toX - fromX) * ease;
        // vertical bounce — feet leave ground 5 times during approach, amplitude fades near end
        const yOffset = -Math.abs(Math.sin(t * Math.PI * 5)) * 8 * (1 - t * 0.7);
        this.rendererHandle.setMonster({ name: monsterName, hpPct: 1, x, yOffset });
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  },

  async startBattle(dungeon, { boss }) {
    if (this.destroyed) return;
    this.rendererHandle.setPlayerState('idle');
    this.rendererHandle.setSpeedFactor(0);

    // Use pre-fetched data if available (normal battles), otherwise fetch now (boss)
    let startResult;
    try {
      if (!boss && this.pendingBattle) {
        startResult = this.pendingBattle;
      } else if (!boss && this.pendingBattlePromise) {
        startResult = await this.pendingBattlePromise;
        if (!startResult) throw new Error('prefetch_failed');
      } else {
        startResult = await api.post(`/dungeons/${dungeon.id}/boss/start`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'network_error';
      toast(`Ошибка боя: ${msg}`);
      this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1500);
      return;
    }
    if (this.destroyed) return;

    // Simulate battle client-side — instant, no network
    const { outcome, log } = simulateBattle(
      { id: startResult.player.id, stats: startResult.player.stats, skills: startResult.player.skills },
      { id: startResult.monster.id, stats: startResult.monster.stats, skills: startResult.monster.skills || [] }
    );

    const monsterMaxHp = startResult.monster.stats.hp;
    const { character } = getState();

    // Monster runs in from right
    this.rendererHandle.setPlayerHpPct(1);
    await this.animateMonsterApproach(startResult.monster.name);
    if (this.destroyed) return;

    // Play battle animation
    this.battleHandle = playBattleLog({
      renderer: this.rendererHandle,
      log,
      monsterMaxHp,
      playerMaxHp: character.effectiveStats.hp,
      onDone: () => {
        if (this.destroyed) return;
        this.rendererHandle.setMonster(null);

        // Report to server in background — don't block the run phase
        const monsterId = startResult.monster.id;
        const finishPath = boss
          ? `/dungeons/${dungeon.id}/boss/finish`
          : '/battles/finish';
        const finishBody = boss
          ? { monsterId, outcome }
          : { dungeonId: dungeon.id, monsterId, outcome };

        api.post(finishPath, finishBody)
          .then((r) => { if (!this.destroyed) setCharacter({ ...r.character, liveHp: undefined }); })
          .catch(() => {});

        // Immediately continue — no waiting
        if (boss && outcome === 'win') {
          this.render();
        } else {
          this.runPhase(dungeon);
        }
      },
    });
    this.battleHandle.setMonsterName(startResult.monster.name);
  },
};
