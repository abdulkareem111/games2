
const express = require('express');
const router = express.Router();
const { googleLogin, facebookLogin } = require('../controllers/socialAuthController');

// Social login endpoints
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);

module.exports = router;