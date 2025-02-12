const db = require('../utils/db');
const { query, handleDbError } = require('../utils/db');
const axios = require('axios'); // Add axios for making HTTP requests

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
  let { name, description, rules, session_duration, max_players } = req.body;
  rules='rules';
  session_duration=30;
  max_players=2;

  const camelName = name
  .replace(/[^a-z0-9]+(.)/gi, (_, char) => char.toUpperCase())
  .replace(/^[a-z]/, match => match.toUpperCase());
  
  name = name.toLowerCase().replace(/[^a-z0-9]/g, '');


  if (!name || !description || !rules || !session_duration || !max_players) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const sql = `
    INSERT INTO games (name, description, rules, session_duration, max_players)
    VALUES (?, ?, ?, ?, ?)
  `;
  try {
    const result = await query(sql, [camelName, description, rules, session_duration, max_players]);
    
    // Call the /complete API after creating the game
    const aiResponse = await axios.post(`${process.env.BASE_URL}/api/ai/complete`, {
      nameOfGame: camelName,
      description,
    });

    res.json({ 
      message: 'Game added successfully', 
      gameId: result.insertId,
      aiResponse: aiResponse.data // Include AI response in the response
    });
  } catch (err) {
    handleDbError(res, err, 'Error adding game');
  }
}

module.exports = { getGames, addGame };