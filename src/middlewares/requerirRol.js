const HttpError = require('../utils/HttpError');

// Se usa SIEMPRE después de verificarToken: req.usuario ya viene del token verificado.
module.exports = (...roles) => (req, _res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    throw new HttpError(403, 'PROHIBIDO', 'No tiene permisos para esta acción');
  }
  next();
};
