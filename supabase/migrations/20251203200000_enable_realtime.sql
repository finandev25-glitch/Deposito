-- ================================================================
-- HABILITAR REALTIME PARA TODAS LAS TABLAS
-- Necesario para que funcione la suscripción en tiempo real
-- ================================================================

-- Habilitar Realtime para la tabla depositos
ALTER PUBLICATION supabase_realtime ADD TABLE public.depositos;

-- Habilitar Realtime para la tabla bancos
ALTER PUBLICATION supabase_realtime ADD TABLE public.bancos;

-- Habilitar Realtime para la tabla empresas
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresas;

-- Habilitar Realtime para la tabla sucursales
ALTER PUBLICATION supabase_realtime ADD TABLE public.sucursales;

-- Habilitar Realtime para la tabla cuentas_bancarias
ALTER PUBLICATION supabase_realtime ADD TABLE public.cuentas_bancarias;

-- Habilitar Realtime para la tabla sucursal_personal
ALTER PUBLICATION supabase_realtime ADD TABLE public.sucursal_personal;

-- Verificar las tablas habilitadas
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
