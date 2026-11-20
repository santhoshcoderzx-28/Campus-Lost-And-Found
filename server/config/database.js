// One PostgreSQL pool for the whole API (Supabase, Session Pooler)
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing from .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  // Supabase's pooler closes idle connections, so keep the pool small and
  // retire idle clients before the pooler does.
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => console.error('Unexpected database error:', err.message));

// Errors that mean "the connection died", not "the query is wrong"
const RETRYABLE = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', '08006', '08003', '57P01'];

function isConnectionError(error) {
  const code = String(error.code || '');
  const message = String(error.message || '');
  if (RETRYABLE.includes(code)) return true;
  return (
    message.includes('Connection terminated') ||
    message.includes('connection timeout') ||
    message.includes('Client has encountered a connection error')
  );
}

// Every query in the project goes through here, so parameter binding ($1, $2)
// is used everywhere and a dead pooled connection is retried once.
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    // Only a read is safe to repeat: a write may already have committed
    // before the connection dropped, so retrying it could duplicate a row.
    const isRead = /^\s*select/i.test(text);
    if (!isRead || !isConnectionError(error)) throw error;
    console.warn('Retrying read after a connection error:', error.message);
    return pool.query(text, params);
  }
}

const testConnection = async () => {
  try {
    const { rows } = await query('select now() as now');
    console.log(`PostgreSQL connected: ${rows[0].now}`);
    return true;
  } catch (error) {
    console.error(`PostgreSQL connection FAILED: ${error.message}`);
    return false;
  }
};

module.exports = { pool, query, testConnection };
