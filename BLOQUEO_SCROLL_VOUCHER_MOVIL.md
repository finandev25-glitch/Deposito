# Bloqueo de Scroll del Voucher en Móvil

## 📋 Cambio Implementado

Se ha bloqueado el scroll y la interacción con el contenedor del voucher (imagen/PDF) en la versión móvil del modal de detalle de depósito.

## 🎯 Objetivo

En dispositivos móviles, cuando el usuario intenta hacer scroll en el modal de detalle del depósito, el contenedor del voucher (que muestra la imagen o PDF del comprobante) ahora está bloqueado y no se puede desplazar ni interactuar con él. Esto evita que el usuario se quede "atrapado" en el iframe o imagen del voucher al intentar hacer scroll en el modal.

## ✅ Cambios Realizados

### Archivo Modificado:
- `src/components/DepositDetailModal.jsx` (líneas 1733-1789)

### Clases CSS Agregadas:

#### 1. **Contenedor Principal del Voucher** (línea 1734):
```jsx
// Antes:
<div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700 flex-1 min-h-0 flex flex-col relative">

// Después:
<div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700 flex-1 min-h-0 flex flex-col relative overflow-hidden lg:overflow-auto">
```

**Cambios:**
- `overflow-hidden` - Bloquea el scroll en móvil
- `lg:overflow-auto` - Permite el scroll en desktop (pantallas grandes)

#### 2. **Contenedor Interno** (línea 1735-1737):
```jsx
// Antes:
<div className="flex-1 min-h-0 flex items-center justify-center" style={{ minHeight: "607px" }}>

// Después:
<div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden lg:overflow-auto pointer-events-none lg:pointer-events-auto" style={{ minHeight: "607px" }}>
```

**Cambios:**
- `overflow-hidden` - Bloquea el scroll en móvil
- `lg:overflow-auto` - Permite el scroll en desktop
- `pointer-events-none` - Bloquea TODOS los eventos de puntero (clicks, toques, scroll) en móvil
- `lg:pointer-events-auto` - Permite la interacción normal en desktop

#### 3. **Header del PDF** (línea 1748):
```jsx
// Antes:
<div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-t">

// Después:
<div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-t pointer-events-auto">
```

**Cambios:**
- `pointer-events-auto` - Permite que el botón "Ventana Dedicada" siga funcionando incluso en móvil

#### 4. **Iframe del PDF** (línea 1764):
```jsx
// Antes:
<iframe className="w-full flex-1 rounded-b" ... />

// Después:
<iframe className="w-full flex-1 rounded-b pointer-events-none lg:pointer-events-auto" ... />
```

**Cambios:**
- `pointer-events-none` - Bloquea la interacción con el iframe en móvil
- `lg:pointer-events-auto` - Permite la interacción con el iframe en desktop

#### 5. **Imagen del Voucher** (línea 1778):
```jsx
// Antes:
<img className="w-full h-full object-contain rounded-md" ... />

// Después:
<img className="w-full h-full object-contain rounded-md pointer-events-none lg:pointer-events-auto" ... />
```

**Cambios:**
- `pointer-events-none` - Bloquea la interacción con la imagen en móvil
- `lg:pointer-events-auto` - Permite la interacción con la imagen en desktop

## 🎨 Comportamiento

### En Móvil (< 1024px):
- ✅ El contenedor del voucher está **bloqueado**
- ✅ No se puede hacer scroll dentro del voucher
- ✅ No se puede hacer zoom ni interactuar con el PDF/imagen
- ✅ El botón "Ventana Dedicada" **sigue funcionando** para abrir el voucher en una ventana dedicada
- ✅ El usuario puede hacer scroll en el resto del modal sin problemas

### En Desktop (≥ 1024px):
- ✅ El contenedor del voucher funciona **normalmente**
- ✅ Se puede hacer scroll dentro del voucher
- ✅ Se puede interactuar con el PDF (zoom, navegación, etc.)
- ✅ Se puede hacer zoom en las imágenes
- ✅ Todas las funcionalidades están disponibles

## 🔧 Breakpoint Utilizado

Se utiliza el breakpoint `lg` de Tailwind CSS:
- **`lg`** = `1024px` y superior (pantallas grandes/desktop)
- **Por defecto** = menos de `1024px` (móvil/tablet)

## 📱 Alternativa para Ver el Voucher en Móvil

Si el usuario necesita ver el voucher en detalle en móvil, puede:
1. Hacer clic en el botón **"🔍 Ventana Dedicada"**
2. Se abrirá el voucher en una ventana modal dedicada
3. En esa ventana podrá interactuar normalmente con el PDF/imagen

## 🧪 Cómo Probar

1. Abre el sistema en un dispositivo móvil o en modo responsive del navegador (F12 → Toggle device toolbar)
2. Abre cualquier depósito en el modal de detalle
3. Intenta hacer scroll o interactuar con el voucher
4. Verifica que:
   - No puedes hacer scroll dentro del voucher
   - No puedes hacer zoom en el PDF/imagen
   - El botón "Ventana Dedicada" sigue funcionando
   - Puedes hacer scroll en el resto del modal sin problemas

5. Cambia a vista desktop (> 1024px)
6. Verifica que:
   - Puedes hacer scroll dentro del voucher
   - Puedes interactuar con el PDF normalmente
   - Todo funciona como antes

## 📝 Notas Técnicas

- **`pointer-events-none`** es más efectivo que solo `overflow-hidden` porque bloquea TODOS los eventos de interacción, no solo el scroll
- Se mantiene `pointer-events-auto` en el header del PDF para que el botón "Ventana Dedicada" siga funcionando
- El uso de clases responsive de Tailwind (`lg:`) asegura que el bloqueo solo aplique en móvil
- No afecta la funcionalidad en desktop, donde los usuarios pueden necesitar interactuar con el PDF

## ✅ Beneficios

1. **Mejor UX en Móvil**: Evita que el usuario se quede "atrapado" en el iframe del voucher
2. **Scroll Fluido**: El scroll del modal funciona correctamente en móvil
3. **Sin Pérdida de Funcionalidad**: En desktop todo sigue funcionando igual
4. **Alternativa Disponible**: El botón "Ventana Dedicada" permite ver el voucher en detalle cuando sea necesario
