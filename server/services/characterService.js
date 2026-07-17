const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const CHARACTERS = require('../content/characters');
const { CLASSES, UPGRADE_STAT_PER_LEVEL, upgradeCost, xpForLevel } = require('../content/constants');

const STAT_KEYS = ['hp', 'attack', 'defense', 'attack_speed', 'crit_chance', 'crit_dmg', 'lifesteal'];

async function createCharacter(userId, characterClass, name) {
  if (!CLASSES.includes(characterClass)) throw httpError(400, 'invalid_class');
  const cleanName = (name || '').trim();
  if (cleanName.length < 2 || cleanName.length > 20) throw httpError(400, 'invalid_name');

  const existing = await pool.query('SELECT id FROM characters WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) throw httpError(409, 'character_exists');

  const base = CHARACTERS[characterClass].baseStats;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const charRes = await client.query(
      `INSERT INTO characters (user_id, class, name) VALUES ($1,$2,$3) RETURNING *`,
      [userId, characterClass, cleanName]
    );
    const character = charRes.rows[0];

    await client.query(
      `INSERT INTO character_stats (character_id, base_hp, base_attack, base_defense, base_attack_speed, base_crit_chance, base_crit_dmg, base_lifesteal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [character.id, base.hp, base.attack, base.defense, base.attack_speed, base.crit_chance, base.crit_dmg, base.lifesteal]
    );

    for (const statKey of STAT_KEYS) {
      await client.query(
        `INSERT INTO character_upgrades (character_id, stat_key, level) VALUES ($1,$2,0)`,
        [character.id, statKey]
      );
    }

    await client.query('COMMIT');
    return character;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rerollCharacter(userId) {
  const result = await pool.query('DELETE FROM characters WHERE user_id = $1 RETURNING id', [userId]);
  if (result.rows.length === 0) throw httpError(404, 'no_character');
}

function computePower(stats) {
  return Math.round(
    stats.attack * 2 +
    stats.defense * 1.5 +
    stats.hp * 0.1 +
    stats.attack_speed * 40 +
    stats.crit_chance * 150 +
    stats.crit_dmg * 80 +
    stats.lifesteal * 100
  );
}

// Sums base stats + flat upgrade bonuses + equipped item rolled_stats.
function computeEffectiveStats(baseStats, upgrades, equippedItems) {
  const stats = { ...baseStats };
  for (const upgrade of upgrades) {
    const perLevel = UPGRADE_STAT_PER_LEVEL[upgrade.stat_key];
    stats[upgrade.stat_key] += perLevel * upgrade.level;
  }
  for (const item of equippedItems) {
    for (const [stat, value] of Object.entries(item.rolled_stats || {})) {
      if (stats[stat] === undefined) continue;
      stats[stat] += Number(value);
    }
  }
  return stats;
}

async function getFullCharacter(characterId, client = pool) {
  const [charRes, statsRes, upgradesRes, equippedRes] = await Promise.all([
    client.query('SELECT * FROM characters WHERE id = $1', [characterId]),
    client.query('SELECT * FROM character_stats WHERE character_id = $1', [characterId]),
    client.query('SELECT stat_key, level FROM character_upgrades WHERE character_id = $1', [characterId]),
    client.query(
      `SELECT ii.id AS instance_id, ii.equipped_slot, ii.rolled_stats, i.class_restriction, i.name, i.rarity, i.slot
       FROM item_instances ii JOIN items i ON i.id = ii.item_id
       WHERE ii.character_id = $1 AND ii.equipped_slot IS NOT NULL`,
      [characterId]
    ),
  ]);

  const character = charRes.rows[0];
  if (!character) return null;
  const statsRow = statsRes.rows[0];
  const baseStats = {
    hp: Number(statsRow.base_hp),
    attack: Number(statsRow.base_attack),
    defense: Number(statsRow.base_defense),
    attack_speed: Number(statsRow.base_attack_speed),
    crit_chance: Number(statsRow.base_crit_chance),
    crit_dmg: Number(statsRow.base_crit_dmg),
    lifesteal: Number(statsRow.base_lifesteal),
  };
  const upgrades = upgradesRes.rows;
  const equippedItems = equippedRes.rows;
  const effectiveStats = computeEffectiveStats(baseStats, upgrades, equippedItems);
  const power = computePower(effectiveStats);

  return {
    id: character.id,
    userId: character.user_id,
    class: character.class,
    name: character.name,
    level: character.level,
    xp: Number(character.xp),
    xpForNextLevel: xpForLevel(character.level),
    gold: Number(character.gold),
    currentDungeonId: character.current_dungeon_id,
    baseStats,
    upgrades: Object.fromEntries(upgrades.map((u) => [u.stat_key, u.level])),
    upgradeCosts: Object.fromEntries(upgrades.map((u) => [u.stat_key, upgradeCost(u.stat_key, u.level)])),
    equippedItems,
    effectiveStats,
    power,
  };
}

async function applyXpAndGold(client, characterId, xpGain, goldGain) {
  const res = await client.query('SELECT level, xp, gold FROM characters WHERE id = $1 FOR UPDATE', [characterId]);
  let { level, xp, gold } = res.rows[0];
  xp = Number(xp) + xpGain;
  gold = Number(gold) + goldGain;

  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }

  await client.query('UPDATE characters SET level = $1, xp = $2, gold = $3, updated_at = now() WHERE id = $4', [
    level, xp, gold, characterId,
  ]);
  return { level, xp, gold, leveledUp };
}

module.exports = {
  STAT_KEYS,
  createCharacter,
  rerollCharacter,
  computePower,
  computeEffectiveStats,
  getFullCharacter,
  applyXpAndGold,
};
