const characterService = require('../services/characterService');

async function create(req, res) {
  const { class: characterClass, name } = req.body || {};
  const character = await characterService.createCharacter(req.user.id, characterClass, name);
  const full = await characterService.getFullCharacter(character.id);
  res.status(201).json(full);
}

// requires middleware.requireCharacter to have run first (populates req.character)
async function get(req, res) {
  const full = await characterService.getFullCharacter(req.character.id);
  res.json(full);
}

async function reroll(req, res) {
  await characterService.rerollCharacter(req.user.id);
  res.json({ ok: true });
}

module.exports = { create, get, reroll };
