-- =================================================================
-- MIGRACIÓN PARA FUNCIONES DE REPORTES
-- Este script crea las funciones de base de datos (RPC) necesarias
-- para alimentar la vista de "Reportes" de forma eficiente.
-- =================================================================

-- 1. Función para obtener el resumen general de depósitos
-- Devuelve el total, cantidad, validados y promedio.
CREATE OR REPLACE FUNCTION get_deposits_summary()
RETURNS TABLE(
  total_depositos NUMERIC,
  cantidad_depositos BIGINT,
  depositos_validados BIGINT,
  promedio_deposito NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(d.monto), 0) AS total_depositos,
    COUNT(d.id) AS cantidad_depositos,
    COUNT(d.id) FILTER (WHERE d.estado = 'validado') AS depositos_validados,
    COALESCE(AVG(d.monto), 0) AS promedio_deposito
  FROM public.depositos d;
END;
$$;

-- 2. Función para obtener los depósitos agrupados por sucursal
-- Devuelve el top 5 de sucursales con más monto depositado.
CREATE OR REPLACE FUNCTION get_deposits_by_sucursal()
RETURNS TABLE(
  nombre TEXT,
  monto NUMERIC,
  cantidad BIGINT,
  porcentaje NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_general NUMERIC;
BEGIN
  SELECT SUM(d.monto) INTO total_general FROM public.depositos d;

  IF total_general IS NULL OR total_general = 0 THEN
    total_general := 1; -- Evitar división por cero
  END IF;

  RETURN QUERY
  SELECT
    s.nombre,
    SUM(d.monto) AS monto,
    COUNT(d.id) AS cantidad,
    (SUM(d.monto) / total_general) * 100 AS porcentaje
  FROM public.depositos d
  JOIN public.sucursales s ON d.sucursal_id = s.id
  GROUP BY s.nombre
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 3. Función para obtener los depósitos agrupados por banco
-- Devuelve el top 5 de bancos con más monto depositado.
CREATE OR REPLACE FUNCTION get_deposits_by_banco()
RETURNS TABLE(
  nombre TEXT,
  monto NUMERIC,
  cantidad BIGINT,
  porcentaje NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_general NUMERIC;
BEGIN
  SELECT SUM(d.monto) INTO total_general FROM public.depositos d;

  IF total_general IS NULL OR total_general = 0 THEN
    total_general := 1; -- Evitar división por cero
  END IF;

  RETURN QUERY
  SELECT
    b.nombre,
    SUM(d.monto) AS monto,
    COUNT(d.id) AS cantidad,
    (SUM(d.monto) / total_general) * 100 AS porcentaje
  FROM public.depositos d
  JOIN public.bancos b ON d.banco_id = b.id
  GROUP BY b.nombre
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 4. Función para obtener las tendencias diarias
-- Devuelve los totales por día para los últimos 7 días.
CREATE OR REPLACE FUNCTION get_daily_deposit_trends()
RETURNS TABLE(
  dia TEXT,
  monto NUMERIC,
  cantidad BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH last_7_days AS (
    SELECT generate_series(
      (current_date - interval '6 days'),
      current_date,
      '1 day'::interval
    )::date AS dia
  )
  SELECT
    to_char(d.dia, 'Dy') AS dia,
    COALESCE(SUM(dep.monto), 0) AS monto,
    COALESCE(COUNT(dep.id), 0) AS cantidad
  FROM last_7_days d
  LEFT JOIN public.depositos dep ON dep.fecha_deposito::date = d.dia
  GROUP BY d.dia
  ORDER BY d.dia;
END;
$$;
