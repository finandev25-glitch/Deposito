# Fix: Recarga Automática al Cambiar de Pestaña

## 🔍 Problema Identificado

El sistema no se recargaba automáticamente cuando el usuario cambiaba de pestaña y regresaba. Esto se debía a **múltiples problemas**:

### Causas Principales:

1. **Listeners Duplicados y Conflictivos**
   - Había **DOS** `useEffect` diferentes escuchando el evento `visibilitychange`
   - Ambos estaban activos simultáneamente, causando comportamiento impredecible
   - Uno tenía condiciones restrictivas (`location.pathname === "/"`)
   - El otro tenía dependencias vacías `[]`, capturando versiones obsoletas de funciones

2. **Lógica de Tiempo Conflictiva**
   - Primer listener: recargaba inmediatamente después de 500ms
   - Segundo listener: solo recargaba si estuviste ausente más de 5 minutos
   - Ambos compitiendo entre sí

3. **Condiciones Restrictivas**
   - El primer listener solo funcionaba en la ruta raíz `"/"`
   - No funcionaba en otras rutas del sistema

## ✅ Solución Implementada

Se consolidó toda la lógica en **un solo `useEffect`** optimizado que:

### Características:

1. **Listener Único y Consolidado**
   - Un solo event listener para `visibilitychange`
   - Sin conflictos ni duplicados
   - Funciona en todas las rutas del sistema

2. **Prevención de Recargas Múltiples**
   - Usa una bandera `hasReloadedRef` para evitar recargas duplicadas
   - Se resetea automáticamente cuando la página se oculta nuevamente

3. **Detección Confiable**
   - Detecta cuando la página pasa de `visible` → `hidden` → `visible`
   - Solo recarga si realmente estuvo oculta antes

4. **Delay Optimizado**
   - Espera 300ms antes de recargar para asegurar que el DOM esté listo
   - Tiempo suficiente para evitar problemas de sincronización

## 📝 Código Implementado

```javascript
// 👁️ Detectar cuando el usuario regresa a la pestaña y recargar automáticamente
useEffect(() => {
  if (!currentUser || !isSupabaseConnected) return;

  // Usar una ref para evitar recargas múltiples
  const hasReloadedRef = { current: false };
  let wasHidden = false;

  const handleVisibilityChange = () => {
    console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

    if (document.visibilityState === "hidden") {
      wasHidden = true;
      hasReloadedRef.current = false; // Resetear la bandera cuando se oculta
      console.log("👋 Página se ocultó");
    } else if (document.visibilityState === "visible" && wasHidden && !hasReloadedRef.current) {
      console.log("👀 Página visible nuevamente - RECARGANDO!");
      hasReloadedRef.current = true; // Marcar que ya recargamos
      
      // Recargar después de un breve delay para asegurar que el DOM esté listo
      setTimeout(() => {
        console.log("🔄 Ejecutando window.location.reload()...");
        window.location.reload();
      }, 300);
    }
  };

  // Listener principal de visibilidad
  document.addEventListener("visibilitychange", handleVisibilityChange);

  console.log("✅ Listener de visibilidad instalado");

  return () => {
    console.log("🧹 Limpiando listener de visibilidad");
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [currentUser, isSupabaseConnected]);
```

## 🧪 Cómo Probar

### Prueba 1: Cambio de Pestaña Básico
1. Abre el sistema en una pestaña del navegador
2. Abre la consola del navegador (F12)
3. Cambia a otra pestaña (o minimiza el navegador)
4. Espera unos segundos
5. Regresa a la pestaña del sistema

**Resultado Esperado:**
- Verás en consola: `"👋 Página se ocultó"`
- Al regresar verás: `"👀 Página visible nuevamente - RECARGANDO!"`
- La página se recargará automáticamente

### Prueba 2: Múltiples Cambios de Pestaña
1. Cambia de pestaña varias veces rápidamente
2. Regresa al sistema

**Resultado Esperado:**
- Solo debe recargar **UNA VEZ** (no múltiples veces)
- La bandera `hasReloadedRef` previene recargas duplicadas

### Prueba 3: Diferentes Rutas
1. Navega a diferentes secciones del sistema (Bancos, Empresas, etc.)
2. En cada sección, cambia de pestaña y regresa

**Resultado Esperado:**
- La recarga debe funcionar en **TODAS las rutas**, no solo en la página principal

### Prueba 4: Sin Usuario Autenticado
1. Cierra sesión
2. Cambia de pestaña y regresa

**Resultado Esperado:**
- NO debe recargar (porque no hay usuario autenticado)
- El listener no se instala si no hay `currentUser` o `isSupabaseConnected`

## 📊 Logs de Consola

Durante el funcionamiento normal, verás estos logs:

```
✅ Listener de visibilidad instalado
🔍 VISIBILIDAD CAMBIÓ: hidden
👋 Página se ocultó
🔍 VISIBILIDAD CAMBIÓ: visible
👀 Página visible nuevamente - RECARGANDO!
🔄 Ejecutando window.location.reload()...
```

## 🔧 Archivos Modificados

- `src/App.jsx` (líneas 469-505)
  - Eliminado: Primer `useEffect` con lógica de inactividad y múltiples event listeners
  - Eliminado: Segundo `useEffect` con lógica de backup de 5 minutos
  - Agregado: Nuevo `useEffect` consolidado y optimizado

## ⚠️ Notas Importantes

1. **Realtime Sigue Activo**: La funcionalidad de Realtime (líneas 554-684) sigue funcionando independientemente de esta recarga
2. **No Afecta Otras Funcionalidades**: Los otros `useEffect` para carga de datos y navegación no fueron modificados
3. **Compatibilidad**: Funciona en todos los navegadores modernos que soportan la API `visibilitychange`

## 🎯 Beneficios

- ✅ Recarga automática confiable al cambiar de pestaña
- ✅ Sin recargas duplicadas
- ✅ Funciona en todas las rutas
- ✅ Código más limpio y mantenible
- ✅ Mejor experiencia de usuario
- ✅ Logs claros para debugging
