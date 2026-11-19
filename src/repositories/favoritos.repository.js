const { query } = require('../config/db');

// Todas las consultas filtran por usuario_id: un usuario solo ve y modifica sus propios favoritos.

const listarPorUsuario = async (usuarioId) => {
  const { rows } = await query(
    `SELECT f.producto_id, p.nombre, p.categoria, p.precio, f.creado_en
     FROM favoritos f
     JOIN productos p ON p.id = f.producto_id
     WHERE f.usuario_id = $1
     ORDER BY f.creado_en, f.producto_id`,
    [usuarioId],
  );
  return rows;
};

const agregar = async (usuarioId, productoId) => {
  const { rows } = await query(
    `INSERT INTO favoritos (usuario_id, producto_id)
     VALUES ($1, $2)
     RETURNING usuario_id, producto_id, creado_en`,
    [usuarioId, productoId],
  );
  return rows[0];
};

// Devuelve 0 si ese usuario no tenía ese producto en favoritos.
const quitar = async (usuarioId, productoId) => {
  const { rowCount } = await query(
    'DELETE FROM favoritos WHERE usuario_id = $1 AND producto_id = $2',
    [usuarioId, productoId],
  );
  return rowCount;
};

module.exports = { listarPorUsuario, agregar, quitar };
