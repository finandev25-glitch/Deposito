import React, { useState, useEffect, memo } from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  User,
  Eye,
  Phone,
} from "lucide-react";
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

  const statusInfo = getStatusInfo(deposit.estado);
  const StatusIcon = getStatusIcon(deposit.estado);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${statusInfo.borderColor}`}
      onClick={() => onClick(deposit)}
    >
      {/* Header - Empresa, Usuario, Estado */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Building2 size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {deposit.empresa?.nombre || "Sin empresa"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <User size={12} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {deposit.trabajador?.nombre || "Sin trabajador"}
            </span>
          </div>
          {deposit.trabajador?.telefono_origen && (
            <div className="flex items-center space-x-2 mt-1">
              <Phone size={12} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate font-mono">
                {deposit.trabajador.telefono_origen}
              </span>
            </div>
          )}
        </div>

        {/* Estado y Badge */}
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-1">
            <StatusIcon size={14} className={statusInfo.iconColor} />
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}
            >
              {statusInfo.label}
            </span>
          </div>
          {deposit.es_antiguo && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              Antiguo
            </span>
          )}
        </div>
      </div>

      {/* Fecha y tiempo transcurrido */}
      <div className="flex justify-between items-center mb-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          <Calendar size={12} />
          <span>{formatShortDate(deposit.fecha_registro)}</span>
        </div>
        <span className="font-medium">{elapsedTime}</span>
      </div>

      {/* Cliente y RUC */}
      <div className="mb-3">
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
          {deposit.cliente || "Sin cliente"}
        </p>
        {deposit.ruc_cliente && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            RUC: {deposit.ruc_cliente}
          </p>
        )}
      </div>

      {/* Monto */}
      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {deposit.moneda} {deposit.monto?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-2 gap-2 text-xs">
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
      </div>

      {/* Número de operación */}
      {deposit.numero_operacion_banco && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            Op: {deposit.numero_operacion_banco}
          </p>
        </div>
      )}

      {/* Botón de vista rápida */}
      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(deposit);
          }}
          className="w-full text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded flex items-center justify-center space-x-1"
        >
          <Eye size={12} />
          <span>Ver detalles</span>
        </button>
      </div>
    </div>
  );
};

// Memoizar el componente para optimizar renders
const MemoizedDepositCard = memo(DepositCard, (prevProps, nextProps) => {
  const prev = prevProps.deposit;
  const next = nextProps.deposit;

  // Si alguno es null/undefined, re-renderizar
  if (!prev || !next) {
    return false;
  }

  // Comparar propiedades críticas que afectan la visualización
  const criticalProps = [
    "id",
    "estado",
    "monto",
    "cliente",
    "ruc_cliente",
    "fecha_registro",
    "numero_operacion_banco",
    "es_antiguo",
  ];

  for (const prop of criticalProps) {
    if (prev[prop] !== next[prop]) {
      return false;
    }
  }

  // Comparar objetos anidados
  const nestedObjects = ["sucursal", "trabajador", "banco", "empresa"];
  for (const obj of nestedObjects) {
    if (
      prev[obj]?.id !== next[obj]?.id ||
      prev[obj]?.nombre !== next[obj]?.nombre
    ) {
      return false;
    }
  }

  // Verificar telefono_origen específicamente
  if (prev.trabajador?.telefono_origen !== next.trabajador?.telefono_origen) {
    return false;
  }

  const shouldNotRerender = prevProps.onClick === nextProps.onClick;

  return shouldNotRerender;
});

MemoizedDepositCard.displayName = "DepositCard";

export default MemoizedDepositCard;
