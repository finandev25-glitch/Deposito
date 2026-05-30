import React from "react";
import { Bell, Menu, ShieldCheck } from "lucide-react";
import ConnectionIndicator from "./ConnectionIndicator";

const MobileHeader = ({
  onMenuClick,
  connectionStatus,
  compactMode = false,
  realtimeActivity = null,
}) => {
  return (
    <header
      className={`lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 flex-shrink-0 ${
        compactMode ? "px-3 py-2.5" : "px-4 py-3"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="text-white" size={14} />
          </div>
          <h1
            className={`font-bold text-gray-900 dark:text-gray-100 ${
              compactMode ? "text-base" : "text-lg"
            }`}
          >
            Control Depósitos
          </h1>
        </div>
        {connectionStatus && (
          <ConnectionIndicator
            supabaseConnected={connectionStatus.supabaseConnected}
            realtimeStatus={connectionStatus.realtimeStatus}
            realtimeErrors={connectionStatus.realtimeErrors}
            className="self-start"
          />
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {realtimeActivity && (
          <div className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <Bell size={14} className="shrink-0" />
            <span className="min-w-0 truncate font-medium">
              {realtimeActivity.type === "delete"
                ? "Realtime: 1 depósito eliminado"
                : `Realtime: ${realtimeActivity.count} depósito${realtimeActivity.count === 1 ? "" : "s"} actualizado${realtimeActivity.count === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Abrir menú"
        >
          <Menu size={17} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
