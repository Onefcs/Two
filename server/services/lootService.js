const { rollChance, randomInRange, randomInt } = require('../lib/rng');

function rollStatsFromRanges(statRanges) {
  const rolled = {};
  for (const [stat, [min, max]] of Object.entries(statRanges)) {
    const isIntegerStat = ['hp', 'attack', 'defense'].includes(stat);
    const value = randomInRange(min, max);
    rolled[stat] = isIntegerStat ? Math.round(value) : Math.round(value * 10000) / 10000;
  }
  return rolled;
}

// Rolls item + material drops for a monster kill inside an existing transaction client.
async function rollLoot(client, characterId, monsterId) {
  const droppedItems = [];
  const droppedMaterials = [];

  const itemDrops = await client.query(
    `SELECT mid.item_id, mid.drop_chance, i.key, i.name, i.rarity, i.slot, i.stat_ranges
     FROM monster_item_drops mid JOIN items i ON i.id = mid.item_id
     WHERE mid.monster_id = $1`,
    [monsterId]
  );
  for (const row of itemDrops.rows) {
    if (!rollChance(Number(row.drop_chance))) continue;
    const rolledStats = rollStatsFromRanges(row.stat_ranges);
    const inserted = await client.query(
      `INSERT INTO item_instances (character_id, item_id, rolled_stats) VALUES ($1,$2,$3) RETURNING id`,
      [characterId, row.item_id, rolledStats]
    );
    droppedItems.push({ instanceId: inserted.rows[0].id, key: row.key, name: row.name, rarity: row.rarity, slot: row.slot, rolledStats });
  }

  const materialDrops = await client.query(
    `SELECT mmd.material_id, mmd.drop_chance, mmd.qty_min, mmd.qty_max, m.key, m.name, m.rarity
     FROM monster_material_drops mmd JOIN materials m ON m.id = mmd.material_id
     WHERE mmd.monster_id = $1`,
    [monsterId]
  );
  for (const row of materialDrops.rows) {
    if (!rollChance(Number(row.drop_chance))) continue;
    const qty = randomInt(row.qty_min, row.qty_max);
    await client.query(
      `INSERT INTO character_materials (character_id, material_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (character_id, material_id) DO UPDATE SET quantity = character_materials.quantity + $3`,
      [characterId, row.material_id, qty]
    );
    droppedMaterials.push({ key: row.key, name: row.name, rarity: row.rarity, quantity: qty });
  }

  return { items: droppedItems, materials: droppedMaterials };
}

module.exports = { rollLoot, rollStatsFromRanges };
