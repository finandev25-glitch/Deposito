/*
          # Create Deposits Table and Policies
          [This script creates the main 'depositos' table and sets up the necessary Row Level Security (RLS) policies to manage access.]

          ## Query Description: [This operation creates the core table for managing deposits. It includes foreign keys to link deposits with users, sucursales, companies, and banks. RLS policies are added to ensure that users can only see and manage data they are authorized to access.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Tables Created: public.depositos
          - Columns Added: id, created_at, numero_operacion, cliente, monto, moneda, fecha_registro, vendedor_id, sucursal_id, imagen_voucher, empresa_id, banco_id, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, validado_por, fecha_validacion
          - Foreign Keys: depositos_vendedor_id_fkey, depositos_sucursal_id_fkey, depositos_empresa_id_fkey, depositos_banco_id_fkey, depositos_validado_por_fkey
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes, new policies are created for SELECT, INSERT, and UPDATE on the 'depositos' table.
          - Auth Requirements: Policies depend on the authenticated user's role and sucursal assignment.
          
          ## Performance Impact:
          - Indexes: Primary key index is created automatically. Consider adding indexes on foreign keys or frequently queried columns later if performance degrades.
          - Triggers: None
          - Estimated Impact: Low on an empty table.
          */

CREATE TABLE public.depositos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- From Solicitante
    numero_operacion TEXT NOT NULL,
    cliente TEXT,
    monto NUMERIC NOT NULL,
    moneda TEXT NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT now() NOT NULL,
    vendedor_id UUID REFERENCES public.profiles(id),
    sucursal_id UUID REFERENCES public.sucursales(id),
    imagen_voucher TEXT,

    -- From Validador (Finanzas/Admin)
    empresa_id UUID REFERENCES public.empresas(id),
    banco_id BIGINT REFERENCES public.bancos(id),
    anexo TEXT,
    numero_operacion_banco TEXT,
    fecha_deposito DATE,
    
    -- Estado y Validación
    estado TEXT DEFAULT 'pendiente' NOT NULL,
    observaciones TEXT,
    motivo_rechazo TEXT,
    validado_por UUID REFERENCES public.profiles(id),
    fecha_validacion TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;

-- Admins and Finanzas can see everything
CREATE POLICY "Admins y Finanzas pueden ver todos los depósitos"
ON public.depositos FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'finanzas'));

-- Users can see deposits they created
CREATE POLICY "Usuarios pueden ver los depósitos que crearon"
ON public.depositos FOR SELECT
TO authenticated
USING (auth.uid() = vendedor_id);

-- Users can create deposits
CREATE POLICY "Usuarios autenticados pueden crear depósitos"
ON public.depositos FOR INSERT
TO authenticated
WITH CHECK (vendedor_id = auth.uid());

-- Admins and Finanzas can update any deposit
CREATE POLICY "Admins y Finanzas pueden actualizar depósitos"
ON public.depositos FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'finanzas'))
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'finanzas'));

-- Forbid deletion for now to maintain a record
CREATE POLICY "La eliminación de depósitos está deshabilitada"
ON public.depositos FOR DELETE
TO authenticated
USING (false);
