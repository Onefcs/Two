const { RARITIES } = require('./constants');

const MATERIAL_NAMES_RU = {
  common: 'Обломок руды',
  uncommon: 'Заряженный кристалл',
  rare: 'Редкая эссенция',
  epic: 'Осколок силы',
  legendary: 'Легендарный сердечник',
};

function buildMaterials() {
  return RARITIES.map((rarity) => ({
    key: `material_${rarity}`,
    name: `${MATERIAL_NAMES_RU[rarity]}`,
    rarity,
  }));
}

module.exports = { buildMaterials };
