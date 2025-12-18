-- =================================================================
-- MIGRACIÓN PARA FUNCIONES MEJORADAS DE REPORTES
-- Este script crea funciones adicionales para separar por moneda
-- y mostrar estadísticas de depósitos confirmados vs rechazados.
-- =================================================================

-- 1. Función para obtener el resumen general de depósitos por moneda
CREATE OR REPLACE FUNCTION get_deposits_summary_by_currency(p_moneda TEXT DEFAULT NULL)
RETURNS TABLE(
  total_depositos NUMERIC,
  cantidad_depositos BIGINT,
  depositos_validados BIGINT,
  promedio_deposito NUMERIC,
  moneda TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(d.monto), 0) AS total_depositos,
    COUNT(d.id) AS cantidad_depositos,
    COUNT(d.id) FILTER (WHERE d.estado = 'validado') AS depositos_validados,
    COALESCE(AVG(d.monto), 0) AS promedio_deposito,
    d.moneda
  FROM public.depositos d
  WHERE p_moneda IS NULL OR d.moneda = p_moneda
  GROUP BY d.moneda
  ORDER BY d.moneda;
END;
$$;

-- 2. Función para obtener depósitos por sucursal filtrados por moneda
CREATE OR REPLACE FUNCTION get_deposits_by_sucursal_currency(p_moneda TEXT DEFAULT NULL)
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
  WHERE p_moneda IS NULL OR d.moneda = p_moneda;

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
  WHERE p_moneda IS NULL OR d.moneda = p_moneda
  GROUP BY s.nombre, d.moneda
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 3. Función para obtener depósitos por banco filtrados por moneda
CREATE OR REPLACE FUNCTION get_deposits_by_banco_currency(p_moneda TEXT DEFAULT NULL)
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
  WHERE p_moneda IS NULL OR d.moneda = p_moneda;

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
  WHERE p_moneda IS NULL OR d.moneda = p_moneda
  GROUP BY b.nombre, d.moneda
  ORDER BY monto DESC
  LIMIT 5;
END;
$$;

-- 4. Función para obtener tendencias diarias filtradas por moneda
CREATE OR REPLACE FUNCTION get_daily_deposit_trends_currency(p_moneda TEXT DEFAULT NULL)
RETURNS TABLE(
  dia TEXT,
  monto NUMERIC,
  cantidad BIGINT,
  moneda TEXT
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
  ),
  monedas AS (
    SELECT DISTINCT d.moneda
    FROM public.depositos d
    WHERE p_moneda IS NULL OR d.moneda = p_moneda
  )
  SELECT
    to_char(days.dia, 'Dy') AS dia,
    COALESCE(SUM(dep.monto), 0) AS monto,
    COALESCE(COUNT(dep.id), 0) AS cantidad,
    m.moneda
  FROM last_7_days days
  CROSS JOIN monedas m
  LEFT JOIN public.depositos dep ON
    COALESCE(dep.fecha_deposito, dep.fecha_registro::date) = days.dia AND
    dep.moneda = m.moneda
  GROUP BY days.dia, m.moneda
  ORDER BY days.dia, m.moneda;
END;
$$;

-- 5. Función NUEVA para obtener depósitos confirmados vs rechazados por día
CREATE OR REPLACE FUNCTION get_daily_confirmed_rejected_deposits()
RETURNS TABLE(
  dia TEXT,
  confirmados BIGINT,
  rechazados BIGINT,
  pendientes BIGINT,
  fecha DATE
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
    to_char(d.dia, 'Dy DD/MM') AS dia,
    COALESCE(COUNT(dep.id) FILTER (WHERE dep.estado = 'validado'), 0) AS confirmados,
    COALESCE(COUNT(dep.id) FILTER (WHERE dep.estado = 'rechazado'), 0) AS rechazados,
    COALESCE(COUNT(dep.id) FILTER (WHERE dep.estado = 'pendiente'), 0) AS pendientes,
    d.dia AS fecha
  FROM last_7_days d
  LEFT JOIN public.depositos dep ON
    COALESCE(dep.fecha_validacion::date, dep.fecha_registro::date) = d.dia
  GROUP BY d.dia
  ORDER BY d.dia;
END;
$$;

-- 6. Función NUEVA para obtener confirmados vs rechazados por moneda y período
CREATE OR REPLACE FUNCTION get_daily_confirmed_rejected_by_currency(
  p_moneda TEXT DEFAULT NULL,
  p_periodo TEXT DEFAULT 'semana' -- 'semana', 'mes', 'año'
)
RETURNS TABLE(
  dia TEXT,
  confirmados BIGINT,
  rechazados BIGINT,
  pendientes BIGINT,
  moneda TEXT,
  fecha DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date DATE;
  date_interval INTERVAL;
  date_format TEXT;
BEGIN
  -- Determinar el rango de fechas según el período
  CASE p_periodo
    WHEN 'semana' THEN
      start_date := current_date - interval '6 days';
      date_interval := '1 day'::interval;
      date_format := 'TMDy DD/MM';  -- TMDy = día en español
    WHEN 'mes' THEN
      start_date := current_date - interval '29 days';
      date_interval := '1 day'::interval;
      date_format := 'DD/MM';
    WHEN 'año' THEN
      start_date := date_trunc('year', current_date);
      date_interval := '1 month'::interval;
      date_format := 'TMMonth YYYY';  -- TMMonth = mes en español
    ELSE
      start_date := current_date - interval '6 days';
      date_interval := '1 day'::interval;
      date_format := 'TMDy DD/MM';  -- TMDy = día en español
  END CASE;

  -- Establecer localización a español
  PERFORM set_config('lc_time', 'es_ES.UTF-8', true);

  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      start_date,
      current_date,
      date_interval
    )::date AS dia
  )
  SELECT
    to_char(days.dia, date_format) AS dia,
    -- Confirmados: usar fecha_validacion si existe, sino fecha_registro
    COALESCE(
      COUNT(dep.id) FILTER (WHERE dep.estado = 'validado'),
      0
    ) AS confirmados,
    -- Rechazados: usar fecha_validacion si existe, sino fecha_registro
    COALESCE(
      COUNT(dep.id) FILTER (WHERE dep.estado = 'rechazado'),
      0
    ) AS rechazados,
    -- Pendientes: usar fecha_registro
    COALESCE(
      COUNT(dep.id) FILTER (WHERE dep.estado = 'pendiente'),
      0
    ) AS pendientes,
    COALESCE(p_moneda, 'ALL') AS moneda,
    days.dia AS fecha
  FROM date_range days
  LEFT JOIN public.depositos dep ON (
    -- Filtrar por moneda primero
    (p_moneda IS NULL OR dep.moneda = p_moneda)
    AND
    -- Luego por fecha según el período
    CASE
      WHEN p_periodo = 'año' THEN
        -- Para año: agrupar por mes
        date_trunc('month',
          CASE
            WHEN dep.estado IN ('validado', 'rechazado') THEN COALESCE(dep.fecha_validacion, dep.fecha_registro)::date
            ELSE dep.fecha_registro::date
          END
        ) = date_trunc('month', days.dia)
      ELSE
        -- Para semana y mes: agrupar por día
        CASE
          WHEN dep.estado IN ('validado', 'rechazado') THEN COALESCE(dep.fecha_validacion, dep.fecha_registro)::date
          ELSE dep.fecha_registro::date
        END = days.dia
    END
  )
  GROUP BY days.dia
  ORDER BY days.dia;
END;
$$;
