// Pool de conexiones. pg toma PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE del entorno.
require('./env');
const { Pool, types } = require('pg');

// pg devuelve NUMERIC como texto; el precio (NUMERIC(10,2)) se entrega como número en el JSON.
types.setTypeParser(types.builtins.NUMERIC, (valor) => (valor === null ? null : Number(valor)));

const pool = new Pool();

// Usar siempre parámetros ($1, $2…) en lugar de concatenar valores en el SQL.
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
