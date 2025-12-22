-- Crear índice en la columna fecha_solo_date para mejorar el rendimiento
-- de las consultas que filtran por fecha específica

-- Verificar si el índice ya existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'depositos'
        AND indexname = 'idx_depositos_fecha_solo_date'
    ) THEN
        -- Crear el índice
        CREATE INDEX idx_depositos_fecha_solo_date ON depositos(fecha_solo_date);
        RAISE NOTICE 'Índice idx_depositos_fecha_solo_date creado exitosamente';
    ELSE
        RAISE NOTICE 'El índice idx_depositos_fecha_solo_date ya existe';
    END IF;
END
$$;

-- Verificar el índice creado
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'depositos'
AND indexname = 'idx_depositos_fecha_solo_date';
