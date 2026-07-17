const battleService = require('../services/battleService');
const httpError = require('../lib/httpError');

async function resolve(req, res) {
  const { dungeonId } = req.body || {};
  if (!dungeonId) throw httpError(400, 'dungeon_required');
  const result = await battleService.resolveBattle(req.user.id, req.character.id, Number(dungeonId), { boss: false });
  res.json(result);
}

async function start(req, res) {
  const { dungeonId, boss = false } = req.body || {};
  if (!dungeonId) throw httpError(400, 'dungeon_required');
  const result = await battleService.startBattle(req.user.id, req.character.id, Number(dungeonId), { boss });
  res.json(result);
}

async function finish(req, res) {
  const { dungeonId, monsterId, outcome, boss = false } = req.body || {};
  if (!dungeonId || !monsterId || !outcome) throw httpError(400, 'missing_fields');
  if (!['win', 'loss', 'timeout'].includes(outcome)) throw httpError(400, 'invalid_outcome');
  const result = await battleService.finishBattle(
    req.user.id, req.character.id, Number(dungeonId), Number(monsterId), outcome, { boss }
  );
  res.json(result);
}

async function dungeonData(req, res) {
  const { dungeonId } = req.query;
  if (!dungeonId) throw httpError(400, 'dungeon_required');
  const result = await battleService.getDungeonData(req.user.id, req.character.id, Number(dungeonId));
  res.json(result);
}

async function sync(req, res) {
  const { dungeonId, battles } = req.body || {};
  if (!dungeonId || !Array.isArray(battles)) throw httpError(400, 'missing_fields');
  const result = await battleService.syncBattles(req.user.id, req.character.id, Number(dungeonId), battles);
  res.json(result);
}

module.exports = { resolve, start, finish, dungeonData, sync };
