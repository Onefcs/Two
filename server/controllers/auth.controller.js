const authService = require('../services/authService');
const pool = require('../db/pool');

async function register(req, res) {
  const { username, password } = req.body || {};
  const { user, token } = await authService.register(username, password);
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const { username, password } = req.body || {};
  const { user, token } = await authService.login(username, password);
  res.json({ user, token });
}

async function me(req, res) {
  const characterResult = await pool.query('SELECT id FROM characters WHERE user_id = $1', [req.user.id]);
  res.json({ user: req.user, hasCharacter: characterResult.rows.length > 0 });
}

module.exports = { register, login, me };
