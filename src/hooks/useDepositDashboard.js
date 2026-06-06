import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { useRealtimeDeposits } from "./useRealtimeDeposits.js";
import { toLocalISOString } from "../utils/dateFormatters";
import { DEPOSIT_FULL_QUERY } from "../constants/depositQuery";
import { buildApiUrl } from "../services/apiBase.js";

const API_BASE = "/api";
const WORKLOAD_ALERT_THRESHOLD = 3;
const WORKLOAD_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

async function apiJson(path, options = {}) {
  const response = await fetch(buildApiUrl(`${API_BASE}${path}`), {
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
  const [workloadAlarmActive, setWorkloadAlarmActive] = useState(false);
  const [replacementRequestState, setReplacementRequestState] = useState({
    isSending: false,
    lastRequestedAt: null,
    lastResult: null,
  });
  const [voucherPanelState, setVoucherPanelState] = useState({
    isOpen: false,
    voucherUrl: "",
    depositData: null,
  });

  const currentUserRef = useRef(currentUser);
  const currentSelectedDateRef = useRef(currentSelectedDate);
  const depositsRef = useRef([]);
  const notificationPermissionPromiseRef = useRef(null);
  const workloadAlarmRef = useRef({
    lastTriggeredAt: 0,
    lastCount: 0,
    lastAutoRequestedAt: 0,
    lastAutoRequestedCount: 0,
  });
  const lastQueryRef = useRef({ type: null, value: null });
  const refreshDepositsRef = useRef(null);
  const isSupabaseConnected = !!currentUser;

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentSelectedDateRef.current = currentSelectedDate;
  }, [currentSelectedDate]);

  useEffect(() => {
    depositsRef.current = deposits;
  }, [deposits]);

  const pendingWorkloadCount = useMemo(
    () => deposits.filter((deposit) => deposit?.estado === "pendiente").length,
    [deposits]
  );

  const formatPendingDepositAmount = useCallback((value, currency = "PEN") => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return String(value ?? "-");
    }

    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currency || "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  }, []);

  const getPendingDepositDisplayData = useCallback(
    (deposit = {}) => {
      const monto = deposit.monto ?? deposit.importe ?? deposit.amount ?? null;
      const moneda = deposit.moneda || "PEN";
      const amount = formatPendingDepositAmount(monto, moneda);
      const storeId = deposit.sucursal_id ?? deposit.sucursal?.id ?? deposit.tienda_id ?? null;
      const workerId =
        deposit.trabajador_sucursal_id ?? deposit.trabajador?.id ?? deposit.personal_id ?? null;
      const bankId = deposit.banco_id ?? deposit.banco?.id ?? null;
      const companyId = deposit.empresa_id ?? deposit.empresa?.id ?? null;

      const storeRecord =
        storeId != null ? sucursales.find((item) => String(item.id) === String(storeId)) : null;
      const workerRecord =
        workerId != null ? personal.find((item) => String(item.id) === String(workerId)) : null;
      const bankRecord =
        bankId != null ? bancos.find((item) => String(item.id) === String(bankId)) : null;
      const companyRecord =
        companyId != null ? empresas.find((item) => String(item.id) === String(companyId)) : null;

      const store =
        deposit.sucursal?.nombre ||
        deposit.sucursal_nombre ||
        storeRecord?.nombre ||
        deposit.sucursal ||
        deposit.tienda ||
        deposit.tienda_nombre ||
        "Sin tienda";
      const personalName =
        deposit.trabajador?.nombre ||
        deposit.trabajador_nombre ||
        workerRecord?.nombre ||
        deposit.personal_nombre ||
        deposit.personal ||
        "Sin personal";
      const bank =
        deposit.banco?.abreviatura ||
        deposit.banco?.nombre ||
        bankRecord?.abreviatura ||
        bankRecord?.nombre ||
        deposit.banco_nombre ||
        deposit.banco ||
        "Banco";
      const company =
        deposit.empresa?.abreviatura ||
        deposit.empresa?.nombre ||
        companyRecord?.abreviatura ||
        companyRecord?.nombre ||
        "Empresa";
      const operation =
        deposit.numero_operacion_banco ||
        deposit.numero_operacion ||
        deposit.numero_voucher ||
        "-";

      return { amount, store, personal: personalName, bank, company, operation, monto, moneda };
    },
    [bancos, empresas, formatPendingDepositAmount, personal, sucursales],
  );

  const getNotificationIconUrl = useCallback(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="url(#g)"/>
        <path d="M24 50.5 64 33l40 17.5v10H24v-10Z" fill="#f8fafc"/>
        <rect x="28" y="60" width="72" height="8" rx="4" fill="#e2e8f0"/>
        <rect x="31" y="70" width="10" height="30" rx="3" fill="#f8fafc"/>
        <rect x="49" y="70" width="10" height="30" rx="3" fill="#f8fafc"/>
        <rect x="69" y="70" width="10" height="30" rx="3" fill="#f8fafc"/>
        <rect x="87" y="70" width="10" height="30" rx="3" fill="#f8fafc"/>
        <rect x="24" y="100" width="80" height="8" rx="4" fill="#e2e8f0"/>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined") return "unsupported";
    if (!("Notification" in window)) return "unsupported";
    if (!window.isSecureContext) return "unsupported";

    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Notification.permission;
    }

    if (!notificationPermissionPromiseRef.current) {
      notificationPermissionPromiseRef.current = Notification.requestPermission().finally(() => {
        notificationPermissionPromiseRef.current = null;
      });
    }

    return notificationPermissionPromiseRef.current;
  }, []);

  const playAlarmTone = useCallback(async () => {
    if (typeof window === "undefined") return false;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      const audioContext = new AudioContextClass();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.25);

      gainNode.gain.setValueAtTime(0.14, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };

      return true;
    } catch (error) {
      console.warn("No se pudo reproducir el tono de alarma:", error.message);
      return false;
    }
  }, []);

  const vibrateAlarm = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return false;
    }

    navigator.vibrate([220, 80, 220, 80, 320]);
    return true;
  }, []);

  const showNativeAlert = useCallback(
    async ({ title, body, tag, requireInteraction = true, requestPermission = false }) => {
      const permission = requestPermission
        ? await ensureNotificationPermission()
        : typeof Notification !== "undefined"
        ? Notification.permission
        : "default";
      if (permission !== "granted") {
        return false;
      }

      try {
        const notification = new Notification(title, {
          body,
          tag,
          renotify: true,
          requireInteraction,
          silent: false,
          icon: getNotificationIconUrl(),
          badge: getNotificationIconUrl(),
          dir: "ltr",
          lang: "es-PE",
        });

        notification.onclick = () => {
          window.focus?.();
          notification.close();
        };

        if (requireInteraction) {
          setTimeout(() => {
            notification.close();
          }, 18000);
        }

        return true;
      } catch (error) {
        console.warn("No se pudo mostrar la alerta nativa:", error.message);
        return false;
      }
    },
    [ensureNotificationPermission, getNotificationIconUrl]
  );

  const createSupportRequestOnBackend = useCallback(
    async ({ reason = "", source = "web" } = {}) => {
      const user = currentUserRef.current;
      const userName = user?.nombre || "Usuario";
      const userRole = user?.user_rol || "N/A";
      const pendingCount = pendingWorkloadCount;
      const finalReason = reason.trim() || "Necesita apoyo temporal por ausencia.";

      console.log("[support-requests] creating", {
        source,
        pendingCount,
        requestedBy: userName,
        requestedByRole: userRole,
        reason: finalReason,
      });

      const response = await apiJson("/support-requests", {
        method: "POST",
        body: JSON.stringify({
          requested_by_id: user?.id || null,
          requested_by_name: userName,
          requested_by_role: userRole,
          reason: finalReason,
          pending_count: pendingCount,
          status: "pendiente",
          source,
        }),
      });

      return {
        sent: true,
        data: response?.data || null,
        message: finalReason,
      };
    },
    [pendingWorkloadCount]
  );

  const triggerWorkloadAlarm = useCallback(
    async (reason = "") => {
      const pendingCount = pendingWorkloadCount;

      if (pendingCount < WORKLOAD_ALERT_THRESHOLD) {
        setWorkloadAlarmActive(false);
        return false;
      }

      const now = Date.now();
      const isWithinCooldown = now - workloadAlarmRef.current.lastTriggeredAt < WORKLOAD_ALERT_COOLDOWN_MS;
      const sameCount = workloadAlarmRef.current.lastCount === pendingCount;

      setWorkloadAlarmActive(true);

      if (isWithinCooldown && sameCount) {
        return false;
      }

      workloadAlarmRef.current = {
        lastTriggeredAt: now,
        lastCount: pendingCount,
        lastAutoRequestedAt: workloadAlarmRef.current.lastAutoRequestedAt,
        lastAutoRequestedCount: workloadAlarmRef.current.lastAutoRequestedCount,
      };

      await Promise.allSettled([playAlarmTone()]);
      vibrateAlarm();

      const shouldRequestSupport =
        workloadAlarmRef.current.lastAutoRequestedCount !== pendingCount ||
        now - workloadAlarmRef.current.lastAutoRequestedAt >= WORKLOAD_ALERT_COOLDOWN_MS;

      if (shouldRequestSupport) {
        try {
          await createSupportRequestOnBackend({
            reason:
              reason.trim() ||
              `Alerta automatica: hay ${pendingCount} depositos pendientes y se necesita apoyo.`,
            source: "workload-auto",
          });
          workloadAlarmRef.current.lastAutoRequestedAt = now;
          workloadAlarmRef.current.lastAutoRequestedCount = pendingCount;
        } catch (error) {
          console.warn("No se pudo crear la solicitud automatica de apoyo:", error);
        }
      }

      return true;
    },
    [createSupportRequestOnBackend, pendingWorkloadCount, playAlarmTone, vibrateAlarm]
  );

  const requestReplacementHelp = useCallback(
    async ({ reason = "" } = {}) => {
      console.log("[support-requests] manual help clicked", { reason });
      setReplacementRequestState((prev) => ({
        ...prev,
        isSending: true,
      }));

      try {
        await Promise.allSettled([playAlarmTone()]);
        vibrateAlarm();

        const supportRequest = await createSupportRequestOnBackend({
          reason,
          source: "manual",
        });

        setReplacementRequestState({
          isSending: false,
          lastRequestedAt: Date.now(),
          lastResult: supportRequest.data,
        });

        return supportRequest;
      } catch (error) {
        setReplacementRequestState((prev) => ({
          ...prev,
          isSending: false,
          lastResult: {
            sent: false,
            error: error.message,
          },
        }));
        throw error;
      }
    },
    [createSupportRequestOnBackend, playAlarmTone, vibrateAlarm]
  );

  const showPendingDepositNotification = useCallback(
    async (deposit) => {
      if (!deposit || deposit.estado !== "pendiente") {
        return false;
      }

      const permission = await ensureNotificationPermission();
      if (permission !== "granted") {
        return false;
      }

      const { amount, store, personal, bank, company, operation } =
        getPendingDepositDisplayData(deposit);
      const client = deposit.cliente || "Sin cliente";
      const dateText = deposit.fecha_deposito
        ? new Date(deposit.fecha_deposito).toLocaleDateString("es-PE")
        : "";
      const timeText = new Date().toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const title = `${store} - ${personal}`;
      const bodyParts = [
        `${company} - ${bank}`,
        `Tienda: ${store}`,
        `Personal: ${personal}`,
        `OP: ${operation}`,
        `Importe: ${amount}`,
        `Cliente: ${client}`,
        dateText ? `Fecha: ${dateText}` : null,
        `Detectado: ${timeText}`,
      ].filter(Boolean);

      try {
        const notification = new Notification(title, {
          body: bodyParts.join("\n"),
          tag: `deposit-pending-${deposit.id || operation}`,
          renotify: true,
          requireInteraction: true,
          silent: false,
          icon: getNotificationIconUrl(),
          badge: getNotificationIconUrl(),
          dir: "ltr",
          lang: "es-PE",
        });

        notification.onclick = () => {
          window.focus?.();
          notification.close();
        };

        setTimeout(() => {
          notification.close();
        }, 15000);

        return true;
      } catch (error) {
        console.warn("No se pudo mostrar la notificaciÃ³n nativa:", error.message);
        return false;
      }
    },
    [ensureNotificationPermission, getNotificationIconUrl, getPendingDepositDisplayData],
  );

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
      console.log("ðŸ”„ Refrescando depÃ³sitos...");
      const lastQuery = lastQueryRef.current;

      if (lastQuery.type === "date" && lastQuery.value) {
        console.log("ðŸ“… Refrescando depÃ³sitos para fecha especÃ­fica:", lastQuery.value);
        return await fetchDepositsByDate(lastQuery.value);
      }

      if (lastQuery.type === "period" && lastQuery.value) {
        console.log("ðŸ“… Refrescando depÃ³sitos para perÃ­odo:", lastQuery.value);
        return await fetchDepositsByPeriod(lastQuery.value);
      }

      console.log("ðŸ“… Refrescando todos los depÃ³sitos...");
      return await fetchAllDeposits();
    } catch (error) {
      console.warn("âš ï¸ Error al refrescar depÃ³sitos:", error.message);
    }
  }, [fetchAllDeposits, fetchDepositsByDate, fetchDepositsByPeriod]);

  useEffect(() => {
    refreshDepositsRef.current = refreshDeposits;
  }, [refreshDeposits]);

  const handleRealtimeInsert = useCallback((newRecord) => {
    setRealtimeActivity({
      type: "update",
      count: 1,
      depositId: null,
      at: Date.now(),
    });
    console.log("ðŸ”„ REALTIME: Llamando refreshDeposits para INSERT...");
    if (newRecord?.estado === "pendiente") {
      void showPendingDepositNotification(newRecord);
    }
    refreshDeposits();
  }, [refreshDeposits, showPendingDepositNotification]);

  const handleRealtimeUpdate = useCallback((fullDeposit) => {
    if (!fullDeposit) return;

    const previousDeposit = depositsRef.current.find((dep) => dep.id === fullDeposit.id) || null;
    const isEnteringPending =
      fullDeposit.estado === "pendiente" &&
      previousDeposit?.estado !== "pendiente";

    if (isEnteringPending) {
      void showPendingDepositNotification(fullDeposit);
    }
    
    setRealtimeActivity({
      type: "update",
      count: 1,
      depositId: fullDeposit.id,
      at: Date.now(),
    });
    
    console.log("ðŸ”„ REALTIME: Actualizando estado deposits para UPDATE...", {
      id: fullDeposit.id,
      estado: fullDeposit.estado,
    });

    setDeposits((prev) => {
      const exists = prev.some((d) => d.id === fullDeposit.id);
      if (exists) {
        const updated = prev.map((dep) => 
          dep.id === fullDeposit.id ? mergeDepositRecord(dep, fullDeposit) : dep
        );
        console.log("âœ… REALTIME: Registro existente actualizado");
        return updated;
      }
      
      console.log("âš ï¸ REALTIME: Registro modificado no existÃ­a en el estado actual. Refrescando todo...");
      setTimeout(() => refreshDeposits(), 0);
      return prev;
    });
  }, [mergeDepositRecord, refreshDeposits, showPendingDepositNotification]);

  const handleRealtimeDelete = useCallback((deletedId) => {
    if (!deletedId) return;

    setRealtimeActivity({
      type: "delete",
      count: 1,
      depositId: deletedId,
      at: Date.now(),
    });

    console.log("ðŸ—‘ï¸ REALTIME: Eliminando depÃ³sito del estado:", deletedId);
    setDeposits((prev) => prev.filter((deposit) => deposit.id !== deletedId));
    console.log("âœ… REALTIME: Estado actualizado");
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

    setVoucherPanelState({
      isOpen: true,
      voucherUrl: url,
      depositData: metadata,
    });

    window.postMessage(
      {
        type: "LOAD_VOUCHER",
        url,
        depositData: metadata,
      },
      "*"
    );
  }, []);

  const handleCloseVoucherPanel = useCallback(() => {
    setVoucherPanelState({
      isOpen: false,
      voucherUrl: "",
      depositData: null,
    });
  }, []);

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
  // Si Realtime estÃ¡ activo y suscrito, el polling se espacia a 5 minutos para ahorrar recursos.
  // Si estÃ¡ desconectado o en error, se activa un fallback de 60 segundos.
  useEffect(() => {
    if (!currentUser || !isSupabaseConnected) {
      return;
    }

    const intervalDelay = realtimeStatus === "SUBSCRIBED" ? 5 * 60 * 1000 : 60000;

    console.log(
      `â±ï¸ DASHBOARD: Iniciando polling de respaldo con intervalo de ${
        intervalDelay / 1000
      }s (Realtime: ${realtimeStatus || "DESCONECTADO"})`
    );

    const refreshTimer = setInterval(() => {
      console.log("â±ï¸ DASHBOARD: Ejecutando refresco periÃ³dico de respaldo...");
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
        console.error("âŒ Error al cargar datos iniciales:", error);
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

  useEffect(() => {
    void triggerWorkloadAlarm();
  }, [pendingWorkloadCount, triggerWorkloadAlarm]);

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
    workloadAlarmActive,
    workloadThreshold: WORKLOAD_ALERT_THRESHOLD,
    pendingWorkloadCount,
    replacementRequestState,
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
    triggerWorkloadAlarm,
    requestReplacementHelp,
  };
}

export default useDepositDashboard;

