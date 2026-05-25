const STORAGE_KEY = "voucher_side_panel_state";

async function storeVoucherState(payload, tabId) {
  const state = {
    ...payload,
    updatedAt: new Date().toISOString(),
    sourceTabId: tabId || null,
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  return state;
}

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildSearchVariants(payload, searchType = "both") {
  const variants = [];
  const add = (value) => {
    const normalized = normalizeSearchValue(value);
    if (normalized && !variants.includes(normalized)) {
      variants.push(normalized);
    }
  };

  const shouldSearchOperation = searchType === "operation" || searchType === "both";
  const shouldSearchAmount = searchType === "amount" || searchType === "both";

  if (shouldSearchOperation) {
    add(payload?.numero_operacion_solicitante);
    add(payload?.numero_operacion_banco);
  }

  if (shouldSearchAmount) {
    add(payload?.importe);
    const amount = payload?.monto;
    if (amount !== undefined && amount !== null && amount !== "") {
      add(amount);
      const numericAmount = Number(String(amount).replace(/[^0-9,.-]/g, "").replace(",", "."));
      if (!Number.isNaN(numericAmount)) {
        add(numericAmount.toFixed(2));
        add(numericAmount.toLocaleString("en-US"));
        add(numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        add(numericAmount.toLocaleString("es-PE"));
        add(numericAmount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    }
  }

  return variants;
}

async function searchInActiveTab(payload, searchType = "both") {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    return { ok: false, message: "No hay una pestaña activa para buscar." };
  }

  const searchTerms = buildSearchVariants(payload, searchType);
  if (searchTerms.length === 0) {
    return { ok: false, message: "No hay nro. operación ni importe para buscar." };
  }

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
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
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
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
          const index = normalizeText(text).indexOf(normalizedTerm);
          if (index < 0) return;

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
    args: [searchTerms],
  });

  if (!result) {
    return { ok: false, message: "No se pudo ejecutar la búsqueda." };
  }

  return {
    ok: true,
    found: !!result.found,
    term: result.term || "",
    matches: result.matches || 0,
    message: result.found ? "" : "No se encontró coincidencia.",
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    console.warn("No se pudo configurar side panel:", error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id && chrome.sidePanel?.open) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "sidepanel.html",
        enabled: true,
      });
      await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
    } catch (error) {
      console.warn("No se pudo abrir el panel lateral:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;

  if (message.type === "SEARCH_VOUCHER_IN_PAGE") {
    (async () => {
      const result = await searchInActiveTab(message.depositData || {}, message.searchType || "both");
      sendResponse(result);
    })().catch((error) => {
      sendResponse({ ok: false, message: error.message });
    });
    return true;
  }

  if (message.type !== "LOAD_VOUCHER") {
    return false;
  }

  const tabId = sender?.tab?.id || null;

  (async () => {
    const state = await storeVoucherState(
      {
        voucherUrl: message.url || "",
        depositData: message.depositData || null,
        sourceUrl: message.sourceUrl || null,
      },
      tabId
    );

    let opened = false;
    if (sender?.tab?.id && chrome.sidePanel?.setOptions && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          path: "sidepanel.html",
          enabled: true,
        });
        await chrome.sidePanel.open({
          tabId: sender.tab.id,
          windowId: sender.tab.windowId,
        });
        opened = true;
      } catch (error) {
        console.warn("No se pudo abrir el panel lateral tras recibir el voucher:", error);
      }
    }

    sendResponse({ ok: true, state, opened });
  })().catch((error) => {
    sendResponse({ ok: false, error: error.message });
  });

  return true;
});
