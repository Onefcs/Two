const pool = require('../db/pool');
const httpError = require('../lib/httpError');
const characterService = require('./characterService');

async function listFriends(userId) {
  const { rows } = await pool.query(
    `SELECT f.id AS friendship_id,
            CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_user_id
     FROM friendships f
     WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)`,
    [userId]
  );

  const friends = [];
  for (const row of rows) {
    const userRes = await pool.query('SELECT id, username FROM users WHERE id = $1', [row.friend_user_id]);
    const charRes = await pool.query('SELECT id, class, name, level FROM characters WHERE user_id = $1', [row.friend_user_id]);
    const character = charRes.rows[0];
    let power = null;
    if (character) {
      const full = await characterService.getFullCharacter(character.id);
      power = full.power;
    }
    friends.push({
      friendshipId: row.friendship_id,
      userId: row.friend_user_id,
      username: userRes.rows[0]?.username,
      character: character ? { class: character.class, name: character.name, level: character.level, power } : null,
    });
  }
  return friends;
}

async function listRequests(userId) {
  const incoming = await pool.query(
    `SELECT f.id, u.id AS user_id, u.username FROM friendships f JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = $1 AND f.status = 'pending'`,
    [userId]
  );
  const outgoing = await pool.query(
    `SELECT f.id, u.id AS user_id, u.username FROM friendships f JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = $1 AND f.status = 'pending'`,
    [userId]
  );
  return { incoming: incoming.rows, outgoing: outgoing.rows };
}

async function sendRequest(userId, targetUsername) {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [targetUsername]);
  const target = targetRes.rows[0];
  if (!target) throw httpError(404, 'user_not_found');
  if (target.id === userId) throw httpError(400, 'cannot_friend_self');

  const existing = await pool.query(
    `SELECT id FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [userId, target.id]
  );
  if (existing.rows.length > 0) throw httpError(409, 'friendship_exists');

  await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')`,
    [userId, target.id]
  );
}

async function acceptRequest(userId, friendshipId) {
  const res = await pool.query(
    `UPDATE friendships SET status = 'accepted' WHERE id = $1 AND addressee_id = $2 AND status = 'pending' RETURNING id`,
    [friendshipId, userId]
  );
  if (res.rows.length === 0) throw httpError(404, 'request_not_found');
}

async function declineRequest(userId, friendshipId) {
  const res = await pool.query(
    `DELETE FROM friendships WHERE id = $1 AND (addressee_id = $2 OR requester_id = $2) AND status = 'pending' RETURNING id`,
    [friendshipId, userId]
  );
  if (res.rows.length === 0) throw httpError(404, 'request_not_found');
}

async function removeFriend(userId, otherUserId) {
  await pool.query(
    `DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [userId, otherUserId]
  );
}

async function getFriendProfile(userId, otherUserId) {
  const friendship = await pool.query(
    `SELECT id FROM friendships WHERE status = 'accepted' AND
       ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, otherUserId]
  );
  if (friendship.rows.length === 0) throw httpError(403, 'not_friends');

  const userRes = await pool.query('SELECT id, username FROM users WHERE id = $1', [otherUserId]);
  if (!userRes.rows[0]) throw httpError(404, 'user_not_found');

  const charRes = await pool.query('SELECT id FROM characters WHERE user_id = $1', [otherUserId]);
  const character = charRes.rows[0] ? await characterService.getFullCharacter(charRes.rows[0].id) : null;

  return { username: userRes.rows[0].username, character };
}

module.exports = { listFriends, listRequests, sendRequest, acceptRequest, declineRequest, removeFriend, getFriendProfile };
