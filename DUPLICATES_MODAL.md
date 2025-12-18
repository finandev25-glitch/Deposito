# Modal de Depósitos Duplicados

## Descripción

Implementación de una ventana emergente (modal) que muestra los depósitos duplicados encontrados durante la validación en la ventana de detalle del depósito.

## Campos Validados para Detectar Duplicados

La función `handleCheckDuplicates` en [src/components/DepositDetailModal.jsx](src/components/DepositDetailModal.jsx#L243) valida los siguientes campos:

### Campos de Validación:
1. **numero_operacion_banco** - Número de operación del banco (se compara sin los ceros iniciales)
2. **monto** - Importe del depósito (debe ser exactamente igual)
3. **moneda** - Moneda del depósito (PEN o USD, debe ser exactamente igual)

**IMPORTANTE**: Solo se buscan duplicados en depósitos con estado diferente a "pendiente" (validado, en_validacion, rechazado).

### Lógica de Validación:
```javascript
// Buscar depósitos con mismo monto y moneda, excluyendo pendientes
.eq("monto", editableData.monto)
.eq("moneda", editableData.moneda)
.neq("id", deposit.id) // Excluir el depósito actual
.neq("estado", "pendiente") // Excluir depósitos pendientes

// Luego verificar número de operación (sin ceros iniciales)
const normalizedInputOp = editableData.numero_operacion_banco.replace(/^0+/, "");
```

## Cambios Implementados

### 1. Estados Agregados (líneas 123-124)

```javascript
const [duplicateDeposits, setDuplicateDeposits] = useState([]);
const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
```

### 2. Query Mejorado para Traer Más Información (líneas 295-314)

**Antes:**
```javascript
.select("id, numero_operacion, numero_operacion_banco")
.eq("monto", editableData.monto)
.eq("fecha_deposito", editableData.fecha_deposito)
```

**Después:**
```javascript
.select(`
  id,
  numero_operacion,
  numero_operacion_banco,
  monto,
  moneda,
  fecha_deposito,
  fecha_registro,
  estado,
  sucursal:sucursal_id(nombre),
  trabajador:trabajador_sucursal_id(nombre),
  empresa:empresa_id(nombre),
  banco:banco_id(nombre, abreviatura)
`)
.eq("monto", editableData.monto)
.eq("moneda", editableData.moneda)
.neq("id", deposit.id)
.neq("estado", "pendiente")
```

**Cambios clave:**
- Se cambió la validación de `fecha_deposito` por `moneda`
- Se agregó `.neq("estado", "pendiente")` para excluir depósitos pendientes
- Se corrigieron los nombres de las relaciones (sucursal_id, trabajador_sucursal_id, empresa_id, banco_id)
- Esto permite mostrar todos los datos relevantes en la tabla del modal

### 3. Guardar Todos los Duplicados (líneas 343-382)

**Antes:**
- Solo encontraba el primer duplicado con `data.find()`
- No guardaba los duplicados para uso posterior

**Después:**
- Encuentra TODOS los duplicados con `data.filter()`
- Guarda los duplicados en el estado con `setDuplicateDeposits(duplicates)`
- Muestra la cantidad de duplicados en el mensaje

```javascript
// Filtrar todos los duplicados, no solo el primero
const duplicates = data.filter((d) => {
  // Lógica de comparación
});

if (duplicates.length > 0) {
  setDuplicateDeposits(duplicates);
  setCheckResult({
    checked: true,
    isDuplicate: true,
    message: `¡Alerta de Duplicado! Se encontraron ${duplicates.length} depósito(s) con los mismos datos.`,
  });
}
```

### 4. Botón "Ver Duplicados" (líneas 1213-1221)

Se agregó un botón que aparece solo cuando hay duplicados encontrados:

```javascript
{checkResult.isDuplicate && duplicateDeposits.length > 0 && (
  <button
    onClick={() => setIsDuplicatesModalOpen(true)}
    className="ml-3 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center space-x-1 flex-shrink-0"
  >
    <Eye size={12} />
    <span>Ver Duplicados</span>
  </button>
)}
```

### 5. Modal de Duplicados (líneas 1523-1658)

Modal completo con:

#### Header:
- Icono de alerta rojo
- Título "Depósitos Duplicados Encontrados"
- Contador de duplicados encontrados
- Botón para cerrar

#### Tabla de Duplicados:
Muestra los siguientes campos en columnas:

| Columna | Descripción |
|---------|-------------|
| Estado | Badge con color según el estado (pendiente, validado, etc.) |
| Sucursal | Nombre de la sucursal del depósito duplicado |
| Personal | Nombre del trabajador/vendedor que registró |
| Fecha Registro | Fecha y hora en que se registró el depósito |
| Empresa | Nombre de la empresa |
| Banco | Abreviatura del banco |
| Nro. Operación | Número de operación del banco |
| Monto | Importe con moneda (S/ o USD) |
| Fecha Depósito | Fecha del depósito |

#### Features de la Tabla:
- Filas alternadas con colores diferentes para mejor legibilidad
- Hover effect en las filas
- Formato de moneda con 2 decimales
- Estados con badges de colores
- Responsive con scroll horizontal si es necesario

#### Warning Message:
```javascript
⚠️ Los depósitos duplicados están en estado diferente a "Pendiente".
Verifique cuidadosamente antes de confirmar.
```

#### Footer:
- Botón "Cerrar" para cerrar el modal

## Uso

### Flujo de Usuario:

1. Usuario abre la ventana de detalle de un depósito
2. Usuario hace clic en el botón "Comprobar Duplicados"
3. El sistema busca depósitos con:
   - Mismo **monto**
   - Misma **moneda** (PEN o USD)
   - Mismo **número de operación** (sin ceros iniciales)
   - Estado **diferente a "pendiente"** (solo muestra validados, en validación o rechazados)
4. Si se encuentran duplicados:
   - Se muestra un mensaje de alerta rojo con la cantidad de duplicados
   - Aparece el botón "Ver Duplicados"
5. Usuario hace clic en "Ver Duplicados"
6. Se abre el modal mostrando una tabla con todos los depósitos duplicados
7. Usuario revisa los datos: estado, sucursal, personal, fecha registro, empresa, banco, número de operación, monto, etc.
8. Usuario cierra el modal y decide qué hacer con el depósito actual

**Nota importante**: Solo se muestran duplicados que NO estén en estado "pendiente", es decir, depósitos que ya fueron procesados (validados, en validación o rechazados).

## Archivos Modificados

- [src/components/DepositDetailModal.jsx](src/components/DepositDetailModal.jsx):
  - Agregado import de `Eye` icon
  - Agregados estados `duplicateDeposits` e `isDuplicatesModalOpen`
  - Modificado query para traer información completa de duplicados
  - Modificada lógica de `handleCheckDuplicates` para guardar todos los duplicados
  - Agregado botón "Ver Duplicados" en el mensaje de resultado
  - Agregado modal completo con tabla de duplicados

## Estado

✅ **Implementado** - 19/11/2025

El modal de duplicados muestra correctamente:
- Todos los depósitos que coinciden con el monto, fecha y número de operación
- Información detallada de cada duplicado: sucursal, personal, fecha registro, empresa, banco, número de operación, monto y fecha de depósito
- Estados de los duplicados con badges de colores
- Tabla responsive con scroll horizontal
- Warning sobre la verificación cuidadosa

## Screenshot de Ejemplo

El modal se ve así:

```
╔═══════════════════════════════════════════════════════════════╗
║ 🔴 Depósitos Duplicados Encontrados                      [X] ║
║    Se encontraron 2 depósito(s) con datos similares          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ ┌───────────────────────────────────────────────────────┐    ║
║ │ Estado │ Sucursal │ Personal │ Fecha Registro │ ... │    ║
║ ├───────────────────────────────────────────────────────┤    ║
║ │ 🟢 Validado │ Lima Centro │ Juan Pérez │ 19/11/2025 │    ║
║ │ 🔵 En Validación │ Lima Norte │ María López │ ...    │    ║
║ └───────────────────────────────────────────────────────┘    ║
║                                                               ║
║ ⚠️ Los depósitos duplicados están en estado diferente a...  ║
║                                                               ║
║                                          [Cerrar]             ║
╚═══════════════════════════════════════════════════════════════╝
```
