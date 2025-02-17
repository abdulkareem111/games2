const express = require('express');
const { signup, login, getRandomUser } = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth'); // new import

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/random', authenticateToken, getRandomUser); // secured

module.exports = router;