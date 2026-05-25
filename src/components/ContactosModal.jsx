import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Phone,
  MessageCircle,
  Search,
  User,
  Loader2,
} from "lucide-react";
import { apiGet } from "../services/backendApi.js";

const ContactosModal = ({ onClose }) => {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAllContactos();
  }, []);

  // Función para formatear número de teléfono para WhatsApp URL
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return "";
    // Limpiar el número: solo dígitos
    let cleaned = phone.replace(/\D/g, "");
    // Si empieza con 0, quitarlo
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    // Si no tiene código de país (Perú = 51), agregarlo
    if (cleaned.length === 9 && cleaned.startsWith("9")) {
      cleaned = "51" + cleaned;
    }
    return cleaned;
  };

  // Función para abrir WhatsApp Web con el número
  const openWhatsApp = (phone, mensaje = "") => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone) {
      alert("No hay número de teléfono disponible");
      return;
    }
    const encodedMessage = encodeURIComponent(mensaje);
    const url = mensaje
      ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
      : `https://wa.me/${formattedPhone}`;
    window.open(url, "_blank");
  };

  const fetchAllContactos = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("🔍 Obteniendo contactos desde sucursal_personal...");

      const response = await apiGet("/dashboard/bootstrap");
      const trabajadoresData = response.personal || [];

      if (!trabajadoresData.length) {
        setError("No hay contactos con teléfono registrado en el sistema.");
        setLoading(false);
        return;
      }

      // Transformar datos al formato esperado
      const contactosFinal = trabajadoresData.map((trabajador) => ({
        id: trabajador.id,
        nombre: trabajador.nombre,
        nombreCompleto: trabajador.nombre,
        telefono_origen: trabajador.telefono_origen,
        empresa: trabajador.empresa,
        es_responsable: trabajador.es_responsable,
        estado: trabajador.estado,
        sucursal: trabajador.sucursal,
      }));

      // Filtrar duplicados por teléfono
      const contactosUnicos = contactosFinal.reduce((acc, contacto) => {
        if (
          contacto &&
          !acc.find((t) => t.telefono_origen === contacto.telefono_origen)
        ) {
          acc.push(contacto);
        }
        return acc;
      }, []);

      console.log(`🎉 Total contactos únicos: ${contactosUnicos.length}`);
      setContactos(contactosUnicos);
    } catch (err) {
      console.error("❌ Error en fetchAllContactos:", err);
      setError(`Error al cargar contactos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar contactos basado en búsqueda
  const filteredContactos = contactos.filter((contacto) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      contacto.nombreCompleto?.toLowerCase().includes(searchLower) ||
      contacto.nombre?.toLowerCase().includes(searchLower) ||
      contacto.empresa?.toLowerCase().includes(searchLower) ||
      contacto.telefono_origen?.includes(searchTerm) ||
      contacto.sucursal?.nombre?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Contactos WhatsApp
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {loading
                    ? "Cargando..."
                    : `${filteredContactos.length} contactos encontrados`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa, sucursal o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">
                Cargando contactos...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchAllContactos}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : filteredContactos.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm
                  ? "No se encontraron contactos con ese criterio"
                  : "No hay contactos disponibles"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContactos.map((contacto) => (
                <motion.div
                  key={`contacto-${contacto.id}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800"
                >
                  {/* Badge de estado */}
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        contacto.es_responsable
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {contacto.es_responsable ? "Responsable" : "Trabajador"}
                    </span>
                    {contacto.estado === "activo" && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>

                  {/* Información del contacto */}
                  <div className="space-y-3">
                    {/* Nombre */}
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {contacto.nombreCompleto || "Sin nombre"}
                        </p>
                        {contacto.empresa && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {contacto.empresa}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sucursal */}
                    {contacto.sucursal && (
                      <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-medium"
                            title={contacto.sucursal.nombre}
                          >
                            {contacto.sucursal.nombre}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Teléfono */}
                    {contacto.telefono_origen && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-mono">{contacto.telefono_origen}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón de WhatsApp */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => openWhatsApp(contacto.telefono_origen)}
                      className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Abrir WhatsApp
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Última actualización: {new Date().toLocaleTimeString("es-ES")}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactosModal;
