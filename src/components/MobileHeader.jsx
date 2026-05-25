import React from "react";
import { Menu, ShieldCheck } from "lucide-react";
import ConnectionIndicator from "./ConnectionIndicator";

const MobileHeader = ({ onMenuClick, connectionStatus }) => {
  return (
    <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="text-white" size={14} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
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

      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Abrir menú"
      >
        <Menu size={17} className="text-gray-600 dark:text-gray-400" />
      </button>
    </header>
  );
};

export default MobileHeader;
