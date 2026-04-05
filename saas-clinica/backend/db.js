const { Pool, types } = require('pg');

// Return TIMESTAMP columns as raw strings so they don't get UTC-serialized.
// Without this, pg creates a JS Date and res.json() adds a trailing "Z",
// which makes the browser interpret the value as UTC — causing hour offsets.
types.setTypeParser(1114, val => val); // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, val => val); // TIMESTAMP WITH TIME ZONE

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'clinic_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

module.exports = pool;
  