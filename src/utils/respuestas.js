// Formato único de respuestas exitosas.
const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });

const lista = (res, data) => res.status(200).json({ ok: true, total: data.length, data });

const sinContenido = (res) => res.status(204).end();

const error = (res, status, codigo, mensaje, detalles) => {
  const cuerpo = { codigo, mensaje };
  if (detalles && detalles.length) cuerpo.detalles = detalles;
  return res.status(status).json({ ok: false, error: cuerpo });
};

module.exports = { ok, lista, sinContenido, error };
