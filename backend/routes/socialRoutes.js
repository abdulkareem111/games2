
const express = require('express');
const { googleLogin, facebookLogin } = require('../controllers/socialAuthController');
const router = express.Router();

// Social login endpoints
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);

module.exports = router;