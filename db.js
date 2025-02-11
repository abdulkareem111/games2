require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// A helper function to execute queries.
async function query(sql, params) {
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = { pool, query };
