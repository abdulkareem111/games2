const express = require('express');
const { getUserStats } = require('../controllers/statsController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', getUserStats);

module.exports = router;