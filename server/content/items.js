const {
  RARITIES, RARITY_MULTIPLIER, RARITY_LABELS_BY_GENDER, CLASSES,
  SLOT_LABELS_RU, SLOT_GENDER, WEAPON_LABELS_RU, WEAPON_GENDER,
} = require('./constants');

// Baseline (common-tier) stat ranges per slot. Scaled per-rarity by RARITY_MULTIPLIER.
const SLOT_STAT_PROFILE = {
  weapon: { attack: [8, 14] },
  helmet: { hp: [15, 25], defense: [2, 4] },
  chest: { hp: [25, 40], defense: [4, 7] },
  gloves: { attack: [3, 6], attack_speed: [0.02, 0.05] },
  boots: { attack_speed: [0.03, 0.06], hp: [10, 18] },
  belt: { defense: [3, 6], hp: [12, 20] },
  ring_1: { crit_chance: [0.01, 0.03], attack: [2, 4] },
  ring_2: { crit_dmg: [0.05, 0.12], attack: [2, 4] },
  amulet: { hp: [10, 18], crit_chance: [0.01, 0.02] },
  relic: { lifesteal: [0.01, 0.03], attack: [2, 4], defense: [1, 3] },
};

const INTEGER_STATS = new Set(['hp', 'attack', 'defense']);

function scaleRange([min, max], mult) {
  return [min * mult, max * mult];
}

function roundStat(stat, value) {
  return INTEGER_STATS.has(stat) ? Math.round(value) : Math.round(value * 10000) / 10000;
}

function buildStatRanges(slot, rarity) {
  const profile = SLOT_STAT_PROFILE[slot];
  const mult = RARITY_MULTIPLIER[rarity];
  const ranges = {};
  for (const [stat, range] of Object.entries(profile)) {
    const [min, max] = scaleRange(range, mult);
    ranges[stat] = [roundStat(stat, min), roundStat(stat, max)];
  }
  return ranges;
}

function levelRequirementFor(rarity) {
  return { common: 1, uncommon: 3, rare: 6, epic: 10, legendary: 15 }[rarity];
}

// 9 generic slots x 5 rarities = 45, + weapon x 5 classes x 5 rarities = 25 => 70 templates total.
function buildItems() {
  const items = [];

  for (const slot of Object.keys(SLOT_LABELS_RU)) {
    for (const rarity of RARITIES) {
      const rarityLabel = RARITY_LABELS_BY_GENDER[rarity][SLOT_GENDER[slot]];
      items.push({
        key: `${slot}_${rarity}`,
        name: `${rarityLabel} ${SLOT_LABELS_RU[slot]}`,
        slot,
        rarity,
        class_restriction: null,
        stat_ranges: buildStatRanges(slot, rarity),
        level_requirement: levelRequirementFor(rarity),
      });
    }
  }

  for (const cls of CLASSES) {
    for (const rarity of RARITIES) {
      const rarityLabel = RARITY_LABELS_BY_GENDER[rarity][WEAPON_GENDER[cls]];
      items.push({
        key: `${cls}_weapon_${rarity}`,
        name: `${rarityLabel} ${WEAPON_LABELS_RU[cls]}`,
        slot: 'weapon',
        rarity,
        class_restriction: cls,
        stat_ranges: buildStatRanges('weapon', rarity),
        level_requirement: levelRequirementFor(rarity),
      });
    }
  }

  return items;
}

module.exports = { buildItems, SLOT_STAT_PROFILE };
