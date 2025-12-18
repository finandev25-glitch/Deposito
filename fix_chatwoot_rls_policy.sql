-- ============================================================================
-- FIX: Política RLS de chatwoot_config
-- ============================================================================
-- Problema: La política actual solo permite a admins leer la configuración,
--           por lo que otros usuarios no pueden ver el chat.
--
-- Solución: Separar las políticas:
--           - Lectura (SELECT): Todos los usuarios autenticados
--           - Escritura (INSERT, UPDATE, DELETE): Solo admins
-- ============================================================================

-- 1. Eliminar la política actual que bloquea todo
DROP POLICY IF EXISTS "Solo admins pueden gestionar ChatWoot" ON chatwoot_config;

-- 2. Crear política de LECTURA para todos los usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer config ChatWoot"
ON chatwoot_config
FOR SELECT
USING (
    -- Cualquier usuario autenticado puede leer
    auth.uid() IS NOT NULL
);

-- 3. Crear política de INSERCIÓN solo para admins
CREATE POLICY "Solo admins pueden crear config ChatWoot"
ON chatwoot_config
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
);

-- 4. Crear política de ACTUALIZACIÓN solo para admins
CREATE POLICY "Solo admins pueden actualizar config ChatWoot"
ON chatwoot_config
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
);

-- 5. Crear política de ELIMINACIÓN solo para admins
CREATE POLICY "Solo admins pueden eliminar config ChatWoot"
ON chatwoot_config
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
);

-- ============================================================================
-- Verificación de políticas
-- ============================================================================

-- Para verificar que las políticas se crearon correctamente, ejecuta:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'chatwoot_config';

-- Deberías ver 4 políticas:
-- 1. "Usuarios autenticados pueden leer config ChatWoot" - SELECT
-- 2. "Solo admins pueden crear config ChatWoot" - INSERT
-- 3. "Solo admins pueden actualizar config ChatWoot" - UPDATE
-- 4. "Solo admins pueden eliminar config ChatWoot" - DELETE
