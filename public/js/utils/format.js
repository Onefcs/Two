export function formatNumber(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

export function formatPercent(n) {
  return `${Math.round(n * 1000) / 10}%`;
}

export function formatStatValue(stat, value) {
  if (stat === 'crit_chance' || stat === 'lifesteal') return formatPercent(value);
  if (stat === 'crit_dmg') return `x${(Math.round(value * 100) / 100).toFixed(2)}`;
  if (stat === 'attack_speed') return `${(Math.round(value * 100) / 100).toFixed(2)}/с`;
  return formatNumber(value);
}
