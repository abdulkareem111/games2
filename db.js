// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || '0.0.0.0',  // Changed default host to allow LAN access
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Saleem@123',
  database: process.env.DB_NAME || 'the_game'
});

// A helper function to execute queries.
async function query(sql, params) {
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = { pool, query };
