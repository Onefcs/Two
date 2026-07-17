const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const characterService = require('../services/characterService');
const { upgradeCost } = require('../content/constants');

async function purchaseUpgrade(characterId, statKey) {
  if (!characterService.STAT_KEYS.includes(statKey)) throw httpError(400, 'invalid_stat');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const charRes = await client.query('SELECT gold FROM characters WHERE id = $1 FOR UPDATE', [characterId]);
    const gold = Number(charRes.rows[0].gold);

    const upgradeRes = await client.query(
      'SELECT level FROM character_upgrades WHERE character_id = $1 AND stat_key = $2 FOR UPDATE',
      [characterId, statKey]
    );
    const currentLevel = upgradeRes.rows[0].level;
    const cost = upgradeCost(statKey, currentLevel);

    if (gold < cost) throw httpError(400, 'not_enough_gold');

    await client.query('UPDATE characters SET gold = gold - $1, updated_at = now() WHERE id = $2', [cost, characterId]);
    await client.query(
      'UPDATE character_upgrades SET level = level + 1 WHERE character_id = $1 AND stat_key = $2',
      [characterId, statKey]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return characterService.getFullCharacter(characterId);
}

module.exports = { purchaseUpgrade };
