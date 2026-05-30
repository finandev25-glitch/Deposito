import React, { useState, useEffect, memo } from "react";
import { Building2, Calendar, CreditCard, User, Phone } from "lucide-react";
import { getStatusIcon, getStatusInfo } from "../utils/depositStatusHelpers";
import { formatDate, formatShortDateFromDateOnly } from "../utils/dateFormatters";

const DepositCard = ({ deposit, onClick, isSelected = false }) => {
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      if (!deposit.fecha_registro) return;
      const now = new Date();
      const registeredAt = new Date(deposit.fecha_registro);
      const diffMs = now - registeredAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      if (diffMins > 60) {
        setElapsedTime("+60 min");
      } else {
        // Mostrar segundos si el estado es "pendiente" o "en_validacion"
        if (
          deposit.estado === "pendiente" ||
          deposit.estado === "en_validacion"
        ) {
          setElapsedTime(`${diffMins}:${diffSecs.toString().padStart(2, "0")}`);
        } else {
          setElapsedTime(`${diffMins} min`);
        }
      }
    };

    calculateTime();
    // Actualizar cada segundo si es pendiente o en_validacion, cada minuto si no
    const interval =
      deposit.estado === "pendiente" || deposit.estado === "en_validacion"
        ? 1000
        : 60000;
    const intervalId = setInterval(calculateTime, interval);

    return () => clearInterval(intervalId);
  }, [deposit.fecha_registro, deposit.estado]);

  const getUserInitials = (name) => {
    if (!name || typeof name !== "string") return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const statusStyles = getStatusInfo(deposit.estado);

  // Determinar si es un depósito antiguo en validación
  const isOldDeposit = deposit.es_antiguo && deposit.estado === "en_validacion";

  return (
    <div
      onClick={() => onClick?.(deposit)}
      className={`rounded-lg border border-gray-200 dark:border-gray-700/80 border-l-4 ${
        isOldDeposit
          ? "border-l-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 shadow-orange-200/50 dark:shadow-orange-900/30"
          : `${statusStyles.borderColor} ${statusStyles.gradient} ${statusStyles.shadow}`
      } p-2.5 transition-all duration-300 cursor-pointer flex flex-col h-full ${
        isOldDeposit ? "ring-2 ring-orange-300 dark:ring-orange-600" : ""
      } ${
        isSelected
          ? "ring-2 ring-emerald-300 shadow-[0_0_0_1px_rgba(34,197,94,0.18),0_0_22px_rgba(34,197,94,0.35)] dark:ring-emerald-400 dark:shadow-[0_0_0_1px_rgba(74,222,128,0.22),0_0_24px_rgba(74,222,128,0.28)]"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          {["en_validacion", "validado", "rechazado"].includes(
            deposit.estado
          ) && deposit.validado_por_usuario?.nombre ? (
            <div
              className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg"
              title={`Por: ${deposit.validado_por_usuario.nombre}`}
            >
              {getUserInitials(deposit.validado_por_usuario.nombre)}
            </div>
          ) : (
            <div className="h-9 w-9"></div> // Placeholder to keep layout stable
          )}
          {/* Badge para depósitos antiguos */}
          {isOldDeposit && (
            <span
              className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded border border-orange-300 dark:border-orange-600 animate-pulse"
              title="Depósito antiguo (más de 24 horas en validación)"
            >
              ⚠️ ANT
            </span>
          )}
          {/* Abreviación de la empresa */}
          {deposit.empresa && (
            <span
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-md border border-blue-200 dark:border-blue-700"
              title={`Empresa: ${deposit.empresa.nombre}`}
            >
              {deposit.empresa.abreviatura ||
                deposit.empresa.nombre
                  .split(" ")
                  .filter((word) => word.length > 2) // Filtrar palabras cortas como "SA", "DE", "LA"
                  .map((word) => word.charAt(0))
                  .join("")
                  .substring(0, 4) // Máximo 4 caracteres
                  .toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {React.createElement(getStatusIcon(deposit.estado), {
            size: 11,
            className: statusStyles.iconColor,
          })}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {formatShortDateFromDateOnly(deposit.fecha_solo_date)}{" "}
            {new Date(deposit.fecha_registro).toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "America/Lima"
            })}
          </span>
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            {React.createElement(getStatusIcon(deposit.estado), {
              size: 10,
            })}
            <span>{elapsedTime}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow">
        {/* Amount & Operation */}
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Ope: {deposit.numero_operacion}
          </span>
          <div className="flex items-baseline space-x-1.5">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {(deposit.monto || 0).toLocaleString("es-ES", {
                minimumFractionDigits: 2,
              })}
            </p>
            <span className="text-base font-medium text-gray-500 dark:text-gray-400">
              {deposit.moneda === "PEN" ? "S/" : deposit.moneda}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2">
          <div className="flex items-center space-x-2 overflow-hidden">
            <Building2
              size={10}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span className="truncate" title={deposit.sucursal?.nombre}>
              {deposit.sucursal?.nombre || "N/A"}
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-hidden">
            <User
              size={10}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="truncate" title={deposit.trabajador?.nombre}>
                {deposit.trabajador?.nombre || "N/A"}
              </span>
              {deposit.trabajador?.telefono_origen && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Phone size={8} className="mr-1" />
                  <span className="font-mono">
                    {deposit.trabajador.telefono_origen.startsWith('51')
                      ? deposit.trabajador.telefono_origen.slice(2)
                      : deposit.trabajador.telefono_origen}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 overflow-hidden">
            <CreditCard
              size={10}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span
              className="truncate font-mono"
              title={deposit.banco?.abreviatura}
            >
              {deposit.banco?.abreviatura || "N/A"}
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-hidden">
            <Calendar
              size={10}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span className="text-xs truncate">
              {formatDate(deposit.fecha_deposito)}
            </span>
          </div>

          {/* Usuario que cambió estado (solo rechazado y en validación) */}
          {(deposit.rechazado_por || deposit.en_validacion_por) && (
            <div className="col-span-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <User size={8} className="flex-shrink-0" />
              {deposit.estado === "rechazado" && deposit.rechazado_por && (
                <span className="text-red-600 truncate">
                  ✗ Rechazado por: {deposit.rechazado_por}
                </span>
              )}
              {deposit.estado === "en_validacion" &&
                deposit.en_validacion_por && (
                  <span className="text-blue-600 truncate">
                    ⏳ En validación por: {deposit.en_validacion_por}
                  </span>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoizar el componente para evitar re-renders innecesarios
const MemoizedDepositCard = memo(DepositCard, (prevProps, nextProps) => {
  // IMPORTANTE: Retornar TRUE significa NO re-renderizar
  // Retornar FALSE significa SÍ re-renderizar

  // Si CUALQUIERA de estos campos cambió, RE-RENDERIZAR (return false)
  const shouldNotRerender =
    prevProps.deposit.id === nextProps.deposit.id &&
    prevProps.deposit.estado === nextProps.deposit.estado &&
    prevProps.deposit.monto === nextProps.deposit.monto &&
    prevProps.deposit.fecha_registro === nextProps.deposit.fecha_registro &&
    prevProps.deposit.validado_por === nextProps.deposit.validado_por &&
    prevProps.deposit.rechazado_por === nextProps.deposit.rechazado_por &&
    prevProps.deposit.en_validacion_por ===
      nextProps.deposit.en_validacion_por &&
    prevProps.deposit.es_antiguo === nextProps.deposit.es_antiguo &&
    prevProps.deposit.trabajador?.telefono_origen ===
      nextProps.deposit.trabajador?.telefono_origen;

  // Debug: Log cuando se detecta un cambio
  if (!shouldNotRerender) {
    console.log("🔄 DepositCard RE-RENDER:", {
      id: nextProps.deposit.id,
      es_antiguo_prev: prevProps.deposit.es_antiguo,
      es_antiguo_next: nextProps.deposit.es_antiguo,
      estado: nextProps.deposit.estado,
    });
  }

  return shouldNotRerender;
});

MemoizedDepositCard.displayName = "DepositCard";

export default MemoizedDepositCard;
