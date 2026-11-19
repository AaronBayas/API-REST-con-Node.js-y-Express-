const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

// Lee "Authorization: Bearer <token>", verifica firma y expiración y deja la identidad en req.usuario
module.exports = (req, _res, next) => {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'NO_AUTENTICADO', 'Token requerido');

  let payload;
  try {
    // Algoritmo fijo: rechaza tokens firmados con otro algoritmo (p. ej. "none").
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    if (e.name === 'TokenExpiredError') throw new HttpError(401, 'TOKEN_VENCIDO', 'El token ha expirado');
    throw new HttpError(401, 'NO_AUTENTICADO', 'Token inválido');
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0 || !['usuario', 'admin'].includes(payload.rol)) {
    throw new HttpError(401, 'NO_AUTENTICADO', 'Token inválido');
  }

  req.usuario = { id, rol: payload.rol };
  next();
};
