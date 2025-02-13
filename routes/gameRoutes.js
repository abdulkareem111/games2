
const express = require('express');
const { getGames, addGame, updateGame } = require('../controllers/gameController');

const router = express.Router();

router.get('/', getGames);
router.post('/add-game', addGame);
router.post('/update-game', updateGame);


module.exports = router;