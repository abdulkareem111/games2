
const express = require('express');
const { getGames, addGame } = require('../controllers/gameController');

const router = express.Router();

router.get('/', getGames);
router.post('/add-game', addGame);

module.exports = router;