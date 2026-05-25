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
  const [realtimeActivity, setRealtimeActivity] = useState(null);
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
    try {
      console.log("🔄 Refrescando depósitos...");
      const lastQuery = lastQueryRef.current;

      if (lastQuery.type === "date" && lastQuery.value) {
        console.log("📅 Refrescando depósitos para fecha específica:", lastQuery.value);
        return await fetchDepositsByDate(lastQuery.value);
      }

      if (lastQuery.type === "period" && lastQuery.value) {
        console.log("📅 Refrescando depósitos para período:", lastQuery.value);
        return await fetchDepositsByPeriod(lastQuery.value);
      }

      console.log("📅 Refrescando todos los depósitos...");
      return await fetchAllDeposits();
    } catch (error) {
      console.warn("⚠️ Error al refrescar depósitos:", error.message);
    }
  }, [fetchAllDeposits, fetchDepositsByDate, fetchDepositsByPeriod]);

  useEffect(() => {
    refreshDepositsRef.current = refreshDeposits;
  }, [refreshDeposits]);

  const handleRealtimeInsert = useCallback(() => {
    setRealtimeActivity({
      type: "update",
      count: 1,
      depositId: null,
      at: Date.now(),
    });
    console.log("🔄 REALTIME: Llamando refreshDeposits para INSERT...");
    refreshDeposits();
  }, [refreshDeposits]);

  const handleRealtimeUpdate = useCallback((fullDeposit) => {
    if (!fullDeposit) return;
    
    setRealtimeActivity({
      type: "update",
      count: 1,
      depositId: fullDeposit.id,
      at: Date.now(),
    });
    
    console.log("🔄 REALTIME: Actualizando estado deposits para UPDATE...", {
      id: fullDeposit.id,
      estado: fullDeposit.estado,
    });

    setDeposits((prev) => {
      const exists = prev.some((d) => d.id === fullDeposit.id);
      if (exists) {
        const updated = prev.map((dep) => 
          dep.id === fullDeposit.id ? mergeDepositRecord(dep, fullDeposit) : dep
        );
        console.log("✅ REALTIME: Registro existente actualizado");
        return updated;
      }
      
      console.log("⚠️ REALTIME: Registro modificado no existía en el estado actual. Refrescando todo...");
      setTimeout(() => refreshDeposits(), 0);
      return prev;
    });
  }, [mergeDepositRecord, refreshDeposits]);

  const handleRealtimeDelete = useCallback((deletedId) => {
    if (!deletedId) return;

    setRealtimeActivity({
      type: "delete",
      count: 1,
      depositId: deletedId,
      at: Date.now(),
    });

    console.log("🗑️ REALTIME: Eliminando depósito del estado:", deletedId);
    setDeposits((prev) => prev.filter((deposit) => deposit.id !== deletedId));
    console.log("✅ REALTIME: Estado actualizado");
  }, []);

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
    handleRealtimeInsert,
    handleRealtimeUpdate,
    handleRealtimeDelete,
    DEPOSIT_FULL_QUERY,
    refreshDeposits
  );

  // Polling de respaldo adaptativo:
  // Si Realtime está activo y suscrito, el polling se espacia a 5 minutos para ahorrar recursos.
  // Si está desconectado o en error, se activa un fallback de 60 segundos.
  useEffect(() => {
    if (!currentUser || !isSupabaseConnected) {
      return;
    }

    const intervalDelay = realtimeStatus === "SUBSCRIBED" ? 5 * 60 * 1000 : 60000;

    console.log(
      `⏱️ DASHBOARD: Iniciando polling de respaldo con intervalo de ${
        intervalDelay / 1000
      }s (Realtime: ${realtimeStatus || "DESCONECTADO"})`
    );

    const refreshTimer = setInterval(() => {
      console.log("⏱️ DASHBOARD: Ejecutando refresco periódico de respaldo...");
      refreshDeposits();
    }, intervalDelay);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [currentUser, isSupabaseConnected, refreshDeposits, realtimeStatus]);

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
      try {
        await fetchData(false);
      } catch (error) {
        console.error("❌ Error al cargar datos iniciales:", error);
      } finally {
        setAppDataLoading(false);
      }
    })();
  }, [currentUser, isSupabaseConnected, fetchData]);

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
    realtimeActivity,
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
