const mysql = require('mysql2');
const util = require('util');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
    user: process.env.DB_USER || 'sql12762180',
    password: process.env.DB_PASSWORD || 'KFjjujU79f',
    database: process.env.DB_NAME || 'sql12762180',
    port: process.env.DB_PORT || 3306
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
