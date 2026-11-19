// Crea (o actualiza) el administrador con ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD del .env.
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { pool } = require('../src/config/db');
const { validarRegistro } = require('../src/utils/validaciones');

(async () => {
  try {
    let datos;
    try {
      datos = validarRegistro({
        nombre: process.env.ADMIN_NOMBRE || 'Administrador',
        correo: process.env.ADMIN_CORREO,
        password: process.env.ADMIN_PASSWORD,
      });
    } catch (err) {
      const campos = (err.detalles || []).map((d) => `ADMIN_${d.campo.toUpperCase()}: ${d.mensaje}`);
      console.error(`Variables del administrador inválidas en .env:\n  ${campos.join('\n  ')}`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(datos.password, env.BCRYPT_ROUNDS);
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (correo) DO UPDATE
       SET rol = 'admin', password_hash = EXCLUDED.password_hash, nombre = EXCLUDED.nombre`,
      [datos.nombre, datos.correo, passwordHash],
    );
    console.log(`Administrador listo: ${datos.correo}`);
  } catch (err) {
    console.error('No se pudo crear el administrador:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
