# Aplicar Migraciones de Base de Datos - Reportes Mejorados

Este documento explica cómo aplicar las nuevas funciones de base de datos para habilitar los reportes mejorados con separación por moneda y estadísticas de confirmados vs rechazados.

## ¿Qué funciones se agregaron?

Las nuevas funciones RPC en Supabase permiten:

1. **Filtrar reportes por moneda** (USD, PEN, o todas)
2. **Ver depósitos confirmados vs rechazados por día**
3. **Separar todos los gráficos por moneda**

## Pasos para aplicar las migraciones

### Opción 1: Usando el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/rwxdwgtcykcskzyfxkam

2. En el menú lateral, haz clic en **"SQL Editor"**

3. Crea una nueva query haciendo clic en **"New query"**

4. Copia y pega el contenido completo del archivo:
   ```
   supabase/migrations/20250101000009_create_enhanced_report_functions.sql
   ```

5. Haz clic en **"Run"** para ejecutar la migración

6. Verifica que no haya errores en la consola

### Opción 2: Usando Supabase CLI

Si tienes instalado Supabase CLI:

```bash
# Navega al directorio del proyecto
cd d:\descargas\confirmaciondep_ozwpnp_dualiteproject

# Aplica la migración específica
supabase db push
```

## Verificar que las funciones se crearon correctamente

Una vez aplicada la migración, puedes verificar en el SQL Editor:

```sql
-- Listar todas las funciones nuevas
SELECT
  routine_name,
  routine_type
FROM
  information_schema.routines
WHERE
  routine_schema = 'public'
  AND routine_name LIKE '%currency%'
  OR routine_name LIKE '%confirmed_rejected%';
```

Deberías ver estas funciones:

- `get_deposits_summary_by_currency`
- `get_deposits_by_sucursal_currency`
- `get_deposits_by_banco_currency`
- `get_daily_deposit_trends_currency`
- `get_daily_confirmed_rejected_deposits`
- `get_daily_confirmed_rejected_by_currency`

## Características nuevas en el módulo de Reportes

Una vez aplicadas las migraciones, el módulo de reportes tendrá:

### 1. Filtro de Moneda
- Selector desplegable en la parte superior derecha
- Opciones: **Todas las monedas**, **USD (Dólares)**, **PEN (Soles)**
- Todos los gráficos se actualizan automáticamente al cambiar el filtro

### 2. Nuevo Gráfico: Confirmados vs Rechazados
- Muestra depósitos confirmados, rechazados y pendientes por día
- Últimos 7 días
- Barras apiladas con colores distintos:
  - Verde: Confirmados
  - Rojo: Rechazados
  - Naranja: Pendientes

### 3. Gráficos existentes ahora con separación por moneda
- **Top 5 Sucursales** - filtra por moneda seleccionada
- **Top 5 Bancos** - filtra por moneda seleccionada
- **Tendencia de 7 días** - filtra por moneda seleccionada
- **Cards de resumen** - suma correctamente según moneda seleccionada

## Troubleshooting

### Error: "function does not exist"

Si ves este error al cargar los reportes, significa que las funciones no se aplicaron correctamente.

**Solución:**
1. Verifica que copiaste TODO el contenido del archivo SQL
2. Ejecuta la migración nuevamente en el SQL Editor
3. Recarga la página de reportes

### Los gráficos están vacíos

Esto puede pasar si no hay datos con `fecha_deposito` válida.

**Solución:**
1. Verifica que tus depósitos tengan el campo `fecha_deposito` completado
2. La función usa los últimos 7 días basados en `fecha_deposito`, no `created_at`

### Error: "permission denied for function"

**Solución:**
Las funciones necesitan permisos. Ejecuta en SQL Editor:

```sql
GRANT EXECUTE ON FUNCTION get_deposits_summary_by_currency TO authenticated;
GRANT EXECUTE ON FUNCTION get_deposits_by_sucursal_currency TO authenticated;
GRANT EXECUTE ON FUNCTION get_deposits_by_banco_currency TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_deposit_trends_currency TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_confirmed_rejected_deposits TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_confirmed_rejected_by_currency TO authenticated;
```

## Probando las funciones manualmente

Puedes probar las funciones en el SQL Editor:

```sql
-- Probar resumen por moneda (USD)
SELECT * FROM get_deposits_summary_by_currency('USD');

-- Probar resumen por moneda (PEN)
SELECT * FROM get_deposits_summary_by_currency('PEN');

-- Probar resumen todas las monedas
SELECT * FROM get_deposits_summary_by_currency(NULL);

-- Probar confirmados vs rechazados (todas las monedas)
SELECT * FROM get_daily_confirmed_rejected_by_currency(NULL);

-- Probar confirmados vs rechazados (solo USD)
SELECT * FROM get_daily_confirmed_rejected_by_currency('USD');
```

## Notas importantes

- Las funciones son compatibles con las funciones anteriores (no se eliminaron)
- El parámetro `p_moneda` acepta `NULL` para "todas las monedas"
- Los valores válidos para `p_moneda` son: `'USD'`, `'PEN'`, o `NULL`
- Las funciones usan `fecha_deposito` (no `created_at`) para las tendencias diarias
