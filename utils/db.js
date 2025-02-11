require('dotenv').config();
const mysql = require('mysql2');
const util = require('util');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

pool.query = util.promisify(pool.query);
pool.getConnection = util.promisify(pool.getConnection);

function handleDbError(res, err, msg = 'Database error') {
  console.error(msg, err);
  return res.status(500).json({ error: msg });
}

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  pool,
  handleDbError
};
