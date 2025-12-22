-- Script para agregar depósitos históricos de prueba en Supabase
-- Ejecutar este script en el editor SQL de Supabase para tener datos de fechas más antiguas

-- Primero, obtener algunos IDs existentes que necesitamos
WITH existing_data AS (
  SELECT 
    (SELECT id FROM empresas LIMIT 1) as empresa_id,
    (SELECT id FROM bancos LIMIT 1) as banco_id,
    (SELECT id FROM sucursales LIMIT 1) as sucursal_id,
    (SELECT id FROM profiles WHERE user_rol = 'finanzas' LIMIT 1) as finanzas_user_id
)

-- Insertar depósitos históricos para los últimos 6 meses
INSERT INTO depositos (
  numero_operacion,
  cliente, 
  monto,
  moneda,
  fecha_registro,
  fecha_deposito,
  estado,
  empresa_id,
  banco_id,
  sucursal_id,
  validado_por,
  numero_operacion_banco,
  observaciones
)
SELECT 
  'OP-' || LPAD((row_number() OVER())::text, 6, '0') as numero_operacion,
  CASE (random() * 4)::int 
    WHEN 0 THEN 'EMPRESA ABC SAC'
    WHEN 1 THEN 'COMERCIAL XYZ LTDA' 
    WHEN 2 THEN 'DISTRIBUIDORA 123 SAC'
    WHEN 3 THEN 'IMPORTADORA DEF EIRL'
    ELSE 'CLIENTE VARIOS'
  END as cliente,
  (50 + random() * 5000)::numeric(10,2) as monto,
  CASE WHEN random() < 0.7 THEN 'PEN' ELSE 'USD' END as moneda,
  -- Generar fechas desde hace 6 meses hasta hoy
  (CURRENT_DATE - INTERVAL '6 months' + (random() * INTERVAL '6 months'))::timestamptz as fecha_registro,
  (CURRENT_DATE - INTERVAL '6 months' + (random() * INTERVAL '6 months'))::date as fecha_deposito,
  CASE (random() * 3)::int
    WHEN 0 THEN 'pendiente'
    WHEN 1 THEN 'validado'
    WHEN 2 THEN 'rechazado'
    ELSE 'en_validacion'
  END as estado,
  ed.empresa_id,
  ed.banco_id, 
  ed.sucursal_id,
  CASE WHEN random() > 0.3 THEN ed.finanzas_user_id ELSE NULL END as validado_por,
  'BCO-' || LPAD((random() * 999999)::int::text, 6, '0') as numero_operacion_banco,
  CASE WHEN random() > 0.7 THEN 'Depósito de prueba histórico' ELSE NULL END as observaciones
FROM 
  existing_data ed,
  generate_series(1, 100) as gs(n); -- Generar 100 depósitos históricos

-- Verificar que se insertaron correctamente
SELECT 
  DATE(fecha_registro) as fecha,
  COUNT(*) as cantidad_depositos,
  estado
FROM depositos 
WHERE fecha_registro >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE(fecha_registro), estado
ORDER BY DATE(fecha_registro) DESC
LIMIT 20;