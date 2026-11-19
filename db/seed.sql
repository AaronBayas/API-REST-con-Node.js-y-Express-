-- Datos ficticios de ejemplo. Solo se insertan si la tabla productos está vacía.

INSERT INTO productos (nombre, descripcion, categoria, precio)
SELECT v.nombre, v.descripcion, v.categoria, v.precio
FROM (VALUES
  ('Audífonos Nébula X2',    'Audífonos inalámbricos con cancelación de ruido y 30 h de batería', 'tecnologia', 79.90),
  ('Teclado Orión 60%',      'Teclado mecánico compacto con switches lineales y retroiluminación', 'tecnologia', 64.50),
  ('Lámpara Lumen Desk',     'Lámpara de escritorio LED con tres temperaturas de color',          'hogar',      32.00),
  ('Set de tazas Brisa',     'Juego de cuatro tazas de cerámica esmaltada de 350 ml',             'hogar',      18.75),
  ('Balón Andes Pro',        'Balón de fútbol tamaño 5 cosido a máquina',                         'deportes',   27.99),
  ('Botella térmica Cumbre', 'Botella de acero inoxidable de 750 ml, mantiene la temperatura 12 h', 'deportes', 21.40)
) AS v (nombre, descripcion, categoria, precio)
WHERE NOT EXISTS (SELECT 1 FROM productos);
