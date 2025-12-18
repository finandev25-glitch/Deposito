import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, UploadCloud, File, User, Building2, DollarSign, Calendar, Type, Hash, Loader2 
} from 'lucide-react';

const UploadDocumentModal = ({ onClose, onSave }) => {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    nombre: '',
    tipo: 'voucher',
    cliente: '',
    sucursal: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    numero: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMetadata(prev => ({ ...prev, nombre: selectedFile.name }));
    }
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecciona un archivo para subir.');
      return;
    }
    setError('');
    setIsLoading(true);
    await onSave(file, metadata);
    setIsLoading(false);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white rounded-xl w-full max-w-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Subir Nuevo Documento</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50"
              onClick={triggerFileSelect}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                {file ? (
                  <>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Haz clic para seleccionar un archivo</p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG, etc.</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del Archivo</label>
                <div className="relative">
                  <File className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" name="nombre" value={metadata.nombre} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <select name="tipo" value={metadata.tipo} onChange={handleMetadataChange} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="voucher">Voucher</option>
                  <option value="comprobante">Comprobante</option>
                  <option value="recibo">Recibo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" name="cliente" value={metadata.cliente} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="sucursal" className="block text-sm font-medium text-gray-700 mb-1.5">Sucursal</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" name="sucursal" value={metadata.sucursal} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1.5">Monto</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="number" name="monto" value={metadata.monto} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="date" name="fecha" value={metadata.fecha} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
               <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1.5">Número de Operación</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" name="numero" value={metadata.numero} onChange={handleMetadataChange} className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2 bg-gray-50/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center space-x-2 disabled:bg-blue-400 text-sm"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <UploadCloud size={12} />}
              <span>{isLoading ? 'Subiendo...' : 'Subir y Guardar'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UploadDocumentModal;
