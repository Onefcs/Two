// 5 skills per class (25 total). The battle engine evaluates skills for a combatant
// in ascending `priority` order each tick and fires the first one off cooldown;
// unlock_level gates availability by character level.

const SKILLS = [
  // ---- mage ----
  { class: 'mage', key: 'mage_fireball', name: 'Огненный шар', description: 'Мощный урон по цели.',
    cooldown_ms: 4000, priority: 1, effect_type: 'damage', power_multiplier: 2.2, extra: {}, unlock_level: 1 },
  { class: 'mage', key: 'mage_frost_lance', name: 'Ледяное копьё', description: 'Быстрый магический удар.',
    cooldown_ms: 2500, priority: 2, effect_type: 'damage', power_multiplier: 1.6, extra: {}, unlock_level: 3 },
  { class: 'mage', key: 'mage_arcane_barrier', name: 'Аркан. барьер', description: 'Временно повышает защиту.',
    cooldown_ms: 8000, priority: 3, effect_type: 'buff', power_multiplier: 1, extra: { defense_mult: 1.3, duration_ms: 3000 }, unlock_level: 5 },
  { class: 'mage', key: 'mage_mana_burn', name: 'Выжигание маны', description: 'Снижает защиту врага.',
    cooldown_ms: 6000, priority: 4, effect_type: 'debuff', power_multiplier: 1, extra: { defense_reduction: 0.2, duration_ms: 3000 }, unlock_level: 7 },
  { class: 'mage', key: 'mage_meteor', name: 'Метеор', description: 'Разрушительный урон по цели.',
    cooldown_ms: 12000, priority: 5, effect_type: 'damage', power_multiplier: 3.5, extra: {}, unlock_level: 10 },

  // ---- warrior ----
  { class: 'warrior', key: 'warrior_shield_bash', name: 'Удар щитом', description: 'Базовый силовой удар.',
    cooldown_ms: 3000, priority: 1, effect_type: 'damage', power_multiplier: 1.3, extra: {}, unlock_level: 1 },
  { class: 'warrior', key: 'warrior_iron_skin', name: 'Железная кожа', description: 'Временно повышает защиту.',
    cooldown_ms: 10000, priority: 2, effect_type: 'buff', power_multiplier: 1, extra: { defense_mult: 1.5, duration_ms: 4000 }, unlock_level: 3 },
  { class: 'warrior', key: 'warrior_heavy_slam', name: 'Тяжёлый удар', description: 'Сильный урон по цели.',
    cooldown_ms: 5000, priority: 3, effect_type: 'damage', power_multiplier: 1.8, extra: {}, unlock_level: 5 },
  { class: 'warrior', key: 'warrior_second_wind', name: 'Второе дыхание', description: 'Восстанавливает часть здоровья.',
    cooldown_ms: 15000, priority: 4, effect_type: 'heal', power_multiplier: 1, extra: { heal_pct: 0.25 }, unlock_level: 7 },
  { class: 'warrior', key: 'warrior_earthquake', name: 'Землетрясение', description: 'Мощный урон по цели.',
    cooldown_ms: 9000, priority: 5, effect_type: 'damage', power_multiplier: 2.5, extra: {}, unlock_level: 10 },

  // ---- archer ----
  { class: 'archer', key: 'archer_quick_shot', name: 'Быстрый выстрел', description: 'Лёгкий частый урон.',
    cooldown_ms: 1500, priority: 1, effect_type: 'damage', power_multiplier: 1.2, extra: {}, unlock_level: 1 },
  { class: 'archer', key: 'archer_multishot', name: 'Мультивыстрел', description: 'Урон несколькими стрелами.',
    cooldown_ms: 4000, priority: 2, effect_type: 'damage', power_multiplier: 1.8, extra: {}, unlock_level: 3 },
  { class: 'archer', key: 'archer_piercing_arrow', name: 'Пронзающая стрела', description: 'Урон, частично игнорирующий защиту.',
    cooldown_ms: 5000, priority: 3, effect_type: 'damage', power_multiplier: 2.0, extra: { defense_pierce: 0.3 }, unlock_level: 5 },
  { class: 'archer', key: 'archer_eagle_eye', name: 'Орлиный глаз', description: 'Временно повышает шанс крита.',
    cooldown_ms: 8000, priority: 4, effect_type: 'buff', power_multiplier: 1, extra: { crit_chance_bonus: 0.2, duration_ms: 4000 }, unlock_level: 7 },
  { class: 'archer', key: 'archer_rain_of_arrows', name: 'Дождь стрел', description: 'Разрушительный залп по цели.',
    cooldown_ms: 11000, priority: 5, effect_type: 'damage', power_multiplier: 3.0, extra: {}, unlock_level: 10 },

  // ---- zhnec ----
  { class: 'zhnec', key: 'zhnec_soul_reap', name: 'Жатва душ', description: 'Урон косой по цели.',
    cooldown_ms: 3000, priority: 1, effect_type: 'damage', power_multiplier: 1.7, extra: {}, unlock_level: 1 },
  { class: 'zhnec', key: 'zhnec_blood_drain', name: 'Иссушение крови', description: 'Временно усиливает вампиризм.',
    cooldown_ms: 6000, priority: 2, effect_type: 'lifesteal_bonus', power_multiplier: 1, extra: { lifesteal_bonus: 0.2, duration_ms: 4000 }, unlock_level: 3 },
  { class: 'zhnec', key: 'zhnec_death_grip', name: 'Хватка смерти', description: 'Урон и подтягивание цели.',
    cooldown_ms: 4000, priority: 3, effect_type: 'damage', power_multiplier: 1.4, extra: {}, unlock_level: 5 },
  { class: 'zhnec', key: 'zhnec_dark_pact', name: 'Тёмный договор', description: 'Урон ценой части здоровья с усиленным вампиризмом.',
    cooldown_ms: 7000, priority: 4, effect_type: 'damage', power_multiplier: 2.0, extra: { self_lifesteal_override: 0.35 }, unlock_level: 7 },
  { class: 'zhnec', key: 'zhnec_execute', name: 'Казнь', description: 'Добивающий удар, усиленный против раненых целей.',
    cooldown_ms: 10000, priority: 5, effect_type: 'damage', power_multiplier: 2.8, extra: { execute_threshold: 0.3, execute_mult: 2.0 }, unlock_level: 10 },

  // ---- assasin ----
  { class: 'assasin', key: 'assasin_backstab', name: 'Удар в спину', description: 'Урон с повышенным шансом крита.',
    cooldown_ms: 2500, priority: 1, effect_type: 'damage', power_multiplier: 1.5, extra: { crit_chance_bonus: 0.15 }, unlock_level: 1 },
  { class: 'assasin', key: 'assasin_shadow_strike', name: 'Теневой удар', description: 'Резкий урон по цели.',
    cooldown_ms: 3500, priority: 2, effect_type: 'damage', power_multiplier: 1.9, extra: {}, unlock_level: 3 },
  { class: 'assasin', key: 'assasin_venom_blade', name: 'Ядовитый клинок', description: 'Наносит урон и отравляет цель.',
    cooldown_ms: 5000, priority: 3, effect_type: 'debuff', power_multiplier: 0.6, extra: { dot_pct: 0.05, duration_ms: 3000 }, unlock_level: 5 },
  { class: 'assasin', key: 'assasin_adrenaline', name: 'Адреналин', description: 'Временно повышает скорость атаки.',
    cooldown_ms: 9000, priority: 4, effect_type: 'buff', power_multiplier: 1, extra: { attack_speed_mult: 1.4, duration_ms: 4000 }, unlock_level: 7 },
  { class: 'assasin', key: 'assasin_assassinate', name: 'Убийство', description: 'Разрушительный крит-удар.',
    cooldown_ms: 12000, priority: 5, effect_type: 'damage', power_multiplier: 3.2, extra: { crit_dmg_bonus: 0.5 }, unlock_level: 10 },
];

module.exports = SKILLS;
