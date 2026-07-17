const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const characterService = require('./characterService');
const { rollStatsFromRanges } = require('./lootService');

async function listRecipes(characterClass) {
  const { rows: recipes } = await pool.query(
    `SELECT cr.*, i.name AS output_name, i.slot AS output_slot, i.rarity AS output_rarity
     FROM crafting_recipes cr JOIN items i ON i.id = cr.output_item_id
     WHERE cr.class_restriction IS NULL OR cr.class_restriction = $1
     ORDER BY cr.required_character_level`,
    [characterClass]
  );

  const { rows: inputs } = await pool.query(
    `SELECT cri.recipe_id, cri.quantity, cri.material_id, cri.item_id,
            m.key AS material_key, m.name AS material_name,
            i.key AS item_key, i.name AS item_name
     FROM crafting_recipe_inputs cri
     LEFT JOIN materials m ON m.id = cri.material_id
     LEFT JOIN items i ON i.id = cri.item_id`
  );

  const inputsByRecipe = new Map();
  for (const row of inputs) {
    const list = inputsByRecipe.get(row.recipe_id) || [];
    list.push({
      quantity: row.quantity,
      material: row.material_id ? { key: row.material_key, name: row.material_name } : null,
      item: row.item_id ? { key: row.item_key, name: row.item_name } : null,
    });
    inputsByRecipe.set(row.recipe_id, list);
  }

  return recipes.map((r) => ({
    id: r.id,
    key: r.key,
    outputName: r.output_name,
    outputSlot: r.output_slot,
    outputRarity: r.output_rarity,
    classRestriction: r.class_restriction,
    requiredCharacterLevel: r.required_character_level,
    goldCost: r.gold_cost,
    inputs: inputsByRecipe.get(r.id) || [],
  }));
}

async function craft(character, recipeId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recipeRes = await client.query('SELECT * FROM crafting_recipes WHERE id = $1', [recipeId]);
    const recipe = recipeRes.rows[0];
    if (!recipe) throw httpError(404, 'recipe_not_found');
    if (recipe.class_restriction && recipe.class_restriction !== character.class) throw httpError(400, 'wrong_class');
    if (character.level < recipe.required_character_level) throw httpError(400, 'level_too_low');

    const charRes = await client.query('SELECT gold FROM characters WHERE id = $1 FOR UPDATE', [character.id]);
    const gold = Number(charRes.rows[0].gold);
    if (gold < recipe.gold_cost) throw httpError(400, 'not_enough_gold');

    const inputsRes = await client.query('SELECT * FROM crafting_recipe_inputs WHERE recipe_id = $1', [recipeId]);

    // Validate + consume materials
    for (const input of inputsRes.rows) {
      if (input.material_id) {
        const matRes = await client.query(
          'SELECT quantity FROM character_materials WHERE character_id = $1 AND material_id = $2 FOR UPDATE',
          [character.id, input.material_id]
        );
        const have = matRes.rows[0]?.quantity || 0;
        if (have < input.quantity) throw httpError(400, 'not_enough_materials');
      }
      if (input.item_id) {
        const itemRes = await client.query(
          `SELECT id FROM item_instances WHERE character_id = $1 AND item_id = $2 AND equipped_slot IS NULL
           LIMIT $3 FOR UPDATE`,
          [character.id, input.item_id, input.quantity]
        );
        if (itemRes.rows.length < input.quantity) throw httpError(400, 'not_enough_items');
      }
    }

    for (const input of inputsRes.rows) {
      if (input.material_id) {
        await client.query(
          'UPDATE character_materials SET quantity = quantity - $1 WHERE character_id = $2 AND material_id = $3',
          [input.quantity, character.id, input.material_id]
        );
      }
      if (input.item_id) {
        const itemRes = await client.query(
          `SELECT id FROM item_instances WHERE character_id = $1 AND item_id = $2 AND equipped_slot IS NULL LIMIT $3`,
          [character.id, input.item_id, input.quantity]
        );
        const ids = itemRes.rows.map((r) => r.id);
        await client.query('DELETE FROM item_instances WHERE id = ANY($1::int[])', [ids]);
      }
    }

    await client.query('UPDATE characters SET gold = gold - $1, updated_at = now() WHERE id = $2', [recipe.gold_cost, character.id]);

    const outputItemRes = await client.query('SELECT * FROM items WHERE id = $1', [recipe.output_item_id]);
    const outputItem = outputItemRes.rows[0];
    const rolledStats = rollStatsFromRanges(outputItem.stat_ranges);
    const crafted = await client.query(
      'INSERT INTO item_instances (character_id, item_id, rolled_stats) VALUES ($1,$2,$3) RETURNING id',
      [character.id, outputItem.id, rolledStats]
    );

    await client.query('COMMIT');
    return { instanceId: crafted.rows[0].id, item: outputItem.name, rolledStats };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listRecipes, craft };
