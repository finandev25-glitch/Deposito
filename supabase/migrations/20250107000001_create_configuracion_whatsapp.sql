-- Crear tabla para configuración de WhatsApp
CREATE TABLE IF NOT EXISTS configuracion_whatsapp (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_url TEXT,
    verify_token TEXT,
    estado BOOLEAN DEFAULT true,
    actualizado_por UUID REFERENCES auth.users(id),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_configuracion_whatsapp_estado ON configuracion_whatsapp(estado);
CREATE INDEX IF NOT EXISTS idx_configuracion_whatsapp_actualizado_por ON configuracion_whatsapp(actualizado_por);

-- Configurar RLS (Row Level Security)
ALTER TABLE configuracion_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política para que solo los admins puedan ver y modificar la configuración
CREATE POLICY "Solo admins pueden gestionar configuración WhatsApp" ON configuracion_whatsapp
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

-- Función para actualizar el timestamp
CREATE OR REPLACE FUNCTION update_configuracion_whatsapp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar automáticamente el timestamp
DROP TRIGGER IF EXISTS update_configuracion_whatsapp_timestamp ON configuracion_whatsapp;
CREATE TRIGGER update_configuracion_whatsapp_timestamp
    BEFORE UPDATE ON configuracion_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracion_whatsapp_timestamp();

-- Comentarios para documentación
COMMENT ON TABLE configuracion_whatsapp IS 'Configuración de WhatsApp Business Cloud API';
COMMENT ON COLUMN configuracion_whatsapp.phone_number_id IS 'ID del número de teléfono de WhatsApp Business';
COMMENT ON COLUMN configuracion_whatsapp.access_token IS 'Token de acceso para la API de WhatsApp';
COMMENT ON COLUMN configuracion_whatsapp.webhook_url IS 'URL del webhook para recibir mensajes';
COMMENT ON COLUMN configuracion_whatsapp.verify_token IS 'Token de verificación del webhook';
COMMENT ON COLUMN configuracion_whatsapp.estado IS 'Estado activo/inactivo de la configuración';
COMMENT ON COLUMN configuracion_whatsapp.actualizado_por IS 'Usuario que realizó la última actualización';
COMMENT ON COLUMN configuracion_whatsapp.actualizado_en IS 'Fecha y hora de la última actualización';
COMMENT ON COLUMN configuracion_whatsapp.creado_en IS 'Fecha y hora de creación del registro';