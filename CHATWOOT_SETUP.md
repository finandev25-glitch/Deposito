# Chat de Chatwoot - Configuración para diferentes entornos

## Problema común

El botón "Ver Chat" funciona en desarrollo pero no en otras PCs después del build.

## Solución implementada

### Para desarrollo local (cualquier puerto)

```bash
# Puerto estándar de Vite (5173)
npm run dev

# O usar puerto 3000
npm run dev:3000
```

### Para testing local después del build

```bash
# Construir la aplicación
npm run build

# Servir en puerto 3000 con proxy funcionando
npm run preview:3000
```

### Para producción

La aplicación detecta automáticamente si está corriendo en:

- Localhost/127.0.0.1/IPs locales → Usa proxy `/chatwoot-api`
- Dominio de producción → Usa URL directa de Chatwoot

## Configuración de variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# URL base de Chatwoot (opcional, tiene fallback)
VITE_CHATWOOT_BASE_URL=https://chatwoot-chatwoot.gnfcio.easypanel.host
```

## Cómo funciona

### En desarrollo (`npm run dev` o `npm run dev:3000`)

- ✅ Usa proxy de Vite → `/chatwoot-api` → `https://chatwoot-chatwoot.gnfcio.easypanel.host`
- ✅ Evita problemas de CORS
- ✅ Funciona en cualquier puerto (5173, 3000, etc.)

### En preview/testing local (`npm run preview:3000`)

- ✅ También usa proxy de Vite
- ✅ Funciona igual que desarrollo
- ✅ Perfecto para testing después del build

### En producción real

- ✅ Detecta automáticamente si es localhost → usa proxy
- ✅ Detecta si es dominio de producción → usa URL directa
- ✅ No requiere configuración adicional

## Debug

La aplicación mostrará en consola la configuración detectada:

```javascript
🔧 Configuración de API Chatwoot: {
  environment: 'development',
  hostname: 'localhost',
  port: '3000',
  isLocalhost: true,
  apiBaseUrl: '/chatwoot-api',
  webBaseUrl: 'https://chatwoot-chatwoot.gnfcio.easypanel.host'
}
```

## Comandos útiles

```bash
# Desarrollo estándar
npm run dev

# Desarrollo puerto 3000
npm run dev:3000

# Build para producción
npm run build

# Preview en puerto 3000 (con proxy)
npm run preview:3000

# Preview puerto estándar
npm run preview
```
