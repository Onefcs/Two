const characterService = require('../services/characterService');

async function get(req, res) {
  const character = await characterService.getFullCharacter(req.character.id);
  res.json({ user: req.user, character });
}

module.exports = { get };
