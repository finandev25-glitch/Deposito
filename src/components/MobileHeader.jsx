import React from "react";
import { Menu, RefreshCw, ShieldCheck, UserMinus } from "lucide-react";

const MobileHeader = ({
  onMenuClick,
  compactMode = false,
  onRequestReplacementHelp = () => {},
  replacementRequestState = {},
}) => {
  const handleRequestReplacement = async () => {
    const reason = window.prompt(
      "Indica el motivo de la ausencia o el tipo de apoyo que necesitas:",
      "Necesito Apoyo!!",
    );

    if (reason === null) {
      return;
    }

    try {
      await onRequestReplacementHelp({ reason });
    } catch (error) {
      window.alert(error.message || "No se pudo solicitar apoyo.");
    }
  };

  return (
    <header
      className={`lg:hidden flex flex-col gap-2 border-b border-gray-200 bg-white flex-shrink-0 dark:border-gray-800 dark:bg-gray-900 ${
        compactMode ? "px-2.5 py-2" : "px-3 py-2.5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-1.5">
            <ShieldCheck className="text-white" size={13} />
          </div>
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            Control Depósitos
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400"
            aria-label="Refrescar extensión"
            title="Refrescar extensión"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleRequestReplacement}
            disabled={replacementRequestState?.isSending}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            title="Pedir apoyo"
            aria-label="Pedir apoyo"
          >
            <UserMinus size={14} />
          </button>
          <button
            onClick={onMenuClick}
            className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Abrir menú"
          >
            <Menu size={15} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
