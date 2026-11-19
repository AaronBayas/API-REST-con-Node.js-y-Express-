const favoritos = require('../repositories/favoritos.repository');
const productos = require('../repositories/productos.repository');
const HttpError = require('../utils/HttpError');
const { ok, lista, sinContenido } = require('../utils/respuestas');
const { validarProductoId } = require('../utils/validaciones');

// La identidad sale SOLO del token verificado (req.usuario.id).
// Cualquier usuarioId que llegue en el cuerpo, la query o la ruta se ignora.

const listar = async (req, res) => {
  const datos = await favoritos.listarPorUsuario(req.usuario.id);
  return lista(res, datos);
};

const agregar = async (req, res) => {
  const productoId = validarProductoId(req.body);

  const producto = await productos.obtenerPorId(productoId);
  if (!producto) throw new HttpError(404, 'NO_ENCONTRADO', 'Producto no encontrado');

  try {
    const favorito = await favoritos.agregar(req.usuario.id, productoId);
    return ok(res, favorito, 201);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'CONFLICTO', 'El producto ya está en sus favoritos');
    // El producto se eliminó entre la consulta y el INSERT
    if (err.code === '23503') throw new HttpError(404, 'NO_ENCONTRADO', 'Producto no encontrado');
    throw err;
  }
};

const quitar = async (req, res) => {
  const eliminados = await favoritos.quitar(req.usuario.id, Number(req.params.productId));
  if (eliminados === 0) throw new HttpError(404, 'NO_ENCONTRADO', 'Favorito no encontrado');
  return sinContenido(res);
};

module.exports = { listar, agregar, quitar };
