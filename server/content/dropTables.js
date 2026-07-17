const { RARITY_DROP_CHANCE } = require('./constants');
const DUNGEONS = require('./dungeons');

const MATERIAL_DROP_BOOST = 1.5; // materials are somewhat more common than full items
const MATERIAL_QTY_BY_RARITY = {
  common: [2, 4],
  uncommon: [1, 3],
  rare: [1, 2],
  epic: [1, 1],
  legendary: [1, 1],
};

// Splits each rarity's aggregate RARITY_DROP_CHANCE evenly across all eligible
// items/materials of that rarity in a dungeon, so "chance to get *a* legendary"
// matches the tuned hardcore constant regardless of pool size.
function buildDropTables({ dungeons, monsters, items, materials }) {
  const dungeonByKey = new Map(dungeons.map((d) => [d.key, d]));
  const itemDrops = [];
  const materialDrops = [];

  for (const monster of monsters) {
    if (monster.is_boss) continue; // bosses use a curated better table below
    const config = DUNGEONS.find((d) => d.key === monster.dungeon_key);
    const allowed = config.allowed_rarities;

    for (const rarity of allowed) {
      const eligibleItems = items.filter((it) => it.rarity === rarity);
      const perItemChance = RARITY_DROP_CHANCE[rarity] / eligibleItems.length;
      for (const item of eligibleItems) {
        itemDrops.push({ monster_key: monster.key, item_key: item.key, drop_chance: perItemChance });
      }

      const material = materials.find((m) => m.rarity === rarity);
      if (material) {
        const [qmin, qmax] = MATERIAL_QTY_BY_RARITY[rarity];
        materialDrops.push({
          monster_key: monster.key,
          material_key: material.key,
          drop_chance: RARITY_DROP_CHANCE[rarity] * MATERIAL_DROP_BOOST,
          qty_min: qmin,
          qty_max: qmax,
        });
      }
    }
  }

  // Bosses: guaranteed-ish shot at the dungeon's top rarity, plus generous materials.
  for (const monster of monsters) {
    if (!monster.is_boss) continue;
    const config = DUNGEONS.find((d) => d.key === monster.dungeon_key);
    const topRarity = config.allowed_rarities[config.allowed_rarities.length - 1];
    const eligibleItems = items.filter((it) => it.rarity === topRarity);
    const perItemChance = Math.min(0.5, RARITY_DROP_CHANCE[topRarity] * 20) / eligibleItems.length;
    for (const item of eligibleItems) {
      itemDrops.push({ monster_key: monster.key, item_key: item.key, drop_chance: perItemChance });
    }
    for (const rarity of config.allowed_rarities) {
      const material = materials.find((m) => m.rarity === rarity);
      if (!material) continue;
      const [qmin, qmax] = MATERIAL_QTY_BY_RARITY[rarity];
      materialDrops.push({
        monster_key: monster.key,
        material_key: material.key,
        drop_chance: Math.min(0.9, RARITY_DROP_CHANCE[rarity] * MATERIAL_DROP_BOOST * 15),
        qty_min: qmin,
        qty_max: qmax + 2,
      });
    }
  }

  return { itemDrops, materialDrops };
}

module.exports = { buildDropTables };
