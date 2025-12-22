-- Crear columna fecha_solo_date e índice para mejorar el rendimiento
-- de las consultas que filtran por fecha específica

-- PASO 1: Verificar si la columna existe, si no crearla
DO $$
BEGIN
    -- Verificar si la columna fecha_solo_date existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'depositos'
        AND column_name = 'fecha_solo_date'
        AND table_schema = 'public'
    ) THEN
        -- Agregar la columna
        ALTER TABLE public.depositos ADD COLUMN fecha_solo_date DATE;
        RAISE NOTICE 'Columna fecha_solo_date creada exitosamente';
        
        -- Actualizar registros existentes
        UPDATE public.depositos 
        SET fecha_solo_date = fecha_registro::date 
        WHERE fecha_solo_date IS NULL;
        RAISE NOTICE 'Registros existentes actualizados con fecha_solo_date';
        
        -- Crear función trigger
        CREATE OR REPLACE FUNCTION update_fecha_solo_date()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.fecha_solo_date := NEW.fecha_registro::date;
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        
        -- Crear trigger
        CREATE TRIGGER trigger_update_fecha_solo_date
            BEFORE INSERT OR UPDATE ON public.depositos
            FOR EACH ROW
            EXECUTE FUNCTION update_fecha_solo_date();
        RAISE NOTICE 'Trigger para fecha_solo_date creado exitosamente';
    ELSE
        RAISE NOTICE 'La columna fecha_solo_date ya existe';
    END IF;
END
$$;

-- PASO 2: Verificar si el índice ya existe, si no crearlo
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
