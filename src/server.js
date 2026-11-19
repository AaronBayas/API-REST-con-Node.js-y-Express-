const env = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('No se pudo conectar a PostgreSQL:', err.message);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${env.PORT}/api`);
  });
})();
