const productos = require('../repositories/productos.repository');
const HttpError = require('../utils/HttpError');
const { ok, lista, sinContenido } = require('../utils/respuestas');
const { validarProducto } = require('../utils/validaciones');

const noEncontrado = () => new HttpError(404, 'NO_ENCONTRADO', 'Producto no encontrado');

const listar = async (req, res) => {
  const { categoria } = req.query;
  if (categoria !== undefined && typeof categoria !== 'string') {
    throw new HttpError(400, 'PETICION_INVALIDA', 'El filtro "categoria" debe indicarse una sola vez');
  }
  const datos = await productos.listar({ categoria: categoria && categoria.trim() });
  return lista(res, datos);
};

const obtener = async (req, res) => {
  const producto = await productos.obtenerPorId(Number(req.params.id));
  if (!producto) throw noEncontrado();
  return ok(res, producto);
};

const crear = async (req, res) => {
  const producto = await productos.crear(validarProducto(req.body));
  return ok(res, producto, 201);
};

// PUT es reemplazo completo: exige los cuatro campos.
const actualizar = async (req, res) => {
  const datos = validarProducto(req.body);
  const producto = await productos.actualizar(Number(req.params.id), datos);
  if (!producto) throw noEncontrado();
  return ok(res, producto);
};

const eliminar = async (req, res) => {
  const eliminados = await productos.eliminar(Number(req.params.id));
  if (eliminados === 0) throw noEncontrado();
  return sinContenido(res);
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
