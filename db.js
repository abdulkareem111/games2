// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  user: process.env.DB_USER || 'sql12762180',
  password: process.env.DB_PASSWORD || 'KFjjujU79f',
  database: process.env.DB_NAME || 'sql12762180',
  port: process.env.DB_PORT || 3306
});

// A helper function to execute queries.
async function query(sql, params) {
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = { pool, query };
