// Carga .env y valida que existan las variables obligatorias (sin imprimir sus valores).
require('dotenv').config({ quiet: true });

const OBLIGATORIAS = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'JWT_SECRET'];

const faltantes = OBLIGATORIAS.filter((nombre) => !process.env[nombre] || !process.env[nombre].trim());
if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Revise su archivo .env (vea .env.example).`);
  process.exit(1);
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 10,
};
