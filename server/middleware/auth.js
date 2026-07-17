const { verifyToken } = require('../services/authService');
const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const asyncHandler = require('../lib/asyncHandler');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'unauthorized'));

  const payload = verifyToken(token);
  if (!payload) return next(httpError(401, 'unauthorized'));

  req.user = { id: payload.sub, username: payload.username };
  next();
};

const loadCharacter = asyncHandler(async (req, res, next) => {
  const result = await pool.query('SELECT * FROM characters WHERE user_id = $1', [req.user.id]);
  req.character = result.rows[0] || null;
  next();
});

const requireCharacter = asyncHandler(async (req, res, next) => {
  const result = await pool.query('SELECT * FROM characters WHERE user_id = $1', [req.user.id]);
  req.character = result.rows[0] || null;
  if (!req.character) return next(httpError(404, 'no_character'));
  next();
});

module.exports = { requireAuth, loadCharacter, requireCharacter };
