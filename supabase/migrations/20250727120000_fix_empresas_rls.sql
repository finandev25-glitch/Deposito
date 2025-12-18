-- Fixes the Row Level Security policies for the 'empresas' table.
-- This ensures that only admin users can create, update, or delete companies,
-- while allowing all authenticated users to read them.

-- Drop existing policies on 'empresas' to avoid conflicts and apply new ones.
DROP POLICY IF EXISTS "Allow admin full access" ON public.empresas;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.empresas;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.empresas;
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.empresas;


-- Policy: Admins can do everything (insert, update, delete).
-- The 'USING' clause applies to SELECT, UPDATE, DELETE.
-- The 'WITH CHECK' clause applies to INSERT, UPDATE.
CREATE POLICY "Admins can manage companies"
ON public.empresas
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::text)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::text);

-- Policy: All authenticated users can read companies.
-- This is necessary for non-admins to see the company names in dropdowns, lists, etc.
CREATE POLICY "Authenticated users can read companies"
ON public.empresas
FOR SELECT
USING (auth.role() = 'authenticated');
