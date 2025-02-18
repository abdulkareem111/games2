const db = require('../utils/db');
const { query, handleDbError } = require('../utils/db');
const axios = require('axios'); // Add axios for making HTTP requests
const fs = require('fs'); // Added for file system operations
const cloudinary = require('cloudinary').v2; // new: import cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
  rules = 'rules';
  session_duration = 30;
  max_players = 2;

  const camelName = name
    .replace(/[^a-z0-9]+(.)/gi, (_, char) => char.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());

  name = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!name || !description || !rules || !session_duration || !max_players) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Replace local file handling with Cloudinary upload:
  let imageUrl = null;
  if (req.file) {
    const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: 'games' });
    imageUrl = uploadResult.secure_url;
  }

  const sql = `
    INSERT INTO games (name, description, image, rules, session_duration, max_players)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    const token = req.headers.authorization; // Retrieve the token from headers
    const result = await query(sql, [camelName, description, imageUrl, rules, session_duration, max_players]);

    // Read existing SnakeGame template files and build the prompt for AI
    const snakeHtmlContent = fs.readFileSync(`./public/games/SnakeGame.htm`, 'utf8');
    const snakeJsContent = fs.readFileSync(`./games/SnakeGame.js`, 'utf8');

    // Improved prompt ensuring exact same backend, socket events, logic, and APIs
    let prompt = `
I will provide you two example files and a prompt. The game should use same backend, socket events, logics and APIs. just give me 1 html and 1 js file code. dont say anything else
    Return the result as a JSON object with two keys: "htmlFile" (containing the HTML code) and "jsFile" (containing the JavaScript code). dont add any extra quotations or backticks
      Your code should be same as below provided code files.

SnakeGame HTML File:
${snakeHtmlContent}

SnakeGame JS File:
${snakeJsContent}
`;  

    // Send the prompt to AI
    const aiResponse = await axios.post(
      `${process.env.BASE_URL}/api/ai/complete`,
      {
        nameOfGame: camelName,
        description,
        systemPrompt: prompt
      },
      { headers: { Authorization: token } }
    );

    // Update the game record with file names from AI response
    const { files } = aiResponse.data;
    const { jsFileName, htmlFileName } = files;
    const updateSql = 'UPDATE games SET jsFileName = ?, htmlFileName = ? WHERE id = ?';
    await query(updateSql, [jsFileName, htmlFileName, result.insertId]);

    res.json({
      message: 'Game added successfully',
      gameId: result.insertId,
      aiResponse: aiResponse.data
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

  try {
    const token = req.headers.authorization; // new: retrieve token header
    const aiResponse = await axios.post(`${process.env.BASE_URL}/api/ai/completeUpdate`, {
      nameOfGame: camelName,
      description,
    }, {
      headers: { Authorization: token } // new: pass token header
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
  } catch (err) {
    // ...existing code...
  }
}

module.exports = { getGames, addGame, updateGame };