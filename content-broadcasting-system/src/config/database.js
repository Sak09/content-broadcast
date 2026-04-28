const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

const createPool = () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'content_broadcasting',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  return pool;
};

const getPool = () => {
  if (!pool) return createPool();
  return pool;
};

const testConnection = async () => {
  try {
    const conn = await getPool().getConnection();
    logger.info('MySQL connected successfully');
    conn.release();
    return true;
  } catch (err) {
    logger.error('MySQL connection failed:', err.message);
    throw err;
  }
};

const query = async (sql, params = []) => {
  const [rows] = await getPool().execute(sql, params);
  return rows;
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

module.exports = { getPool, testConnection, query, queryOne };
