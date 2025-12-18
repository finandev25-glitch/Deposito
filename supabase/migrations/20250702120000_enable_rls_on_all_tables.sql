/*
# [SECURITY] Habilitar RLS en todas las tablas públicas
Este script activa la Seguridad a Nivel de Fila (RLS) en todas las tablas de la aplicación para hacer cumplir las políticas de acceso y proteger los datos contra accesos no autorizados.

## Query Description:
- Habilita RLS en las tablas: `bancos`, `empresas`, `cuentas_bancarias`, `sucursales`, `sucursal_personal`, `depositos`, `documentos`.
- Este es un paso de seguridad crítico. Sin RLS, cualquier política de acceso definida no tiene efecto.
- No hay riesgo de pérdida de datos, pero es fundamental para la seguridad.

## Metadata:
- Schema-Category: "Security"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true (se puede revertir con `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`)

## Structure Details:
- Afecta a las tablas: `bancos`, `empresas`, `cuentas_bancarias`, `sucursales`, `sucursal_personal`, `depositos`, `documentos`.

## Security Implications:
- RLS Status: Habilitado en todas las tablas.
- Policy Changes: No, solo activa la aplicación de las políticas existentes.
- Auth Requirements: Ninguno para ejecutar, pero crítico para la autenticación de la app.

## Performance Impact:
- Indexes: Ninguno.
- Triggers: Ninguno.
- Estimated Impact: Mínimo. Puede haber una ligera sobrecarga en las consultas para verificar las políticas, pero es esencial para la seguridad.
*/

-- Habilita RLS para cada tabla de la aplicación
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
