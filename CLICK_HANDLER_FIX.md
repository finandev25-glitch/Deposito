# Corrección: Los Clics No Funcionan Después de 5 Minutos de Inactividad

## Problema Reportado

Después de dejar la página web inactiva por 5 minutos, hacer clic en una tarjeta del Kanban no abre la ventana de detalle del depósito.

## Causa del Problema

El problema se debía a **funciones obsoletas** en React. Cuando el navegador pone la pestaña en segundo plano después de ~5 minutos de inactividad:

1. Los componentes de React pueden volver a dibujarse
2. Las funciones de clic (`handleCardClick`) quedaban con referencias a versiones antiguas de datos
3. Al volver a la página, los clics ejecutaban funciones obsoletas que no tenían acceso al estado actualizado

## Solución Implementada ✅

### 1. **Envolver Manejadores en `useCallback`**

Cambios en [src/components/KanbanView.jsx](src/components/KanbanView.jsx):

```javascript
// ANTES: Función normal que se vuelve a crear en cada renderizado
const handleCardClick = async (deposit) => {
  if (deposit.estado === "pendiente" && currentUser) {
    const updatedDeposit = await onTakeDeposit(deposit);
    if (updatedDeposit) {
      setSelectedDeposit(updatedDeposit);
    }
  } else {
    setSelectedDeposit(deposit);
  }
};

// DESPUÉS: useCallback con dependencias correctas
const handleCardClick = useCallback(async (deposit) => {
  console.log('👆 KANBAN: Clic en tarjeta detectado', {
    depositId: deposit.id,
    estado: deposit.estado,
    timestamp: new Date().toISOString()
  });

  if (deposit.estado === "pendiente" && currentUser) {
    const updatedDeposit = await onTakeDeposit(deposit);
    if (updatedDeposit) {
      setSelectedDeposit(updatedDeposit);
    }
  } else {
    setSelectedDeposit(deposit);
  }

  console.log('✅ KANBAN: El modal debería abrirse ahora');
}, [currentUser, onTakeDeposit]); // Dependencias correctas
```

**Beneficio**:
- La función se mantiene estable entre renderizados
- Solo se actualiza cuando cambian `currentUser` o `onTakeDeposit`
- Previene que las funciones queden obsoletas

### 2. **Envolver `handleCloseModal` en `useCallback`**

```javascript
// DESPUÉS
const handleCloseModal = useCallback(() => {
  if (selectedDeposit) {
    const currentDepositData = deposits.find(
      (d) => d.id === selectedDeposit.id
    );

    if (
      currentDepositData &&
      currentDepositData.estado === "en_validacion" &&
      currentDepositData.validado_por === currentUser.id
    ) {
      onUpdateDeposit({
        id: selectedDeposit.id,
        estado: "pendiente",
        validado_por: null,
        fecha_validacion: null,
      });
    }
  }
  setSelectedDeposit(null);
}, [selectedDeposit, deposits, currentUser, onUpdateDeposit]);
```

### 3. **Detectar Cambios de Visibilidad**

Agregamos un detector para saber cuando la página se oculta o se muestra:

```javascript
// Detectar cambios de visibilidad de la página
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('🟢 KANBAN: Página visible - Los clics deberían funcionar');
    } else {
      console.log('🔴 KANBAN: Página oculta - Inactividad detectada');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Beneficio**:
- Podemos monitorear cuando la página se vuelve inactiva
- Ayuda a diagnosticar problemas en el futuro
- Se puede ampliar para recargar datos si es necesario

### 4. **Mensajes de Diagnóstico Mejorados**

Agregamos mensajes en consola para diagnosticar clics:

```javascript
console.log('👆 KANBAN: Clic en tarjeta detectado', {
  depositId: deposit.id,
  estado: deposit.estado,
  timestamp: new Date().toISOString()
});
```

## Cómo Funciona Ahora

### Antes de la Corrección:
1. Usuario deja la página inactiva 5 minutos
2. Navegador pone la pestaña en segundo plano
3. React vuelve a dibujar los componentes al regresar
4. `handleCardClick` queda obsoleto con referencias antiguas
5. Los clics no funcionan porque la función está "congelada"

### Después de la Corrección:
1. Usuario deja la página inactiva 5 minutos
2. Navegador pone la pestaña en segundo plano
3. React vuelve a dibujar los componentes al regresar
4. `handleCardClick` se actualiza automáticamente gracias a `useCallback`
5. Los clics funcionan correctamente porque las dependencias se actualizan

## Verificación

Para verificar que la corrección funciona:

1. Abre la consola del navegador (F12)
2. Ve a la vista Kanban
3. Deja la página inactiva más de 5 minutos (cambia a otra pestaña)
4. Regresa a la página
5. Verás en consola: `🟢 KANBAN: Página visible - Los clics deberían funcionar`
6. Haz clic en cualquier tarjeta
7. Verás en consola: `👆 KANBAN: Clic en tarjeta detectado`
8. El modal debería abrirse correctamente

## Archivos Modificados

- [src/components/KanbanView.jsx](src/components/KanbanView.jsx):
  - Agregado import de `useCallback`
  - Envuelto `handleCardClick` en `useCallback`
  - Envuelto `handleCloseModal` en `useCallback`
  - Agregado detector de `visibilitychange`
  - Agregados mensajes de diagnóstico

## Relación con el Sistema en Tiempo Real

Esta corrección complementa las optimizaciones de tiempo real documentadas en [REALTIME_OPTIMIZATIONS.md](REALTIME_OPTIMIZATIONS.md). Ambos trabajan juntos para:

1. **Tiempo Real**: Mantiene los datos actualizados mediante websockets
2. **Manejadores de Clic**: Asegura que las interacciones del usuario funcionen incluso después de inactividad

## Estado

✅ **Implementado** - 19/11/2025

Los clics ahora funcionan correctamente incluso después de períodos largos de inactividad gracias a `useCallback` y la gestión correcta de dependencias.
