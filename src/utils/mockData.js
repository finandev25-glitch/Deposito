import { Faker, es, en } from '@faker-js/faker';

const faker = new Faker({
  locale: [es, en],
});

export const initialBancos = [
  { id: 'bcp', nombre: 'BCP - Banco de Crédito', abreviatura: 'BCP', estado: 'activo' },
  { id: 'bbva', nombre: 'BBVA Continental', abreviatura: 'BBVA', estado: 'activo' },
  { id: 'interbank', nombre: 'Interbank', abreviatura: 'IBK', estado: 'activo' },
  { id: 'scotiabank', nombre: 'Scotiabank', abreviatura: 'SCOTIA', estado: 'activo' },
  { id: 'nacion', nombre: 'Banco de la Nación', abreviatura: 'BN', estado: 'inactivo' },
  { id: 'pichincha', nombre: 'Banco Pichincha', abreviatura: 'PICHINCHA', estado: 'activo' },
  { id: 'falabella', nombre: 'Banco Falabella', abreviatura: 'FALABELLA', estado: 'activo' },
  { id: 'ripley', nombre: 'Banco Ripley', abreviatura: 'RIPLEY', estado: 'activo' },
];

export let initialEmpresas = [
    { id: '1', nombre: 'Grupo Inversiones Alfa', abreviatura: 'GIA', estado: 'activo' },
    { id: '2', nombre: 'Comercial Beta S.A.C.', abreviatura: 'BETA', estado: 'activo' },
    { id: '3', nombre: 'Servicios Gamma S.R.L.', abreviatura: 'GAMMA', estado: 'activo' }
];

const sucursalesBaseNombres = [
  'Lima Centro',
  'Miraflores',
  'San Isidro',
  'Surco',
  'Callao',
  'Arequipa',
  'Trujillo',
  'Cusco',
  'Piura',
  'Iquitos'
];

const sucursalesNombres = sucursalesBaseNombres.map(
  (nombre) => `${nombre} ${faker.person.lastName()} ${faker.string.numeric(4)}`
);

const estados = ['pendiente', 'en_validacion', 'validado', 'rechazado'];

const observaciones = [
  'Voucher enviado por WhatsApp, pendiente de validación bancaria',
  'Monto coincide con la venta registrada',
  'Cliente solicita confirmación urgente',
  'Revisar número de operación con el banco',
  'Depósito realizado fuera del horario bancario',
  'Cliente envió foto borrosa del voucher',
  'Validación completada con éxito',
  'Rechazado por monto incorrecto',
  'Banco confirma la operación',
  'Pendiente de confirmación del cliente'
];

export const initialUsers = [
  {
    id: 1,
    nombre: 'Ana García',
    usuario: 'admin',
    email: 'admin@empresa.com',
    password: 'password',
    rol: 'admin',
    estado: 'activo',
    ultimo_acceso: faker.date.recent({ days: 1 }).toISOString(),
    depositos_gestionados: 150,
    validaciones_realizadas: 145,
  },
  {
    id: 2,
    nombre: 'Carlos Torres',
    usuario: 'ctorres',
    email: 'ctorres@empresa.com',
    password: 'password',
    rol: 'finanzas',
    estado: 'activo',
    ultimo_acceso: faker.date.recent({ days: 2 }).toISOString(),
    depositos_gestionados: 80,
    validaciones_realizadas: 75,
  },
  {
    id: 3,
    nombre: 'Maria Rojas',
    usuario: 'mrojas',
    email: 'mrojas@empresa.com',
    password: 'password',
    rol: 'finanzas',
    estado: 'activo',
    ultimo_acceso: faker.date.recent({ days: 1 }).toISOString(),
    depositos_gestionados: 45,
    validaciones_realizadas: 40,
  },
  {
    id: 4,
    nombre: 'Luis Fernandez',
    usuario: 'lfernandez',
    email: 'lfernandez@empresa.com',
    password: 'password',
    rol: 'finanzas',
    estado: 'inactivo',
    ultimo_acceso: faker.date.recent({ days: 10 }).toISOString(),
    depositos_gestionados: 20,
    validaciones_realizadas: 18,
  },
];

export const generateMockDeposits = (count = 100, personal = [], users = []) => {
  return Array.from({ length: count }, (_, index) => {
    // Generar fechas en un rango amplio (últimos 730 días = 2 años)
    const fechaDeposito = faker.date.recent({ days: 730 });
    const fechaRegistro = faker.date.recent({ days: 7, refDate: fechaDeposito });
    const estado = faker.helpers.arrayElement(estados);
    
    const isPdf = Math.random() > 0.8;
    const voucherUrl = isPdf
      ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      : `https://placehold.co/400x600.jpg?text=Voucher%0A${faker.string.alphanumeric(8).toUpperCase()}`;

    const trabajador = personal.length > 0 ? faker.helpers.arrayElement(personal) : null;
    const isProcessed = ['en_validacion', 'validado', 'rechazado'].includes(estado);
    const validator = isProcessed && users.length > 0 ? faker.helpers.arrayElement(users) : null;
    const ruc_cliente = Math.random() > 0.5 ? `20${faker.string.numeric(9)}` : faker.string.numeric(8);

    return {
      id: index + 1,
      numero_voucher: faker.string.alphanumeric({ length: { min: 8, max: 12 } }).toUpperCase(),
      cliente: faker.person.fullName(),
      ruc_cliente: ruc_cliente,
      monto: parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })),
      moneda: faker.helpers.arrayElement(['PEN', 'USD']),
      banco: faker.helpers.arrayElement(initialBancos.filter(b => b.estado === 'activo')).abreviatura,
      sucursal: faker.helpers.arrayElement(sucursalesNombres),
      estado: estado,
      fecha_deposito: fechaDeposito.toISOString(),
      fecha_registro: fechaRegistro.toISOString(),
      trabajador_sucursal_id: trabajador ? trabajador.id : null,
      numero_operacion: faker.string.numeric(10),
      imagen_voucher: voucherUrl,
      observaciones: Math.random() > 0.5 ? faker.helpers.arrayElement(observaciones) : null,
      validado_por: validator ? validator.id : null,
      fecha_validacion: isProcessed ? faker.date.recent({ days: 3, refDate: fechaRegistro }).toISOString() : null,
      empresa: faker.helpers.arrayElement(initialEmpresas).nombre,
      anexo: faker.string.alphanumeric(5).toUpperCase(),
      motivo_rechazo: estado === 'rechazado' ? faker.lorem.sentence({ min: 5, max: 15 }) : null,
      referencia_cliente: Math.random() > 0.5 ? faker.lorem.sentence() : null,
    };
  });
};

export const generateMockSucursales = (count = 8) => {
  return Array.from({ length: count }, (_, index) => {
    const personal = Array.from({ length: faker.number.int({ min: 3, max: 15 }) }, () => {
      const enviados = faker.number.int({ min: 5, max: 50 });
      const confirmados = faker.number.int({ min: 1, max: enviados });
      const rechazados = faker.number.int({ min: 0, max: (enviados - confirmados) });
      return {
        id: faker.string.uuid(),
        nombre: faker.person.fullName(),
        estado: faker.helpers.arrayElement(['activo', 'inactivo']),
        depositos_enviados: enviados,
        depositos_confirmados: confirmados,
        depositos_rechazados: rechazados,
      };
    });

    return {
      id: index + 1,
      codigo: `SUC${(index + 1).toString().padStart(3, '0')}`,
      nombre: sucursalesNombres[index] || `${faker.location.city()} ${faker.person.lastName()} ${faker.string.numeric(4)}`,
      telefono: faker.phone.number(),
      personal: personal,
      depositos_mes: personal.reduce((acc, p) => acc + p.depositos_enviados, 0),
      estado: faker.helpers.arrayElement(['activa', 'inactiva'])
    };
  });
};

export const generateMockCuentasBancarias = (count = 15, bancos, empresas) => {
  return Array.from({ length: count }, (_, index) => {
    const empresa = faker.helpers.arrayElement(empresas);
    const banco = faker.helpers.arrayElement(bancos.filter(b => b.estado === 'activo'));
    return {
      id: faker.string.uuid(),
      empresa: { id: empresa.id, nombre: empresa.nombre },
      banco: { id: banco.id, abreviatura: banco.abreviatura },
      anexo: faker.string.alphanumeric(5).toUpperCase(),
      nro_cuenta: faker.finance.accountNumber(14),
      subdiario: faker.string.numeric(6),
      depositos_hoy: faker.number.int({ min: 0, max: 25 }),
      validaciones: faker.number.int({ min: 50, max: 200 }),
      errores: faker.number.int({ min: 0, max: 3 }),
      estado: faker.helpers.arrayElement(['activo', 'inactivo']),
    };
  });
};
