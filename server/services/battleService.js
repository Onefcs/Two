const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const { randomInt } = require('../lib/rng');
const characterService = require('./characterService');
const dungeonService = require('./dungeonService');
const lootService = require('./lootService');
const { simulateBattle } = require('./battleEngine');

async function getSkillsForClass(characterClass, level) {
  const { rows } = await pool.query(
    'SELECT * FROM skills WHERE class = $1 AND unlock_level <= $2 ORDER BY priority',
    [characterClass, level]
  );
  return rows.map((s) => ({
    key: s.key,
    name: s.name,
    cooldown_ms: s.cooldown_ms,
    priority: s.priority,
    effect_type: s.effect_type,
    power_multiplier: Number(s.power_multiplier),
    extra: s.extra,
    unlock_level: s.unlock_level,
  }));
}

async function resolveBattle(userId, characterId, dungeonId, { boss = false } = {}) {
  const character = await characterService.getFullCharacter(characterId);
  if (!character || character.userId !== userId) throw httpError(404, 'no_character');

  const dungeon = await dungeonService.getDungeon(dungeonId);
  if (character.level < dungeon.min_character_level) throw httpError(400, 'dungeon_locked');
  if (boss && character.level < dungeon.boss_unlock_level) throw httpError(400, 'boss_locked');

  const monster = await dungeonService.pickMonster(dungeonId, { boss });
  const skills = await getSkillsForClass(character.class, character.level);

  const playerCombatant = { id: character.id, stats: character.effectiveStats, skills };
  const monsterCombatant = {
    id: monster.id,
    stats: {
      hp: Number(monster.hp), attack: Number(monster.attack), defense: Number(monster.defense),
      attack_speed: Number(monster.attack_speed), crit_chance: Number(monster.crit_chance),
      crit_dmg: Number(monster.crit_dmg), lifesteal: 0,
    },
    skills: [],
  };

  const result = simulateBattle(playerCombatant, monsterCombatant);

  const client = await pool.connect();
  let rewards = { xp: 0, gold: 0, items: [], materials: [] };
  try {
    await client.query('BEGIN');

    if (result.outcome === 'win') {
      const xpGain = monster.xp_reward;
      const goldGain = randomInt(monster.gold_reward_min, monster.gold_reward_max);
      const { items, materials } = await lootService.rollLoot(client, characterId, monster.id);
      await characterService.applyXpAndGold(client, characterId, xpGain, goldGain);

      if (monster.is_boss) {
        await client.query(
          `INSERT INTO character_dungeon_progress (character_id, dungeon_id, boss_defeated) VALUES ($1,$2,true)
           ON CONFLICT (character_id, dungeon_id) DO UPDATE SET boss_defeated = true`,
          [characterId, dungeonId]
        );
      }

      rewards = { xp: xpGain, gold: goldGain, items, materials };
    }

    await client.query(
      `INSERT INTO battle_logs (character_id, dungeon_id, monster_id, outcome, xp_gained, gold_gained, loot)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [characterId, dungeonId, monster.id, result.outcome, rewards.xp, rewards.gold, JSON.stringify(rewards.items)]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updatedCharacter = await characterService.getFullCharacter(characterId);

  return {
    outcome: result.outcome,
    log: result.log,
    ticks: result.ticks,
    monster: { key: monster.key, name: monster.name, hp: Number(monster.hp), isBoss: monster.is_boss },
    rewards,
    character: updatedCharacter,
  };
}

async function startBattle(userId, characterId, dungeonId, { boss = false } = {}) {
  const character = await characterService.getFullCharacter(characterId);
  if (!character || character.userId !== userId) throw httpError(404, 'no_character');

  const dungeon = await dungeonService.getDungeon(dungeonId);
  if (character.level < dungeon.min_character_level) throw httpError(400, 'dungeon_locked');
  if (boss && character.level < dungeon.boss_unlock_level) throw httpError(400, 'boss_locked');

  const monster = await dungeonService.pickMonster(dungeonId, { boss });
  const skills = await getSkillsForClass(character.class, character.level);

  return {
    monster: {
      id: monster.id,
      key: monster.key,
      name: monster.name,
      isBoss: monster.is_boss,
      stats: {
        hp: Number(monster.hp),
        attack: Number(monster.attack),
        defense: Number(monster.defense),
        attack_speed: Number(monster.attack_speed),
        crit_chance: Number(monster.crit_chance),
        crit_dmg: Number(monster.crit_dmg),
        lifesteal: 0,
      },
      skills: [],
    },
    player: {
      id: character.id,
      stats: character.effectiveStats,
      skills,
    },
  };
}

async function finishBattle(userId, characterId, dungeonId, monsterId, outcome, { boss = false } = {}) {
  const character = await characterService.getFullCharacter(characterId);
  if (!character || character.userId !== userId) throw httpError(404, 'no_character');

  const { rows: [monster] } = await pool.query('SELECT * FROM monsters WHERE id = $1', [monsterId]);
  if (!monster) throw httpError(404, 'monster_not_found');

  const client = await pool.connect();
  let rewards = { xp: 0, gold: 0, items: [], materials: [] };
  try {
    await client.query('BEGIN');

    if (outcome === 'win') {
      const xpGain = monster.xp_reward;
      const goldGain = randomInt(monster.gold_reward_min, monster.gold_reward_max);
      const { items, materials } = await lootService.rollLoot(client, characterId, monsterId);
      await characterService.applyXpAndGold(client, characterId, xpGain, goldGain);

      if (boss) {
        await client.query(
          `INSERT INTO character_dungeon_progress (character_id, dungeon_id, boss_defeated) VALUES ($1,$2,true)
           ON CONFLICT (character_id, dungeon_id) DO UPDATE SET boss_defeated = true`,
          [characterId, dungeonId]
        );
      }

      rewards = { xp: xpGain, gold: goldGain, items, materials };
    }

    await client.query(
      `INSERT INTO battle_logs (character_id, dungeon_id, monster_id, outcome, xp_gained, gold_gained, loot)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [characterId, dungeonId, monsterId, outcome, rewards.xp, rewards.gold, JSON.stringify(rewards.items)]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updatedCharacter = await characterService.getFullCharacter(characterId);
  return { outcome, rewards, character: updatedCharacter };
}

module.exports = { resolveBattle, startBattle, finishBattle, getSkillsForClass };
