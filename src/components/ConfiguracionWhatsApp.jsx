import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import {
  Save,
  MessageSquare,
  Send,
  Database,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Power,
  PowerOff,
} from "lucide-react";

const ConfiguracionWhatsApp = () => {
  const { currentUser } = useContext(AuthContext);
  const [config, setConfig] = useState({
    alias: "",
    descripcion: "",
    phone_number_id: "",
    access_token: "",
  });
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [configList, setConfigList] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);

  // Solo admin puede acceder
  if (currentUser?.user_rol !== "admin") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Acceso Denegado</h2>
        <p>Solo administradores pueden configurar WhatsApp.</p>
      </div>
    );
  }

  // Cargar lista de configuraciones al iniciar
  React.useEffect(() => {
    const cargarConfigs = async () => {
      try {
        const { supabase } = await import("../supabaseClient");

        // Cargar solo la lista de configuraciones
        const { data: configs, error: listError } = await supabase
          .from("whatsapp_config")
          .select(
            "id, alias, descripcion, phone_number_id, access_token, activo, creado_en"
          )
          .order("activo", { ascending: false })
          .order("creado_en", { ascending: false });

        if (!listError && configs) {
          setConfigList(configs);
        }
      } catch (dbError) {
        console.log("BD no disponible para cargar configuraciones");
      }
    };

    cargarConfigs();
  }, []);

  // Guardar configuración
  const guardarConfig = async () => {
    console.log("🔄 Iniciando guardado...", { config });

    if (!config.alias || !config.phone_number_id || !config.access_token) {
      alert("Complete todos los campos obligatorios (Alias, Phone ID, Token)");
      return;
    }

    setLoading(true);
    setMessage("🔄 Guardando configuración...");

    try {
      // Limpiar token (remover "Bearer " si existe)
      const cleanToken = config.access_token.replace("Bearer ", "").trim();
      console.log(
        "🔍 Token original:",
        config.access_token.substring(0, 50) + "..."
      );
      console.log("🔍 Token length:", config.access_token.length);
      console.log("🔍 Clean token:", cleanToken.substring(0, 50) + "...");
      console.log("🔍 Clean token length:", cleanToken.length);

      // Verificar si el token contiene caracteres problemáticos
      const hasSpecialChars = /[^\w\-_.~]/.test(cleanToken);
      console.log("🔍 Token tiene caracteres especiales:", hasSpecialChars);

      // Verificar si es un token válido (no vacío después de limpiar)
      if (!cleanToken || cleanToken.length < 10) {
        throw new Error("Token inválido: demasiado corto después de limpiar");
      }

      // Validar Phone Number ID
      console.log("🔍 Phone Number ID original:", config.phone_number_id);
      console.log("🔍 Phone Number ID length:", config.phone_number_id.length);
      console.log("🔍 Phone Number ID type:", typeof config.phone_number_id);

      // Limpiar phone_number_id (quitar espacios y caracteres no numéricos)
      const cleanPhoneId = config.phone_number_id.toString().replace(/\D/g, "");
      console.log("🔍 Clean Phone Number ID:", cleanPhoneId);
      console.log("🔍 Clean Phone Number ID length:", cleanPhoneId.length);

      // Verificar que el Phone Number ID sea válido
      if (
        !cleanPhoneId ||
        cleanPhoneId.length < 10 ||
        cleanPhoneId.length > 20
      ) {
        throw new Error(
          `Phone Number ID inválido: ${cleanPhoneId} (longitud: ${cleanPhoneId.length})`
        );
      }

      // Guardar en base de datos
      console.log("📡 Importando supabase...");
      const { supabase } = await import("../supabaseClient");
      console.log("✅ Supabase importado correctamente");

      // Verificar autenticación
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log(
          "🔐 Sesión actual:",
          session ? "autenticado" : "no autenticado"
        );
        console.log("👤 Usuario:", session?.user?.email || "ninguno");
      } catch (sessionError) {
        console.error("❌ Error verificando sesión:", sessionError);
      }

      // Restaurar operaciones de desactivación
      console.log("🔄 Ejecutando operaciones de desactivación...");
      // 1. Desactivar configuraciones anteriores
      console.log("🔄 Desactivando configuraciones anteriores...");
      try {
        const { error: updateError1 } = await supabase
          .from("whatsapp_config")
          .update({ activo: false })
          .eq("activo", true);

        if (updateError1) throw updateError1;
        console.log("✅ Configuraciones anteriores desactivadas");
      } catch (error) {
        console.error(
          "❌ Fallo en desactivar configuraciones anteriores:",
          error
        );
        throw error;
      }

      // 2. Desactivar configuración con el mismo alias si existe
      console.log("🔄 Desactivando configuración con mismo alias...");
      try {
        const { error: updateError2 } = await supabase
          .from("whatsapp_config")
          .update({ activo: false })
          .eq("alias", config.alias);

        if (updateError2) throw updateError2;
        console.log("✅ Configuración con mismo alias desactivada");
      } catch (error) {
        console.error(
          "❌ Fallo en desactivar configuración con mismo alias:",
          error
        );
        throw error;
      } // 3. Insertar nueva configuración
      console.log("🔄 Insertando nueva configuración...");
      const insertData = {
        alias: config.alias.trim(),
        descripcion: config.descripcion?.trim() || null,
        phone_number_id: cleanPhoneId,
        access_token: cleanToken,
        activo: false, // TEMPORAL: Cambiar a false para evitar conflictos de RLS
      };

      // Log detallado de tamaños
      console.log("📝 Datos a insertar:");
      console.log(
        "  - Alias:",
        insertData.alias,
        `(${insertData.alias.length} chars)`
      );
      console.log(
        "  - Descripción:",
        insertData.descripcion,
        `(${insertData.descripcion?.length || 0} chars)`
      );
      console.log(
        "  - Phone Number ID:",
        insertData.phone_number_id,
        `(${insertData.phone_number_id.length} chars)`
      );
      console.log(
        "  - Access Token:",
        insertData.access_token.substring(0, 50) + "...",
        `(${insertData.access_token.length} chars)`
      );
      console.log("  - Activo:", insertData.activo);

      console.log("🚀 Ejecutando inserción en Supabase...");

      // Función de inserción alternativa usando API REST directa
      const insertViaREST = async (data) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log("🌐 Probando inserción vía REST API...");

        const response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(data),
        });

        console.log("📡 REST API Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ REST API Error:", errorText);
          throw new Error(`REST API Error: ${response.status} - ${errorText}`);
        }

        console.log("✅ Inserción vía REST API exitosa");
        return { error: null };
      };

      // Función de inserción con retry y timeout extendido
      const insertWithRetry = async (data, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(
            `⏰ Intento ${attempt}/${maxRetries} - Esperando respuesta de Supabase...`
          );

          try {
            const { error } = await Promise.race([
              supabase.from("whatsapp_config").insert(data),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Timeout en intento ${attempt}: Supabase no respondió en 20s`
                      )
                    ),
                  20000 // Aumentar timeout a 20 segundos
                )
              ),
            ]);

            if (!error) {
              console.log(`✅ Inserción exitosa en intento ${attempt}`);
              return { error: null };
            } else {
              console.log(`❌ Error en intento ${attempt}:`, error);
              if (attempt === maxRetries) {
                return { error };
              }
            }
          } catch (timeoutError) {
            console.log(
              `⏰ Timeout en intento ${attempt}:`,
              timeoutError.message
            );
            if (attempt === maxRetries) {
              throw timeoutError;
            }

            // Esperar 2 segundos antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      };

      // Probar inserción simple primero
      console.log("🚀 Iniciando inserción simple...");

      let error = null;
      try {
        console.log("⏰ Ejecutando inserción básica...");
        const { error: insertError } = await supabase
          .from("whatsapp_config")
          .insert(insertData);

        error = insertError;
        console.log("📤 Resultado inserción básica:", { error: insertError });
      } catch (simpleError) {
        console.error("❌ Error en inserción simple:", simpleError);
        error = simpleError;
      }

      console.log("📤 Resultado de inserción:", { error });

      if (error) {
        console.error("❌ Error de inserción completo:", error);
        console.error("❌ Código de error:", error.code);
        console.error("❌ Mensaje de error:", error.message);
        console.error("❌ Detalles del error:", error.details);
        console.error("❌ Hint del error:", error.hint);

        // Verificar si es un error de longitud de datos
        if (error.message && error.message.includes("value too long")) {
          console.error(
            "🚨 ERROR DE LONGITUD: El token es demasiado largo para la columna de BD"
          );
          alert(
            "❌ Error: El token de acceso es demasiado largo. Contacta al administrador para ajustar la base de datos."
          );
        } else {
          alert(`❌ Error al guardar: ${error.message}`);
        }
        throw error;
      }

      // También guardar en localStorage como backup
      localStorage.setItem("whatsapp_phone_number_id", config.phone_number_id);
      localStorage.setItem("whatsapp_access_token", cleanToken);

      setMessage("✅ Configuración guardada en base de datos");
      console.log("✅ Guardado en BD exitoso sin errores");

      // Recargar la lista de configuraciones
      await recargarConfigs();
    } catch (error) {
      console.error("❌ Error:", error);

      // Si falla BD, guardar automáticamente en localStorage
      const cleanToken = config.access_token.replace("Bearer ", "").trim();
      localStorage.setItem("whatsapp_phone_number_id", config.phone_number_id);
      localStorage.setItem("whatsapp_access_token", cleanToken);

      setMessage("⚠️ BD falló, guardado localmente como backup");
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje HTTP directo
  const enviarMensaje = async (useActive = true) => {
    if (!testPhone) {
      alert("Complete el número de teléfono");
      return;
    }

    setLoading(true);
    setMessage("📤 Enviando mensaje...");

    try {
      // Usar SOLO la configuración activa de la base de datos
      const activeConfig = configList.find((c) => c.activo);

      if (!activeConfig) {
        throw new Error(
          "No hay ninguna configuración activa. Por favor, activa una configuración desde la lista."
        );
      }

      const phone_id = activeConfig.phone_number_id;
      const token = activeConfig.access_token;

      console.log("📤 Usando configuración activa:", {
        alias: activeConfig.alias,
        phone_id: phone_id,
        token_length: token?.length || 0,
      });

      if (!phone_id || !token) {
        throw new Error("Configuración no encontrada");
      }

      const cleanToken = token.replace("Bearer ", "").trim();

      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phone_id}/messages`,
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

  // Recargar lista de configuraciones
  const recargarConfigs = async () => {
    try {
      const { supabase } = await import("../supabaseClient");
      const { data: configs, error } = await supabase
        .from("whatsapp_config")
        .select(
          "id, alias, descripcion, phone_number_id, access_token, activo, creado_en"
        )
        .order("activo", { ascending: false })
        .order("creado_en", { ascending: false });

      if (!error && configs) {
        setConfigList(configs);
      }
    } catch (error) {
      console.error("Error recargando configuraciones:", error);
    }
  };

  // Eliminar configuración
  const eliminarConfig = async (configId, alias) => {
    if (!confirm(`¿Estás seguro de eliminar la configuración "${alias}"?`)) {
      return;
    }

    try {
      const { supabase } = await import("../supabaseClient");
      const { error } = await supabase
        .from("whatsapp_config")
        .delete()
        .eq("id", configId);

      if (error) throw error;

      setMessage(`✅ Configuración "${alias}" eliminada`);
      await recargarConfigs();
    } catch (error) {
      setMessage(`❌ Error eliminando: ${error.message}`);
    }
  };

  // Activar/desactivar configuración
  const toggleConfig = async (configId, alias, currentStatus) => {
    try {
      const { supabase } = await import("../supabaseClient");

      if (!currentStatus) {
        // Si vamos a activar, desactivar las demás primero
        await supabase
          .from("whatsapp_config")
          .update({ activo: false })
          .eq("activo", true);
      }

      const { error } = await supabase
        .from("whatsapp_config")
        .update({ activo: !currentStatus })
        .eq("id", configId);

      if (error) throw error;

      const action = !currentStatus ? "activada" : "desactivada";
      setMessage(`✅ Configuración "${alias}" ${action}`);
      await recargarConfigs();
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  // Editar configuración (cargar en formulario)
  const editarConfig = async (configId) => {
    try {
      const { supabase } = await import("../supabaseClient");
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("id", configId)
        .single();

      if (error) throw error;

      setConfig({
        alias: data.alias,
        descripcion: data.descripcion || "",
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
      });
      setSelectedConfig(data);
      setMessage(`📝 Configuración "${data.alias}" cargada para edición`);
    } catch (error) {
      setMessage(`❌ Error cargando configuración: ${error.message}`);
    }
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setConfig({
      alias: "",
      descripcion: "",
      phone_number_id: "",
      access_token: "",
    });
    setSelectedConfig(null);
    setMessage("");
  };

  // Configuración activa (si existe)
  const activeConfig = configList.find((c) => c.activo) || null;

  return (
    <div className="w-full p-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <MessageSquare className="text-green-500" />
        Gestión WhatsApp
      </h1>

      {/* Cards Layout Horizontal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card: Nueva Configuración */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="text-green-500" />
              {selectedConfig
                ? `Editando: ${selectedConfig.alias}`
                : "Nueva Configuración"}
            </h2>
            {selectedConfig && (
              <button
                onClick={limpiarFormulario}
                className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancelar Edición
              </button>
            )}
          </div>

          {/* Formulario de Configuración */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Alias / Nombre de Configuración *
              </label>
              <input
                type="text"
                value={config.alias}
                onChange={(e) =>
                  setConfig({ ...config, alias: e.target.value })
                }
                placeholder="Ej: Principal, Producción, Pruebas..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={config.descripcion}
                onChange={(e) =>
                  setConfig({ ...config, descripcion: e.target.value })
                }
                placeholder="Descripción de esta configuración..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number ID *
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
              <label className="block text-sm font-medium mb-2">
                Access Token
              </label>
              <textarea
                value={config.access_token}
                onChange={(e) =>
                  setConfig({ ...config, access_token: e.target.value })
                }
                placeholder="EAAxxxxxxxxxxxxxxxxxx..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                💡 Puedes pegar el token con o sin "Bearer " - se limpiará
                automáticamente
              </div>
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
        </div>

        {/* Card: Configuraciones Existentes */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database size={24} />
              Configuraciones Existentes
            </h2>
            <button
              onClick={recargarConfigs}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Recargar
            </button>
          </div>

          {configList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                No hay configuraciones creadas
              </p>
              <p className="text-sm">
                Crea tu primera configuración en el formulario de la izquierda
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {configList.map((cfg) => (
                <div
                  key={cfg.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    cfg.activo
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 shadow-md"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{cfg.alias}</h3>
                        {cfg.activo ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 text-xs rounded-full font-medium">
                            <Power size={12} />
                            ACTIVA
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                            <PowerOff size={12} />
                            INACTIVA
                          </span>
                        )}
                      </div>

                      {cfg.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          {cfg.descripcion}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Phone ID:</span>
                          {cfg.phone_number_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Creado:</span>
                          {new Date(cfg.creado_en).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-6">
                      {/* Activar/Desactivar */}
                      <button
                        onClick={() =>
                          toggleConfig(cfg.id, cfg.alias, cfg.activo)
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          cfg.activo
                            ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                            : "bg-green-100 hover:bg-green-200 text-green-700"
                        }`}
                        title={
                          cfg.activo
                            ? "Desactivar configuración"
                            : "Activar configuración"
                        }
                      >
                        {cfg.activo ? (
                          <PowerOff size={18} />
                        ) : (
                          <Power size={18} />
                        )}
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => editarConfig(cfg.id)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                        title="Editar configuración"
                      >
                        <Edit2 size={18} />
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarConfig(cfg.id, cfg.alias)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        title="Eliminar configuración"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card: Probar Mensaje */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Send size={20} />
            Probar Mensaje
          </h2>

          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Configuración activa
              </label>
              {(() => {
                const activeConfig = configList.find((c) => c.activo);
                if (activeConfig) {
                  return (
                    <>
                      <div className="text-sm text-green-600 font-medium">
                        ✅ {activeConfig.alias}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Phone ID: {activeConfig.phone_number_id}
                      </div>
                      {activeConfig.descripcion && (
                        <div className="text-xs text-gray-400 mt-1">
                          {activeConfig.descripcion}
                        </div>
                      )}
                    </>
                  );
                } else {
                  return (
                    <div className="text-sm text-red-600">
                      ❌ No hay configuración activa
                    </div>
                  );
                }
              })()}
            </div>

            <button
              onClick={() => enviarMensaje(true)}
              disabled={loading || !configList.find((c) => c.activo)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                !configList.find((c) => c.activo)
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white"
              }`}
              title={
                !configList.find((c) => c.activo)
                  ? "Activa una configuración para enviar mensajes"
                  : ""
              }
            >
              <Send size={16} />
              {loading
                ? "Enviando..."
                : !configList.find((c) => c.activo)
                ? "Activar configuración primero"
                : "Enviar Mensaje de Prueba"}
            </button>

            {message && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm whitespace-pre-line">{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionWhatsApp;
