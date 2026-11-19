const { query } = require('../config/db');

const COLUMNAS = 'id, nombre, descripcion, categoria, precio, creado_en, actualizado_en';

const listar = async ({ categoria } = {}) => {
  if (categoria) {
    const { rows } = await query(
      `SELECT ${COLUMNAS} FROM productos WHERE lower(categoria) = lower($1) ORDER BY id`,
      [categoria],
    );
    return rows;
  }
  const { rows } = await query(`SELECT ${COLUMNAS} FROM productos ORDER BY id`);
  return rows;
};

const obtenerPorId = async (id) => {
  const { rows } = await query(`SELECT ${COLUMNAS} FROM productos WHERE id = $1`, [id]);
  return rows[0] || null;
};

const crear = async ({ nombre, descripcion, categoria, precio }) => {
  const { rows } = await query(
    `INSERT INTO productos (nombre, descripcion, categoria, precio)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNAS}`,
    [nombre, descripcion, categoria, precio],
  );
  return rows[0];
};

// Devuelve null si el producto no existe.
const actualizar = async (id, { nombre, descripcion, categoria, precio }) => {
  const { rows } = await query(
    `UPDATE productos
     SET nombre = $2, descripcion = $3, categoria = $4, precio = $5, actualizado_en = now()
     WHERE id = $1
     RETURNING ${COLUMNAS}`,
    [id, nombre, descripcion, categoria, precio],
  );
  return rows[0] || null;
};

// Devuelve cuántas filas se eliminaron (0 si no existía). Los favoritos se borran por ON DELETE CASCADE.
const eliminar = async (id) => {
  const { rowCount } = await query('DELETE FROM productos WHERE id = $1', [id]);
  return rowCount;
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
