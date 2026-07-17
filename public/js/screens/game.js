import { el, mount } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { getState, setCharacter } from '../state.js';
import { toast } from '../ui/modal.js';
import { setupCanvas } from '../game/canvas.js';
import { createRenderer } from '../game/renderer.js';
import { createLoop } from '../game/loop.js';
import { playBattleLog } from '../game/battleView.js';
import { formatNumber } from '../utils/format.js';

const RUN_DURATION_MS = 3000;

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

    const dungeonBar = el('div', { class: 'panel', style: 'margin:12px 12px 0;padding:8px 12px;' }, [
      el('div', { class: 'row' }, [
        el('div', {}, currentDungeon ? `📍 ${currentDungeon.name}` : 'Подземелье не выбрано'),
        el('button', { class: 'btn small', onClick: () => this.renderDungeonPicker() }, 'Сменить'),
      ]),
    ]);

    const canvasWrap = el('div', { class: 'game-canvas-wrap' }, [el('canvas', { id: 'gameCanvas' })]);
    const bossRow = el('div', { class: 'game-controls' });
    const logPanel = el('div', { class: 'game-log' });

    mount(this.container, el('div', {}, [dungeonBar, canvasWrap, bossRow, logPanel]));
    this.logPanel = logPanel;
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
    this.rendererHandle = createRenderer(this.canvasHandle, dungeon.backgroundLayers?.colors || ['#1a1a2a', '#242438']);
    this.rendererHandle.setPlayerClass(character.class);
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

  logLine(text) {
    if (!this.logPanel) return;
    this.logPanel.insertBefore(el('div', {}, text), this.logPanel.firstChild);
    while (this.logPanel.children.length > 20) this.logPanel.removeChild(this.logPanel.lastChild);
  },

  runPhase(dungeon) {
    if (this.destroyed) return;
    this.rendererHandle.setPlayerState('run');
    this.rendererHandle.setMonster(null);
    this.rendererHandle.setSpeedFactor(1);
    const start = performance.now();
    const animateRun = () => {
      if (this.destroyed) return;
      const t = Math.min(1, (performance.now() - start) / RUN_DURATION_MS);
      this.rendererHandle.setPlayerX(0.1 + t * 0.35);
      if (t < 1) requestAnimationFrame(animateRun);
    };
    animateRun();
    this.phaseTimer = setTimeout(() => this.startBattle(dungeon, { boss: false }), RUN_DURATION_MS);
  },

  async fightBoss(dungeon) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.startBattle(dungeon, { boss: true });
  },

  async startBattle(dungeon, { boss }) {
    if (this.destroyed) return;
    this.rendererHandle.setPlayerX(0.16);
    this.rendererHandle.setPlayerState('idle');
    this.rendererHandle.setSpeedFactor(0);

    let result;
    try {
      result = boss
        ? await api.post(`/dungeons/${dungeon.id}/boss`)
        : await api.post('/battles/resolve', { dungeonId: dungeon.id });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'network_error';
      toast(`Ошибка боя: ${msg}`);
      this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1500);
      return;
    }
    if (this.destroyed) return;

    const { character } = getState();
    const monsterMaxHp = result.monster.hp;
    this.rendererHandle.setMonster({ name: result.monster.name, hpPct: 1, x: 0.68 });
    this.rendererHandle.setPlayerHpPct(1);

    this.battleHandle = playBattleLog({
      renderer: this.rendererHandle,
      log: result.log,
      monsterMaxHp,
      playerMaxHp: character.effectiveStats.hp,
      onDone: () => {
        if (this.destroyed) return;
        this.rendererHandle.setMonster(null);
        setCharacter({ ...result.character, liveHp: undefined });

        if (result.outcome === 'win') {
          const lootText = result.rewards.items.length > 0
            ? ` +${result.rewards.items.map((i) => i.name).join(', ')}`
            : '';
          this.logLine(`✅ Победа над ${result.monster.name}: +${formatNumber(result.rewards.xp)} XP, +${formatNumber(result.rewards.gold)} золота${lootText}`);
        } else if (result.outcome === 'loss') {
          this.logLine(`💀 Поражение от ${result.monster.name}`);
        } else {
          this.logLine(`⏱ Бой с ${result.monster.name} затянулся без победителя`);
        }

        if (boss && result.outcome === 'win') {
          this.render();
        } else {
          this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1200);
        }
      },
    });
    this.battleHandle.setMonsterName(result.monster.name);
  },
};
