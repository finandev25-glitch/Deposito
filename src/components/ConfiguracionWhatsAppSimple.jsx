import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { Save, MessageSquare, Send } from "lucide-react";

const ConfiguracionWhatsApp = () => {
  const { currentUser } = useContext(AuthContext);
  const [config, setConfig] = useState({
    phone_number_id: "",
    access_token: "",
  });
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Solo admin puede acceder
  if (currentUser?.user_rol !== "admin") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Acceso Denegado</h2>
        <p>Solo administradores pueden configurar WhatsApp.</p>
      </div>
    );
  }

  // Cargar configuración al iniciar
  React.useEffect(() => {
    const cargarConfig = async () => {
      try {
        const { data } = await supabase.rpc("get_whatsapp_credentials");
        if (data && data[0]) {
          setConfig(data[0]);
        }
      } catch (error) {
        console.log("No hay configuración guardada");
      }
    };
    cargarConfig();
  }, []);

  // Guardar configuración
  const guardarConfig = async () => {
    if (!config.phone_number_id || !config.access_token) {
      alert("Complete todos los campos");
      return;
    }

    setLoading(true);
    try {
      // Desactivar configs anteriores
      await supabase
        .from("whatsapp_config")
        .update({ activo: false })
        .eq("activo", true);

      // Insertar nueva
      await supabase.from("whatsapp_config").insert({
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
        activo: true,
      });

      setMessage("✅ Configuración guardada");
    } catch (error) {
      setMessage("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje HTTP simple
  const enviarMensaje = async () => {
    if (!testPhone || !config.phone_number_id || !config.access_token) {
      alert("Complete teléfono y configuración");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: testPhone,
            type: "text",
            text: { body: "Hola! Mensaje de prueba desde el sistema 🚀" },
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage("✅ Mensaje enviado: " + result.messages[0].id);
      } else {
        setMessage(
          "❌ Error: " + (result.error?.message || "Error desconocido")
        );
      }
    } catch (error) {
      setMessage("❌ Error HTTP: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="text-green-500" />
        Configuración WhatsApp
      </h1>

      {/* Configuración */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number ID
          </label>
          <input
            type="text"
            value={config.phone_number_id}
            onChange={(e) =>
              setConfig({ ...config, phone_number_id: e.target.value })
            }
            placeholder="123456789012345"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Access Token</label>
          <textarea
            value={config.access_token}
            onChange={(e) =>
              setConfig({ ...config, access_token: e.target.value })
            }
            placeholder="EAAxxxxxxxxxxxxxxxxxx..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={guardarConfig}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
        >
          <Save size={16} />
          {loading ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>

      {/* Prueba de mensaje */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-lg font-semibold">Probar Mensaje</h3>

        <div>
          <label className="block text-sm font-medium mb-2">
            Número de teléfono (con código país)
          </label>
          <input
            type="text"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="51987654321"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={enviarMensaje}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
        >
          <Send size={16} />
          {loading ? "Enviando..." : "Enviar Mensaje de Prueba"}
        </button>
      </div>

      {/* Resultado */}
      {message && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionWhatsApp;
