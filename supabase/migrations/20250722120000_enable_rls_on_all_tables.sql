/*
          # Habilitar RLS en Todas las Tablas
          Este script activa la Seguridad a Nivel de Fila (RLS) en todas las tablas del esquema público para resolver una advertencia de seguridad crítica.

          ## Query Description: [Este script recorre todas las tablas del esquema 'public' y ejecuta el comando 'ALTER TABLE ... ENABLE ROW LEVEL SECURITY' en cada una. Esta acción es fundamental para que las políticas de seguridad que hemos definido se apliquen correctamente, protegiendo tus datos de accesos no autorizados. Es una operación segura que no modifica datos.]
          
          ## Metadata:
          - Schema-Category: ["Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [Afecta a la configuración de seguridad de todas las tablas en el esquema 'public'.]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [N/A]
          
          ## Performance Impact:
          - Indexes: [No]
          - Triggers: [No]
          - Estimated Impact: [Bajo. Puede haber un impacto mínimo en el rendimiento de las consultas, ya que ahora se evaluarán las políticas de RLS, pero es un costo necesario para la seguridad.]
          */
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;
