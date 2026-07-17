const friendsService = require('../services/friendsService');
const httpError = require('../lib/httpError');

async function list(req, res) {
  const friends = await friendsService.listFriends(req.user.id);
  res.json({ friends });
}

async function requests(req, res) {
  const result = await friendsService.listRequests(req.user.id);
  res.json(result);
}

async function sendRequest(req, res) {
  const { username } = req.body || {};
  if (!username) throw httpError(400, 'username_required');
  await friendsService.sendRequest(req.user.id, username);
  res.status(201).json({ ok: true });
}

async function accept(req, res) {
  await friendsService.acceptRequest(req.user.id, Number(req.params.id));
  res.json({ ok: true });
}

async function decline(req, res) {
  await friendsService.declineRequest(req.user.id, Number(req.params.id));
  res.json({ ok: true });
}

async function remove(req, res) {
  await friendsService.removeFriend(req.user.id, Number(req.params.userId));
  res.json({ ok: true });
}

async function profile(req, res) {
  const result = await friendsService.getFriendProfile(req.user.id, Number(req.params.userId));
  res.json(result);
}

module.exports = { list, requests, sendRequest, accept, decline, remove, profile };
