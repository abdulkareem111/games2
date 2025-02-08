
const express = require('express');
const { getUserStats } = require('../controllers/statsController');

const router = express.Router();

router.get('/', getUserStats);

module.exports = router;