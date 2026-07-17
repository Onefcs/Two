const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const characterService = require('./characterService');

async function listInventory(characterId) {
  const { rows } = await pool.query(
    `SELECT ii.id, ii.rolled_stats, ii.equipped_slot, ii.acquired_at,
            i.key, i.name, i.slot, i.rarity, i.class_restriction, i.level_requirement
     FROM item_instances ii JOIN items i ON i.id = ii.item_id
     WHERE ii.character_id = $1
     ORDER BY ii.acquired_at DESC`,
    [characterId]
  );
  return rows;
}

async function listMaterials(characterId) {
  const { rows } = await pool.query(
    `SELECT m.key, m.name, m.rarity, cm.quantity
     FROM character_materials cm JOIN materials m ON m.id = cm.material_id
     WHERE cm.character_id = $1 AND cm.quantity > 0
     ORDER BY m.rarity`,
    [characterId]
  );
  return rows;
}

async function equipItem(character, itemInstanceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `SELECT ii.id, ii.item_id, ii.equipped_slot, i.slot, i.class_restriction, i.level_requirement
       FROM item_instances ii JOIN items i ON i.id = ii.item_id
       WHERE ii.id = $1 AND ii.character_id = $2 FOR UPDATE`,
      [itemInstanceId, character.id]
    );
    const item = res.rows[0];
    if (!item) throw httpError(404, 'item_not_found');
    if (item.class_restriction && item.class_restriction !== character.class) throw httpError(400, 'wrong_class');
    if (item.level_requirement > character.level) throw httpError(400, 'level_too_low');

    // unequip whatever currently occupies that slot
    await client.query(
      `UPDATE item_instances SET equipped_slot = NULL WHERE character_id = $1 AND equipped_slot = $2`,
      [character.id, item.slot]
    );
    await client.query(`UPDATE item_instances SET equipped_slot = $1 WHERE id = $2`, [item.slot, itemInstanceId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return characterService.getFullCharacter(character.id);
}

async function unequipItem(characterId, itemInstanceId) {
  const res = await pool.query(
    `UPDATE item_instances SET equipped_slot = NULL WHERE id = $1 AND character_id = $2 RETURNING id`,
    [itemInstanceId, characterId]
  );
  if (res.rows.length === 0) throw httpError(404, 'item_not_found');
  return characterService.getFullCharacter(characterId);
}

const SELL_VALUE_BY_RARITY = { common: 10, uncommon: 30, rare: 90, epic: 250, legendary: 800 };

async function sellItem(characterId, itemInstanceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `SELECT ii.id, ii.equipped_slot, i.rarity FROM item_instances ii JOIN items i ON i.id = ii.item_id
       WHERE ii.id = $1 AND ii.character_id = $2 FOR UPDATE`,
      [itemInstanceId, characterId]
    );
    const item = res.rows[0];
    if (!item) throw httpError(404, 'item_not_found');
    if (item.equipped_slot) throw httpError(400, 'item_equipped');

    const value = SELL_VALUE_BY_RARITY[item.rarity] || 0;
    await client.query('DELETE FROM item_instances WHERE id = $1', [itemInstanceId]);
    await client.query('UPDATE characters SET gold = gold + $1, updated_at = now() WHERE id = $2', [value, characterId]);

    await client.query('COMMIT');
    return value;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listInventory, listMaterials, equipItem, unequipItem, sellItem };
