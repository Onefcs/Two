if (require.main === module) {
  require('dotenv').config();
}

const pool = require('../db/pool');
const SKILLS = require('./skills');
const { buildItems } = require('./items');
const { buildMaterials } = require('./materials');
const DUNGEONS = require('./dungeons');
const { buildMonsters } = require('./monsters');
const { buildDropTables } = require('./dropTables');
const { buildCraftingRecipes } = require('./craftingRecipes');

async function seed(client = pool) {
  const items = buildItems();
  const materials = buildMaterials();
  const monsters = buildMonsters();
  const { itemDrops, materialDrops } = buildDropTables({ dungeons: DUNGEONS, monsters, items, materials });
  const craftingRecipes = buildCraftingRecipes();

  await client.query('BEGIN');
  try {
    // dungeons
    for (const d of DUNGEONS) {
      await client.query(
        `INSERT INTO dungeons (key, name, min_character_level, boss_unlock_level, order_index, background_layers)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (key) DO UPDATE SET name=$2, min_character_level=$3, boss_unlock_level=$4, order_index=$5, background_layers=$6`,
        [d.key, d.name, d.min_character_level, d.boss_unlock_level, d.order_index, d.background_layers]
      );
    }
    const dungeonRows = await client.query('SELECT id, key FROM dungeons');
    const dungeonIdByKey = new Map(dungeonRows.rows.map((r) => [r.key, r.id]));

    // items
    for (const it of items) {
      await client.query(
        `INSERT INTO items (key, name, slot, rarity, class_restriction, stat_ranges, level_requirement)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (key) DO UPDATE SET name=$2, slot=$3, rarity=$4, class_restriction=$5, stat_ranges=$6, level_requirement=$7`,
        [it.key, it.name, it.slot, it.rarity, it.class_restriction, it.stat_ranges, it.level_requirement]
      );
    }
    const itemRows = await client.query('SELECT id, key FROM items');
    const itemIdByKey = new Map(itemRows.rows.map((r) => [r.key, r.id]));

    // materials
    for (const m of materials) {
      await client.query(
        `INSERT INTO materials (key, name, rarity) VALUES ($1,$2,$3)
         ON CONFLICT (key) DO UPDATE SET name=$2, rarity=$3`,
        [m.key, m.name, m.rarity]
      );
    }
    const materialRows = await client.query('SELECT id, key FROM materials');
    const materialIdByKey = new Map(materialRows.rows.map((r) => [r.key, r.id]));

    // skills
    for (const s of SKILLS) {
      await client.query(
        `INSERT INTO skills (class, key, name, description, cooldown_ms, priority, effect_type, power_multiplier, extra, unlock_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (key) DO UPDATE SET class=$1, name=$3, description=$4, cooldown_ms=$5, priority=$6,
           effect_type=$7, power_multiplier=$8, extra=$9, unlock_level=$10`,
        [s.class, s.key, s.name, s.description, s.cooldown_ms, s.priority, s.effect_type, s.power_multiplier, s.extra, s.unlock_level]
      );
    }

    // monsters
    for (const m of monsters) {
      const dungeonId = dungeonIdByKey.get(m.dungeon_key);
      await client.query(
        `INSERT INTO monsters (dungeon_id, key, name, hp, attack, defense, attack_speed, crit_chance, crit_dmg,
           xp_reward, gold_reward_min, gold_reward_max, is_boss, spawn_weight)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (key) DO UPDATE SET dungeon_id=$1, name=$3, hp=$4, attack=$5, defense=$6, attack_speed=$7,
           crit_chance=$8, crit_dmg=$9, xp_reward=$10, gold_reward_min=$11, gold_reward_max=$12, is_boss=$13, spawn_weight=$14`,
        [dungeonId, m.key, m.name, m.hp, m.attack, m.defense, m.attack_speed, m.crit_chance, m.crit_dmg,
          m.xp_reward, m.gold_reward_min, m.gold_reward_max, m.is_boss, m.spawn_weight]
      );
    }
    const monsterRows = await client.query('SELECT id, key FROM monsters');
    const monsterIdByKey = new Map(monsterRows.rows.map((r) => [r.key, r.id]));

    // drop tables
    for (const drop of itemDrops) {
      const monsterId = monsterIdByKey.get(drop.monster_key);
      const itemId = itemIdByKey.get(drop.item_key);
      if (!monsterId || !itemId) continue;
      await client.query(
        `INSERT INTO monster_item_drops (monster_id, item_id, drop_chance) VALUES ($1,$2,$3)
         ON CONFLICT (monster_id, item_id) DO UPDATE SET drop_chance=$3`,
        [monsterId, itemId, drop.drop_chance]
      );
    }
    for (const drop of materialDrops) {
      const monsterId = monsterIdByKey.get(drop.monster_key);
      const materialId = materialIdByKey.get(drop.material_key);
      if (!monsterId || !materialId) continue;
      await client.query(
        `INSERT INTO monster_material_drops (monster_id, material_id, drop_chance, qty_min, qty_max)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (monster_id, material_id) DO UPDATE SET drop_chance=$3, qty_min=$4, qty_max=$5`,
        [monsterId, materialId, drop.drop_chance, drop.qty_min, drop.qty_max]
      );
    }

    // crafting recipes
    for (const r of craftingRecipes) {
      const outputItemId = itemIdByKey.get(r.output_item_key);
      const res = await client.query(
        `INSERT INTO crafting_recipes (key, output_item_id, class_restriction, required_character_level, gold_cost)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (key) DO UPDATE SET output_item_id=$2, class_restriction=$3, required_character_level=$4, gold_cost=$5
         RETURNING id`,
        [r.key, outputItemId, r.class_restriction, r.required_character_level, r.gold_cost]
      );
      const recipeId = res.rows[0].id;
      await client.query('DELETE FROM crafting_recipe_inputs WHERE recipe_id = $1', [recipeId]);
      for (const input of r.inputs) {
        const itemId = input.item_key ? itemIdByKey.get(input.item_key) : null;
        const materialId = input.material_key ? materialIdByKey.get(input.material_key) : null;
        await client.query(
          `INSERT INTO crafting_recipe_inputs (recipe_id, material_id, item_id, quantity) VALUES ($1,$2,$3,$4)`,
          [recipeId, materialId, itemId, input.quantity]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`[seed] items=${items.length} materials=${materials.length} skills=${SKILLS.length} ` +
      `dungeons=${DUNGEONS.length} monsters=${monsters.length} itemDrops=${itemDrops.length} ` +
      `materialDrops=${materialDrops.length} recipes=${craftingRecipes.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

module.exports = seed;

if (require.main === module) {
  seed(pool)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
