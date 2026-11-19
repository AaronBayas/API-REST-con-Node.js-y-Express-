const HttpError = require('../utils/HttpError');

const MAX_INT = 2147483647; // máximo de INTEGER/SERIAL en PostgreSQL

// Valida que req.params[nombre] sea un entero positivo; si no, la petición está mal formada (400).
module.exports = (nombre = 'id') => (req, _res, next) => {
  const valor = req.params[nombre];
  if (!/^[1-9]\d{0,9}$/.test(valor) || Number(valor) > MAX_INT) {
    throw new HttpError(400, 'PETICION_INVALIDA', `El parámetro "${nombre}" debe ser un entero positivo`);
  }
  next();
};
