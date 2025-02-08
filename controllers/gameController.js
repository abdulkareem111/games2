const db = require('../utils/db');
const { query, handleDbError } = require('../utils/db');

async function getGames(req, res) {
  const sql = 'SELECT * FROM games';
  try {
    const results = await query(sql);
    res.json(results);
  } catch (err) {
    handleDbError(res, err, 'Error fetching games');
  }
}

async function addGame(req, res) {
  const { name, description, rules, session_duration, max_players } = req.body;
  if (!name || !description || !rules || !session_duration || !max_players) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = `
    INSERT INTO games (name, description, rules, session_duration, max_players)
    VALUES (?, ?, ?, ?, ?)
  `;
  try {
    const result = await query(sql, [name, description, rules, session_duration, max_players]);
    res.json({ message: 'Game added successfully', gameId: result.insertId });
  } catch (err) {
    handleDbError(res, err, 'Error adding game');
  }
}

module.exports = { getGames, addGame };