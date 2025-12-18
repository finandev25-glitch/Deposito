/*
  # Crear Tabla de Bancos

  Este script crea la tabla `bancos` para almacenar la información de las entidades bancarias utilizadas en el sistema.

  ## Descripción de la Consulta:
  - Crea la tabla `bancos` con campos para nombre, abreviatura y estado.
  - La abreviatura es única para evitar duplicados.
  - Habilita la seguridad a nivel de fila (RLS) para controlar el acceso.
  - Define políticas de seguridad que permiten a los usuarios autenticados leer la lista de bancos y a los administradores gestionarlos (crear, actualizar, eliminar).

  ## Metadatos:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (se puede eliminar la tabla)

  ## Estructura Afectada:
  - Nueva tabla: `public.bancos`
    - `id` (uuid, pk)
    - `created_at` (timestamptz)
    - `nombre` (text)
    - `abreviatura` (text, unique)
    - `estado` (text)

  ## Implicaciones de Seguridad:
  - RLS Status: Habilitado
  - Policy Changes: Sí, se añaden nuevas políticas para la tabla `bancos`.
  - Auth Requirements: Los usuarios deben estar autenticados. Se requiere rol de 'admin' para modificaciones.

  ## Impacto en el Rendimiento:
  - Se añade un índice único en la columna `abreviatura`.
  - El impacto es bajo, ya que la tabla de bancos no se espera que sea muy grande.
*/

-- 1. Crear la tabla `bancos`
CREATE TABLE public.bancos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    nombre text NOT NULL,
    abreviatura text NOT NULL,
    estado text NOT NULL DEFAULT 'activo'::text,
    CONSTRAINT bancos_pkey PRIMARY KEY (id),
    CONSTRAINT bancos_abreviatura_key UNIQUE (abreviatura)
);

-- 2. Habilitar la seguridad a nivel de fila
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

-- 3. Añadir comentarios a la tabla y columnas
COMMENT ON TABLE public.bancos IS 'Almacena las entidades bancarias del sistema.';
COMMENT ON COLUMN public.bancos.nombre IS 'Nombre completo del banco.';
COMMENT ON COLUMN public.bancos.abreviatura IS 'Abreviatura única para el banco (ej. BCP).';
COMMENT ON COLUMN public.bancos.estado IS 'Estado del banco (activo o inactivo).';

-- 4. Crear políticas de seguridad (RLS)
CREATE POLICY "Los bancos son visibles para todos los usuarios autenticados"
ON public.bancos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Los administradores pueden gestionar los bancos"
ON public.bancos
FOR ALL
TO authenticated
USING ((( SELECT rol
   FROM public.profiles
  WHERE profiles.id = auth.uid()) = 'admin'::text))
WITH CHECK ((( SELECT rol
   FROM public.profiles
  WHERE profiles.id = auth.uid()) = 'admin'::text));
