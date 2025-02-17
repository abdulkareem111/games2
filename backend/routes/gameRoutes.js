const express = require('express');
const { getGames, addGame, updateGame } = require('../controllers/gameController');
const { loadGames } = require('../gameLoader');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', getGames);
router.post('/add-game', addGame);
router.post('/update-game', async (req, res) => {
  await updateGame(req, res);
  loadGames();
});

module.exports = router;