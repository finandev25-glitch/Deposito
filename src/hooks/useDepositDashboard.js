import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { useRealtimeDeposits } from "./useRealtimeDeposits.js";
import { toLocalISOString } from "../utils/dateFormatters";
import { DEPOSIT_FULL_QUERY } from "../constants/depositQuery";

const API_BASE = "/api";

async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(options.headers || {}),
    },
    cache: "no-store",
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText;
    throw new Error(message);
  }

  return payload;
}

export function useDepositDashboard() {
  const { currentUser, users } = useContext(AuthContext);

  const [bancos, setBancos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [currentSelectedDate, setCurrentSelectedDate] = useState(null);
  const [appDataLoading, setAppDataLoading] = useState(true);
  const [appDataError, setAppDataError] = useState(null);
  const [voucherPanelState] = useState({
    isOpen: false,
    voucherUrl: "",
    depositData: null,
  });

  const currentUserRef = useRef(currentUser);
  const currentSelectedDateRef = useRef(currentSelectedDate);
  const lastQueryRef = useRef({ type: null, value: null });
  const refreshDepositsRef = useRef(null);
  const isSupabaseConnected = !!currentUser;

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentSelectedDateRef.current = currentSelectedDate;
  }, [currentSelectedDate]);

  const matchesCurrentQuery = useCallback((deposit) => {
    const lastQuery = lastQueryRef.current;

    if (!deposit || !lastQuery.type) return false;
    if (lastQuery.type === "all") return true;

    if (lastQuery.type === "date") {
      return deposit.fecha_solo_date === lastQuery.value;
    }

    if (lastQuery.type === "period") {
      const period = lastQuery.value;

      if (period === "today") {
        return deposit.fecha_solo_date === toLocalISOString(new Date());
      }

      if (period === "week") {
        const now = new Date();
        const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysFromMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return (
          deposit.fecha_solo_date >= toLocalISOString(startOfWeek) &&
          deposit.fecha_solo_date <= toLocalISOString(endOfWeek)
        );
      }

      if (period === "month") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return (
          deposit.fecha_solo_date >= toLocalISOString(start) &&
          deposit.fecha_solo_date <= toLocalISOString(end)
        );
      }

      if (period.startsWith("month:")) {
        const [year, month] = period.split(":")[1].split("-").map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);

        return (
          deposit.fecha_solo_date >= toLocalISOString(start) &&
          deposit.fecha_solo_date <= toLocalISOString(end)
        );
      }
    }

    return false;
  }, []);

  const mergeDepositRecord = useCallback((existing = {}, incoming = {}) => {
    const merged = { ...existing, ...incoming };

    ["empresa", "banco", "sucursal", "trabajador", "validado_por_usuario"].forEach((field) => {
      const incomingValue = incoming[field];
      const existingValue = existing[field];

      if (incomingValue && typeof incomingValue === "object" && !Array.isArray(incomingValue)) {
        merged[field] = {
          ...(existingValue && typeof existingValue === "object" ? existingValue : {}),
          ...incomingValue,
        };
      } else if (existingValue && typeof existingValue === "object" && incomingValue == null) {
        merged[field] = existingValue;
      }
    });

    return merged;
  }, []);

  const mergeDepositsIntoView = useCallback(
    (prevDeposits, incomingDeposits) => {
      const incomingMap = new Map(incomingDeposits.map((deposit) => [deposit.id, deposit]));

      const next = prevDeposits
        .map((deposit) => {
          const incoming = incomingMap.get(deposit.id);
          return incoming ? mergeDepositRecord(deposit, incoming) : deposit;
        })
        .filter((deposit) => {
          if (!incomingMap.has(deposit.id)) return true;
          return matchesCurrentQuery(deposit);
        });

      const existingIds = new Set(next.map((deposit) => deposit.id));
      const newItems = incomingDeposits
        .map((deposit) => mergeDepositRecord({}, deposit))
        .filter((deposit) => matchesCurrentQuery(deposit) && !existingIds.has(deposit.id))
        .sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));

      return [...newItems, ...next];
    },
    [matchesCurrentQuery, mergeDepositRecord]
  );

  const handleRealtimeUpdate = useCallback(
    (updatedDepositsOrNull, deletedId) => {
      if (Array.isArray(updatedDepositsOrNull) && updatedDepositsOrNull.length > 0) {
        console.log("🔄 REALTIME: Actualizando estado deposits...", {
          count: updatedDepositsOrNull.length,
          firstId: updatedDepositsOrNull[0]?.id,
        });
        setDeposits((prev) => mergeDepositsIntoView(prev, updatedDepositsOrNull));
        console.log("✅ REALTIME: Estado actualizado");
        return;
      }

      if (deletedId) {
        console.log("🗑️ REALTIME: Eliminando depósito del estado:", deletedId);
        setDeposits((prev) => prev.filter((deposit) => deposit.id !== deletedId));
        console.log("✅ REALTIME: Estado actualizado");
      }
    },
    [mergeDepositsIntoView]
  );

  const applyKanbanRealtimeUpdates = useCallback(async () => {}, []);
  const applyKanbanPayload = useCallback(() => {}, []);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setAppDataLoading(true);
    }

    setAppDataError(null);

    try {
      const data = await apiJson("/dashboard/bootstrap");
      setBancos(data.bancos || []);
      setEmpresas(data.empresas || []);
      setCuentas(data.cuentas || []);
      setSucursales(data.sucursales || []);
      setPersonal(data.personal || []);
      return data;
    } catch (error) {
      setAppDataError(error.message);
      return null;
    } finally {
      if (showLoading) {
        setAppDataLoading(false);
      }
    }
  }, []);

  const fetchBancosData = useCallback(async () => {
    const data = await apiJson("/bancos");
    setBancos(data.data || []);
    return data.data || [];
  }, []);

  const fetchEmpresasData = useCallback(async () => {
    const data = await apiJson("/empresas");
    setEmpresas(data.data || []);
    return data.data || [];
  }, []);

  const fetchCuentasData = useCallback(async () => {
    const data = await apiJson("/cuentas-bancarias");
    setCuentas(data.data || []);
    return data.data || [];
  }, []);

  const fetchSucursalesData = useCallback(async () => {
    const data = await apiJson("/sucursales");
    setSucursales(data.data || []);
    return data.data || [];
  }, []);

  const fetchPersonalData = useCallback(async (includeInactive = true) => {
    const query = includeInactive ? "/personal?includeInactive=1&limit=2000" : "/personal?limit=2000";
    const data = await apiJson(query);
    setPersonal(data.data || []);
    return data.data || [];
  }, []);

  const fetchDepositsByDate = useCallback(async (date) => {
    if (!date) {
      return fetchAllDeposits();
    }

    const data = await apiJson(`/depositos?date=${encodeURIComponent(date)}&limit=500`);
    setDeposits(data.data || []);
    setCurrentSelectedDate(date);
    lastQueryRef.current = { type: "date", value: date };
    return data.data || [];
  }, []);

  const fetchDepositsByPeriod = useCallback(async (period) => {
    const query = period ? `?period=${encodeURIComponent(period)}&limit=500` : "?limit=500";
    const data = await apiJson(`/depositos${query}`);
    setDeposits(data.data || []);
    setCurrentSelectedDate(null);
    lastQueryRef.current = { type: "period", value: period };
    return data.data || [];
  }, []);

  const fetchAllDeposits = useCallback(async () => {
    const data = await apiJson("/depositos?limit=500");
    setDeposits(data.data || []);
    setCurrentSelectedDate(null);
    lastQueryRef.current = { type: "all", value: null };
    return data.data || [];
  }, []);

  const refreshDeposits = useCallback(async () => {
    const lastQuery = lastQueryRef.current;

    if (lastQuery.type === "date" && lastQuery.value) {
      return fetchDepositsByDate(lastQuery.value);
    }

    if (lastQuery.type === "period" && lastQuery.value) {
      return fetchDepositsByPeriod(lastQuery.value);
    }

    return fetchAllDeposits();
  }, [fetchAllDeposits, fetchDepositsByDate, fetchDepositsByPeriod]);

  useEffect(() => {
    refreshDepositsRef.current = refreshDeposits;
  }, [refreshDeposits]);

  const handleSelectedDateChange = useCallback((fecha) => {
    setCurrentSelectedDate(fecha);
  }, []);

  const handleSelectDate = useCallback(
    async (fecha) => {
      if (!currentUserRef.current) return;

      if (!fecha) {
        await fetchAllDeposits();
        return;
      }

      await fetchDepositsByDate(fecha);
    },
    [fetchAllDeposits, fetchDepositsByDate]
  );

  const handleOpenVoucherWindow = useCallback((url, metadata = {}) => {
    if (!url) {
      alert("No hay un voucher para mostrar.");
      return;
    }

    window.postMessage(
      {
        type: "LOAD_VOUCHER",
        url,
        depositData: metadata,
      },
      "*"
    );
  }, []);

  const handleCloseVoucherPanel = useCallback(() => {}, []);

  const handleAddBanco = useCallback(async (newBancoData) => {
    try {
      const data = await apiJson("/bancos", {
        method: "POST",
        body: JSON.stringify(newBancoData),
      });
      setBancos((prev) => [data.data, ...prev]);
      return data.data;
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  }, []);

  const handleUpdateBanco = useCallback(async (updatedBanco) => {
    try {
      const { id, ...updateData } = updatedBanco;
      const data = await apiJson(`/bancos/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      setBancos((prev) => prev.map((b) => (b.id === id ? data.data : b)));
      return data.data;
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  }, []);

  const handleDeleteBanco = useCallback(async (bancoId) => {
    try {
      await apiJson(`/bancos/${bancoId}`, { method: "DELETE" });
      setBancos((prev) => prev.filter((b) => b.id !== bancoId));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleAddEmpresa = useCallback(async (newEmpresaData) => {
    try {
      const data = await apiJson("/empresas", {
        method: "POST",
        body: JSON.stringify(newEmpresaData),
      });
      setEmpresas((prev) => [...prev, data.data]);
      return data.data;
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  }, []);

  const handleUpdateEmpresa = useCallback(async (empresaId, updatedData) => {
    try {
      const data = await apiJson(`/empresas/${empresaId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });
      setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? data.data : e)));
      return data.data;
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  }, []);

  const handleAddCuenta = useCallback(
    async (newCuentaData) => {
      try {
        const data = await apiJson("/cuentas-bancarias", {
          method: "POST",
          body: JSON.stringify(newCuentaData),
        });
        setCuentas((prev) => [data.data, ...prev]);
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    },
    []
  );

  const handleBatchAddCuentas = useCallback((newCuentas) => {
    setCuentas((prev) => [...newCuentas, ...prev]);
  }, []);

  const handleUpdateCuenta = useCallback(async (cuentaId, updatedData) => {
    try {
      const data = await apiJson(`/cuentas-bancarias/${cuentaId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });
      setCuentas((prev) => prev.map((c) => (c.id === cuentaId ? data.data : c)));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleDeleteCuenta = useCallback(async (cuentaId) => {
    try {
      await apiJson(`/cuentas-bancarias/${cuentaId}`, { method: "DELETE" });
      setCuentas((prev) => prev.filter((c) => c.id !== cuentaId));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleAddSucursal = useCallback(async (newSucursalData) => {
    try {
      const data = await apiJson("/sucursales", {
        method: "POST",
        body: JSON.stringify(newSucursalData),
      });
      setSucursales((prev) => [data.data, ...prev]);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleUpdateSucursal = useCallback(async (sucursalId, updatedData) => {
    try {
      const data = await apiJson(`/sucursales/${sucursalId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });
      setSucursales((prev) => prev.map((s) => (s.id === sucursalId ? { ...s, ...data.data } : s)));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleAddPersonalToSucursal = useCallback(async (sucursalId, personalData) => {
    try {
      const nombre = typeof personalData === "string" ? personalData : personalData.nombre;
      let telefono = typeof personalData === "object" ? personalData.telefono : null;
      const empresa = typeof personalData === "object" ? personalData.empresa : null;

      if (telefono && !telefono.startsWith("51")) {
        telefono = `51${telefono}`;
      }

      const payload = {
        sucursal_id: sucursalId,
        nombre,
        estado: "activo",
        telefono_origen: telefono,
        empresa,
      };

      const data = await apiJson("/personal", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPersonal((prev) => [...prev, data.data]);
      return data.data;
    } catch (error) {
      alert(`Error: ${error.message}`);
      return null;
    }
  }, []);

  const handleRemovePersonalFromSucursal = useCallback(async (personalId) => {
    try {
      await apiJson(`/personal/${personalId}`, { method: "DELETE" });
      setPersonal((prev) => prev.filter((p) => p.id !== personalId));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleUpdatePersonal = useCallback(async (personalId, updates) => {
    try {
      const data = await apiJson(`/personal/${personalId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      setPersonal((prev) => prev.map((p) => (p.id === personalId ? { ...p, ...data.data } : p)));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }, []);

  const handleUpdateDeposit = useCallback(async (updatedDeposit) => {
    setDeposits((prev) => prev.map((d) => (d.id === updatedDeposit.id ? updatedDeposit : d)));

    try {
      const { id, empresa, banco, sucursal, trabajador, validado_por_usuario, ...updateData } =
        updatedDeposit;

      const data = await apiJson(`/depositos/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      setDeposits((prev) => prev.map((d) => (d.id === id ? data.data : d)));
      return data.data;
    } catch (error) {
      console.error("Error en handleUpdateDeposit:", error);
      return null;
    }
  }, []);

  const handleTakeDepositForValidation = useCallback(async (deposit) => {
    if (!currentUserRef.current) return null;

    const updatedDeposit = {
      ...deposit,
      estado: "en_validacion",
      validado_por: currentUserRef.current.id,
      fecha_validacion: new Date().toISOString(),
    };

    try {
      const data = await apiJson(`/depositos/${deposit.id}`, {
        method: "PUT",
        body: JSON.stringify(updatedDeposit),
      });

      setDeposits((prev) => prev.map((d) => (d.id === deposit.id ? data.data : d)));
      return data.data;
    } catch (error) {
      alert(`No se pudo tomar el deposito: ${error.message}`);
      return null;
    }
  }, []);

  const { realtimeStatus, realtimeErrors } = useRealtimeDeposits(
    isSupabaseConnected,
    currentUser,
    handleRealtimeUpdate,
    DEPOSIT_FULL_QUERY
  );

  useEffect(() => {
    if (false) {
      return () => {};

    if (!currentUser || !isSupabaseConnected || location.pathname !== "/kanban" || !supabase) {
      if (realtimeChannelRef.current) {
        supabase?.removeChannel?.(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      if (kanbanRealtimeTimerRef.current) {
        clearTimeout(kanbanRealtimeTimerRef.current);
        kanbanRealtimeTimerRef.current = null;
      }
      kanbanRealtimeQueueRef.current = [];
      return;
    }

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channelName = `kanban-depositos-${currentUser.id || "anon"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "depositos" },
        (payload) => {
          const eventType = payload?.eventType;
          const recordId = payload?.new?.id || payload?.old?.id;

          if (!recordId) return;

          applyKanbanPayload(payload);

          kanbanRealtimeQueueRef.current.push({
            id: recordId,
            eventType,
          });

          if (kanbanRealtimeTimerRef.current) {
            clearTimeout(kanbanRealtimeTimerRef.current);
          }

          kanbanRealtimeTimerRef.current = setTimeout(() => {
            kanbanRealtimeTimerRef.current = null;
            applyKanbanRealtimeUpdates();
          }, 80);

          if (kanbanHydrateTimerRef.current) {
            clearTimeout(kanbanHydrateTimerRef.current);
          }

          kanbanHydrateTimerRef.current = setTimeout(() => {
            kanbanHydrateTimerRef.current = null;
            if (refreshDepositsRef.current) {
              refreshDepositsRef.current().catch((error) => {
                console.error("Error rehidratando Kanban realtime:", error);
              });
            }
          }, 1500);
        }
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ KANBAN realtime: Supabase conectado a depositos");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("Error en el canal Supabase realtime:", status, error || "");
        } else {
          console.log("🟡 KANBAN realtime status:", status);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
      if (kanbanRealtimeTimerRef.current) {
        clearTimeout(kanbanRealtimeTimerRef.current);
        kanbanRealtimeTimerRef.current = null;
      }
      if (kanbanHydrateTimerRef.current) {
        clearTimeout(kanbanHydrateTimerRef.current);
        kanbanHydrateTimerRef.current = null;
      }
      kanbanRealtimeQueueRef.current = [];
      supabase.removeChannel(channel);
    };
    }
  }, [applyKanbanPayload, applyKanbanRealtimeUpdates, currentUser, isSupabaseConnected, location.pathname]);

  useEffect(() => {
    if (!currentUser || !isSupabaseConnected) {
      return;
    }

    const handleVisibilityRefresh = () => {
      if (document.visibilityState !== "visible") return;
      refreshDeposits();
    };

    const refreshTimer = setInterval(() => {
      refreshDeposits();
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      clearInterval(refreshTimer);
    };
  }, [currentUser, isSupabaseConnected, refreshDeposits]);

  const depositsWithFullData = useMemo(() => {
    if (!deposits) return [];
    if (isSupabaseConnected) return deposits;

    return deposits.map((dep) => {
      const trabajador = personal.find((p) => p.id === dep.trabajador_sucursal_id);
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

  useEffect(() => {
    if (!currentUser || !isSupabaseConnected) {
      setAppDataLoading(false);
      return;
    }

    (async () => {
      await fetchData(false);

      const today = new Date().toISOString().split("T")[0];
      if (currentSelectedDateRef.current) {
        await refreshDeposits();
      } else {
        await fetchDepositsByDate(today);
      }
    })();
  }, [
    currentUser,
    isSupabaseConnected,
    fetchData,
    fetchDepositsByDate,
    refreshDeposits,
  ]);

  useEffect(() => {
    if (!currentUser) return;

    // Keep the local selection in sync when user navigates or refreshes.
    if (!currentSelectedDateRef.current && deposits.length > 0 && lastQueryRef.current.type === null) {
      lastQueryRef.current = { type: "all", value: null };
    }
  }, [currentUser, deposits.length]);

  return {
    bancos,
    empresas,
    cuentas,
    sucursales,
    deposits,
    personal,
    appDataLoading,
    appDataError,
    realtimeStatus,
    realtimeErrors,
    voucherPanelState,
    currentSelectedDate,
    depositsWithFullData,
    isSupabaseConnected,
    fetchData,
    fetchBancosData,
    fetchEmpresasData,
    fetchCuentasData,
    fetchSucursalesData,
    fetchPersonalData,
    refreshDeposits,
    fetchDepositsByDate,
    fetchAllDeposits,
    fetchDepositsByPeriod,
    handleSelectedDateChange,
    handleSelectDate,
    handleOpenVoucherWindow,
    handleCloseVoucherPanel,
    handleAddBanco,
    handleUpdateBanco,
    handleDeleteBanco,
    handleAddEmpresa,
    handleUpdateEmpresa,
    handleAddCuenta,
    handleBatchAddCuentas,
    handleUpdateCuenta,
    handleDeleteCuenta,
    handleAddSucursal,
    handleUpdateSucursal,
    handleAddPersonalToSucursal,
    handleRemovePersonalFromSucursal,
    handleUpdatePersonal,
    handleUpdateDeposit,
    handleTakeDepositForValidation,
  };
}

export default useDepositDashboard;
