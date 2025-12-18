-- Crear tabla para almacenar archivos subidos a Google Drive
-- Esta tabla almacena los links de imágenes y PDFs subidos y su vinculación con depósitos

CREATE TABLE public.drive_files (
    id BIGSERIAL PRIMARY KEY,
    file_url TEXT NOT NULL,
    deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL
);

-- Índice para optimizar consultas por deposito_id
CREATE INDEX idx_drive_files_deposito_id ON public.drive_files(deposito_id);

-- Habilitar RLS
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios autenticados puedan ver todos los archivos
CREATE POLICY "Los usuarios autenticados pueden ver archivos"
ON public.drive_files
FOR SELECT
TO authenticated
USING (true);

-- Política para que los usuarios autenticados puedan insertar archivos
CREATE POLICY "Los usuarios autenticados pueden subir archivos"
ON public.drive_files
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para que los usuarios autenticados puedan actualizar archivos
CREATE POLICY "Los usuarios autenticados pueden actualizar archivos"
ON public.drive_files
FOR UPDATE
TO authenticated
USING (true);

-- Política para que los administradores puedan eliminar archivos
CREATE POLICY "Los administradores pueden eliminar archivos"
ON public.drive_files
FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'user_role' = 'admin');

-- Permisos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_files TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE drive_files_id_seq TO authenticated;

-- Comentarios para documentación
COMMENT ON TABLE public.drive_files IS 'Almacena información de archivos subidos a Google Drive y su vinculación con depósitos';
-- Comentarios para documentar las columnas
COMMENT ON TABLE public.drive_files IS 'Tabla para almacenar URLs de archivos de Google Drive vinculados a depósitos';
COMMENT ON COLUMN public.drive_files.id IS 'ID único de la tabla';
COMMENT ON COLUMN public.drive_files.file_url IS 'URL completa del archivo en Google Drive';
COMMENT ON COLUMN public.drive_files.deposito_id IS 'ID del depósito vinculado';