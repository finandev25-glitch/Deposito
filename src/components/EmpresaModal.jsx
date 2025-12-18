import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Building, Loader2, Type } from "lucide-react";

const EmpresaModal = ({ onClose, onSave, empresaToEdit, existingEmpresas }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    abreviatura: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (empresaToEdit) {
      setFormData({
        nombre: empresaToEdit.nombre || "",
        abreviatura: empresaToEdit.abreviatura || "",
      });
    }
  }, [empresaToEdit]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "abreviatura") {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("📝 Enviando formulario de empresa:", formData);

    // Validaciones
    if (!formData.nombre.trim() || !formData.abreviatura.trim()) {
      setError("El nombre y la abreviatura son obligatorios.");
      return;
    }

    const isDuplicate = existingEmpresas.some(
      (empresa) =>
        empresa.abreviatura === formData.abreviatura &&
        empresa.id !== empresaToEdit?.id
    );

    if (isDuplicate) {
      setError("La abreviatura ya existe. Debe ser única.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🔄 Llamando a onSave con:", formData);
      const result = await onSave(formData);
      console.log("✅ Resultado de onSave:", result);

      setIsLoading(false);

      if (result) {
        console.log("🎉 Empresa guardada exitosamente");
        alert(
          `¡Empresa ${empresaToEdit ? "actualizada" : "creada"} con éxito!`
        );
        onClose();
      } else {
        console.log("❌ onSave devolvió resultado falsy");
        setError("Error al guardar la empresa. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("💥 Error en handleSubmit:", error);
      setIsLoading(false);
      setError(`Error: ${error.message || "Error desconocido"}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {empresaToEdit ? "Editar Empresa" : "Crear Nueva Empresa"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3">
            <div>
              <label
                htmlFor="nombre-empresa"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Nombre de la Empresa
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="nombre-empresa"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Ej: Transportes Delta S.A."
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="abreviatura-empresa"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Abreviatura (Única)
              </label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="abreviatura-empresa"
                  name="abreviatura"
                  value={formData.abreviatura}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono"
                  placeholder="Ej: TDELTA"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center space-x-2 disabled:bg-blue-400 text-sm"
            >
              {isLoading && <Loader2 className="animate-spin" />}
              <span>{isLoading ? "Guardando..." : "Guardar Empresa"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EmpresaModal;
