const battleService = require('../services/battleService');
const httpError = require('../lib/httpError');

async function resolve(req, res) {
  const { dungeonId } = req.body || {};
  if (!dungeonId) throw httpError(400, 'dungeon_required');
  const result = await battleService.resolveBattle(req.user.id, req.character.id, Number(dungeonId), { boss: false });
  res.json(result);
}

module.exports = { resolve };
