/*
          # Create Sucursales and Personal Tables
          This migration creates the necessary tables to manage company branches (sucursales) and the staff associated with them.

          ## Query Description: This operation is safe and structural. It adds two new tables: `sucursales` for branch information and `sucursal_personal` to link users to branches. It also sets up Row Level Security to protect the data, allowing admins full access and authenticated users read-only access. No existing data is affected.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Adds table: `public.sucursales`
          - Adds table: `public.sucursal_personal`
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes (New policies for new tables)
          - Auth Requirements: Policies use `is_admin()` function and `auth.role()`.
          
          ## Performance Impact:
          - Indexes: Primary keys and Foreign keys are indexed by default.
          - Triggers: None
          - Estimated Impact: Low.
          */

-- 1. Create sucursales table
CREATE TABLE public.sucursales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    nombre text NOT NULL,
    telefono text,
    estado text NOT NULL DEFAULT 'activa'::text,
    CONSTRAINT sucursales_pkey PRIMARY KEY (id),
    CONSTRAINT sucursales_nombre_key UNIQUE (nombre)
);
COMMENT ON TABLE public.sucursales IS 'Stores company branches or locations.';

-- 2. Create sucursal_personal join table
CREATE TABLE public.sucursal_personal (
    sucursal_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT sucursal_personal_pkey PRIMARY KEY (sucursal_id, usuario_id),
    CONSTRAINT sucursal_personal_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE,
    CONSTRAINT sucursal_personal_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.sucursal_personal IS 'Links users (personal) to branches (sucursales).';

-- 3. RLS for sucursales
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to admins on sucursales" ON public.sucursales
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Allow read access to authenticated on sucursales" ON public.sucursales
FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. RLS for sucursal_personal
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to admins on sucursal_personal" ON public.sucursal_personal
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Allow read access to authenticated on sucursal_personal" ON public.sucursal_personal
FOR SELECT
USING (auth.role() = 'authenticated');
