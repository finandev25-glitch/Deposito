const STORAGE_KEY = "voucher_side_panel_state";

const elements = {
  fechaDeposito: document.getElementById("fechaDeposito"),
  numeroOperacion: document.getElementById("numeroOperacion"),
  importe: document.getElementById("importe"),
  moneda: document.getElementById("moneda"),
  cliente: document.getElementById("cliente"),
  sucursal: document.getElementById("sucursal"),
  banco: document.getElementById("banco"),
  searchOperationButton: document.getElementById("searchOperationButton"),
  searchAmountButton: document.getElementById("searchAmountButton"),
  searchStatus: document.getElementById("searchStatus"),
  openLink: document.getElementById("openLink"),
  voucherPreview: document.getElementById("voucherPreview"),
};

let currentState = null;

function formatDate(value) {
  if (!value) return "-";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, year, month, day] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

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

function normalizeVoucherUrl(url) {
  if (!url) return "";

  if (url.includes("drive.google.com/file/d/")) {
    const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  return url;
}

function resolveDepositDate(data) {
  return data?.fecha_deposito || data?.fechaDeposito || "";
}

function isPdfUrl(url) {
  return String(url || "").toLowerCase().includes(".pdf");
}

function isImageUrl(url) {
  const value = String(url || "").toLowerCase();
  return (
    value.includes(".png") ||
    value.includes(".jpg") ||
    value.includes(".jpeg") ||
    value.includes(".webp") ||
    value.includes(".gif")
  );
}

function renderEmpty() {
  currentState = null;
  elements.fechaDeposito.textContent = "-";
  elements.numeroOperacion.textContent = "-";
  elements.importe.textContent = "-";
  elements.moneda.textContent = "-";
  elements.cliente.textContent = "-";
  elements.sucursal.textContent = "-";
  elements.banco.textContent = "-";
  elements.searchStatus.textContent = "Busca por nro. operación o importe en la pestaña activa.";
  elements.searchOperationButton.disabled = true;
  elements.searchAmountButton.disabled = true;
  elements.openLink.href = "#";
  elements.openLink.setAttribute("aria-disabled", "true");
  elements.voucherPreview.className = "preview empty";
  elements.voucherPreview.innerHTML = '<div class="empty-state">Carga un depósito para ver su comprobante.</div>';
}

function renderPanel(state) {
  currentState = state || null;

  if (!state?.voucherUrl) {
    renderEmpty();
    return;
  }

  const data = state.depositData || {};
  const voucherUrl = normalizeVoucherUrl(state.voucherUrl);
  const operationValue = data.numero_operacion_solicitante || data.numero_operacion || "-";

  elements.fechaDeposito.textContent = formatDate(resolveDepositDate(data));
  elements.numeroOperacion.textContent = operationValue;
  elements.importe.textContent = formatAmount(data.monto);
  elements.moneda.textContent = data.moneda || "-";
  elements.cliente.textContent = data.cliente || "-";
  elements.sucursal.textContent = data.sucursal || "-";
  elements.banco.textContent = data.banco || "-";
  elements.searchOperationButton.disabled = false;
  elements.searchAmountButton.disabled = false;
  elements.searchStatus.textContent = "Busca por nro. operación o importe en la pestaña activa.";

  elements.openLink.href = voucherUrl;
  elements.openLink.removeAttribute("aria-disabled");

  const previewClass = "preview";
  const useIframe = isPdfUrl(voucherUrl) || !isImageUrl(voucherUrl);

  if (useIframe) {
    elements.voucherPreview.className = previewClass;
    elements.voucherPreview.innerHTML = `
      <iframe src="${voucherUrl}#toolbar=1&navpanes=1&scrollbar=1" title="Voucher"></iframe>
    `;
  } else {
    elements.voucherPreview.className = previewClass;
    elements.voucherPreview.innerHTML = `
      <img src="${voucherUrl}" alt="Voucher del depósito" />
    `;
  }
}

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeOperationNumber(value) {
  const digits = String(value || "")
    .trim()
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
  return digits || "0";
}

function formatAmount(value) {
  if (value === undefined || value === null || value === "") return "-";
  const numericAmount = Number(String(value).replace(/[^0-9,.-]/g, "").replace(",", "."));
  if (Number.isNaN(numericAmount)) {
    return String(value);
  }
  return numericAmount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildSearchVariants(payload) {
  const variants = [];
  const add = (value) => {
    const normalized = normalizeSearchValue(value);
    if (normalized && !variants.includes(normalized)) {
      variants.push(normalized);
    }
  };

  const solicitante = payload?.numero_operacion_solicitante;
  const banco = payload?.numero_operacion_banco;

  add(solicitante);
  add(banco);
  add(normalizeOperationNumber(solicitante));
  add(normalizeOperationNumber(banco));

  const amount = payload?.monto;
  if (amount !== undefined && amount !== null && amount !== "") {
    add(amount);
    const numericAmount = Number(String(amount).replace(/[^0-9,.-]/g, "").replace(",", "."));
    if (!Number.isNaN(numericAmount)) {
      add(numericAmount.toFixed(2));
      add(numericAmount.toLocaleString("es-PE"));
      add(numericAmount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }

  return variants;
}

async function searchInActiveTab(payload) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    return { ok: false, message: "No hay una pestaña activa para buscar." };
  }

  const searchTerms = buildSearchVariants(payload);
  if (searchTerms.length === 0) {
    return { ok: false, message: "No hay nro. operación ni importe para buscar." };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [searchTerms],
    func: (terms) => {
      const HIGHLIGHT_ATTR = "data-voucher-search-highlight";
      const HIGHLIGHT_CLASS = "__voucher_search_highlight__";

      const normalizeText = (value) =>
        String(value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const cleanup = () => {
        document.querySelectorAll(`[${HIGHLIGHT_ATTR}="1"]`).forEach((node) => {
          const parent = node.parentNode;
          while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
          parent.normalize();
        });
      };

      const clearPreviousHighlights = () => {
        const existing = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
        existing.forEach((el) => {
          const parent = el.parentNode;
          if (!parent) return;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        });
      };

      const highlightTerm = (term) => {
        const normalizedTerm = normalizeText(term);
        if (!normalizedTerm) return 0;

        clearPreviousHighlights();
        cleanup();

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest(`[${HIGHLIGHT_ATTR}="1"]`)) {
              return NodeFilter.FILTER_REJECT;
            }
            const text = normalizeText(node.textContent);
            if (!text) return NodeFilter.FILTER_REJECT;
            return text.includes(normalizedTerm) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
        });

        const nodes = [];
        let current = walker.nextNode();
        while (current) {
          nodes.push(current);
          current = walker.nextNode();
        }

        let matches = 0;
        let firstNode = null;

        nodes.forEach((node) => {
          const text = node.textContent || "";
          const normalizedText = normalizeText(text);
          const index = normalizedText.indexOf(normalizedTerm);
          if (index < 0) return;

          let searchStart = 0;
          let remainingIndex = index;
          const pieces = [];

          while (remainingIndex > 0) {
            const char = text[searchStart];
            if (!char) break;
            const normalizedChar = normalizeText(char);
            if (normalizedChar) {
              remainingIndex -= normalizedChar.length;
            }
            searchStart += 1;
          }

          const startOffset = text.toLowerCase().indexOf(String(term).toLowerCase());
          if (startOffset < 0) return;

          const range = document.createRange();
          range.setStart(node, startOffset);
          range.setEnd(node, startOffset + String(term).length);

          const mark = document.createElement("mark");
          mark.setAttribute(HIGHLIGHT_ATTR, "1");
          mark.className = HIGHLIGHT_CLASS;
          range.surroundContents(mark);
          matches += 1;
          if (!firstNode) {
            firstNode = mark;
          }
        });

        if (firstNode) {
          firstNode.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          firstNode.style.outline = "3px solid #f59e0b";
          firstNode.style.background = "#fde68a";
        }

        return matches;
      };

      for (const term of terms) {
        const matches = highlightTerm(term);
        if (matches > 0) {
          return { found: true, term, matches };
        }
      }

      clearPreviousHighlights();
      cleanup();
      return { found: false, term: "", matches: 0 };
    },
  });

  return results?.[0]?.result || { ok: false, message: "No se pudo ejecutar la búsqueda." };
}

async function loadStateFromStorage() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  renderPanel(result[STORAGE_KEY] || null);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[STORAGE_KEY]) return;
  renderPanel(changes[STORAGE_KEY].newValue || null);
});

function getSearchPayload() {
  const data = currentState?.depositData || {};
  return {
    numero_operacion_solicitante: data.numero_operacion_solicitante || data.numero_operacion || "",
    numero_operacion_banco: data.numero_operacion_banco || "",
    importe: data.importe || data.monto || "",
    monto: data.monto || data.importe || "",
  };
}

async function runSearch(searchType) {
  const payload = getSearchPayload();
  const isAmount = searchType === "amount";
  const button = isAmount ? elements.searchAmountButton : elements.searchOperationButton;

  button.disabled = true;
  elements.searchStatus.textContent = isAmount
    ? "Buscando importe en la pestaña activa..."
    : "Buscando nro. operación en la pestaña activa...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SEARCH_VOUCHER_IN_PAGE",
      depositData: payload,
      searchType: isAmount ? "amount" : "operation",
    });

    if (response?.found) {
      elements.searchStatus.textContent = `Encontrado: ${response.term} (${response.matches} coincidencia${response.matches === 1 ? "" : "s"})`;
    } else {
      elements.searchStatus.textContent = response?.message || "No se encontró coincidencia.";
    }
  } catch (error) {
    elements.searchStatus.textContent = `Error al buscar: ${error.message}`;
  } finally {
    elements.searchOperationButton.disabled = !currentState?.voucherUrl;
    elements.searchAmountButton.disabled = !currentState?.voucherUrl;
  }
}

elements.searchOperationButton.addEventListener("click", () => runSearch("operation"));
elements.searchAmountButton.addEventListener("click", () => runSearch("amount"));

loadStateFromStorage().catch((error) => {
  console.error("No se pudo cargar el panel lateral:", error);
  renderEmpty();
});
