-- =================================================================
-- FUNCIÓN PARA OBTENER TOP SUCURSALES POR CONFIRMACIONES
-- Retorna las sucursales con más depósitos confirmados
-- =================================================================

CREATE OR REPLACE FUNCTION get_top_sucursales_by_confirmations(
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  nombre TEXT,
  confirmados BIGINT,
  total_depositos BIGINT,
  tasa_confirmacion NUMERIC,
  monto_confirmado_usd NUMERIC,
  monto_confirmado_pen NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.nombre, 'Sin sucursal') AS nombre,
    COUNT(d.id) FILTER (WHERE d.estado = 'validado') AS confirmados,
    COUNT(d.id) AS total_depositos,
    CASE
      WHEN COUNT(d.id) > 0 THEN
        (COUNT(d.id) FILTER (WHERE d.estado = 'validado')::NUMERIC / COUNT(d.id)::NUMERIC) * 100
      ELSE 0
    END AS tasa_confirmacion,
    COALESCE(SUM(d.monto) FILTER (WHERE d.estado = 'validado' AND d.moneda = 'USD'), 0) AS monto_confirmado_usd,
    COALESCE(SUM(d.monto) FILTER (WHERE d.estado = 'validado' AND d.moneda = 'PEN'), 0) AS monto_confirmado_pen
  FROM public.depositos d
  LEFT JOIN public.sucursales s ON d.sucursal_id = s.id
  GROUP BY s.nombre
  HAVING COUNT(d.id) FILTER (WHERE d.estado = 'validado') > 0
  ORDER BY confirmados DESC
  LIMIT p_limit;
END;
$$;
