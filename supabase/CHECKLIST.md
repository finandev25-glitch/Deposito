# ✅ Checklist de Configuración de Supabase

## 📋 Archivos Creados/Corregidos

- [x] **`config.toml`** - Archivo de configuración principal de Supabase
- [x] **`functions/send-chatwoot-message/deno.json`** - Configuración de Deno para Edge Function
- [x] **`functions/send-chatwoot-message/index.ts`** - Edge Function corregida (validación de null)
- [x] **`.gitignore`** - Exclusión de archivos temporales
- [x] **`ERRORES_CORREGIDOS.md`** - Documentación de errores corregidos

---

## 🔧 Tareas Pendientes (Opcionales)

### Alta Prioridad
- [ ] **Renombrar migraciones inconsistentes**
  - Mover a `migrations/legacy/` o renombrar con formato timestamp
  - Archivos afectados: `add_alias_whatsapp_config.sql`, `clean_whatsapp_table.sql`, etc.

### Media Prioridad  
- [ ] **Actualizar versiones de dependencias**
  - Edge Function: Actualizar de `std@0.168.0` a versión más reciente
  - Supabase JS: Especificar versión exacta (ej: `@2.39.0`)

### Baja Prioridad
- [ ] **Consolidar migraciones duplicadas de RLS**
  - Revisar: `enable_rls_*.sql`, `fix_rls_*.sql`
  - Considerar crear una migración consolidada

- [ ] **Crear archivo `seed.sql`**
  - Para data inicial de desarrollo local

- [ ] **Configurar variables de entorno**
  - Crear `.env.local` con:
    ```
    SUPABASE_URL=http://localhost:54321
    SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui
    ```

---

## 🚀 Comandos Útiles

### Iniciar Supabase Localmente
```bash
npx supabase start
```

### Ver estado de Supabase
```bash
npx supabase status
```

### Aplicar migraciones
```bash
npx supabase db reset
```

### Deployar Edge Function
```bash
npx supabase functions deploy send-chatwoot-message
```

### Ver logs de Edge Function
```bash
npx supabase functions logs send-chatwoot-message
```

---

## 📚 Queries Útiles de Diagnóstico

Ver archivo: `supabase/queries/rls_diagnostics.sql`
- Consultas para revisar políticas RLS
- Identificar tablas con RLS sin políticas
- Ver permisos de tablas

---

## ⚠️ Notas Importantes

1. **RLS (Row Level Security)**: Todas las tablas tienen RLS habilitado. Asegúrate que las políticas estén correctamente configuradas.

2. **Edge Functions**: Requieren variables de entorno configuradas en el dashboard de Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Migraciones**: Siempre probar localmente antes de aplicar en producción.

4. **Realtime**: Habilitado para las tablas principales (ver migración `20251203200000_enable_realtime.sql`)
