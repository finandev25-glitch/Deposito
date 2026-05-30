const OVERLAY_ID = "voucher-floating-meta-overlay";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ensureStyles() {
  if (document.getElementById("voucher-floating-meta-overlay-styles")) return;
  const style = document.createElement("style");
  style.id = "voucher-floating-meta-overlay-styles";
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      left: 16px;
      top: 16px;
      z-index: 2147483647;
      width: min(340px, calc(100vw - 32px));
      color: #e5eefc;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      pointer-events: auto;
    }
    #${OVERLAY_ID} .vf-card {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.92));
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
      overflow: hidden;
    }
    #${OVERLAY_ID} .vf-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 12px 10px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }
    #${OVERLAY_ID} .vf-kicker {
      margin: 0;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #67e8f9;
      font-weight: 700;
    }
    #${OVERLAY_ID} .vf-title {
      margin: 3px 0 0;
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.2;
    }
    #${OVERLAY_ID} .vf-subtitle {
      margin: 4px 0 0;
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.3;
    }
    #${OVERLAY_ID} .vf-close {
      appearance: none;
      border: 0;
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      cursor: pointer;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
    }
    #${OVERLAY_ID} .vf-body {
      display: grid;
      gap: 8px;
      padding: 12px;
    }
    #${OVERLAY_ID} .vf-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    #${OVERLAY_ID} .vf-item {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 14px;
      padding: 8px 10px;
      min-width: 0;
    }
    #${OVERLAY_ID} .vf-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(196, 242, 255, 0.82);
      margin-bottom: 4px;
    }
    #${OVERLAY_ID} .vf-value {
      display: block;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${OVERLAY_ID} .vf-chipbar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }
    #${OVERLAY_ID} .vf-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(148, 163, 184, 0.14);
    }
    #${OVERLAY_ID} .vf-chip span {
      color: #67e8f9;
      font-weight: 700;
    }
    #${OVERLAY_ID} .vf-foot {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      padding: 0 12px 12px;
      font-size: 10px;
      color: rgba(226, 232, 240, 0.8);
    }
    @media (max-width: 768px) {
      #${OVERLAY_ID} {
        left: 12px;
        top: 12px;
        width: calc(100vw - 24px);
      }
      #${OVERLAY_ID} .vf-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function removeFloatingMetaOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function renderFloatingMetaOverlay(depositData = {}) {
  ensureStyles();

  const normalized = {
    banco: depositData.banco || depositData.banco_nombre || "-",
    sucursal: depositData.sucursal || depositData.sucursal_nombre || "-",
    cliente: depositData.cliente || "-",
    fechaDeposito: formatDate(depositData.fecha_deposito || depositData.fechaDeposito),
    numeroOperacion:
      depositData.numero_operacion_solicitante ||
      depositData.numero_operacion ||
      "-",
    monto:
      depositData.monto !== undefined && depositData.monto !== null && depositData.monto !== ""
        ? String(depositData.monto)
        : depositData.importe || "-",
    moneda: depositData.moneda || "-",
  };

  let root = document.getElementById(OVERLAY_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = OVERLAY_ID;
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <div class="vf-card" role="complementary" aria-label="Datos flotantes del depósito">
      <div class="vf-head">
        <div>
          <p class="vf-kicker">Voucher Side Panel</p>
          <h3 class="vf-title">Datos flotantes</h3>
          <p class="vf-subtitle">Campos no editables visibles sobre la pagina activa.</p>
        </div>
        <button class="vf-close" type="button" aria-label="Cerrar datos flotantes" title="Cerrar">×</button>
      </div>
      <div class="vf-body">
        <div class="vf-grid">
          <div class="vf-item"><span class="vf-label">Banco</span><span class="vf-value">${escapeHtml(normalized.banco)}</span></div>
          <div class="vf-item"><span class="vf-label">Sucursal</span><span class="vf-value">${escapeHtml(normalized.sucursal)}</span></div>
          <div class="vf-item"><span class="vf-label">Cliente</span><span class="vf-value">${escapeHtml(normalized.cliente)}</span></div>
          <div class="vf-item"><span class="vf-label">Fecha</span><span class="vf-value">${escapeHtml(normalized.fechaDeposito)}</span></div>
        </div>
        <div class="vf-chipbar">
          <span class="vf-chip"><span>Nro.</span> ${escapeHtml(normalized.numeroOperacion)}</span>
          <span class="vf-chip"><span>Monto</span> ${escapeHtml(normalized.monto)} ${escapeHtml(normalized.moneda)}</span>
        </div>
      </div>
      <div class="vf-foot">
        <span>Fijos: cliente, sucursal, banco</span>
        <span>Editable: en el panel lateral</span>
      </div>
    </div>
  `;

  root.querySelector(".vf-close")?.addEventListener("click", removeFloatingMetaOverlay);
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.type !== "LOAD_VOUCHER") return;

  console.debug("LOAD_VOUCHER recibido en content script:", {
    url: data.url,
    hasDepositData: !!data.depositData,
  });

  if (data.depositData) {
    renderFloatingMetaOverlay(data.depositData);
  } else {
    removeFloatingMetaOverlay();
  }

  chrome.runtime.sendMessage({
    type: "LOAD_VOUCHER",
    url: data.url,
    depositData: data.depositData || null,
    sourceUrl: window.location.href,
  });
});
