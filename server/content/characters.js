// Base level-1 stats per class, matching the design spec:
// mage: ranged, high attack, low hp, low defense, medium attack speed, medium crit
// warrior: melee, low attack, high hp, high defense, low attack speed
// archer: ranged, high attack, low hp, low defense, high attack speed, high crit
// zhnec: melee, high attack, medium hp, medium defense, low attack speed, lifesteal
// assasin: melee, low attack, low hp, low defense, high attack speed, strong crit dmg+chance

const CHARACTERS = {
  mage: {
    range: 'ranged',
    baseStats: {
      hp: 100, attack: 28, defense: 5, attack_speed: 0.9,
      crit_chance: 0.15, crit_dmg: 1.6, lifesteal: 0,
    },
  },
  warrior: {
    range: 'melee',
    baseStats: {
      hp: 300, attack: 14, defense: 25, attack_speed: 0.6,
      crit_chance: 0.05, crit_dmg: 1.5, lifesteal: 0,
    },
  },
  archer: {
    range: 'ranged',
    baseStats: {
      hp: 110, attack: 26, defense: 6, attack_speed: 1.3,
      crit_chance: 0.25, crit_dmg: 1.7, lifesteal: 0,
    },
  },
  zhnec: {
    range: 'melee',
    baseStats: {
      hp: 180, attack: 24, defense: 12, attack_speed: 0.7,
      crit_chance: 0.08, crit_dmg: 1.5, lifesteal: 0.15,
    },
  },
  assasin: {
    range: 'melee',
    baseStats: {
      hp: 90, attack: 16, defense: 4, attack_speed: 1.5,
      crit_chance: 0.35, crit_dmg: 2.2, lifesteal: 0,
    },
  },
};

module.exports = CHARACTERS;
