/*
# [Mantenimiento] Eliminar Función de Conteo de Personal
[Se elimina la función de base de datos `count_personal_by_sucursal` que ha demostrado ser problemática y se reemplaza por una lógica más simple y robusta en el lado del cliente.]

## Query Description: [Esta operación elimina una función de la base de datos. No afecta a los datos existentes, pero la lógica de la aplicación que la utilizaba debe ser actualizada. En este caso, la lógica ya ha sido actualizada en el frontend.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [false]

## Structure Details:
- Function `count_personal_by_sucursal` será eliminada.

## Security Implications:
- RLS Status: [N/A]
- Policy Changes: [No]
- Auth Requirements: [N/A]

## Performance Impact:
- Indexes: [N/A]
- Triggers: [N/A]
- Estimated Impact: [Nulo. La carga se traslada al cliente, lo cual es aceptable para esta funcionalidad.]
*/
DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();
