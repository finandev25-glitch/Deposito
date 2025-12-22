-- Script de diagnóstico para verificar la columna fecha_solo_date
-- Ejecutar este script en Supabase Dashboard > SQL Editor para diagnosticar

-- 1. Verificar si la columna fecha_solo_date existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'depositos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay registros con fecha_solo_date
SELECT 
    COUNT(*) as total_registros,
    COUNT(fecha_solo_date) as registros_con_fecha_solo_date,
    COUNT(*) - COUNT(fecha_solo_date) as registros_sin_fecha_solo_date
FROM public.depositos;

-- 3. Mostrar algunos registros para verificar datos
SELECT 
    id,
    fecha_registro,
    fecha_solo_date,
    cliente,
    estado
FROM public.depositos 
ORDER BY fecha_registro DESC 
LIMIT 5;

-- 4. Verificar si existe el trigger
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_fecha_solo_date';

-- 5. Verificar si existe el índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'depositos' 
AND indexname = 'idx_depositos_fecha_solo_date';