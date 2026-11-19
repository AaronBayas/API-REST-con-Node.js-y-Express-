const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const usuarios = require('../repositories/usuarios.repository');
const HttpError = require('../utils/HttpError');
const { ok } = require('../utils/respuestas');
const { validarRegistro, validarLogin } = require('../utils/validaciones');

// Hash de relleno: si el correo no existe se compara igual, para no revelar por tiempo de respuesta qué falló.
const HASH_RELLENO = bcrypt.hashSync('relleno-no-valido', env.BCRYPT_ROUNDS);

const aPublico = ({ id, nombre, correo, rol }) => ({ id, nombre, correo, rol });

const registro = async (req, res) => {
  const { nombre, correo, password } = validarRegistro(req.body);
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const usuario = await usuarios.crear({ nombre, correo, passwordHash });
    return ok(res, aPublico(usuario), 201);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'CONFLICTO', 'El correo ya está registrado');
    throw err;
  }
};

const login = async (req, res) => {
  const { correo, password } = validarLogin(req.body);
  const usuario = await usuarios.buscarPorCorreoConHash(correo);

  const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_RELLENO);
  if (!usuario || !coincide) {
    throw new HttpError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos');
  }

  const token = jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN },
  );

  return ok(res, { token, tipo: 'Bearer', expiraEn: env.JWT_EXPIRES_IN, usuario: aPublico(usuario) });
};

module.exports = { registro, login };
