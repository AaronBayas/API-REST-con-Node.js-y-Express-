// Error con estado HTTP y código propio. El manejador central lo convierte al formato §2.3.
class HttpError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.name = 'HttpError';
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

module.exports = HttpError;
