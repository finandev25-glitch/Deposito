-- =============================================
--      SCRIPT CONSOLIDADO DE BASE DE DATOS
-- =============================================
-- Este script contiene la estructura completa de la base de datos del proyecto.
-- Ejecútalo en el Editor SQL de tu proyecto de Supabase.

-- ---------------------------------------------
-- SECCIÓN 1: FUNCIONES AUXILIARES
-- ---------------------------------------------

-- Función para obtener el rol de un usuario de forma segura y evitar recursión.
-- SECURITY DEFINER permite que la función se ejecute con los permisos del creador.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT rol FROM public.profiles WHERE id = user_id);
END;
$$;

-- Función para contar el personal total y activo por sucursal.
CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id uuid, total_count bigint, active_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id AS sucursal_id,
    COUNT(sp.usuario_id) AS total_count,
    COUNT(sp.usuario_id) FILTER (WHERE p.estado = 'activo') AS active_count
  FROM sucursales s
  LEFT JOIN sucursal_personal sp ON s.id = sp.sucursal_id
  LEFT JOIN profiles p ON sp.usuario_id = p.id
  GROUP BY s.id;
$$;


-- ---------------------------------------------
-- SECCIÓN 2: TABLAS Y POLÍTICAS DE SEGURIDAD
-- ---------------------------------------------

-- --- TABLA: profiles ---
-- Almacena datos públicos de los usuarios, extendiendo la tabla auth.users.
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nombre text,
  usuario text UNIQUE,
  rol text DEFAULT 'finanzas'::text,
  estado text DEFAULT 'inactivo'::text,
  last_sign_in_at timestamptz
);
COMMENT ON TABLE public.profiles IS 'Almacena datos públicos de los usuarios.';

-- Políticas RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los perfiles son visibles para todos los usuarios."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Los usuarios pueden insertar su propio perfil."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Los administradores pueden gestionar todos los perfiles."
  ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: bancos ---
-- Almacena la lista de bancos disponibles en el sistema.
CREATE TABLE public.bancos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    abreviatura text NOT NULL UNIQUE,
    estado text DEFAULT 'activo'::text NOT NULL
);
COMMENT ON TABLE public.bancos IS 'Gestiona los bancos del sistema.';

-- Políticas RLS para bancos
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los bancos son visibles para usuarios autenticados."
  ON public.bancos FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los administradores pueden gestionar los bancos."
  ON public.bancos FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: empresas ---
-- Almacena las empresas del grupo.
CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL UNIQUE
);
COMMENT ON TABLE public.empresas IS 'Gestiona las empresas del grupo.';

-- Políticas RLS para empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Las empresas son visibles para usuarios autenticados."
  ON public.empresas FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los administradores pueden gestionar las empresas."
  ON public.empresas FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: cuentas_bancarias ---
-- Almacena las cuentas bancarias, vinculadas a empresas y bancos.
CREATE TABLE public.cuentas_bancarias (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id),
    banco_id uuid NOT NULL REFERENCES public.bancos(id),
    anexo text,
    nro_cuenta text NOT NULL,
    subdiario text,
    estado text DEFAULT 'activo'::text NOT NULL
);
COMMENT ON TABLE public.cuentas_bancarias IS 'Cuentas bancarias de las empresas.';

-- Políticas RLS para cuentas_bancarias
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Las cuentas son visibles para usuarios autenticados."
  ON public.cuentas_bancarias FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los administradores pueden gestionar las cuentas."
  ON public.cuentas_bancarias FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: sucursales ---
-- Almacena las sucursales del grupo.
CREATE TABLE public.sucursales (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    telefono text,
    estado text DEFAULT 'activa'::text NOT NULL
);
COMMENT ON TABLE public.sucursales IS 'Gestiona las sucursales del grupo.';

-- Políticas RLS para sucursales
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Las sucursales son visibles para usuarios autenticados."
  ON public.sucursales FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los administradores pueden gestionar las sucursales."
  ON public.sucursales FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: sucursal_personal ---
-- Tabla pivote para la relación muchos-a-muchos entre sucursales y personal (profiles).
CREATE TABLE public.sucursal_personal (
    sucursal_id uuid NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (sucursal_id, usuario_id)
);
COMMENT ON TABLE public.sucursal_personal IS 'Relaciona personal con sucursales.';

-- Políticas RLS para sucursal_personal
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Las asignaciones son visibles para usuarios autenticados."
  ON public.sucursal_personal FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los administradores pueden asignar personal."
  ON public.sucursal_personal FOR ALL USING (get_user_role(auth.uid()) = 'admin');


-- --- TABLA: depositos ---
-- Tabla principal que almacena todos los registros de depósitos.
CREATE TABLE public.depositos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    numero_operacion text NOT NULL,
    cliente text,
    monto numeric NOT NULL,
    moneda text NOT NULL,
    fecha_registro timestamptz DEFAULT now() NOT NULL,
    imagen_voucher text,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    observaciones text,
    motivo_rechazo text,
    fecha_validacion timestamptz,
    vendedor_id uuid REFERENCES public.profiles(id),
    sucursal_id uuid REFERENCES public.sucursales(id),
    validado_por uuid REFERENCES public.profiles(id),
    empresa_id uuid REFERENCES public.empresas(id),
    banco_id uuid REFERENCES public.bancos(id),
    anexo text,
    numero_operacion_banco text,
    fecha_deposito date
);
COMMENT ON TABLE public.depositos IS 'Tabla principal de registros de depósitos.';

-- Políticas RLS para depositos
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los depósitos son visibles para usuarios autenticados."
  ON public.depositos FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios de finanzas y admin pueden gestionar depósitos."
  ON public.depositos FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'finanzas'));


-- ---------------------------------------------
-- SECCIÓN 3: DISPARADORES (TRIGGERS)
-- ---------------------------------------------

-- Función del disparador para crear un perfil de usuario automáticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, usuario)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name');
  RETURN new;
END;
$$;

-- Creación del disparador que se activa después de insertar un nuevo usuario en auth.users.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Crea un perfil de usuario automáticamente al registrarse.';
