# Mensaje Automático de Rechazo por Duplicados

## Descripción

Cuando un usuario hace clic en el botón "Rechazar" en la ventana de detalle del depósito y se han detectado duplicados mediante el botón "Comprobar Duplicados", el campo de motivo de rechazo se pre-llena automáticamente con información detallada sobre los depósitos duplicados encontrados.

## Funcionamiento

### Flujo de Usuario:

1. Usuario abre la ventana de detalle de un depósito
2. Usuario hace clic en "Comprobar Duplicados"
3. Sistema detecta que hay duplicados (mismo número de operación, monto y moneda)
4. Usuario hace clic en el botón "Rechazar"
5. Se abre el modal de rechazo con el campo de texto **PRE-LLENADO** automáticamente
6. El mensaje es **EDITABLE** - el usuario puede modificarlo, agregar o quitar información
7. Usuario confirma el rechazo con el mensaje (editado o sin editar)

### Formato del Mensaje Automático:

```
DEPÓSITO DUPLICADO

Se encontró que este depósito ya existe en el sistema con los siguientes datos:

1. Estado: Validado
   Sucursal: Lima Centro
   Personal: Juan Pérez
   Fecha Registro: 19/11/2025, 14:30
   Empresa: EMPRESA ABC SAC
   Banco: BCP
   Nro. Operación: 123456789
   Monto: S/ 4,498.00
   Fecha Depósito: 17/10/2025

2. Estado: En Validación
   Sucursal: Lima Norte
   Personal: María López
   Fecha Registro: 19/11/2025, 15:45
   Empresa: EMPRESA XYZ SAC
   Banco: BBVA
   Nro. Operación: 123456789
   Monto: S/ 4,498.00
   Fecha Depósito: 17/10/2025

Por favor, verificar la información antes de procesar nuevamente.
```

## Implementación Técnica

### 1. Función Generadora de Mensaje

Ubicación: [src/components/DepositDetailModal.jsx:871-905](src/components/DepositDetailModal.jsx#L871)

```javascript
// Generar mensaje automático de rechazo basado en duplicados
const generateDuplicateRejectionMessage = () => {
  if (!checkResult.isDuplicate || duplicateDeposits.length === 0) {
    return '';
  }

  let message = `DEPÓSITO DUPLICADO\n\n`;
  message += `Se encontró que este depósito ya existe en el sistema con los siguientes datos:\n\n`;

  duplicateDeposits.forEach((dup, index) => {
    const statusLabel = getStatusInfo(dup.estado).label;
    const fechaRegistro = new Date(dup.fecha_registro).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const fechaDeposito = new Date(dup.fecha_deposito).toLocaleDateString('es-ES');

    message += `${index + 1}. Estado: ${statusLabel}\n`;
    message += `   Sucursal: ${dup.sucursal?.nombre || 'N/A'}\n`;
    message += `   Personal: ${dup.trabajador?.nombre || 'N/A'}\n`;
    message += `   Fecha Registro: ${fechaRegistro}\n`;
    message += `   Empresa: ${dup.empresa?.nombre || 'N/A'}\n`;
    message += `   Banco: ${dup.banco?.abreviatura || 'N/A'}\n`;
    message += `   Nro. Operación: ${dup.numero_operacion_banco || dup.numero_operacion || 'N/A'}\n`;
    message += `   Monto: ${dup.moneda === 'PEN' ? 'S/' : dup.moneda} ${parseFloat(dup.monto).toFixed(2)}\n`;
    message += `   Fecha Depósito: ${fechaDeposito}\n\n`;
  });

  message += `Por favor, verificar la información antes de procesar nuevamente.`;

  return message;
};
```

**Características:**
- Solo genera mensaje si hay duplicados detectados (`checkResult.isDuplicate === true`)
- Retorna string vacío si no hay duplicados (permite al usuario escribir libremente)
- Formatea fechas en español (dd/mm/yyyy y hh:mm)
- Muestra todos los duplicados encontrados (puede haber múltiples)
- Incluye todos los datos relevantes de cada duplicado

### 2. Modificación del RejectionModal

Ubicación: [src/components/RejectionModal.jsx:5-6](src/components/RejectionModal.jsx#L5)

**Antes:**
```javascript
const RejectionModal = ({ onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
```

**Después:**
```javascript
const RejectionModal = ({ onClose, onConfirm, initialReason = '' }) => {
  const [reason, setReason] = useState(initialReason);
```

**Cambio:** Se agregó el parámetro `initialReason` con valor por defecto vacío, y el estado `reason` se inicializa con este valor.

### 3. Pasar el Mensaje al Modal

Ubicación: [src/components/DepositDetailModal.jsx:1504-1510](src/components/DepositDetailModal.jsx#L1504)

```javascript
<AnimatePresence>
  {isRejectionModalOpen && (
    <RejectionModal
      onClose={() => setIsRejectionModalOpen(false)}
      onConfirm={handleConfirmRejection}
      initialReason={generateDuplicateRejectionMessage()}
    />
  )}
</AnimatePresence>
```

El prop `initialReason` se pasa con el resultado de `generateDuplicateRejectionMessage()`.

## Campos Incluidos en el Mensaje

Para cada duplicado encontrado, se incluye:

| Campo | Descripción | Formato |
|-------|-------------|---------|
| Estado | Estado actual del depósito duplicado | Badge de texto (Validado, En Validación, Rechazado) |
| Sucursal | Sucursal donde se registró | Texto |
| Personal | Trabajador/Vendedor que registró | Texto |
| Fecha Registro | Fecha y hora de registro | dd/mm/yyyy, hh:mm |
| Empresa | Empresa del depósito | Texto |
| Banco | Banco del depósito | Abreviatura |
| Nro. Operación | Número de operación del banco | Texto |
| Monto | Importe con moneda | S/ 0.00 o USD 0.00 |
| Fecha Depósito | Fecha del depósito | dd/mm/yyyy |

## Ventajas

1. **Ahorra Tiempo**: El usuario no tiene que escribir manualmente la información de los duplicados
2. **Información Completa**: Se incluyen todos los datos relevantes automáticamente
3. **Editable**: El usuario puede modificar el mensaje si necesita agregar o quitar información
4. **Consistencia**: Todos los rechazos por duplicados tendrán un formato similar
5. **Transparencia**: El motivo de rechazo contiene evidencia clara de por qué se rechazó

## Casos de Uso

### Caso 1: Duplicado Detectado
1. Usuario comprueba duplicados → Se encuentra 1 duplicado
2. Usuario hace clic en "Rechazar"
3. Campo se pre-llena con información del duplicado
4. Usuario puede editar el mensaje si desea
5. Usuario confirma el rechazo

### Caso 2: Sin Duplicados
1. Usuario NO comprueba duplicados o no se encontraron
2. Usuario hace clic en "Rechazar"
3. Campo aparece **VACÍO** - usuario escribe el motivo manualmente
4. Usuario confirma el rechazo

### Caso 3: Múltiples Duplicados
1. Usuario comprueba duplicados → Se encuentran 3 duplicados
2. Usuario hace clic en "Rechazar"
3. Campo se pre-llena con información de **LOS 3 DUPLICADOS**
4. Usuario revisa y puede editar
5. Usuario confirma el rechazo

## Archivos Modificados

1. **[src/components/DepositDetailModal.jsx](src/components/DepositDetailModal.jsx)**:
   - Agregada función `generateDuplicateRejectionMessage()` (líneas 871-905)
   - Modificado RejectionModal para pasar `initialReason` (línea 1508)

2. **[src/components/RejectionModal.jsx](src/components/RejectionModal.jsx)**:
   - Agregado parámetro `initialReason` (línea 5)
   - Inicializado estado `reason` con `initialReason` (línea 6)

## Estado

✅ **Implementado** - 19/11/2025

El mensaje automático de rechazo por duplicados está completamente funcional. El campo de texto es editable, permitiendo al usuario modificar o complementar la información generada automáticamente.
