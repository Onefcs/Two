const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const { weightedPick } = require('../lib/rng');

async function listDungeons(characterId, characterLevel) {
  const { rows: dungeons } = await pool.query('SELECT * FROM dungeons ORDER BY order_index');
  const { rows: progress } = await pool.query(
    'SELECT dungeon_id, boss_defeated FROM character_dungeon_progress WHERE character_id = $1',
    [characterId]
  );
  const progressByDungeon = new Map(progress.map((p) => [p.dungeon_id, p.boss_defeated]));

  return dungeons.map((d) => ({
    id: d.id,
    key: d.key,
    name: d.name,
    orderIndex: d.order_index,
    minCharacterLevel: d.min_character_level,
    bossUnlockLevel: d.boss_unlock_level,
    backgroundLayers: d.background_layers,
    unlocked: characterLevel >= d.min_character_level,
    bossUnlocked: characterLevel >= d.boss_unlock_level,
    bossDefeated: progressByDungeon.get(d.id) || false,
  }));
}

async function getDungeon(dungeonId) {
  const { rows } = await pool.query('SELECT * FROM dungeons WHERE id = $1', [dungeonId]);
  if (!rows[0]) throw httpError(404, 'dungeon_not_found');
  return rows[0];
}

async function enterDungeon(characterId, dungeonId, characterLevel) {
  const dungeon = await getDungeon(dungeonId);
  if (characterLevel < dungeon.min_character_level) throw httpError(400, 'dungeon_locked');

  await pool.query('UPDATE characters SET current_dungeon_id = $1, updated_at = now() WHERE id = $2', [dungeonId, characterId]);
  await pool.query(
    `INSERT INTO character_dungeon_progress (character_id, dungeon_id) VALUES ($1, $2)
     ON CONFLICT (character_id, dungeon_id) DO NOTHING`,
    [characterId, dungeonId]
  );
  return dungeon;
}

async function pickMonster(dungeonId, { boss }) {
  if (boss) {
    const { rows } = await pool.query('SELECT * FROM monsters WHERE dungeon_id = $1 AND is_boss = true', [dungeonId]);
    if (!rows[0]) throw httpError(404, 'boss_not_found');
    return rows[0];
  }
  const { rows } = await pool.query('SELECT * FROM monsters WHERE dungeon_id = $1 AND is_boss = false', [dungeonId]);
  if (rows.length === 0) throw httpError(404, 'no_monsters');
  const picked = weightedPick(rows.map((m) => ({ ...m, weight: m.spawn_weight })));
  return picked;
}

module.exports = { listDungeons, getDungeon, enterDungeon, pickMonster };
