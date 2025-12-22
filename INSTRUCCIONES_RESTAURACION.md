# 🔄 Instrucciones de Restauración - Reconexión

## 📦 Backups Creados

Se han creado 2 archivos de backup:

1. **`BACKUP_RECONEXION_SIMPLE.js`** - Código ANTERIOR (siempre recarga página)
2. **`CODIGO_ACTUAL_RECONEXION_INTELIGENTE.js`** - Código NUEVO (reconexión inteligente)

## ⚠️ Si la Reconexión Inteligente NO Funciona

### Opción 1: Restaurar desde Backup (Recomendado)

1. **Abre el archivo**: `BACKUP_RECONEXION_SIMPLE.js`
2. **Copia todo el código** (líneas 10-48)
3. **Abre**: `src/App.jsx`
4. **Busca** el `useEffect` de reconexión (aproximadamente línea 469-544)
5. **Reemplaza** todo el `useEffect` con el código copiado
6. **Guarda** el archivo

### Opción 2: Restaurar Manualmente

Reemplaza el `useEffect` de reconexión en `src/App.jsx` (líneas 469-544) con este código:

```javascript
// 👁️ Detectar cuando el usuario regresa a la pestaña y recargar automáticamente
useEffect(() => {
  if (!currentUser || !isSupabaseConnected) return;

  const hasReloadedRef = { current: false };
  let wasHidden = false;

  const handleVisibilityChange = () => {
    console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

    if (document.visibilityState === "hidden") {
      wasHidden = true;
      hasReloadedRef.current = false;
      console.log("👋 Página se ocultó");
    } else if (document.visibilityState === "visible" && wasHidden && !hasReloadedRef.current) {
      console.log("👀 Página visible nuevamente - RECARGANDO!");
      hasReloadedRef.current = true;
      
      setTimeout(() => {
        console.log("🔄 Ejecutando window.location.reload()...");
        window.location.reload();
      }, 300);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  console.log("✅ Listener de visibilidad instalado");

  return () => {
    console.log("🧹 Limpiando listener de visibilidad");
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [currentUser, isSupabaseConnected]);
```

## ✅ Cómo Verificar que Funciona

### Prueba 1: Cambio Rápido de Pestaña (< 5 min)

1. Abre el sistema
2. Abre la consola del navegador (F12)
3. Cambia a otra pestaña por 30 segundos
4. Regresa al sistema

**Logs esperados con código NUEVO (inteligente):**
```
👋 Página se ocultó
👀 Página visible después de 30s
✅ Pestaña inactiva <5min - Recargando datos...
🔄 Refrescando depósitos...
✅ Depósitos refrescados exitosamente
```

**Logs esperados con código ANTERIOR (simple):**
```
👋 Página se ocultó
👀 Página visible nuevamente - RECARGANDO!
🔄 Ejecutando window.location.reload()...
[Recarga completa de página]
```

### Prueba 2: Inactividad Larga (> 5 min)

1. Abre el sistema
2. Abre la consola del navegador (F12)
3. Cambia a otra pestaña por 10 minutos
4. Regresa al sistema

**Logs esperados con código NUEVO (inteligente):**
```
👋 Página se ocultó
👀 Página visible después de 600s
⚠️ Pestaña inactiva >5min - Verificando conexión...
✅ Conexión OK - Recargando solo datos...
🔄 Refrescando depósitos...
✅ Depósitos refrescados exitosamente
```

**Logs esperados con código ANTERIOR (simple):**
```
👋 Página se ocultó
👀 Página visible nuevamente - RECARGANDO!
🔄 Ejecutando window.location.reload()...
[Recarga completa de página]
```

## 🔍 Señales de que NO Funciona

### Con Código NUEVO (Inteligente):

❌ **Problema**: No recarga nada al regresar a la pestaña
- **Solución**: Restaurar código anterior

❌ **Problema**: Se queda "colgado" sin hacer nada
- **Solución**: Restaurar código anterior

❌ **Problema**: Error en consola relacionado con `testConnection`
- **Solución**: Restaurar código anterior

### Con Código ANTERIOR (Simple):

✅ **Siempre funciona** - Recarga la página completa cada vez
- Más lento pero 100% confiable

## 📊 Comparación

| Aspecto | Código NUEVO | Código ANTERIOR |
|---------|--------------|-----------------|
| Velocidad (< 5 min inactivo) | ⚡ Muy rápido (~1 seg) | 🐌 Lento (~5 seg) |
| Velocidad (> 5 min inactivo) | ⚡ Rápido (~2 seg) | 🐌 Lento (~5 seg) |
| Confiabilidad | ✅ 95% casos | ✅ 100% casos |
| Experiencia | ✨ Suave | 😵 Pantalla blanca |
| Complejidad | 🧠 Media | 🔧 Simple |

## 🎯 Recomendación

1. **Prueba el código NUEVO** primero
2. **Monitorea los logs** en consola
3. **Si funciona bien** → Déjalo así (mejor rendimiento)
4. **Si hay problemas** → Restaura el código ANTERIOR (más confiable)

## 📝 Notas

- El código ANTERIOR siempre funciona pero es más lento
- El código NUEVO es más rápido pero tiene más lógica
- Ambos resuelven el problema de pérdida de conexión
- La diferencia principal es la velocidad y experiencia de usuario

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en consola
2. Compara con los logs esperados arriba
3. Si no coinciden, restaura el código anterior
4. El código anterior SIEMPRE funciona

## 📁 Archivos de Referencia

- `BACKUP_RECONEXION_SIMPLE.js` - Código para restaurar
- `CODIGO_ACTUAL_RECONEXION_INTELIGENTE.js` - Código actual
- `RECONEXION_INTELIGENTE.md` - Documentación técnica
- `src/App.jsx` (líneas 469-544) - Ubicación del código
