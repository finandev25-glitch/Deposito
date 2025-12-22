# Fix: Error al Mostrar Cards Después de INSERT en Realtime

## 🐛 Problema Identificado

Después de eliminar los filtros de empresa y banco en KanbanView, los depósitos no se mostraban cuando se insertaba un nuevo registro vía Realtime.

### Síntomas:
```
📋 REALTIME: Estado del depósito: pendiente
🔄 Recargando datos... (Background: true)
📊 Depósitos cargados: 0
✅ Datos actualizados exitosamente
🔍 KANBAN: Filtrando deposits: Object
✅ KANBAN: Resultado filtrado: 0 de 0
```

## 🔍 Causa Raíz

En `App.jsx`, el handler de Realtime para eventos `INSERT` estaba llamando a `fetchData(true)`:

```javascript
case "INSERT":
  console.log("➕ REALTIME: Nuevo depósito creado:", payload.new.id);
  // ❌ PROBLEMA: fetchData NO carga depósitos
  fetchData(true);
  break;
```

La función `fetchData` está diseñada para cargar bancos, empresas, cuentas, sucursales y personal, pero **NO carga depósitos**:

```javascript
const fetchData = async (isBackground = false) => {
  // ...
  const fetchPromises = [
    supabase.from("bancos").select("*"),
    supabase.from("empresas").select("*"),
    supabase.from("cuentas_bancarias").select("*"),
    supabase.from("sucursales").select("*"),
    // ❌ NO carga depósitos - retorna array vacío
    Promise.resolve({ data: [], error: null }),
    supabase.from("sucursal_personal").select("*"),
  ];
  // ...
};
```

Esto es intencional porque los depósitos se cargan mediante `fetchDepositsByDate` cuando el usuario selecciona una fecha. Sin embargo, cuando Realtime detecta un INSERT, necesitamos recargar los depósitos.

## ✅ Solución Implementada

Cambiar el handler de INSERT para que use `refreshDeposits()` en lugar de `fetchData(true)`:

```javascript
case "INSERT":
  console.log("➕ REALTIME: Nuevo depósito creado:", payload.new.id);
  console.log("📋 REALTIME: Estado del depósito:", payload.new.estado);

  // ✅ SOLUCIÓN: refreshDeposits SÍ carga depósitos con todas sus relaciones
  console.log("🔄 REALTIME: Llamando refreshDeposits para INSERT...");
  refreshDeposits();
  break;
```

La función `refreshDeposits` sí carga los depósitos correctamente:

```javascript
const refreshDeposits = async () => {
  if (!supabase || !currentUser || !isSupabaseConnected) {
    console.log("⚠️ No se puede refrescar depósitos - falta conexión");
    return;
  }

  try {
    console.log("🔄 Refrescando depósitos...");
    const { data, error } = await supabase
      .from("depositos")
      .select(DEPOSIT_FULL_QUERY_STRING)  // ✅ Incluye todas las relaciones
      .order("fecha_registro", { ascending: false });

    if (error) {
      console.error("❌ Error refrescando depósitos:", error);
      return;
    }

    setDeposits(data || []);
    console.log("✅ Depósitos refrescados exitosamente");
  } catch (error) {
    console.error("💥 Error crítico refrescando depósitos:", error);
  }
};
```

## 📊 Resultado Esperado

Ahora cuando se inserte un nuevo depósito:

```
📨 REALTIME: Cambio detectado en depositos: INSERT
➕ REALTIME: Nuevo depósito creado: 32b1792e-342c-4dd5-9f3e-d648a88d53e5
📋 REALTIME: Estado del depósito: pendiente
🔄 REALTIME: Llamando refreshDeposits para INSERT...
🔄 Refrescando depósitos...
✅ Depósitos refrescados exitosamente
📊 KANBAN: Prop deposits actualizada: 1
🔍 KANBAN: Filtrando deposits: { total: 1, ... }
✅ KANBAN: Resultado filtrado: 1 de 1
```

## 🔧 Archivos Modificados

- `src/App.jsx` (línea 564)
  - Cambio: `fetchData(true)` → `refreshDeposits()`
  - Handler: Realtime INSERT event

## 🧪 Cómo Probar

1. Abre el sistema en el navegador
2. Abre la consola del navegador (F12)
3. Desde otro dispositivo o sesión, crea un nuevo depósito
4. Verifica que el nuevo depósito aparezca automáticamente en el Kanban
5. Revisa los logs en consola para confirmar que se llama a `refreshDeposits()`

## 📝 Notas

- Este fix es independiente de los cambios de simplificación del Kanban
- La función `refreshDeposits` ya existía y funcionaba correctamente
- Solo era necesario usarla en el lugar correcto
- Los eventos UPDATE y DELETE ya estaban manejados correctamente
