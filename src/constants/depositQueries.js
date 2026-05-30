export const DEPOSIT_FULL_QUERY_STRING = `
  id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, chatwoot_message_id, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)
`;
