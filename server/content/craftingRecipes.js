const { CLASSES } = require('./constants');

const RARITY_CHAIN = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const GOLD_COST_BY_TARGET_RARITY = {
  uncommon: 500,
  rare: 2000,
  epic: 8000,
  legendary: 30000,
};

const MATERIAL_QTY_BY_SOURCE_RARITY = {
  common: 3,
  uncommon: 4,
  rare: 4,
  epic: 5,
};

const LEVEL_REQ_BY_TARGET_RARITY = { uncommon: 3, rare: 6, epic: 10, legendary: 15 };

// Weapon crafting chains: each class can upgrade its own weapon one rarity tier at a
// time by consuming the previous tier weapon + materials of the *source* tier + gold.
function buildWeaponRecipes() {
  const recipes = [];
  for (const cls of CLASSES) {
    for (let i = 0; i < RARITY_CHAIN.length - 1; i++) {
      const fromRarity = RARITY_CHAIN[i];
      const toRarity = RARITY_CHAIN[i + 1];
      recipes.push({
        key: `${cls}_weapon_to_${toRarity}`,
        output_item_key: `${cls}_weapon_${toRarity}`,
        class_restriction: cls,
        required_character_level: LEVEL_REQ_BY_TARGET_RARITY[toRarity],
        gold_cost: GOLD_COST_BY_TARGET_RARITY[toRarity],
        inputs: [
          { item_key: `${cls}_weapon_${fromRarity}`, quantity: 1 },
          { material_key: `material_${fromRarity}`, quantity: MATERIAL_QTY_BY_SOURCE_RARITY[fromRarity] },
        ],
      });
    }
  }
  return recipes;
}

// Generic relic upgrade chain (uncommon -> legendary), class-agnostic, showcases
// non-weapon crafting using the same material-tier system.
function buildRelicRecipes() {
  const recipes = [];
  for (let i = 1; i < RARITY_CHAIN.length - 1; i++) {
    const fromRarity = RARITY_CHAIN[i];
    const toRarity = RARITY_CHAIN[i + 1];
    recipes.push({
      key: `relic_to_${toRarity}`,
      output_item_key: `relic_${toRarity}`,
      class_restriction: null,
      required_character_level: LEVEL_REQ_BY_TARGET_RARITY[toRarity],
      gold_cost: GOLD_COST_BY_TARGET_RARITY[toRarity],
      inputs: [
        { item_key: `relic_${fromRarity}`, quantity: 1 },
        { material_key: `material_${fromRarity}`, quantity: MATERIAL_QTY_BY_SOURCE_RARITY[fromRarity] },
      ],
    });
  }
  return recipes;
}

function buildCraftingRecipes() {
  return [...buildWeaponRecipes(), ...buildRelicRecipes()];
}

module.exports = { buildCraftingRecipes };
