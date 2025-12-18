# 📊 Explicación del Módulo de Reportes

## 📈 Cards del Resumen (Parte Superior)

### 1. 💵 Total USD
- **Qué muestra**: Suma total de **montos** de todos los depósitos en dólares (USD)
- **Filtro**: Cambia según el filtro de moneda seleccionado
- **Ejemplo**: Si tienes depósitos de $100, $200 y $150 USD → Muestra: **$450.00**

### 2. 💰 Total PEN
- **Qué muestra**: Suma total de **montos** de todos los depósitos en soles (PEN)
- **Filtro**: Cambia según el filtro de moneda seleccionado
- **Ejemplo**: Si tienes depósitos de S/300, S/500 → Muestra: **S/800.00**

### 3. 📊 Cantidad Total
- **Qué muestra**: **Número total** de depósitos registrados (cuenta los depósitos, no el dinero)
- **Filtro**: Cambia según el filtro de moneda seleccionado
- **Ejemplo**: Si tienes 5 depósitos USD + 3 depósitos PEN → Muestra: **8**

### 4. ✅ Validados
- **Qué muestra**: **Cantidad** de depósitos que han sido validados/aprobados
- **Filtro**: Cambia según el filtro de moneda seleccionado
- **Porcentaje**: Muestra qué % del total de depósitos están validados
- **Ejemplo**: Si de 8 depósitos, 6 están validados → Muestra: **6 (75% del total)**

---

## 📈 Gráfico: Validados vs Rechazados

### ¿Qué muestra?
Este gráfico muestra **la cantidad de depósitos** (no el dinero) que fueron:
- ✅ **Validados** (línea verde)
- ❌ **Rechazados** (línea roja)

### ¿Por qué período?
Puedes ver estos datos por:
- **7 días**: Última semana (día por día)
- **30 días**: Último mes (día por día)
- **Año**: Todo el año actual (mes por mes)

### Ejemplo
Si el **Lun 25/11** tuviste:
- 3 depósitos validados (2 USD + 1 PEN) → Punto en **3** en la línea verde
- 1 depósito rechazado (1 USD) → Punto en **1** en la línea roja

**NOTA IMPORTANTE**: Este gráfico cuenta **cantidades** de depósitos, no montos. **NO está separado por moneda**, suma USD + PEN juntos.

---

## 📊 Otros Gráficos

### 🏢 Top 5 Sucursales
- **Qué muestra**: Las 5 sucursales con más **monto** depositado
- **Filtro**: Respeta el filtro de moneda (USD/PEN/Todas)
- **Ejemplo**: Sucursal Lima → $50,000 (40% del total)

### 🏦 Top 5 Bancos
- **Qué muestra**: Los 5 bancos con más **monto** depositado
- **Filtro**: Respeta el filtro de moneda (USD/PEN/Todas)
- **Ejemplo**: BCP → $30,000 (25% del total)

### 📅 Tendencias Últimos 7 Días
- **Qué muestra**: **Monto total** depositado cada día de la última semana
- **Filtro**: Respeta el filtro de moneda (USD/PEN/Todas)
- **Por qué es útil**: Te permite ver si hay días con más o menos depósitos. Por ejemplo:
  - **Lunes** puede tener más depósitos porque la gente deposita después del fin de semana
  - **Viernes** puede tener menos porque algunos bancos cierran temprano
  - Te ayuda a identificar **patrones semanales** y planificar mejor tu operación

---

## 🔍 Filtros Disponibles

### Filtro de Moneda (Arriba a la derecha)
- **Todas las monedas**: Suma USD + PEN juntos
- **USD - Dólares**: Solo muestra datos de depósitos en dólares
- **PEN - Soles**: Solo muestra datos de depósitos en soles

### Filtro de Período (Para Validados vs Rechazados)
- **7 días**: Muestra los últimos 7 días
- **30 días**: Muestra los últimos 30 días
- **Año**: Muestra todo el año actual (agrupado por mes)

---

## 💡 Preguntas Frecuentes

### ¿Por qué "Total USD" y "Total PEN" no suman el "Total Depósitos" del filtro "Todas las monedas"?
Porque cuando seleccionas "Todas las monedas", se **suman los montos** de USD + PEN directamente, pero son **monedas diferentes** que no deberías sumar en la realidad (necesitarías tipo de cambio).

### ¿El gráfico "Validados vs Rechazados" separa por moneda?
**NO**. Este gráfico muestra **cantidades** (número de depósitos), no montos. Suma USD + PEN juntos porque estamos contando depósitos, no dinero.

### ¿Qué diferencia hay entre "Cantidad Total" y "Validados"?
- **Cantidad Total**: Todos los depósitos (validados + pendientes + rechazados)
- **Validados**: Solo los que ya fueron aprobados/validados

---

## 📌 Resumen Rápido

| Card/Gráfico | Muestra | Separa por Moneda |
|--------------|---------|-------------------|
| Total USD | Monto total en dólares | ✅ Solo USD |
| Total PEN | Monto total en soles | ✅ Solo PEN |
| Cantidad Total | Número de depósitos | ❌ (depende del filtro) |
| Validados | Cantidad validada | ❌ (depende del filtro) |
| Validados vs Rechazados | Cantidad por día | ❌ Suma USD+PEN |
| Top 5 Sucursales | Monto por sucursal | ❌ (depende del filtro) |
| Top 5 Bancos | Monto por banco | ❌ (depende del filtro) |
| Tendencias 7 días | Monto por día | ❌ (depende del filtro) |
