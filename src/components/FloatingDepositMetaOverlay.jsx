import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function MetaItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm shadow-slate-200/40">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

export default function FloatingDepositMetaOverlay({ isOpen, depositData, onClose }) {
  const visible = !!isOpen && !!depositData;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="fixed left-4 top-4 z-[120] w-[320px] max-w-[calc(100vw-2rem)]"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-300/30 backdrop-blur">
            <div className="flex items-start justify-between border-b border-slate-200 px-3 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
                  Datos flotantes
                </p>
                <h3 className="mt-1 text-sm font-bold">Campos no editables</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Se muestran sobre la pagina activa.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                aria-label="Cerrar datos flotantes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 p-3">
              <div className="grid grid-cols-2 gap-2">
                <MetaItem label="Banco" value={depositData.banco || depositData.banco_nombre} />
                <MetaItem label="Sucursal" value={depositData.sucursal || depositData.sucursal_nombre} />
                <MetaItem label="Cliente" value={depositData.cliente} />
                <MetaItem label="Fecha" value={depositData.fecha_deposito || depositData.fechaDeposito} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetaItem
                  label="Nro. operación"
                  value={depositData.numero_operacion_solicitante || depositData.numero_operacion}
                />
                <MetaItem label="Monto" value={`${depositData.monto || depositData.importe || "-"} ${depositData.moneda || ""}`.trim()} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                Editables: quedan en el panel lateral. Fijos: cliente, sucursal, banco.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
