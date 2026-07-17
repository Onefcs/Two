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
const MONSTER_BATTLE_X = 0.35;
const RANGED_CLASSES = new Set(['mage', 'archer']);
const PROJECTILE_TYPE = { mage: 'spell', archer: 'arrow' };
const SYNC_INTERVAL_MS = 30_000;

function xpForLevel(n) { return Math.round(100 * Math.pow(n, 2.2)); }

function weightedPick(items) {
  const total = items.reduce((s, m) => s + m.spawnWeight, 0);
  let r = Math.random() * total;
  for (const m of items) {
    r -= m.spawnWeight;
    if (r <= 0) return m;
  }
  return items[items.length - 1];
}

export const gameScreen = {
  container: null,
  loop: null,
  rendererHandle: null,
  canvasHandle: null,
  destroyed: false,
  phaseTimer: null,
  battleHandle: null,
  dungeons: [],
  dungeonData: null,      // { player, monsters[] } — cached per dungeon
  battleBuffer: [],       // [{ monsterId, outcome }] — flushed every 30s
  syncTimer: null,
  currentDungeonId: null,

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
    if (this.syncTimer) clearInterval(this.syncTimer);
    this._flushBattleBuffer();
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
    // Flush any buffered battles from the previous dungeon before switching
    this._flushBattleBuffer();

    const canvas = this.container.querySelector('#gameCanvas') || document.getElementById('gameCanvas');
    if (!canvas) return;
    this.canvasHandle = setupCanvas(canvas);
    this.rendererHandle = createRenderer(this.canvasHandle, dungeon);
    this.rendererHandle.setPlayerClass(character.class);
    this.rendererHandle.setPlayerX(0.05);
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

    this.dungeonData = null;
    this.battleBuffer = [];
    this.currentDungeonId = dungeon.id;

    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this._flushBattleBuffer(), SYNC_INTERVAL_MS);

    // Fetch dungeon data (monsters + player stats); start running immediately
    this._loadDungeonData(dungeon);
    this.runPhase(dungeon);
  },

  async _loadDungeonData(dungeon) {
    try {
      const data = await api.get(`/battles/dungeon-data?dungeonId=${dungeon.id}`);
      if (!this.destroyed && this.currentDungeonId === dungeon.id) {
        this.dungeonData = data;
      }
    } catch {
      // Will retry when startBattle sees null dungeonData
    }
  },

  _pickMonster() {
    const monsters = this.dungeonData?.monsters;
    if (!monsters?.length) return null;
    return weightedPick(monsters);
  },

  _applyRewardsLocally(monster, outcome) {
    if (outcome !== 'win') return;
    const char = getState().character;
    if (!char) return;

    const xpGain = monster.xpReward;
    const goldGain = Math.floor(Math.random() * (monster.goldMax - monster.goldMin + 1)) + monster.goldMin;

    let { level, xp, gold } = char;
    gold += goldGain;
    xp += xpGain;

    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
    }

    setCharacter({ ...char, gold, xp, level, xpForNextLevel: xpForLevel(level) });
  },

  async _flushBattleBuffer() {
    if (!this.battleBuffer.length || !this.currentDungeonId) return;
    const dungeonId = this.currentDungeonId;
    const toSend = this.battleBuffer.splice(0);
    try {
      const result = await api.post('/battles/sync', { dungeonId, battles: toSend });
      if (result?.character && !this.destroyed) {
        const prevLevel = getState().character?.level ?? 0;
        setCharacter({ ...result.character, liveHp: undefined });
        // Re-fetch dungeon data if player levelled up (new skills may unlock)
        if (result.character.level > prevLevel && this.currentDungeonId === dungeonId) {
          const dungeon = this.dungeons.find((d) => d.id === dungeonId);
          if (dungeon) this._loadDungeonData(dungeon);
        }
      }
    } catch {
      // On failure, merge back capped at 200 to avoid infinite accumulation
      const merged = [...toSend, ...this.battleBuffer].slice(0, 200);
      this.battleBuffer = merged;
    }
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

  // Monster runs from off-screen right to battle position, no bounce — pure horizontal.
  // approachControl.stopped = true stops the animation mid-way (when monster dies for ranged).
  animateMonsterApproach(monsterName, approachControl) {
    return new Promise((resolve) => {
      if (this.destroyed) { resolve(); return; }
      const startTime = performance.now();
      const fromX = 1.5;
      const toX = MONSTER_BATTLE_X;

      const tick = () => {
        if (this.destroyed || approachControl.stopped) { resolve(); return; }
        const t = Math.min(1, (performance.now() - startTime) / APPROACH_DURATION_MS);
        const ease = 1 - (1 - t) * (1 - t); // ease-out quad
        const x = fromX + (toX - fromX) * ease;
        this.rendererHandle.setMonster({ name: monsterName, hpPct: 1, x });
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

    let startResult;
    if (!boss) {
      if (!this.dungeonData) {
        // Still loading dungeon data; retry shortly
        this.phaseTimer = setTimeout(() => this.startBattle(dungeon, { boss: false }), 400);
        return;
      }
      const monster = this._pickMonster();
      if (!monster) {
        this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1000);
        return;
      }
      startResult = {
        monster: {
          id: monster.id,
          key: monster.key,
          name: monster.name,
          isBoss: false,
          stats: monster.stats,
          skills: monster.skills || [],
        },
        player: this.dungeonData.player,
      };
    } else {
      try {
        startResult = await api.post(`/dungeons/${dungeon.id}/boss/start`);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'network_error';
        toast(`Ошибка боя: ${msg}`);
        this.phaseTimer = setTimeout(() => this.runPhase(dungeon), 1500);
        return;
      }
    }
    if (this.destroyed) return;

    const { outcome, log } = simulateBattle(
      { id: startResult.player.id, stats: startResult.player.stats, skills: startResult.player.skills },
      { id: startResult.monster.id, stats: startResult.monster.stats, skills: startResult.monster.skills || [] }
    );

    const monsterMaxHp = startResult.monster.stats.hp;
    const { character } = getState();
    const isRanged = RANGED_CLASSES.has(character.class);
    const projType = PROJECTILE_TYPE[character.class] ?? null;
    const onPlayerAttack = projType
      ? () => this.rendererHandle.addProjectile(projType)
      : undefined;

    const approachControl = { stopped: false };
    this.rendererHandle.setPlayerHpPct(1);

    if (isRanged) {
      this.animateMonsterApproach(startResult.monster.name, approachControl);

      this.battleHandle = playBattleLog({
        renderer: this.rendererHandle,
        log,
        monsterMaxHp,
        playerMaxHp: character.effectiveStats.hp,
        onPlayerAttack,
        onMonsterDied: () => { approachControl.stopped = true; },
        onDone: () => this._onBattleDone(dungeon, startResult, outcome, boss),
      });
    } else {
      await this.animateMonsterApproach(startResult.monster.name, approachControl);
      if (this.destroyed) return;

      this.battleHandle = playBattleLog({
        renderer: this.rendererHandle,
        log,
        monsterMaxHp,
        playerMaxHp: character.effectiveStats.hp,
        onPlayerAttack,
        onDone: () => this._onBattleDone(dungeon, startResult, outcome, boss),
      });
    }

    this.battleHandle.setMonsterName(startResult.monster.name);
  },

  _onBattleDone(dungeon, startResult, outcome, boss) {
    if (this.destroyed) return;
    this.rendererHandle.setMonster(null);

    if (boss) {
      api.post(`/dungeons/${dungeon.id}/boss/finish`, {
        monsterId: startResult.monster.id,
        outcome,
      })
        .then((r) => { if (!this.destroyed) setCharacter({ ...r.character, liveHp: undefined }); })
        .catch(() => {});

      if (outcome === 'win') {
        this.render();
      } else {
        this.runPhase(dungeon);
      }
    } else {
      // Queue for 30s batch sync; apply gold/xp optimistically right now
      this.battleBuffer.push({ monsterId: startResult.monster.id, outcome });
      const localMonster = this.dungeonData?.monsters?.find((m) => m.id === startResult.monster.id);
      if (localMonster) this._applyRewardsLocally(localMonster, outcome);
      this.runPhase(dungeon);
    }
  },
};
