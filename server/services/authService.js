const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const httpError = require('../lib/httpError');

const TOKEN_TTL = '30d';

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function register(username, password) {
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 32) {
    throw httpError(400, 'invalid_username');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw httpError(400, 'invalid_password');
  }

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    throw httpError(409, 'username_taken');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash]
  );
  const user = result.rows[0];
  return { user, token: signToken(user) };
}

async function login(username, password) {
  const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
  const row = result.rows[0];
  if (!row) throw httpError(401, 'invalid_credentials');

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw httpError(401, 'invalid_credentials');

  const user = { id: row.id, username: row.username };
  return { user, token: signToken(user) };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { register, login, verifyToken };
