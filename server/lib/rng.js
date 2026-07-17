function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomInRange(min, max + 1));
}

// items: [{ weight, ...rest }]
function weightedPick(items) {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollChance(chance) {
  return Math.random() < chance;
}

module.exports = { randomInRange, randomInt, weightedPick, rollChance };
