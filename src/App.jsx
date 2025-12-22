import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import Sidebar from "./components/Sidebar";
import KanbanView from "./components/KanbanView";
import TableView from "./components/TableView";
import SucursalesView from "./components/SucursalesView";
import BancosView from "./components/BancosView";
import GestionBancosView from "./components/GestionBancosView";
import GestionEmpresasView from "./components/GestionEmpresasView";
import UsuariosView from "./components/UsuariosView";
import ReportesView from "./components/ReportesView";
import DocumentosView from "./components/DocumentosView";
import ConfiguracionWhatsApp from "./components/ConfiguracionWhatsApp";
import ConfiguracionChatWoot from "./components/ConfiguracionChatWoot";
import EnviarMensajeChatWoot from "./components/EnviarMensajeChatWoot";
import CambiarContrasena from "./components/CambiarContrasena";
import RegularizarDepositos from "./components/RegularizarDepositos";
import AuthPage from "./pages/AuthPage.jsx";
import PendingApproval from "./pages/PendingApproval.jsx";
import MobileHeader from "./components/MobileHeader.jsx";

import {
  initialBancos,
  initialEmpresas,
  initialUsers,
  generateMockCuentasBancarias,
  generateMockSucursales,
  generateMockDeposits,
} from "./utils/mockData";
import { Loader2, XCircle } from "lucide-react";

export const DEPOSIT_FULL_QUERY_STRING = `
  id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, chatwoot_conversation_id, chatwoot_config_id, chatwoot_message_id, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)
`;

function App() {
  const { currentUser, users, loading } = useContext(AuthContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Variable para controlar si la carga inicial se completó (persiste entre renders)
  const initialLoadCompleteRef = useRef(false);
  const lastLocationRef = useRef(location.pathname);

  // Estados relacionados con reconexión eliminados - ahora se recarga la página directamente

  // 🐛 DEBUG: Logging para diagnosticar el problema
  React.useEffect(() => {
    console.log("🔍 App.jsx - Estado actual:", {
      loading,
      currentUser: currentUser
        ? {
            nombre: currentUser.nombre,
            user_rol: currentUser.user_rol,
            estado: currentUser.estado,
          }
        : null,
      usersCount: users?.length || 0,
      supabaseConnected: !!supabase,
    });
  }, [loading, currentUser, users]);

  // Estados para datos de la aplicación
  const [bancos, setBancos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Estados de carga y error para los datos principales
  const [appDataLoading, setAppDataLoading] = useState(true);
  const [appDataError, setAppDataError] = useState(null);

  const isSupabaseConnected = supabase && currentUser;

  // Función centralizada para cargar datos
  const fetchData = async (isBackground = false) => {
    console.log(`🔄 Recargando datos... (Background: ${isBackground})`);

    // Solo mostrar loading si NO es background refresh
    if (!isBackground) {
      setAppDataLoading(true);
      setAppDataError(null);
    }

    // Verificar conexión antes de proceder
    if (!supabase || !currentUser) {
      console.log("⚠️ No hay conexión o usuario - saltando fetchData");
      if (!isBackground) {
        setAppDataLoading(false);
        setAppDataError("No hay conexión activa");
      }
      return;
    }

    try {
      if (isSupabaseConnected) {
        const fetchPromises = [
          supabase
            .from("bancos")
            .select("*")
            .order("nombre", { ascending: true }),
          supabase
            .from("empresas")
            .select("*")
            .order("nombre", { ascending: true }),
          supabase
            .from("cuentas_bancarias")
            .select("*, empresa:empresas(*), banco:bancos(*)")
            .order("created_at", { ascending: false }),
          supabase
            .from("sucursales")
            .select("*")
            .order("nombre", { ascending: true }),
          // NO cargar depósitos en la carga inicial
          // Los depósitos se cargarán mediante fetchDepositsByDate cuando el usuario seleccione una fecha
          Promise.resolve({ data: [], error: null }),
          supabase.from("sucursal_personal").select("*"),
        ];

        const [
          bancosRes,
          empresasRes,
          cuentasRes,
          sucursalesRes,
          depositsRes,
          personalRes,
        ] = await Promise.all(fetchPromises);

        // Lanzar error si alguna de las consultas falla
        if (bancosRes.error)
          throw new Error(`Bancos: ${bancosRes.error.message}`);
        if (empresasRes.error)
          throw new Error(`Empresas: ${empresasRes.error.message}`);
        if (cuentasRes.error)
          throw new Error(`Cuentas: ${cuentasRes.error.message}`);
        if (sucursalesRes.error)
          throw new Error(`Sucursales: ${sucursalesRes.error.message}`);
        if (depositsRes.error)
          throw new Error(`Depósitos: ${depositsRes.error.message}`);
        if (personalRes.error)
          throw new Error(`Personal: ${personalRes.error.message}`);

        // Debug: Verificar si telefono_origen viene en los datos
        const firstDeposit = depositsRes.data?.[0];
        console.log("📞 DEBUG: Primer depósito de la BD:", {
          id: firstDeposit?.id,
          telefono_origen: firstDeposit?.telefono_origen,
          cliente: firstDeposit?.cliente,
          trabajador: firstDeposit?.trabajador?.nombre,
          // Mostrar TODAS las propiedades del depósito
          allKeys: firstDeposit ? Object.keys(firstDeposit) : [],
        });

        // Log de depósitos cargados
        const deposits = depositsRes.data || [];
        console.log(`📊 Depósitos cargados: ${deposits.length}`);
        if (deposits.length > 0) {
          const fechas = deposits.map((d) => d.fecha_registro).filter((f) => f);
          const fechaMin = Math.min(
            ...fechas.map((f) => new Date(f).getTime())
          );
          const fechaMax = Math.max(
            ...fechas.map((f) => new Date(f).getTime())
          );
          console.log(
            `📅 Rango de fechas: ${
              new Date(fechaMin).toISOString().split("T")[0]
            } a ${new Date(fechaMax).toISOString().split("T")[0]}`
          );
        }

        // Si todo va bien, actualizamos los estados
        // React hará batching de estas actualizaciones
        setBancos(bancosRes.data || []);
        setEmpresas(empresasRes.data || []);
        setCuentas(cuentasRes.data || []);
        setSucursales(sucursalesRes.data || []);
        setDeposits(deposits);
        setPersonal(personalRes.data || []);

        console.log("✅ Datos actualizados exitosamente");
      } else {
        // Fallback a datos simulados si no hay conexión a Supabase
        if (!isBackground) {
          setBancos(initialBancos);
          setEmpresas(initialEmpresas);
          setCuentas(
            generateMockCuentasBancarias(50, initialBancos, initialEmpresas)
          );
          const mockSucursales = generateMockSucursales(8);
          setSucursales(mockSucursales);
          const mockPersonal = mockSucursales.flatMap((s) =>
            s.personal.map((p) => ({ ...p, sucursal_id: s.id }))
          );
          setPersonal(mockPersonal);
          setDeposits(generateMockDeposits(200, mockPersonal, initialUsers)); // Aumentar significativamente los datos de prueba
        }
      }
    } catch (error) {
      console.error("Error crítico durante la carga de datos:", error);

      // Determinar si es un error de red/conexión
      const isNetworkError =
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("Failed to fetch");

      if (!isBackground) {
        if (isNetworkError) {
          const errorMsg =
            "Error de conexión. Verifica tu internet y usa el botón 'Reconectar' si es necesario.";
          setAppDataError(errorMsg);
          setConnectionError(new Error(errorMsg));
        } else {
          setAppDataError(
            `Error al cargar los datos: ${error.message}. Revisa la consola para más detalles.`
          );
        }

        // Aseguramos que los estados de datos sean arrays vacíos para evitar más errores
        setBancos([]);
        setEmpresas([]);
        setCuentas([]);
        setSucursales([]);
        setDeposits([]);
        setPersonal([]);
      } else {
        // Si es background refresh y hay error, no romper la app
        console.log(
          "⚠️ Error en background refresh, manteniendo datos actuales"
        );
      }
    } finally {
      if (!isBackground) {
        setAppDataLoading(false);
      }
    }
  };

  // Función para refrescar solo los depósitos (cuando se actualiza uno específico)
  const refreshDeposits = async () => {
    if (!supabase || !currentUser || !isSupabaseConnected) {
      console.log("⚠️ No se puede refrescar depósitos - falta conexión");
      return;
    }

    try {
      console.log("🔄 Refrescando depósitos...");
      const { data, error } = await supabase
        .from("depositos")
        .select(DEPOSIT_FULL_QUERY_STRING)
        .order("fecha_registro", { ascending: false });

      if (error) {
        console.error("❌ Error refrescando depósitos:", error);
        return;
      }

      setDeposits(data || []);
      console.log("✅ Depósitos refrescados exitosamente");
    } catch (error) {
      console.error("💥 Error crítico refrescando depósitos:", error);
    }
  };

  // Función para cargar depósitos por fecha específica (memoizada con useCallback)
  const fetchDepositsByDate = useCallback(
    async (fecha) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎬 fetchDepositsByDate INICIADA para fecha:", fecha);
      console.log("🕐 Timestamp:", new Date().toISOString());
      console.log("🔍 Estado de conexión:", {
        supabase: !!supabase,
        currentUser: !!currentUser,
        isSupabaseConnected,
      });

      if (!supabase || !currentUser || !isSupabaseConnected) {
        console.log("⚠️ No se puede cargar depósitos - falta conexión");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return;
      }

      try {
        console.log(`🔄 PASO 1: Iniciando consulta a BD para fecha: ${fecha}`);
        console.log(`📝 Query: depositos where fecha_solo_date = '${fecha}'`);
        console.log(
          `⏱️ Antes de ejecutar query - Timestamp:`,
          new Date().toISOString()
        );

        // Crear una Promise con timeout para detectar queries que se cuelgan
        console.log("🔄 Ejecutando query completa con todos los datos...");
        const queryPromise = supabase
          .from("depositos")
          .select(DEPOSIT_FULL_QUERY_STRING, {
            count: "exact",
          })
          .eq("fecha_solo_date", fecha)
          .order("fecha_registro", { ascending: false });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Query timeout después de 30 segundos")),
            30000
          );
        });

        console.log("⏳ Esperando respuesta de Supabase...");
        const { data, error, count } = await Promise.race([
          queryPromise,
          timeoutPromise,
        ]);

        console.log("📡 PASO 2: Respuesta recibida de Supabase");
        console.log(
          `⏱️ Después de recibir respuesta - Timestamp:`,
          new Date().toISOString()
        );

        if (error) {
          console.error("❌ PASO 3: Error cargando depósitos:", error);
          console.error("❌ Detalles del error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          return;
        }

        console.log(
          `✅ PASO 3: Depósitos cargados: ${
            data?.length || 0
          } registros (count: ${count})`
        );
        if (data && data.length > 0) {
          console.log("📊 Primer depósito:", {
            id: data[0].id,
            fecha_solo_date: data[0].fecha_solo_date,
            cliente: data[0].cliente,
            numero_operacion: data[0].numero_operacion,
            monto: data[0].monto,
            estado: data[0].estado,
            empresa: data[0].empresa?.nombre,
            banco: data[0].banco?.abreviatura,
          });
        } else {
          console.warn(
            "⚠️ La consulta retornó 0 depósitos para la fecha:",
            fecha
          );
        }

        console.log(
          "💾 PASO 4: Actualizando estado deposits con",
          data?.length || 0,
          "registros"
        );
        setDeposits(data || []);
        console.log("✅ PASO 5: Estado actualizado correctamente");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      } catch (error) {
        console.error("💥 Error crítico cargando depósitos:", error);
        console.error("💥 Stack:", error.stack);
        console.error("💥 Nombre:", error.name);
        console.error("💥 Mensaje:", error.message);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }
    },
    [supabase, currentUser, isSupabaseConnected]
  );

  // Carga inicial
  useEffect(() => {
    console.log("🔍 Verificando estado de carga...", {
      currentUser: !!currentUser,
      isSupabaseConnected,
      pathname: location.pathname,
      lastLocation: lastLocationRef.current,
    });

    if (!currentUser || !isSupabaseConnected) {
      setAppDataLoading(false);
      return;
    }

    // Detectar si volvimos a la página principal desde otra página
    const returnedToMainPage =
      location.pathname === "/" &&
      lastLocationRef.current !== "/" &&
      lastLocationRef.current !== null;
    const isFirstLoad = !initialLoadCompleteRef.current;

    if (isFirstLoad || returnedToMainPage) {
      console.log(
        returnedToMainPage
          ? "🏠 REGRESANDO a página principal - FORZANDO RECARGA..."
          : "🔄 PRIMERA CARGA - Ejecutando carga inicial..."
      );
      initialLoadCompleteRef.current = true;
      fetchData(false);
    }

    // Actualizar la referencia de ubicación
    lastLocationRef.current = location.pathname;
  }, [currentUser, isSupabaseConnected, location.pathname]);

  // � Efecto para refrescar datos cuando vuelves a la página principal
  useEffect(() => {
    // Si estás en la página principal y hay usuario, asegurar que los datos están cargados
    if (location.pathname === "/" && currentUser && !appDataLoading) {
      console.log("🏠 Volviendo a la página principal - verificando datos...");
      if (deposits.length === 0 && bancos.length === 0) {
        console.log("📊 No hay datos cargados - ejecutando recarga...");
        fetchData(false);
      }
    }
  }, [
    location.pathname,
    currentUser,
    appDataLoading,
    deposits.length,
    bancos.length,
  ]);

  // 🔄 Efecto adicional para asegurar recarga inmediata al volver a la página principal
  useEffect(() => {
    if (location.pathname === "/" && currentUser && isSupabaseConnected) {
      console.log("🏠 DETECTADO: Navegación a página principal");
      // Forzar recarga después de un breve delay
      const timeoutId = setTimeout(() => {
        console.log(
          "🔄 EJECUTANDO: Recarga forzada al volver a página principal"
        );
        fetchData(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, currentUser, isSupabaseConnected]);

  // 👁️ Detectar cuando el usuario regresa a la pestaña y recargar automáticamente
  // Solución al problema conocido de Supabase con pestañas inactivas
  useEffect(() => {
    if (!currentUser || !isSupabaseConnected) return;

    const hasReloadedRef = { current: false };
    let wasHidden = false;

    const handleVisibilityChange = () => {
      console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

      if (document.visibilityState === "hidden") {
        wasHidden = true;
        hasReloadedRef.current = false;
        console.log("👋 Página se ocultó");
      } else if (document.visibilityState === "visible" && wasHidden && !hasReloadedRef.current) {
        console.log("👀 Página visible nuevamente - RECARGANDO!");
        hasReloadedRef.current = true;
        
        setTimeout(() => {
          console.log("🔄 Ejecutando window.location.reload()...");
          window.location.reload();
        }, 300);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    console.log("✅ Listener de visibilidad instalado");

    return () => {
      console.log("🧹 Limpiando listener de visibilidad");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser, isSupabaseConnected]);

  useEffect(() => {
    // DESHABILITADO: No queremos polling automático
    // if (!currentUser || !isSupabaseConnected || location.pathname !== "/")
    //   return;
    // console.log("INICIANDO polling cada 30 segundos en página principal...");
    // const interval = setInterval(() => {
    //   if (document.visibilityState === "visible") {
    //     console.log("POLLING: Refrescando datos automáticamente...");
    //     fetchData(false);
    //   }
    // }, 30000); // Cada 30 segundos
    // return () => {
    //   console.log("DETENIENDO polling...");
    //   clearInterval(interval);
    // };
  }, [currentUser, isSupabaseConnected, location.pathname]);

  // �🔴 Suscripción a cambios en tiempo real (Realtime)
  useEffect(() => {
    if (!isSupabaseConnected || !supabase || !currentUser) {
      console.log(
        "⚠️ REALTIME: No se puede suscribir (falta conexión o usuario)"
      );
      return;
    }

    console.log("🔴 REALTIME: Iniciando suscripción a cambios en depositos...");

    const channel = supabase
      .channel("depositos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "depositos",
        },
        (payload) => {
          try {
            console.log(
              "📨 REALTIME: Cambio detectado en depositos:",
              payload.eventType
            );
            console.log("📦 REALTIME: Payload completo:", payload);

            switch (payload.eventType) {
              case "INSERT":
                console.log(
                  "➕ REALTIME: Nuevo depósito creado:",
                  payload.new.id
                );
                console.log(
                  "📋 REALTIME: Estado del depósito:",
                  payload.new.estado
                );

                // Recargar depósitos para obtener el nuevo depósito con todas sus relaciones
                console.log("🔄 REALTIME: Llamando refreshDeposits para INSERT...");
                refreshDeposits();
                break;

              case "UPDATE":
                console.log(
                  "🔄 REALTIME: Depósito actualizado:",
                  payload.new.id
                );

                // Obtener el depósito completo con todas las relaciones
                (async () => {
                  try {
                    console.log("📡 REALTIME: Consultando depósito completo...");
                    const { data: fullDeposit, error } = await supabase
                      .from("depositos")
                      .select(DEPOSIT_FULL_QUERY_STRING)
                      .eq("id", payload.new.id)
                      .single();

                    console.log("📦 REALTIME: Respuesta de query:", {
                      hasData: !!fullDeposit,
                      hasError: !!error,
                      depositId: payload.new.id,
                    });

                    if (error) {
                      console.error(
                        "❌ REALTIME: Error obteniendo depósito completo:",
                        error
                      );
                      // Fallback: actualizar solo con los datos básicos
                      console.log("⚠️ REALTIME: Usando fallback con datos básicos");
                      setDeposits((prev) =>
                        prev.map((dep) =>
                          dep.id === payload.new.id
                            ? { ...dep, ...payload.new }
                            : dep
                        )
                      );
                    } else if (fullDeposit) {
                      console.log(
                        "✅ REALTIME: Depósito completo obtenido con relaciones:",
                        {
                          id: fullDeposit.id,
                          estado: fullDeposit.estado,
                          validado_por_usuario:
                            fullDeposit.validado_por_usuario,
                        }
                      );
                      // Actualizar con el depósito completo que incluye las relaciones
                      console.log("🔄 REALTIME: Actualizando estado deposits...");
                      setDeposits((prev) => {
                        const updated = prev.map((dep) =>
                          dep.id === payload.new.id ? fullDeposit : dep
                        );
                        console.log("✅ REALTIME: Estado actualizado");
                        return updated;
                      });
                    } else {
                      console.warn("⚠️ REALTIME: No hay data ni error - caso inesperado");
                    }
                  } catch (err) {
                    console.error("💥 REALTIME: Error inesperado:", err);
                  }
                })();
                break;

              case "DELETE":
                console.log("🗑️ REALTIME: Depósito eliminado:", payload.old.id);
                // Eliminar el depósito del estado
                setDeposits((prev) =>
                  prev.filter((dep) => dep.id !== payload.old.id)
                );
                break;

              default:
                console.log(
                  "❓ REALTIME: Evento desconocido:",
                  payload.eventType
                );
            }
          } catch (error) {
            console.error("❌ REALTIME: Error procesando payload:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 REALTIME: Estado de suscripción:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ REALTIME: Suscripción activa");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ REALTIME: Error en el canal");
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ REALTIME: Timeout de conexión");
        } else if (status === "CLOSED") {
          console.log("🔒 REALTIME: Canal cerrado");
        }
      });

    return () => {
      console.log("🧹 REALTIME: Limpiando suscripción");
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConnected, currentUser]);


  const depositsWithFullData = useMemo(() => {
    if (!deposits) return [];
    if (isSupabaseConnected) {
      return deposits;
    }
    return deposits.map((dep) => {
      const trabajador = personal.find(
        (p) => p.id === dep.trabajador_sucursal_id
      );
      const validator = users.find((u) => u.id === dep.validado_por);
      return {
        ...dep,
        trabajador: trabajador ? { nombre: trabajador.nombre } : null,
        validado_por_usuario: validator ? { nombre: validator.nombre } : null,
        sucursal: { nombre: dep.sucursal },
        banco: { abreviatura: dep.banco },
        empresa: { nombre: dep.empresa },
      };
    });
  }, [deposits, personal, users, isSupabaseConnected]);

  const handleOpenVoucherWindow = (url) => {
    if (!url) {
      alert("No hay un voucher para mostrar.");
      return;
    }
    window.postMessage({ type: "LOAD_VOUCHER", url: url }, "*");
  };

  // --- Lógica CRUD (sin cambios) ---
  const handleAddBanco = async (newBancoData) => {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from("bancos")
        .insert([{ ...newBancoData, estado: "activo" }])
        .select()
        .single();
      if (error) {
        alert(`Error: ${error.message}`);
        return null;
      }
      setBancos((prev) => [data, ...prev]);
      return data;
    } else {
      const newBanco = {
        id: Date.now().toString(),
        ...newBancoData,
        estado: "activo",
      };
      setBancos((prev) => [newBanco, ...prev]);
      return newBanco;
    }
  };
  const handleUpdateBanco = async (updatedBanco) => {
    if (isSupabaseConnected) {
      const { id, ...updateData } = updatedBanco;
      const { data, error } = await supabase
        .from("bancos")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        alert(`Error: ${error.message}`);
        return null;
      }
      setBancos((prev) => prev.map((b) => (b.id === id ? data : b)));
      return data;
    } else {
      setBancos((prev) =>
        prev.map((b) => (b.id === updatedBanco.id ? updatedBanco : b))
      );
      return updatedBanco;
    }
  };
  const handleDeleteBanco = async (bancoId) => {
    if (isSupabaseConnected) {
      const { error } = await supabase
        .from("bancos")
        .delete()
        .eq("id", bancoId);
      if (error) alert(`Error: ${error.message}`);
      else setBancos((prev) => prev.filter((b) => b.id !== bancoId));
    } else {
      setBancos((prev) => prev.filter((b) => b.id !== bancoId));
    }
  };
  const handleAddEmpresa = async (newEmpresaData) => {
    console.log("🏢 Creando nueva empresa:", newEmpresaData);
    console.log("🔗 Supabase conectado:", isSupabaseConnected);

    if (isSupabaseConnected) {
      try {
        const { data, error } = await supabase
          .from("empresas")
          .insert({ ...newEmpresaData, estado: "activo" })
          .select()
          .single();

        if (error) {
          console.error("❌ Error creando empresa en Supabase:", error);
          alert(`Error: ${error.message}`);
          return null;
        }

        console.log("✅ Empresa creada en Supabase:", data);
        setEmpresas((prev) => [...prev, data]);
        return data;
      } catch (error) {
        console.error("💥 Error crítico creando empresa:", error);
        alert(`Error crítico: ${error.message || error}`);
        return null;
      }
    } else {
      const newEmpresa = {
        id: Date.now().toString(),
        ...newEmpresaData,
        estado: "activo",
        created_at: new Date().toISOString(),
      };
      console.log("🎭 Empresa creada en modo simulado:", newEmpresa);
      setEmpresas((prev) => [...prev, newEmpresa]);
      return newEmpresa;
    }
  };
  const handleUpdateEmpresa = async (empresaId, updatedData) => {
    console.log("🔄 Actualizando empresa:", empresaId, updatedData);
    console.log("🔗 Supabase conectado:", isSupabaseConnected);

    if (isSupabaseConnected) {
      try {
        console.log("📡 Enviando actualización a Supabase...");

        // Crear un timeout de 15 segundos para evitar colgarse
        const updatePromise = supabase
          .from("empresas")
          .update(updatedData)
          .eq("id", empresaId)
          .select()
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error("Timeout: La consulta tardó más de 15 segundos")
              ),
            15000
          )
        );

        const { data, error } = await Promise.race([
          updatePromise,
          timeoutPromise,
        ]);

        if (error) {
          console.error("❌ Error actualizando empresa en Supabase:", error);
          alert(`Error: ${error.message}`);
          return null;
        }

        console.log("✅ Empresa actualizada en Supabase:", data);
        setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? data : e)));
        return data;
      } catch (error) {
        console.error("💥 Error crítico actualizando empresa:", error);

        // Si es un timeout o error de conexión, usar fallback local
        if (
          error.message?.includes("Timeout") ||
          error.message?.includes("network")
        ) {
          console.log("🔄 Usando fallback local debido a problemas de red...");
          const updatedEmpresa = { id: empresaId, ...updatedData };
          setEmpresas((prev) =>
            prev.map((e) => (e.id === empresaId ? { ...e, ...updatedData } : e))
          );
          return updatedEmpresa;
        }

        alert(`Error crítico: ${error.message || error}`);
        return null;
      }
    } else {
      console.log("🎭 Actualizando empresa en modo simulado");
      const updatedEmpresa = { id: empresaId, ...updatedData };
      console.log("✅ Empresa actualizada en modo simulado:", updatedEmpresa);
      setEmpresas((prev) =>
        prev.map((e) => (e.id === empresaId ? { ...e, ...updatedData } : e))
      );
      return updatedEmpresa;
    }
  };
  const handleAddCuenta = async (newCuentaData) => {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .insert(newCuentaData)
        .select("*, empresa:empresas(*), banco:bancos(*)")
        .single();
      if (error) alert(`Error: ${error.message}`);
      else setCuentas((prev) => [data, ...prev]);
    } else {
      const newCuenta = {
        id: Date.now().toString(),
        ...newCuentaData,
        empresa: {
          nombre: empresas.find((e) => e.id === newCuentaData.empresa_id)
            ?.nombre,
        },
        banco: {
          abreviatura: bancos.find((b) => b.id === newCuentaData.banco_id)
            ?.abreviatura,
        },
        depositos_hoy: 0,
        validaciones: 0,
        errores: 0,
        estado: "activo",
      };
      setCuentas((prev) => [newCuenta, ...prev]);
    }
  };
  const handleUpdateCuenta = async (cuentaId, updatedData) => {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .update(updatedData)
        .eq("id", cuentaId)
        .select("*, empresa:empresas(*), banco:bancos(*)")
        .single();
      if (error) alert(`Error: ${error.message}`);
      else
        setCuentas((prev) => prev.map((c) => (c.id === cuentaId ? data : c)));
    } else {
      setCuentas((prev) =>
        prev.map((c) => (c.id === cuentaId ? { ...c, ...updatedData } : c))
      );
    }
  };
  const handleDeleteCuenta = async (cuentaId) => {
    if (isSupabaseConnected) {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .delete()
        .eq("id", cuentaId);
      if (error) alert(`Error: ${error.message}`);
      else setCuentas((prev) => prev.filter((c) => c.id !== cuentaId));
    } else {
      setCuentas((prev) => prev.filter((c) => c.id !== cuentaId));
    }
  };
  const handleAddSucursal = async (newSucursalData) => {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from("sucursales")
        .insert(newSucursalData)
        .select()
        .single();
      if (error) alert(`Error: ${error.message}`);
      else setSucursales((prev) => [data, ...prev]);
    } else {
      const newSucursal = {
        id: Date.now().toString(),
        ...newSucursalData,
        personal: [],
        depositos_mes: 0,
        estado: "activa",
      };
      setSucursales((prev) => [newSucursal, ...prev]);
    }
  };
  const handleUpdateSucursal = async (sucursalId, updatedData) => {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from("sucursales")
        .update(updatedData)
        .eq("id", sucursalId)
        .select()
        .single();
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        setSucursales((prev) =>
          prev.map((s) => (s.id === sucursalId ? { ...s, ...data } : s))
        );
      }
    } else {
      setSucursales((prev) =>
        prev.map((s) => (s.id === sucursalId ? { ...s, ...updatedData } : s))
      );
    }
  };
  const handleAddPersonalToSucursal = async (sucursalId, personalData) => {
    if (isSupabaseConnected) {
      // Handle both string (legacy) and object inputs
      const nombre =
        typeof personalData === "string" ? personalData : personalData.nombre;
      let telefono =
        typeof personalData === "object" ? personalData.telefono : null;
      const empresa =
        typeof personalData === "object" ? personalData.empresa : null;

      // Add "51" prefix if phone doesn't start with it
      if (telefono && !telefono.startsWith("51")) {
        telefono = "51" + telefono;
      }

      const insertData = {
        sucursal_id: sucursalId,
        nombre: nombre,
        estado: "activo",
        telefono_origen: telefono,
        empresa: empresa,
      };

      const { data, error } = await supabase
        .from("sucursal_personal")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        alert(`Error: ${error.message}`);
        return null;
      }
      setPersonal((prev) => [...prev, data]);
      return data;
    }
    return null;
  };
  const handleRemovePersonalFromSucursal = async (personalId) => {
    if (isSupabaseConnected) {
      const { error } = await supabase
        .from("sucursal_personal")
        .delete()
        .eq("id", personalId);
      if (error) alert(`Error: ${error.message}`);
      else setPersonal((prev) => prev.filter((p) => p.id !== personalId));
    }
  };
  const handleUpdatePersonal = async (personalId, updates) => {
    if (isSupabaseConnected) {
      const { error } = await supabase
        .from("sucursal_personal")
        .update(updates)
        .eq("id", personalId);
      if (error) alert(`Error: ${error.message}`);
      else
        setPersonal((prev) =>
          prev.map((p) => (p.id === personalId ? { ...p, ...updates } : p))
        );
    }
  };
  const handleUpdateDeposit = async (updatedDeposit) => {
    console.log("🔄 handleUpdateDeposit llamado:", {
      id: updatedDeposit.id,
      es_antiguo: updatedDeposit.es_antiguo,
      estado: updatedDeposit.estado,
    });

    // ACTUALIZACIÓN OPTIMISTA INMEDIATA - Actualizar UI primero
    setDeposits((prev) => {
      const updated = prev.map((d) =>
        d.id === updatedDeposit.id ? updatedDeposit : d
      );
      console.log("✅ Estado local actualizado optimísticamente");
      return updated;
    });

    // Si está conectado a Supabase, sincronizar en segundo plano
    if (isSupabaseConnected) {
      try {
        const {
          id,
          empresa,
          banco,
          sucursal,
          trabajador,
          validado_por_usuario,
          ...updateData
        } = updatedDeposit;

        // Actualizar en Supabase y obtener el registro completo con relaciones
        const { data, error } = await supabase
          .from("depositos")
          .update(updateData)
          .eq("id", id)
          .select(DEPOSIT_FULL_QUERY_STRING)
          .single();

        if (error) {
          console.error("❌ Error al sincronizar con Supabase:", error);
          // Revertir cambio optimista si falla
          fetchData(true); // Recargar datos completos
        } else {
          console.log("✅ Sincronizado con Supabase exitosamente");
          // Actualizar con los datos completos que incluyen las relaciones
          setDeposits((prev) => prev.map((d) => (d.id === id ? data : d)));
        }
      } catch (error) {
        console.error("❌ Error en handleUpdateDeposit:", error);
        // Recargar datos en caso de error
        fetchData(true);
      }
    }
  };
  const handleTakeDepositForValidation = async (deposit) => {
    console.log("🎯 handleTakeDeposit iniciado:", {
      depositId: deposit.id,
      estado: deposit.estado,
      currentUser: currentUser?.nombre,
      isSupabaseConnected,
    });

    if (!currentUser) {
      console.error("❌ No hay usuario autenticado");
      return null;
    }

    // Si no hay conexión, usar modo simulado
    if (!isSupabaseConnected) {
      console.log("📴 Modo simulado: Creando depósito simulado");
      const simulatedDeposit = {
        ...deposit,
        estado: "en_validacion",
        validado_por: currentUser.id,
        fecha_validacion: new Date().toISOString(),
        validado_por_usuario: {
          id: currentUser.id,
          nombre: currentUser.nombre,
        },
      };
      setDeposits((prev) =>
        prev.map((d) => (d.id === deposit.id ? simulatedDeposit : d))
      );
      return simulatedDeposit;
    }

    // ========================================
    // FLUJO CORRECTO: PRIMERO BD, LUEGO UI
    // ========================================
    try {
      console.log("🔄 PASO 1: Actualizando BD...");
      const updateStart = Date.now();

      // 1. ACTUALIZAR EN BASE DE DATOS
      const { error } = await supabase
        .from("depositos")
        .update({
          estado: "en_validacion",
          validado_por: currentUser.id,
          fecha_validacion: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      if (error) {
        console.error("❌ ERROR al actualizar en BD:", error);
        alert(`No se pudo tomar el depósito: ${error.message}`);
        return null;
      }

      console.log(`✅ BD actualizada en ${Date.now() - updateStart}ms`);

      // 2. OBTENER DATOS ACTUALIZADOS DEL SERVIDOR
      console.log("🔄 PASO 2: Obteniendo datos actualizados...");
      const { data: fullDeposit, error: fetchError } = await supabase
        .from("depositos")
        .select(DEPOSIT_FULL_QUERY_STRING)
        .eq("id", deposit.id)
        .single();

      if (fetchError) {
        console.error("❌ Error al obtener depósito actualizado:", fetchError);
        alert("Error al obtener el depósito actualizado. Recarga la página.");
        return null;
      }

      if (!fullDeposit) {
        console.error("❌ No se encontró el depósito en la BD");
        alert("Error: Depósito no encontrado. Recarga la página.");
        return null;
      }

      console.log("✅ Depósito obtenido del servidor:", {
        id: fullDeposit.id,
        estado: fullDeposit.estado,
        validado_por: fullDeposit.validado_por,
        validado_por_usuario: fullDeposit.validado_por_usuario,
      });

      // IMPORTANTE: Si el join no trajo validado_por_usuario, agregarlo manualmente
      if (
        !fullDeposit.validado_por_usuario &&
        fullDeposit.validado_por === currentUser.id
      ) {
        console.log(
          "⚠️ Join no trajo validado_por_usuario, agregando manualmente"
        );
        fullDeposit.validado_por_usuario = {
          id: currentUser.id,
          nombre: currentUser.nombre,
        };
      }

      // 3. ACTUALIZAR UI CON DATOS REALES
      console.log("🔄 PASO 3: Actualizando UI...");
      setDeposits((prev) =>
        prev.map((d) => (d.id === deposit.id ? fullDeposit : d))
      );

      console.log("✅ Proceso completado - Depósito listo para abrir modal");
      return fullDeposit;
    } catch (error) {
      console.error("❌ Error inesperado:", error);
      alert("Error al tomar el depósito. Por favor intenta de nuevo.");
      return null;
    }
  };

  // Agregar este console.log para debugging
  console.log("App render state:", {
    currentUser,
    loading,
    appDataLoading,
    appDataError,
  });

  // Verificar si AuthContext está cargando
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">
            Inicializando aplicación...
          </p>
        </div>
      </div>
    );
  }

  // 🔄 Mostrar loading mientras se inicializa
  if (loading) {
    console.log("⏳ Mostrando loading de App...");
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
            Inicializando aplicación...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {supabase ? "Conectando con Supabase..." : "Modo simulado..."}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    console.log("🔐 Sin usuario, mostrando AuthPage...");
    return <AuthPage />;
  }

  if (currentUser.estado === "inactivo") {
    console.log("🚫 Usuario inactivo, mostrando PendingApproval...");
    return <PendingApproval />;
  }

  if (appDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">
          Cargando datos...
        </p>
      </div>
    );
  }

  if (appDataError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Error Crítico
          </h3>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            {appDataError}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Intenta recargar la página. Si el problema persiste, contacta a
            soporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/kanban" replace />} />
              <Route
                path="/kanban"
                element={
                  <KanbanView
                    deposits={depositsWithFullData}
                    onUpdateDeposit={handleUpdateDeposit}
                    onTakeDeposit={handleTakeDepositForValidation}
                    onFetchDepositsByDate={fetchDepositsByDate}
                    empresas={empresas}
                    bancos={bancos}
                    cuentas={cuentas}
                    onOpenVoucherWindow={handleOpenVoucherWindow}
                  />
                }
              />
              <Route
                path="/table"
                element={
                  <TableView
                    deposits={depositsWithFullData}
                    onUpdateDeposit={handleUpdateDeposit}
                    empresas={empresas}
                    bancos={bancos}
                    cuentas={cuentas}
                    onOpenVoucherWindow={handleOpenVoucherWindow}
                  />
                }
              />
              <Route
                path="/sucursales"
                element={
                  <SucursalesView
                    sucursales={sucursales}
                    deposits={deposits}
                    onAddSucursal={handleAddSucursal}
                    onUpdateSucursal={handleUpdateSucursal}
                    onDeleteSucursal={(id) =>
                      handleUpdateSucursal(id, { estado: "inactiva" })
                    }
                    onAddPersonal={handleAddPersonalToSucursal}
                    onRemovePersonal={handleRemovePersonalFromSucursal}
                    onUpdatePersonal={handleUpdatePersonal}
                  />
                }
              />
              <Route
                path="/bancos"
                element={
                  <BancosView
                    bancos={bancos}
                    empresas={empresas}
                    onAddEmpresa={handleAddEmpresa}
                    cuentas={cuentas}
                    onAddCuenta={handleAddCuenta}
                    onUpdateCuenta={handleUpdateCuenta}
                    onDeleteCuenta={handleDeleteCuenta}
                    onBatchAddCuentas={(newCuentas) =>
                      setCuentas((prev) => [...newCuentas, ...prev])
                    }
                  />
                }
              />
              <Route
                path="/gestion-bancos"
                element={
                  <GestionBancosView
                    bancos={bancos}
                    onAdd={handleAddBanco}
                    onUpdate={handleUpdateBanco}
                    onDelete={handleDeleteBanco}
                  />
                }
              />
              <Route
                path="/gestion-empresas"
                element={
                  <GestionEmpresasView
                    empresas={empresas}
                    onAdd={handleAddEmpresa}
                    onUpdate={handleUpdateEmpresa}
                  />
                }
              />
              <Route
                path="/usuarios"
                element={
                  currentUser?.user_rol === "admin" ? (
                    <UsuariosView />
                  ) : (
                    <Navigate to="/kanban" replace />
                  )
                }
              />
              <Route
                path="/configuracion-whatsapp"
                element={
                  currentUser?.user_rol === "admin" ? (
                    <ConfiguracionWhatsApp />
                  ) : (
                    <Navigate to="/kanban" replace />
                  )
                }
              />
              <Route
                path="/configuracion-chatwoot"
                element={
                  currentUser?.user_rol === "admin" ? (
                    <ConfiguracionChatWoot />
                  ) : (
                    <Navigate to="/kanban" replace />
                  )
                }
              />
              <Route
                path="/enviar-mensaje-chatwoot"
                element={
                  currentUser?.user_rol === "admin" ? (
                    <EnviarMensajeChatWoot />
                  ) : (
                    <Navigate to="/kanban" replace />
                  )
                }
              />
              <Route path="/reportes" element={<ReportesView />} />
              <Route
                path="/documentos"
                element={<DocumentosView deposits={depositsWithFullData} />}
              />
              <Route
                path="/cambiar-contrasena"
                element={<CambiarContrasena />}
              />
              <Route
                path="/regularizar-depositos"
                element={
                  <RegularizarDepositos onDepositUpdated={refreshDeposits} />
                }
              />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              {/* Agrega más rutas según sea necesario */}
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
