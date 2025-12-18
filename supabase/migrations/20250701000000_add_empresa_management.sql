-- Add status column to empresas table
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo';

-- Drop existing policies to redefine them
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."empresas";
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON "public"."empresas";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."empresas";


-- Allow all authenticated users to view companies
CREATE POLICY "Enable read access for all users" ON "public"."empresas"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to create companies
CREATE POLICY "Authenticated users can insert companies" ON "public"."empresas"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update companies
CREATE POLICY "Enable update for authenticated users" ON "public"."empresas"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
