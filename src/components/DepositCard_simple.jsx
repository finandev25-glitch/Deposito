import React, { useState, useEffect, memo } from "react";
import { Eye, User, Phone } from "lucide-react";
import { getStatusIcon, getStatusInfo } from "../utils/depositStatusHelpers";
import { formatDate, formatShortDate } from "../utils/dateFormatters";

const DepositCard = ({ deposit, onClick }) => {
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
    const interval =
      deposit.estado === "pendiente" || deposit.estado === "en_validacion"
        ? 1000
        : 60000;
    const intervalId = setInterval(calculateTime, interval);

    return () => clearInterval(intervalId);
  }, [deposit.fecha_registro, deposit.estado]);

  const statusInfo = getStatusInfo(deposit.estado);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${statusInfo.borderColor} relative group`}
      onClick={() => onClick(deposit)}
    >
      {/* Header */}
      <div className="flex justify-between items-start p-3 pb-2">
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            {deposit.empresa?.nombre?.substring(0, 3).toUpperCase() || "EVO"}
          </span>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <div>{formatShortDate(deposit.fecha_registro)}</div>
          <div className="font-medium text-orange-500">{elapsedTime}</div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {/* ID */}
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          OPE: {deposit.id}
        </div>

        {/* Monto */}
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {deposit.monto?.toLocaleString()} {deposit.moneda}
        </div>

        {/* Cliente */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 truncate">
          {deposit.cliente || "Sin cliente"}
        </div>

        {/* Trabajador y Teléfono */}
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          <User className="inline w-3 h-3 mr-1" />
          {deposit.trabajador?.nombre || "Sin trabajador"}
          {deposit.trabajador?.telefono_origen && (
            <span className="ml-2 font-mono">
              <Phone className="inline w-3 h-3 mr-1" />
              {deposit.trabajador.telefono_origen}
            </span>
          )}
        </div>

        {/* Usuario que cambió estado */}
        {(deposit.validado_por ||
          deposit.rechazado_por ||
          deposit.en_validacion_por) && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {deposit.estado === "validado" && deposit.validado_por && (
              <span className="text-green-600">
                ✓ Validado por: {deposit.validado_por}
              </span>
            )}
            {deposit.estado === "rechazado" && deposit.rechazado_por && (
              <span className="text-red-600">
                ✗ Rechazado por: {deposit.rechazado_por}
              </span>
            )}
            {deposit.estado === "en_validacion" &&
              deposit.en_validacion_por && (
                <span className="text-blue-600">
                  ⏳ En validación por: {deposit.en_validacion_por}
                </span>
              )}
          </div>
        )}

        {/* Banco */}
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          {deposit.banco?.abreviatura || deposit.banco?.nombre || "N/A"}
        </div>

        {/* Fecha */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(deposit.fecha_registro).toLocaleDateString("es-ES")}
        </div>
      </div>

      {/* Eye icon */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Eye
          size={16}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        />
      </div>
    </div>
  );
};

// Memoizar el componente para optimizar renders
const MemoizedDepositCard = memo(DepositCard, (prevProps, nextProps) => {
  const prev = prevProps.deposit;
  const next = nextProps.deposit;

  if (!prev || !next) {
    return false;
  }

  const criticalProps = [
    "id",
    "estado",
    "monto",
    "cliente",
    "ruc_cliente",
    "fecha_registro",
    "numero_operacion_banco",
    "es_antiguo",
    "validado_por",
    "rechazado_por",
    "en_validacion_por",
  ];

  for (const prop of criticalProps) {
    if (prev[prop] !== next[prop]) {
      return false;
    }
  }

  const nestedObjects = ["sucursal", "trabajador", "banco", "empresa"];
  for (const obj of nestedObjects) {
    if (
      prev[obj]?.id !== next[obj]?.id ||
      prev[obj]?.nombre !== next[obj]?.nombre
    ) {
      return false;
    }
  }

  if (prev.trabajador?.telefono_origen !== next.trabajador?.telefono_origen) {
    return false;
  }

  return prevProps.onClick === nextProps.onClick;
});

MemoizedDepositCard.displayName = "DepositCard";

export default MemoizedDepositCard;
