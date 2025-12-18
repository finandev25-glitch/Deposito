/*
          # Añadir Columna para RUC/DNI del Cliente
          Este script añade una nueva columna de texto llamada `ruc_cliente` a la tabla `depositos`. Esta columna almacenará el número de RUC o DNI asociado al cliente que realiza el depósito, mejorando la capacidad de identificación y auditoría.

          ## Query Description: [Esta operación es segura y no destructiva. Añadirá una nueva columna a la tabla `depositos` sin afectar los datos existentes. Los registros actuales tendrán un valor nulo (NULL) en esta nueva columna hasta que se actualicen.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Tabla Afectada: `public.depositos`
          - Columna Añadida: `ruc_cliente` (tipo: `text`)
          
          ## Security Implications:
          - RLS Status: No se modifica. La nueva columna heredará las políticas de RLS existentes en la tabla.
          - Policy Changes: No
          - Auth Requirements: No
          
          ## Performance Impact:
          - Indexes: No se añaden índices en esta migración.
          - Triggers: No se modifican.
          - Estimated Impact: Mínimo. El impacto en el rendimiento de lectura/escritura será insignificante.
          */

ALTER TABLE public.depositos
ADD COLUMN ruc_cliente TEXT;
