const HttpError = require('../utils/HttpError');

// Se monta después de todas las rutas: cualquier ruta no atendida es 404.
module.exports = (req, _res, next) => {
  next(new HttpError(404, 'NO_ENCONTRADO', `Ruta no encontrada: ${req.method} ${req.path}`));
};
