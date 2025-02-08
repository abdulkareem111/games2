const { query, handleDbError } = require('../utils/db');
const db = require('../utils/db');

async function getUserStats(req, res) {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const winsQuery = `
    SELECT COUNT(*) as wins 
    FROM session_players sp
    JOIN sessions s ON sp.session_id = s.id
    WHERE sp.user_id = ? 
      AND sp.score = (
          SELECT MAX(score) 
          FROM session_players 
          WHERE session_id = sp.session_id
      )
  `;
  const historyQuery = `
    SELECT g.name as game, sp.score, s.end_time as date
    FROM session_players sp
    JOIN sessions s ON sp.session_id = s.id
    JOIN games g ON s.game_id = g.id
    WHERE sp.user_id = ?
    ORDER BY s.end_time DESC
    LIMIT 10
  `;
  try {
    const winsResults = await db.query(winsQuery, [userId]);
    const historyResults = await db.query(historyQuery, [userId]);
    res.json({ wins: winsResults[0].wins, history: historyResults });
  } catch (err) {
    handleDbError(res, err, 'Error fetching stats');
  }
}

module.exports = { getUserStats };