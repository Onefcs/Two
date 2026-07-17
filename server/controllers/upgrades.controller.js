const characterService = require('../services/characterService');
const upgradeService = require('../services/upgradeService');

async function list(req, res) {
  const full = await characterService.getFullCharacter(req.character.id);
  res.json({ upgrades: full.upgrades, upgradeCosts: full.upgradeCosts, gold: full.gold });
}

async function purchase(req, res) {
  const { statKey } = req.body || {};
  const character = await upgradeService.purchaseUpgrade(req.character.id, statKey);
  res.json(character);
}

module.exports = { list, purchase };
