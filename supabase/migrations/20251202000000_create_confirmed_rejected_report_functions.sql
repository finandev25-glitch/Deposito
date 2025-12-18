-- =================================================================
-- FUNCIONES PARA REPORTES DE DEPÓSITOS CONFIRMADOS Y RECHAZADOS
-- Filtran por estado = 'validado' o 'rechazado' según corresponda
-- =================================================================

-- 1. Función para obtener depósitos CONFIRMADOS por sucursal filtrados por moneda
CREATE OR REPLACE FUNCTION get_confirmed_deposits_by_sucursal_currency(p_moneda TEXT DEFAULT NULL)
RETURNS TABLE(
  nombre TEXT,
  monto NUMERIC,
  cantidad BIGINT,
  porcentaje NUMERIC,
  moneda TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_general NUMERIC;
BEGIN
  SELECT SUM(d.monto) INTO total_general
  FROM public.depositos d
  WHERE d.estado = 'validado'
    AND (p_moneda IS NULL OR d.moneda = p_moneda);

  IF total_general IS NULL OR total_general = 0 THEN
    total_general := 1; -- Evitar división por cero
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(s.nombre, 'Sin sucursal') AS nombre,
    SUM(d.monto) AS monto,
    COUNT(d.id) AS cantidad,
    (SUM(d.monto) / total_general) * 100 AS porcentaje,
    d.moneda
  FROM public.depositos d
  LEFT JOIN public.sucursales s ON d.sucursal_id = s.id
  WHERE d.estado = 'validado'
    AND (p_moneda IS NULL OR d.moneda = p_moneda)
  GROUP BY s.nombre, d.moneda
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 2. Función para obtener depósitos CONFIRMADOS por banco filtrados por moneda
CREATE OR REPLACE FUNCTION get_confirmed_deposits_by_banco_currency(p_moneda TEXT DEFAULT NULL)
RETURNS TABLE(
  nombre TEXT,
  monto NUMERIC,
  cantidad BIGINT,
  porcentaje NUMERIC,
  moneda TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_general NUMERIC;
BEGIN
  SELECT SUM(d.monto) INTO total_general
  FROM public.depositos d
  WHERE d.estado = 'validado'
    AND (p_moneda IS NULL OR d.moneda = p_moneda);

  IF total_general IS NULL OR total_general = 0 THEN
    total_general := 1; -- Evitar división por cero
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(b.nombre, 'Sin banco') AS nombre,
    SUM(d.monto) AS monto,
    COUNT(d.id) AS cantidad,
    (SUM(d.monto) / total_general) * 100 AS porcentaje,
    d.moneda
  FROM public.depositos d
  LEFT JOIN public.bancos b ON d.banco_id::text = b.id::text
  WHERE d.estado = 'validado'
    AND (p_moneda IS NULL OR d.moneda = p_moneda)
  GROUP BY b.nombre, d.moneda
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 3. Función para obtener depósitos RECHAZADOS por sucursal
CREATE OR REPLACE FUNCTION get_rejected_deposits_by_sucursal(
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  nombre TEXT,
  rechazados BIGINT,
  total_depositos BIGINT,
  tasa_rechazo NUMERIC,
  monto_rechazado_usd NUMERIC,
  monto_rechazado_pen NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.nombre, 'Sin sucursal') AS nombre,
    COUNT(d.id) FILTER (WHERE d.estado = 'rechazado') AS rechazados,
    COUNT(d.id) AS total_depositos,
    CASE
      WHEN COUNT(d.id) > 0 THEN
        (COUNT(d.id) FILTER (WHERE d.estado = 'rechazado')::NUMERIC / COUNT(d.id)::NUMERIC) * 100
      ELSE 0
    END AS tasa_rechazo,
    COALESCE(SUM(d.monto) FILTER (WHERE d.estado = 'rechazado' AND d.moneda = 'USD'), 0) AS monto_rechazado_usd,
    COALESCE(SUM(d.monto) FILTER (WHERE d.estado = 'rechazado' AND d.moneda = 'PEN'), 0) AS monto_rechazado_pen
  FROM public.depositos d
  LEFT JOIN public.sucursales s ON d.sucursal_id = s.id
  GROUP BY s.nombre
  HAVING COUNT(d.id) FILTER (WHERE d.estado = 'rechazado') > 0
  ORDER BY rechazados DESC
  LIMIT p_limit;
END;
$$;
