const craftingService = require('../services/craftingService');
const characterService = require('../services/characterService');
const httpError = require('../lib/httpError');

async function list(req, res) {
  const recipes = await craftingService.listRecipes(req.character.class);
  res.json({ recipes });
}

async function craft(req, res) {
  const { recipeId } = req.body || {};
  if (!recipeId) throw httpError(400, 'recipe_id_required');
  const result = await craftingService.craft(req.character, Number(recipeId));
  const character = await characterService.getFullCharacter(req.character.id);
  res.json({ ...result, character });
}

module.exports = { list, craft };
