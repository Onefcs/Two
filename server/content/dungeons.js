// Placeholder parallax layers: flat colour gradients until real background art exists.
// Renderer just needs {colors: [near..far]} to draw gradient bands; swappable later
// for real image layers without touching schema/API.

const DUNGEONS = [
  {
    key: 'whispering_forest',
    name: 'Шепчущий лес',
    min_character_level: 1,
    boss_unlock_level: 5,
    order_index: 1,
    allowed_rarities: ['common', 'uncommon'],
    background_layers: { colors: ['#0d1f14', '#173c26', '#2c6b42', '#4fa568'] },
  },
  {
    key: 'sunken_crypt',
    name: 'Затонувший склеп',
    min_character_level: 6,
    boss_unlock_level: 12,
    order_index: 2,
    allowed_rarities: ['common', 'uncommon', 'rare'],
    background_layers: { colors: ['#0c111f', '#182236', '#2b3a5c', '#495e8f'] },
  },
  {
    key: 'ashen_wastes',
    name: 'Пепельные пустоши',
    min_character_level: 13,
    boss_unlock_level: 20,
    order_index: 3,
    allowed_rarities: ['uncommon', 'rare', 'epic'],
    background_layers: { colors: ['#1f0c0c', '#3c1717', '#6b2c2c', '#a5504f'] },
  },
  {
    key: 'frozen_citadel',
    name: 'Ледяная цитадель',
    min_character_level: 21,
    boss_unlock_level: 30,
    order_index: 4,
    allowed_rarities: ['rare', 'epic', 'legendary'],
    background_layers: { colors: ['#0c1a1f', '#173036', '#2c5b66', '#4f97a5'] },
  },
  {
    key: 'abyssal_rift',
    name: 'Бездонный разлом',
    min_character_level: 30,
    boss_unlock_level: 40,
    order_index: 5,
    allowed_rarities: ['epic', 'legendary'],
    background_layers: { colors: ['#150c1f', '#291736', '#4c2c6b', '#7a4fa5'] },
  },
];

module.exports = DUNGEONS;
