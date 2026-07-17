const dungeonService = require('../services/dungeonService');
const battleService = require('../services/battleService');

async function list(req, res) {
  const dungeons = await dungeonService.listDungeons(req.character.id, req.character.level);
  res.json({ dungeons });
}

async function enter(req, res) {
  const dungeonId = Number(req.params.id);
  const dungeon = await dungeonService.enterDungeon(req.character.id, dungeonId, req.character.level);
  res.json({ dungeon });
}

async function bossBattle(req, res) {
  const dungeonId = Number(req.params.id);
  const result = await battleService.resolveBattle(req.user.id, req.character.id, dungeonId, { boss: true });
  res.json(result);
}

module.exports = { list, enter, bossBattle };
