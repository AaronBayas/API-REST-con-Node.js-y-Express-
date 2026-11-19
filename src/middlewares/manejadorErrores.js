const HttpError = require('../utils/HttpError');
const { error } = require('../utils/respuestas');

// Códigos de error de PostgreSQL que se traducen a respuestas controladas.
const ERRORES_PG = {
  23505: [409, 'CONFLICTO', 'El recurso ya existe'],
  23503: [404, 'NO_ENCONTRADO', 'El recurso relacionado no existe'],
  23514: [422, 'VALIDACION', 'Datos inválidos'],
  22001: [422, 'VALIDACION', 'Un valor excede la longitud permitida'],
  '22P02': [400, 'PETICION_INVALIDA', 'Petición mal formada'],
};

// Último middleware de la app. Nunca expone stack, SQL ni datos internos al cliente.
// eslint-disable-next-line no-unused-vars
module.exports = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return error(res, err.status, err.codigo, err.message, err.detalles);
  }

  // JSON mal formado en el cuerpo (lo lanza express.json)
  if (err.type === 'entity.parse.failed') {
    return error(res, 400, 'PETICION_INVALIDA', 'El cuerpo de la petición no es un JSON válido');
  }
  if (err.type === 'entity.too.large') {
    return error(res, 413, 'PETICION_INVALIDA', 'El cuerpo de la petición es demasiado grande');
  }

  if (err.code && ERRORES_PG[err.code]) {
    const [status, codigo, mensaje] = ERRORES_PG[err.code];
    return error(res, status, codigo, mensaje);
  }

  console.error(err);
  return error(res, 500, 'ERROR_INTERNO', 'Error interno del servidor');
};
