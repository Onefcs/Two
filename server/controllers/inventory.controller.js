const inventoryService = require('../services/inventoryService');
const characterService = require('../services/characterService');
const httpError = require('../lib/httpError');

async function list(req, res) {
  const [items, materials] = await Promise.all([
    inventoryService.listInventory(req.character.id),
    inventoryService.listMaterials(req.character.id),
  ]);
  res.json({ items, materials });
}

async function equip(req, res) {
  const { itemInstanceId } = req.body || {};
  if (!itemInstanceId) throw httpError(400, 'item_instance_id_required');
  const character = await inventoryService.equipItem(req.character, Number(itemInstanceId));
  res.json(character);
}

async function unequip(req, res) {
  const { itemInstanceId } = req.body || {};
  if (!itemInstanceId) throw httpError(400, 'item_instance_id_required');
  const character = await inventoryService.unequipItem(req.character.id, Number(itemInstanceId));
  res.json(character);
}

async function sell(req, res) {
  const itemInstanceId = Number(req.params.id);
  const goldGained = await inventoryService.sellItem(req.character.id, itemInstanceId);
  const character = await characterService.getFullCharacter(req.character.id);
  res.json({ goldGained, character });
}

module.exports = { list, equip, unequip, sell };
