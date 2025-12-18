-- Activa la Seguridad a Nivel de Fila (RLS) en todas las tablas públicas para corregir la vulnerabilidad de seguridad.
-- Esto asegura que las políticas de acceso que hemos definido se apliquen correctamente.

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
