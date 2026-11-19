// Ejecuta db/schema.sql y luego db/seed.sql sobre la base configurada en .env.
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/config/db');

const leer = (archivo) => fs.readFileSync(path.join(__dirname, '..', 'db', archivo), 'utf8');

(async () => {
  try {
    await pool.query(leer('schema.sql'));
    await pool.query(leer('seed.sql'));
    console.log('Base de datos inicializada');
  } catch (err) {
    console.error('No se pudo inicializar la base de datos:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
