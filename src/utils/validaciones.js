const HttpError = require('./HttpError');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// El cuerpo debe ser un objeto JSON; si no llega cuerpo se trata como vacío.
const comoObjeto = (body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {});

const lanzarSiHayErrores = (detalles) => {
  if (detalles.length > 0) throw new HttpError(422, 'VALIDACION', 'Datos inválidos', detalles);
};

// Valida un texto obligatorio con longitud mínima y máxima tras trim.
const validarTexto = (detalles, campo, valor, min, max) => {
  if (typeof valor !== 'string' || valor.trim() === '') {
    detalles.push({ campo, mensaje: 'Es obligatorio y debe ser texto' });
    return undefined;
  }
  const limpio = valor.trim();
  if (limpio.length < min || limpio.length > max) {
    detalles.push({ campo, mensaje: `Debe tener entre ${min} y ${max} caracteres` });
  }
  return limpio;
};

const validarCorreo = (detalles, valor) => {
  const correo = validarTexto(detalles, 'correo', valor, 3, 150);
  if (correo === undefined) return undefined;
  if (!REGEX_CORREO.test(correo)) detalles.push({ campo: 'correo', mensaje: 'Formato de correo inválido' });
  return correo.toLowerCase();
};

// Registro: lista blanca nombre/correo/password. Cualquier "rol" enviado se ignora.
const validarRegistro = (body) => {
  const { nombre, correo, password } = comoObjeto(body);
  const detalles = [];

  const datos = {
    nombre: validarTexto(detalles, 'nombre', nombre, 2, 100),
    correo: validarCorreo(detalles, correo),
    password,
  };

  // bcrypt solo usa los primeros 72 bytes, por eso se limita la longitud.
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    detalles.push({ campo: 'password', mensaje: 'Debe tener entre 8 y 72 caracteres' });
  }

  lanzarSiHayErrores(detalles);
  return datos;
};

// Login: solo exige que lleguen ambos campos; la verificación real la hace bcrypt.
const validarLogin = (body) => {
  const { correo, password } = comoObjeto(body);
  const detalles = [];
  if (typeof correo !== 'string' || correo.trim() === '') {
    detalles.push({ campo: 'correo', mensaje: 'Es obligatorio y debe ser texto' });
  }
  if (typeof password !== 'string' || password === '') {
    detalles.push({ campo: 'password', mensaje: 'Es obligatorio y debe ser texto' });
  }
  lanzarSiHayErrores(detalles);
  return { correo: correo.trim().toLowerCase(), password };
};

module.exports = { comoObjeto, lanzarSiHayErrores, validarTexto, validarRegistro, validarLogin };
