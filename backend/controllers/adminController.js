const db = require('../utils/db');
const gameRegistry = require('../gameRegistry');
const { query, handleDbError } = require('../utils/db');

function getAdminStats(req, res) {
  const activeSessions = Array.from(gameRegistry.activeSessions.entries()).map(([roomId, game]) => ({
    roomId,
    gameId: game.gameId,
    playerCount: game.getPlayerCount(),
    state: game.state,
    metadata: game.getMetadata()
  }));
  res.json({
    activeSessions,
    totalSessions: gameRegistry.activeSessions.size,
    registeredGames: Array.from(gameRegistry.games.keys())
  });
}

async function getAdminGames(req, res) {
  const sql = 'SELECT * FROM games';
  try {
    const results = await db.query(sql);
    res.json(results);
  } catch (err) {
    handleDbError(res, err, 'Error fetching games');
  }
}

module.exports = { getAdminStats, getAdminGames };