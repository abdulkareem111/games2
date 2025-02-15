const express = require('express');
const { getGames, addGame, updateGame } = require('../controllers/gameController');
const { loadGames } = require('../gameLoader'); // Import loadGames

const router = express.Router();

router.get('/', getGames);
router.post('/add-game', addGame);
router.post('/update-game', async (req, res) => {
  await updateGame(req, res);
  loadGames(); // Call loadGames after updating a game
  
});

module.exports = router;