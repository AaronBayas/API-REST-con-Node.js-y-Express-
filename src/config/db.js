// Pool de conexiones. pg toma PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE del entorno.
require('./env');
const { Pool } = require('pg');

const pool = new Pool();

// Usar siempre parámetros ($1, $2…) en lugar de concatenar valores en el SQL.
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
