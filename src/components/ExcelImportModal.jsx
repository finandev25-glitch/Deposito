import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { apiGet } from '../services/backendApi.js';

const ExcelImportModal = ({ onClose, onImport }) => {
  const [pastedData, setPastedData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validating, setValidating] = useState(false);

  const handlePaste = (e) => {
    const text = e.target.value;
    setPastedData(text);

    if (!text.trim()) {
      setParsedData([]);
      setErrors([]);
      return;
    }

    const lines = text.trim().split('\n');
    const parsed = [];
    const newErrors = [];

    lines.forEach((line, index) => {
      const columns = line.split('\t');

      if (columns.length < 4) {
        newErrors.push(`Línea ${index + 1}: Faltan columnas (se esperan al menos 4)`);
        return;
      }

      const [sucursal, empresa, nombreTrabajador, telefono, tipo] = columns;

      if (!sucursal?.trim()) {
        newErrors.push(`Línea ${index + 1}: Falta nombre de sucursal`);
        return;
      }

      if (!nombreTrabajador?.trim()) {
        newErrors.push(`Línea ${index + 1}: Falta nombre de trabajador`);
        return;
      }

      if (!telefono?.trim()) {
        newErrors.push(`Línea ${index + 1}: Falta teléfono`);
        return;
      }

      let cleanPhone = telefono.trim().replace(/\D/g, '');
      if (!cleanPhone.startsWith('51')) {
        cleanPhone = '51' + cleanPhone;
      }

      parsed.push({
        sucursal: sucursal.trim(),
        empresa: empresa?.trim() || '',
        nombreTrabajador: nombreTrabajador.trim().replace(/\s+/g, ' '),
        telefono: cleanPhone,
        tipo: tipo?.trim().toUpperCase() || 'AGREGAR'
      });
    });

    setParsedData(parsed);
    setErrors(newErrors);

    if (parsed.length > 0) {
      validateDeleteRecords(parsed);
    }
  };

  const validateDeleteRecords = async (data) => {
    setValidating(true);
    const validated = [];

    for (const record of data) {
      const tipo = record.tipo?.toUpperCase();
      const phoneTerm = String(record.telefono || '').replace(/\D/g, '');

      if (tipo === 'ELIMINAR') {
        const response = await apiGet(`/personal/search?q=${encodeURIComponent(phoneTerm)}&limit=5&includeInactive=1`);
        const existingWorker = (response.data || []).find((worker) => {
          const workerPhone = String(worker.telefono_origen || '').replace(/\D/g, '');
          return workerPhone === phoneTerm;
        }) || null;

        let validationMsg = null;
        if (!existingWorker) {
          validationMsg = 'NO ENCONTRADO';
        } else if (existingWorker.estado === 'inactivo') {
          validationMsg = 'YA ESTÁ INACTIVO';
        }

        validated.push({
          ...record,
          notFound: !existingWorker || existingWorker.estado === 'inactivo',
          validationMessage: validationMsg
        });
      } else if (tipo === 'AGREGAR' || !tipo) {
        const response = await apiGet(`/personal/search?q=${encodeURIComponent(phoneTerm)}&limit=5&includeInactive=1`);
        const existingWorker = (response.data || []).find((worker) => {
          const workerPhone = String(worker.telefono_origen || '').replace(/\D/g, '');
          return workerPhone === phoneTerm;
        }) || null;

        let validationMsg = null;
        if (existingWorker) {
          if (existingWorker.estado === 'activo') {
            validationMsg = 'YA EXISTE Y ESTÁ ACTIVO';
          } else {
            validationMsg = 'EXISTE (INACTIVO) - SE REACTIVARÁ';
          }
        }

        validated.push({
          ...record,
          notFound: existingWorker && existingWorker.estado === 'activo',
          validationMessage: validationMsg,
          willReactivate: existingWorker && existingWorker.estado === 'inactivo'
        });
      } else {
        validated.push(record);
      }
    }

    setParsedData(validated);
    setValidating(false);
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      alert('No hay datos para importar');
      return;
    }

    if (errors.length > 0) {
      alert('Por favor corrige los errores antes de importar');
      return;
    }

    onImport(parsedData);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Upload className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Importar desde Excel
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pega los datos copiados desde Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Formato esperado:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Columna 1: Nombre de Sucursal</li>
              <li>• Columna 2: Empresa (opcional)</li>
              <li>• Columna 3: Nombre completo del trabajador</li>
              <li>• Columna 4: Teléfono (se agregará automáticamente el prefijo 51)</li>
              <li>• Columna 5: Tipo (opcional)</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pega los datos aquí:
            </label>
            <textarea
              value={pastedData}
              onChange={handlePaste}
              placeholder="Copia las filas desde Excel y pégalas aquí..."
              className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
          </div>

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="text-red-600 dark:text-red-400" size={16} />
                <h3 className="font-semibold text-red-900 dark:text-red-300">
                  Errores encontrados:
                </h3>
              </div>
              <ul className="text-sm text-red-800 dark:text-red-400 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validating && (
            <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Validando registros contra el backend...
            </div>
          )}

          {parsedData.length > 0 && errors.length === 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Vista previa ({parsedData.length} registros):
                </h3>
              </div>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Sucursal</th>
                      <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Empresa</th>
                      <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Trabajador</th>
                      <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Teléfono</th>
                      <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {parsedData.slice(0, 10).map((row, index) => {
                      const bgClass = row.willReactivate
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : row.notFound
                          ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50';

                      const textClass = row.willReactivate
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : row.notFound
                          ? 'text-red-600 dark:text-red-400 font-semibold'
                          : '';

                      return (
                        <tr key={index} className={bgClass}>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.sucursal}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.empresa || '-'}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.nombreTrabajador}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.telefono}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            <span className={textClass}>
                              {row.tipo}
                              {row.validationMessage && ` (${row.validationMessage})`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    ... y {parsedData.length - 10} registros más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={parsedData.length === 0 || errors.length > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Upload size={16} />
            <span>Importar {parsedData.length} registros</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExcelImportModal;
