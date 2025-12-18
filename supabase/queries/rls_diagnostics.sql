-- =====================================================
-- CONSULTAS PARA REVISAR RLS EN SUPABASE
-- =====================================================

-- 1. VER TODAS LAS POLÍTICAS RLS EN LA BASE DE DATOS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
ORDER BY schemaname, tablename, policyname;

-- =====================================================

-- 2. VER TABLAS CON RLS HABILITADO
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as rls_forced
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================

-- 3. VER POLÍTICAS RLS ESPECÍFICAMENTE PARA WHATSAPP_CONFIG
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'whatsapp_config'
ORDER BY policyname;

-- =====================================================

-- 4. VER INFORMACIÓN COMPLETA DE RLS POR TABLA
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd as command_type,
    p.qual as using_expression,
    p.with_check as with_check_expression
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
ORDER BY t.tablename, p.policyname;

-- =====================================================

-- 5. VER SOLO TABLAS CON RLS PROBLEMÁTICO (habilitado pero sin políticas)
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- =====================================================

-- 6. INFORMACIÓN DETALLADA DE UNA TABLA ESPECÍFICA
-- (Cambia 'whatsapp_config' por la tabla que quieras revisar)
SELECT 
    'Table Info' as section,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as rls_forced,
    tableowner
FROM pg_tables 
WHERE tablename = 'whatsapp_config'

UNION ALL

SELECT 
    'Policy Info' as section,
    policyname as tablename,
    permissive::text as rls_enabled,
    cmd as rls_forced,
    roles::text as tableowner
FROM pg_policies 
WHERE tablename = 'whatsapp_config';

-- =====================================================

-- 7. COMANDO PARA DESHABILITAR RLS EN UNA TABLA
-- (Solo ejecutar si es necesario)
-- ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;

-- =====================================================

-- 8. COMANDO PARA ELIMINAR TODAS LAS POLÍTICAS DE UNA TABLA
-- (Solo ejecutar si es necesario)
-- DROP POLICY IF EXISTS [policy_name] ON whatsapp_config;

-- =====================================================

-- 9. VER PERMISOS DE TABLA
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
AND table_name = 'whatsapp_config'
ORDER BY grantee, privilege_type;

-- =====================================================

-- 10. CONSULTA RÁPIDA PARA IDENTIFICAR PROBLEMAS RLS
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true AND policy_count = 0 THEN '❌ RLS habilitado sin políticas'
        WHEN rowsecurity = true AND policy_count > 0 THEN '✅ RLS habilitado con políticas'
        WHEN rowsecurity = false THEN '🔓 RLS deshabilitado'
        ELSE '❓ Estado desconocido'
    END as rls_status,
    policy_count
FROM (
    SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
) subq
ORDER BY tablename;