const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, handleDbError } = require('../utils/db');
const db = require('../utils/db');

async function signup(req, res) {
  const { email, username, password } = req.body;
  try {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, username, hashed_password, coins) VALUES (?, ?, ?, ?)';
    const result = await db.query(sql, [email, username, hashedPassword, 10]);
    // Create JWT token
    const token = jwt.sign({ id: result.insertId, email, username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ 
      message: 'User created successfully', 
      userId: result.insertId,
      token
    });
  } catch (err) {
    handleDbError(res, err, 'Error creating user');
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  try {
    const results = await db.query(sql, [email]);
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = results[0];
    // Compare provided password with stored hash
    const passwordValid = await bcrypt.compare(password, user.hashed_password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Create JWT token
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', user, token });
  } catch (err) {
    handleDbError(res, err, 'Login error');
  }
}

async function getRandomUser(req, res) {
  const exclude = req.query.exclude;
  let sql;
  let params = [];
  if (exclude) {
    sql = 'SELECT id, username FROM users WHERE id != ? ORDER BY RAND() LIMIT 1';
    params.push(exclude);
  } else {
    sql = 'SELECT id, username FROM users ORDER BY RAND() LIMIT 1';
  }
  try {
    const results = await db.query(sql, params);
    if (results.length === 0) {
      return res.status(404).json({ error: 'No user found' });
    }
    res.json(results[0]);
  } catch (err) {
    handleDbError(res, err, 'Error fetching random user');
  }
}

module.exports = { signup, login, getRandomUser };