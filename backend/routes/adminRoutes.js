
const express = require('express');
const { getAdminStats, getAdminGames } = require('../controllers/adminController');

const router = express.Router();

router.get('/stats', getAdminStats);
router.get('/games', getAdminGames);

module.exports = router;