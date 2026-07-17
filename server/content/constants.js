const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_MULTIPLIER = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.3,
  legendary: 3.2,
};

// Hardcore economy: intentionally low drop chances per kill.
const RARITY_DROP_CHANCE = {
  common: 0.08,
  uncommon: 0.03,
  rare: 0.008,
  epic: 0.0015,
  legendary: 0.0002,
};

const RARITY_LABELS_RU = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

// Gender-agreement forms for rarity adjectives, used when composing item names.
const RARITY_LABELS_BY_GENDER = {
  common: { m: 'Обычный', f: 'Обычная', n: 'Обычное', pl: 'Обычные' },
  uncommon: { m: 'Необычный', f: 'Необычная', n: 'Необычное', pl: 'Необычные' },
  rare: { m: 'Редкий', f: 'Редкая', n: 'Редкое', pl: 'Редкие' },
  epic: { m: 'Эпический', f: 'Эпическая', n: 'Эпическое', pl: 'Эпические' },
  legendary: { m: 'Легендарный', f: 'Легендарная', n: 'Легендарное', pl: 'Легендарные' },
};

const CLASSES = ['mage', 'warrior', 'archer', 'zhnec', 'assasin'];

const CLASS_LABELS_RU = {
  mage: 'Маг',
  warrior: 'Танк',
  archer: 'Лучник',
  zhnec: 'Жнец',
  assasin: 'Ассасин',
};

const SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'ring_1', 'ring_2', 'amulet', 'relic'];

const SLOT_LABELS_RU = {
  helmet: 'Шлем',
  chest: 'Доспех',
  gloves: 'Перчатки',
  boots: 'Сапоги',
  belt: 'Пояс',
  ring_1: 'Кольцо силы',
  ring_2: 'Кольцо ярости',
  amulet: 'Амулет',
  relic: 'Реликвия',
};

// Grammatical gender per slot noun, for rarity-adjective agreement in item names.
const SLOT_GENDER = {
  helmet: 'm', chest: 'm', gloves: 'pl', boots: 'pl', belt: 'm',
  ring_1: 'n', ring_2: 'n', amulet: 'm', relic: 'f',
};

const WEAPON_LABELS_RU = {
  mage: 'Посох',
  warrior: 'Меч',
  archer: 'Лук',
  zhnec: 'Коса',
  assasin: 'Кинжалы',
};

const WEAPON_GENDER = { mage: 'm', warrior: 'm', archer: 'm', zhnec: 'f', assasin: 'pl' };

// Upgrade cost curve: cost(level) = baseCost * 1.15^level, deliberately slow.
const UPGRADE_BASE_COST = {
  attack: 50,
  defense: 40,
  hp: 20,
  attack_speed: 80,
  crit_chance: 100,
  crit_dmg: 100,
  lifesteal: 120,
};

const UPGRADE_STAT_PER_LEVEL = {
  attack: 1,
  defense: 0.8,
  hp: 5,
  attack_speed: 0.01,
  crit_chance: 0.003,
  crit_dmg: 0.01,
  lifesteal: 0.003,
};

function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 2.2));
}

function upgradeCost(statKey, currentLevel) {
  const base = UPGRADE_BASE_COST[statKey];
  return Math.round(base * Math.pow(1.15, currentLevel));
}

module.exports = {
  RARITIES,
  RARITY_MULTIPLIER,
  RARITY_DROP_CHANCE,
  RARITY_LABELS_RU,
  RARITY_LABELS_BY_GENDER,
  CLASSES,
  CLASS_LABELS_RU,
  SLOTS,
  SLOT_LABELS_RU,
  SLOT_GENDER,
  WEAPON_LABELS_RU,
  WEAPON_GENDER,
  UPGRADE_BASE_COST,
  UPGRADE_STAT_PER_LEVEL,
  xpForLevel,
  upgradeCost,
};
