import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { Save, MessageSquare, Send, Database, HardDrive } from "lucide-react";

const ConfiguracionWhatsApp = () => {
  const { currentUser } = useContext(AuthContext);
  const [config, setConfig] = useState({
    phone_number_id: "",
    access_token: "",
  });
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [storageMethod, setStorageMethod] = useState("localStorage"); // localStorage o database

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
    const cargarConfig = () => {
      // Cargar desde localStorage
      const savedConfig = {
        phone_number_id: localStorage.getItem("whatsapp_phone_number_id") || "",
        access_token: localStorage.getItem("whatsapp_access_token") || "",
      };

      if (savedConfig.phone_number_id || savedConfig.access_token) {
        setConfig(savedConfig);
        setMessage("✅ Configuración cargada desde almacenamiento local");
      }
    };
    cargarConfig();
  }, []);

  // Guardar configuración
  const guardarConfig = async () => {
    console.log("🔄 Iniciando guardado...", { config, storageMethod });

    if (!config.phone_number_id || !config.access_token) {
      alert("Complete todos los campos");
      return;
    }

    setLoading(true);
    setMessage("🔄 Guardando configuración...");

    try {
      // Limpiar token (remover "Bearer " si existe)
      const cleanToken = config.access_token.replace("Bearer ", "").trim();
      console.log("Token length:", config.access_token.length);
      console.log("Clean token length:", cleanToken.length);

      if (storageMethod === "localStorage") {
        // Guardar en localStorage (funciona siempre)
        localStorage.setItem(
          "whatsapp_phone_number_id",
          config.phone_number_id
        );
        localStorage.setItem("whatsapp_access_token", cleanToken);

        setMessage(
          "✅ Configuración guardada localmente (funcional para envío)"
        );
        console.log("✅ Guardado en localStorage exitoso");
      } else {
        // Intentar guardar en base de datos con timeout muy corto
        const { supabase } = await import("../supabaseClient");

        const insertPromise = supabase.from("whatsapp_config").insert({
          phone_number_id: config.phone_number_id,
          access_token: cleanToken,
          activo: true,
        });

        // Timeout de solo 5 segundos para BD
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout BD")), 5000)
        );

        await Promise.race([insertPromise, timeoutPromise]);
        setMessage("✅ Configuración guardada en base de datos");
        console.log("✅ Guardado en BD exitoso");
      }
    } catch (error) {
      console.error("❌ Error:", error);

      if (storageMethod === "database") {
        // Si falla BD, guardar automáticamente en localStorage
        const cleanToken = config.access_token.replace("Bearer ", "").trim();
        localStorage.setItem(
          "whatsapp_phone_number_id",
          config.phone_number_id
        );
        localStorage.setItem("whatsapp_access_token", cleanToken);

        setMessage(
          "⚠️ BD falló, guardado localmente (funciona igual para envío)"
        );
        setStorageMethod("localStorage");
      } else {
        setMessage("❌ Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje HTTP directo
  const enviarMensaje = async () => {
    if (!testPhone || !config.phone_number_id || !config.access_token) {
      alert("Complete teléfono y configuración");
      return;
    }

    setLoading(true);
    setMessage("📤 Enviando mensaje...");

    try {
      // Obtener token desde localStorage si no está en estado
      const phone_id =
        config.phone_number_id ||
        localStorage.getItem("whatsapp_phone_number_id");
      const token =
        config.access_token || localStorage.getItem("whatsapp_access_token");

      if (!phone_id || !token) {
        throw new Error("Configuración no encontrada");
      }

      const cleanToken = token.replace("Bearer ", "").trim();

      const response = await fetch(
        `https://graph.facebook.com/v24.0/${phone_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: testPhone,
            type: "text",
            text: {
              preview_url: false,
              body: "🎉 ¡Mensaje de prueba desde el sistema de control de depósitos!\n\nSi recibes este mensaje, la configuración de WhatsApp está funcionando correctamente.",
            },
          }),
        }
      );

      const result = await response.json();
      console.log("Respuesta WhatsApp:", result);

      if (response.ok && result.messages) {
        setMessage(
          `✅ Mensaje enviado exitosamente!\nID: ${result.messages[0].id}`
        );
      } else {
        const errorMsg =
          result.error?.message ||
          result.error?.error_user_msg ||
          "Error desconocido";
        setMessage(`❌ Error: ${errorMsg}`);
        console.error("Error WhatsApp:", result);
      }
    } catch (error) {
      setMessage("❌ Error de conexión: " + error.message);
      console.error("Error HTTP:", error);
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

      {/* Selector de método de almacenamiento */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
        <label className="block text-sm font-medium mb-2">
          Método de almacenamiento:
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="storage"
              value="localStorage"
              checked={storageMethod === "localStorage"}
              onChange={(e) => setStorageMethod(e.target.value)}
              className="text-blue-600"
            />
            <HardDrive size={16} />
            <span className="text-sm">Local (Recomendado)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="storage"
              value="database"
              checked={storageMethod === "database"}
              onChange={(e) => setStorageMethod(e.target.value)}
              className="text-blue-600"
            />
            <Database size={16} />
            <span className="text-sm">Base de Datos</span>
          </label>
        </div>
      </div>

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
            placeholder="802828579588987"
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
            Número de teléfono (formato internacional)
          </label>
          <input
            type="text"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+51987654321"
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
          <p className="text-sm whitespace-pre-line">{message}</p>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionWhatsApp;
