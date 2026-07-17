// ~6 monsters per dungeon (5 regular + 1 boss), stats scaled by dungeon difficulty tier.
// Hardcore economy: gold/xp rewards are modest relative to upgrade/crafting costs.

const ROSTERS = {
  whispering_forest: [
    { key: 'forest_wolf', name: 'Лесной волк' },
    { key: 'forest_boar', name: 'Дикий кабан' },
    { key: 'forest_bandit', name: 'Лесной разбойник' },
    { key: 'forest_spider', name: 'Гигантский паук' },
    { key: 'forest_treant', name: 'Молодой энт' },
    { key: 'forest_boss', name: 'Страж леса', boss: true },
  ],
  sunken_crypt: [
    { key: 'crypt_skeleton', name: 'Скелет-воин' },
    { key: 'crypt_ghoul', name: 'Гуль' },
    { key: 'crypt_wraith', name: 'Призрак' },
    { key: 'crypt_zombie', name: 'Зомби' },
    { key: 'crypt_cultist', name: 'Культист' },
    { key: 'crypt_boss', name: 'Хранитель склепа', boss: true },
  ],
  ashen_wastes: [
    { key: 'ashen_imp', name: 'Пепельный бес' },
    { key: 'ashen_hound', name: 'Огненный пёс' },
    { key: 'ashen_marauder', name: 'Мародёр пустошей' },
    { key: 'ashen_golem', name: 'Магматический голем' },
    { key: 'ashen_witch', name: 'Пепельная ведьма' },
    { key: 'ashen_boss', name: 'Владыка пепла', boss: true },
  ],
  frozen_citadel: [
    { key: 'frost_knight', name: 'Ледяной рыцарь' },
    { key: 'frost_wraith', name: 'Морозный призрак' },
    { key: 'frost_yeti', name: 'Йети' },
    { key: 'frost_elemental', name: 'Элементаль льда' },
    { key: 'frost_sorcerer', name: 'Ледяной чародей' },
    { key: 'frost_boss', name: 'Королева цитадели', boss: true },
  ],
  abyssal_rift: [
    { key: 'abyss_stalker', name: 'Пожиратель бездны' },
    { key: 'abyss_horror', name: 'Ужас разлома' },
    { key: 'abyss_serpent', name: 'Бездонный змей' },
    { key: 'abyss_wraithlord', name: 'Владыка теней' },
    { key: 'abyss_harbinger', name: 'Предвестник' },
    { key: 'abyss_boss', name: 'Разлом-Пожиратель', boss: true },
  ],
};

function buildMonsters(dungeonsByKey) {
  const monsters = [];

  Object.entries(ROSTERS).forEach(([dungeonKey, roster], dungeonIndex) => {
    const tier = dungeonIndex + 1; // 1..5 difficulty scale
    roster.forEach((def, i) => {
      const isBoss = !!def.boss;
      const scale = isBoss ? 4.5 : 1 + i * 0.15;
      monsters.push({
        dungeon_key: dungeonKey,
        key: def.key,
        name: def.name,
        hp: Math.round((40 + tier * 25) * scale),
        attack: Math.round((6 + tier * 3) * scale * (isBoss ? 0.7 : 1)),
        defense: Math.round((1 + tier * 1.5) * scale * 0.5),
        attack_speed: Number((0.6 + tier * 0.05).toFixed(2)),
        crit_chance: 0.05,
        crit_dmg: 1.5,
        xp_reward: Math.round((8 + tier * 6) * (isBoss ? 6 : 1)),
        gold_reward_min: Math.round((2 + tier * 2) * (isBoss ? 5 : 1)),
        gold_reward_max: Math.round((5 + tier * 4) * (isBoss ? 6 : 1)),
        is_boss: isBoss,
        spawn_weight: isBoss ? 0 : 10 - i,
      });
    });
  });

  return monsters;
}

module.exports = { buildMonsters, ROSTERS };
