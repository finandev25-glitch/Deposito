// Utilidades para persistencia de estado de la interfaz

/**
 * Guarda el ID del depósito actualmente seleccionado para persistir entre sesiones
 * @param {string} depositId - ID del depósito a guardar
 */
export const saveOpenDepositId = (depositId) => {
  try {
    localStorage.setItem('openDepositId', depositId);
    console.log('💾 Guardando ID de depósito abierto:', depositId);
  } catch (error) {
    console.warn('⚠️ No se pudo guardar el ID de depósito:', error);
  }
};

/**
 * Obtiene el ID del depósito guardado anteriormente
 * @returns {string|null} - ID del depósito o null si no existe
 */
export const getOpenDepositId = () => {
  try {
    const savedId = localStorage.getItem('openDepositId');
    if (savedId) {
      console.log('🔍 ID de depósito encontrado en localStorage:', savedId);
    }
    return savedId;
  } catch (error) {
    console.warn('⚠️ Error al leer localStorage:', error);
    return null;
  }
};

/**
 * Limpia el ID del depósito guardado
 */
export const clearOpenDepositId = () => {
  try {
    localStorage.removeItem('openDepositId');
    console.log('🧹 ID de depósito eliminado del localStorage');
  } catch (error) {
    console.warn('⚠️ Error al limpiar localStorage:', error);
  }
};

/**
 * Busca un depósito por ID en una lista de depósitos
 * @param {Array} deposits - Lista de depósitos
 * @param {string} depositId - ID del depósito a buscar
 * @returns {Object|null} - Depósito encontrado o null
 */
export const findDepositById = (deposits, depositId) => {
  if (!deposits || !Array.isArray(deposits) || !depositId) {
    return null;
  }
  
  return deposits.find(deposit => deposit.id === depositId) || null;
};

/**
 * Verifica si hay un depósito guardado y lo restaura si es posible
 * @param {Array} deposits - Lista de depósitos disponibles
 * @param {Function} setSelectedDeposit - Función para establecer el depósito seleccionado
 * @param {Object} currentSelectedDeposit - Depósito actualmente seleccionado
 * @returns {boolean} - True si se restauró un depósito, False en caso contrario
 */
export const restoreOpenDeposit = (deposits, setSelectedDeposit, currentSelectedDeposit = null) => {
  // No restaurar si ya hay un depósito seleccionado
  if (currentSelectedDeposit) {
    console.log('🔄 Ya hay un depósito seleccionado, no restaurando');
    return false;
  }
  
  const savedDepositId = getOpenDepositId();
  
  if (!savedDepositId) {
    console.log('🔄 No hay depósito guardado para restaurar');
    return false;
  }
  
  if (!deposits || deposits.length === 0) {
    console.log('🔄 No hay depósitos disponibles para restaurar');
    return false;
  }
  
  const depositToRestore = findDepositById(deposits, savedDepositId);
  
  if (depositToRestore) {
    console.log('✅ Restaurando depósito:', {
      id: depositToRestore.id,
      cliente: depositToRestore.cliente,
      estado: depositToRestore.estado
    });
    setSelectedDeposit(depositToRestore);
    return true;
  } else {
    console.log('⚠️ Depósito guardado no encontrado en la lista actual, limpiando');
    clearOpenDepositId();
    return false;
  }
};

/**
 * Configuración para el comportamiento de persistencia
 */
export const PERSISTENCE_CONFIG = {
  // Tiempo mínimo en ms que debe estar abierto un modal antes de poder cerrarlo
  MIN_MODAL_OPEN_TIME: 300,
  
  // Clave de localStorage para el ID de depósito abierto
  STORAGE_KEY: 'openDepositId',
  
  // Mensajes de log
  MESSAGES: {
    SAVING: '💾 Guardando estado del modal',
    RESTORED: '✅ Modal restaurado exitosamente', 
    NOT_FOUND: '⚠️ Modal guardado no encontrado',
    CLEARED: '🧹 Estado del modal limpiado',
    TAB_RETURN: '👁️ Usuario regresó, verificando modal guardado'
  }
};