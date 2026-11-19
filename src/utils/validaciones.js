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

const PRECIO_MAXIMO = 99999999.99; // límite de NUMERIC(10,2)

const validarPrecio = (detalles, precio) => {
  // Solo se acepta un número JSON: "10" (texto) es inválido.
  if (typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0) {
    detalles.push({ campo: 'precio', mensaje: 'Debe ser un número mayor que 0' });
    return;
  }
  const centavos = precio * 100;
  if (Math.abs(centavos - Math.round(centavos)) > 1e-6) {
    detalles.push({ campo: 'precio', mensaje: 'Admite como máximo 2 decimales' });
  }
  if (precio > PRECIO_MAXIMO) {
    detalles.push({ campo: 'precio', mensaje: `No puede ser mayor que ${PRECIO_MAXIMO}` });
  }
};

// Producto: lista blanca nombre/descripcion/categoria/precio; cualquier otro campo se ignora.
const validarProducto = (body) => {
  const { nombre, descripcion, categoria, precio } = comoObjeto(body);
  const detalles = [];

  const datos = {
    nombre: validarTexto(detalles, 'nombre', nombre, 2, 120),
    descripcion: validarTexto(detalles, 'descripcion', descripcion, 1, 500),
    categoria: validarTexto(detalles, 'categoria', categoria, 2, 60),
    precio,
  };
  validarPrecio(detalles, precio);

  lanzarSiHayErrores(detalles);
  datos.categoria = datos.categoria.toLowerCase();
  return datos;
};

module.exports = {
  comoObjeto,
  lanzarSiHayErrores,
  validarTexto,
  validarRegistro,
  validarLogin,
  validarProducto,
};
