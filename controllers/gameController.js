const db = require('../utils/db');
const { query, handleDbError } = require('../utils/db');
const axios = require('axios'); // Add axios for making HTTP requests
const fs = require('fs'); // Added for file system operations

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

    // New: Update game record with file names from aiResponse
    const { files } = aiResponse.data;
    const { jsFileName, htmlFileName } = files;
    const updateSql = 'UPDATE games SET jsFileName = ?, htmlFileName = ? WHERE id = ?';
    await query(updateSql, [jsFileName, htmlFileName, result.insertId]);

    res.json({ 
      message: 'Game added successfully', 
      gameId: result.insertId,
      aiResponse: aiResponse.data // Include AI response in the response
    });
  } catch (err) {
    handleDbError(res, err, 'Error adding game');
  }
}

async function updateGame(req, res) {
  let { gameId, description } = req.body;
  if (!gameId || !description) {
    return res.status(400).json({ error: 'gameId and description are required' });
  }
  
  // Select game record including name
  const selectSql = 'SELECT name, jsFileName, htmlFileName FROM games WHERE id = ?';
  const results = await query(selectSql, [gameId]);
  if (!results || !results.length) {
    return res.status(404).json({ error: 'Game not found' });
  }
  const game = results[0];

  // Read current file contents to send to AI
  const oldJsContent = fs.readFileSync(`./games/${game.jsFileName}`, 'utf8');
  const oldHtmlContent = fs.readFileSync(`./public/games/${game.htmlFileName}`, 'utf8');

  // Use the name from DB to create camelCase version for AI prompt
  const camelName = game.name
    .replace(/[^a-z0-9]+(.)/gi, (_, char) => char.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());

  description = description + " Js File: " + oldJsContent + " Html File: " + oldHtmlContent;

  
  // Call AI with the description and current file contents
  const aiResponse = await axios.post(`${process.env.BASE_URL}/api/ai/completeUpdate`, {
    nameOfGame: camelName,
    description,
  });
  
  const { files } = aiResponse.data;
  const { jsFileName, htmlFileName } = files;

  // Update the game record with new file names
  const updateSql = 'UPDATE games SET jsFileName = ?, htmlFileName = ? WHERE id = ?';
  await query(updateSql, [jsFileName, htmlFileName, gameId]);

  // Read updated file contents
  const newJsContent = fs.readFileSync(`./games/${jsFileName}`, 'utf8');
  const newHtmlContent = fs.readFileSync(`./public/games/${htmlFileName}`, 'utf8');

  res.json({
    message: 'Game updated successfully',
    gameId,
    jsFile: newJsContent,
    htmlFile: newHtmlContent,
    aiResponse: aiResponse.data
  });
}

module.exports = { getGames, addGame, updateGame };