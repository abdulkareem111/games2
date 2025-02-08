const { query, handleDbError } = require('../utils/db');
const db = require('../utils/db');

async function signup(req, res) {
  const { email, username, password } = req.body;
  const hashed_password = password; // For production, hash the password!
  const sql = 'INSERT INTO users (email, username, hashed_password) VALUES (?, ?, ?)';
  try {
    const result = await db.query(sql, [email, username, hashed_password]);
    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (err) {
    handleDbError(res, err, 'Error creating user');
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND hashed_password = ?';
  try {
    const results = await db.query(sql, [email, password]);
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', user: results[0] });
  } catch (err) {
    handleDbError(res, err, 'Login error');
  }
}

module.exports = { signup, login };