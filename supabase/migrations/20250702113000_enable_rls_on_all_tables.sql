-- Habilita Row Level Security (RLS) en todas las tablas del proyecto.
-- Esto es una medida de seguridad crítica para asegurar que las políticas
-- de acceso a los datos que hemos definido se apliquen correctamente.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
