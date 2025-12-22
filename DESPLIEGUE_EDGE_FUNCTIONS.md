# Despliegue de Edge Functions para Chatwoot

## Problema Resuelto
En producción, las peticiones directas a Chatwoot desde el navegador fallan por problemas de CORS. La solución es usar Supabase Edge Functions como proxy.

## Edge Functions Creadas

### 1. `send-chatwoot-message`
- **Función**: Enviar mensajes a Chatwoot
- **Ubicación**: `supabase/functions/send-chatwoot-message/`
- **Estado**: ✅ Ya existe

### 2. `get-chatwoot-data` (NUEVA)
- **Función**: Obtener datos de Chatwoot (mensajes, conversaciones, contactos)
- **Ubicación**: `supabase/functions/get-chatwoot-data/`
- **Estado**: 🆕 Recién creada - NECESITA DESPLEGARSE

## Pasos para Desplegar

### 1. Instalar Supabase CLI (si no está instalado)
```bash
npm install -g supabase
```

### 2. Login en Supabase
```bash
supabase login
```

### 3. Link al proyecto de Supabase
```bash
supabase link --project-ref rwxdwgtcykcskzyfxkam
```

### 4. Desplegar la nueva Edge Function
```bash
supabase functions deploy get-chatwoot-data
```

### 5. Verificar que ambas funciones estén desplegadas
```bash
supabase functions list
```

Deberías ver:
- ✅ send-chatwoot-message
- ✅ get-chatwoot-data

## Cambios Realizados en el Código

### Archivos Modificados:
1. **src/services/chatwootService.js**
   - ✅ Agregada función `getChatwootData()` para usar la nueva Edge Function

2. **src/components/ChatwootConversation.jsx**
   - ✅ `fetchConversationDetails()` - Ahora usa Edge Function
   - ✅ `fetchMessages()` - Ahora usa Edge Function
   - ✅ `updateBotAttributeDirectly()` - Ahora usa Edge Function
   - ✅ `updateBotAttribute()` - Ahora usa Edge Function

## Pruebas

### En Desarrollo (Localhost)
Las Edge Functions funcionarán inmediatamente una vez desplegadas.

### En Producción (VPS Hostinger)
1. Despliega el código actualizado a tu VPS
2. Las Edge Functions resolverán automáticamente los problemas de CORS
3. Los chats de Chatwoot deberían verse correctamente

## Verificación

Para verificar que todo funciona:

1. Abre la consola del navegador
2. Ve a la sección de Chatwoot
3. Busca logs como:
   - `🔍 ChatWoot Service - Obteniendo datos via Edge Function:`
   - `✅ Datos obtenidos exitosamente via Edge Function`

Si ves estos logs, significa que las Edge Functions están funcionando correctamente.

## Troubleshooting

### Error: "Edge Function no responde"
- Verifica que la función esté desplegada: `supabase functions list`
- Verifica logs de la función: `supabase functions logs get-chatwoot-data`

### Error: "Configuración ChatWoot no encontrada"
- Verifica que el `configId` sea correcto
- Verifica que la configuración esté activa en la tabla `chatwoot_config`

### Error: "ChatWoot API Error"
- Verifica que el `api_token` en `chatwoot_config` sea válido
- Verifica que la URL de Chatwoot sea correcta
