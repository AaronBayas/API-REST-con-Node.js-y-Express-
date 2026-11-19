const { query } = require('../config/db');

// Columnas públicas: nunca incluir password_hash aquí.
const COLUMNAS = 'id, nombre, correo, rol, creado_en';

// El rol está fijo en la consulta: el cliente nunca decide su rol al registrarse.
const crear = async ({ nombre, correo, passwordHash }) => {
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, correo, password_hash, rol)
     VALUES ($1, $2, $3, 'usuario')
     RETURNING ${COLUMNAS}`,
    [nombre, correo, passwordHash],
  );
  return rows[0];
};

// Único método que lee password_hash; uso exclusivo del login.
const buscarPorCorreoConHash = async (correo) => {
  const { rows } = await query(
    `SELECT ${COLUMNAS}, password_hash FROM usuarios WHERE correo = $1`,
    [correo],
  );
  return rows[0] || null;
};

const buscarPorId = async (id) => {
  const { rows } = await query(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
};

module.exports = { crear, buscarPorCorreoConHash, buscarPorId };
