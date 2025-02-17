require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../utils/db'); // Your custom DB query helper
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Google Login
 */
router.post('/google', async (req, res) => {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.status(400).json({ error: 'No Google token provided.' });
    }

    // 1. Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // 2. Basic checks
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token.' });
    }

    const email = payload.email;
    const username = payload.name || email;

    // 3. Find or create user
    let sql = 'SELECT * FROM users WHERE email = ?';
    let results = await query(sql, [email]);
    let user;
    if (results.length > 0) {
      user = results[0];
    } else {
      // Create simple random password
      const randomPass = await bcrypt.hash(Date.now().toString(), 10);
      sql = 'INSERT INTO users (email, username, hashed_password, coins) VALUES (?, ?, ?, ?)';
      const insertResult = await query(sql, [email, username, randomPass, 10]);

      user = {
        id: insertResult.insertId,
        email,
        username
      };
    }

    // 4. Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 5. Respond
    res.json({
      message: 'Google login successful',
      user,
      token
    });
  } catch (err) {
    console.error('Google Login error:', err);
    return res.status(500).json({ error: 'Server error during Google login' });
  }
});

/**
 * Facebook Login
 */
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'No Facebook access token provided.' });
    }

    // 1. Validate with Graph API
    const fbResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,email'
      }
    });

    const fbData = fbResponse.data;
    if (!fbData || !fbData.email) {
      return res.status(400).json({ error: 'Failed to get email from Facebook.' });
    }

    const email = fbData.email;
    const username = fbData.name || email;

    // 2. Find or create user
    let sql = 'SELECT * FROM users WHERE email = ?';
    let results = await query(sql, [email]);
    let user;
    if (results.length > 0) {
      user = results[0];
    } else {
      const randomPass = await bcrypt.hash(Date.now().toString(), 10);
      sql = 'INSERT INTO users (email, username, hashed_password, coins) VALUES (?, ?, ?, ?)';
      const insertResult = await query(sql, [email, username, randomPass, 10]);

      user = {
        id: insertResult.insertId,
        email,
        username
      };
    }

    // 3. Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Send response
    res.json({
      message: 'Facebook login successful',
      user,
      token
    });
  } catch (err) {
    console.error('Facebook Login error:', err);
    return res.status(500).json({ error: 'Server error during Facebook login' });
  }
});

module.exports = router;
