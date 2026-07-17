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
const APPROACH_DURATION_MS = 800;

export const gameScreen = {
  container: null,
  loop: null,
  rendererHandle: null,
  canvasHandle: null,
  destroyed: false,
  phaseTimer: null,
  battleHandle: null,
  dungeons: [],

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
    this.phaseTimer = setTimeout(() => this.startBattle(dungeon, { boss: false }), RUN_DURATION_MS);
  },

  async fightBoss(dungeon) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.battleHandle?.cancel();
    this.startBattle(dungeon, { boss: true });
  },

  // Smoothly slides monster from off-screen (x=1.2) to battle position (x=0.68)
  animateMonsterApproach(monsterName) {
    return new Promise((resolve) => {
      if (this.destroyed) { resolve(); return; }
      const start = performance.now();
      const fromX = 1.2;
      const toX = 0.68;
      const tick = () => {
        if (this.destroyed) { resolve(); return; }
        const t = Math.min(1, (performance.now() - start) / APPROACH_DURATION_MS);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        this.rendererHandle.setMonster({ name: monsterName, hpPct: 1, x: fromX + (toX - fromX) * ease });
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

    // 1. Fetch monster + player data from server
    let startResult;
    try {
      startResult = boss
        ? await api.post(`/dungeons/${dungeon.id}/boss/start`)
        : await api.post('/battles/start', { dungeonId: dungeon.id });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'network_error';
      toast(`Ошибка боя: ${msg}`);
      this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1500);
      return;
    }
    if (this.destroyed) return;

    // 2. Simulate battle on client
    const { outcome, log } = simulateBattle(
      { id: startResult.player.id, stats: startResult.player.stats, skills: startResult.player.skills },
      { id: startResult.monster.id, stats: startResult.monster.stats, skills: startResult.monster.skills || [] }
    );

    const monsterMaxHp = startResult.monster.stats.hp;
    const { character } = getState();

    // 3. Monster runs toward player
    this.rendererHandle.setMonster({ name: startResult.monster.name, hpPct: 1, x: 1.2 });
    this.rendererHandle.setPlayerHpPct(1);
    await this.animateMonsterApproach(startResult.monster.name);
    if (this.destroyed) return;

    // 4. Play battle log animation
    this.battleHandle = playBattleLog({
      renderer: this.rendererHandle,
      log,
      monsterMaxHp,
      playerMaxHp: character.effectiveStats.hp,
      onDone: async () => {
        if (this.destroyed) return;
        this.rendererHandle.setMonster(null);

        // 5. Report outcome to server → get rewards + updated character
        let finishResult;
        try {
          finishResult = boss
            ? await api.post(`/dungeons/${dungeon.id}/boss/finish`, {
                monsterId: startResult.monster.id, outcome,
              })
            : await api.post('/battles/finish', {
                dungeonId: dungeon.id, monsterId: startResult.monster.id, outcome,
              });
        } catch (err) {
          void err;
          // Continue the run loop even if the server call fails
          this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1200);
          return;
        }

        setCharacter({ ...finishResult.character, liveHp: undefined });

        if (outcome === 'win') {
          const lootText = finishResult.rewards.items.length > 0
            ? ` +${finishResult.rewards.items.map((i) => i.name).join(', ')}`
            : '';
          void lootText; // log removed from UI; could show toast here if desired
        }

        if (boss && outcome === 'win') {
          this.render();
        } else {
          this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1200);
        }
      },
    });
    this.battleHandle.setMonsterName(startResult.monster.name);
  },
};
