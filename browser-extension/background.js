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

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeOperationNumber(value) {
  const digits = normalizeDigits(value).replace(/^0+(?=\d)/, "");
  return digits || "0";
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
    const solicitante = payload?.numero_operacion_solicitante;
    const banco = payload?.numero_operacion_banco;

    add(solicitante);
    add(banco);

    const normalizedSolicitante = normalizeOperationNumber(solicitante);
    const normalizedBanco = normalizeOperationNumber(banco);

    add(normalizedSolicitante);
    add(normalizedBanco);
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
    return { ok: false, message: "No hay una pestaÃƒÂ±a activa para buscar." };
  }

  const searchTerms = buildSearchVariants(payload, searchType);
  if (searchTerms.length === 0) {
    return { ok: false, message: "No hay nro. operaciÃƒÂ³n ni importe para buscar." };
  }

  const frameResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
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

      const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

      const buildDigitIndexMap = (text) => {
        const positions = [];
        for (let index = 0; index < text.length; index += 1) {
          if (/\d/.test(text[index])) {
            positions.push(index);
          }
        }
        return positions;
      };

      const buildFlexibleDigitRegex = (digits) => {
        const safeDigits = String(digits || "").replace(/\D/g, "");
        if (!safeDigits) return null;
        return new RegExp(safeDigits.split("").map((digit) => `${digit}\\D*`).join(""), "i");
      };

      const normalizeMoneyText = (value) => {
        const text = String(value || "").trim();
        if (!text) return "";
        return text
          .replace(/[^\d,.-]/g, "")
          .replace(/(?<=\d),(?=\d{3}(\D|$))/g, "")
          .replace(/,/g, ".")
          .replace(/(\.\d{2})\d+$/, "$1");
      };

      const collectTableRows = () =>
        Array.from(document.querySelectorAll("tr")).map((row) => {
          const cells = Array.from(row.querySelectorAll("td, th")).map((cell) => ({
            text: String(cell.textContent || "").trim(),
            normalizedText: normalizeText(cell.textContent || ""),
            digits: normalizeDigits(cell.textContent || ""),
          }));

          return {
            row,
            text: normalizeText(row.textContent || ""),
            digits: normalizeDigits(row.textContent || ""),
            money: cells.map((cell) => normalizeMoneyText(cell.text)).filter(Boolean),
            cells,
          };
        });

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
        const digitTerm = normalizeDigits(term);
        const digitRegex = buildFlexibleDigitRegex(digitTerm);
        const normalizedMoneyTerm = normalizeMoneyText(term);
        if (!normalizedTerm) return 0;

        clearPreviousHighlights();
        cleanup();

        const rows = collectTableRows();
        const matchingRows = rows.filter((entry) => {
          if (entry.text.includes(normalizedTerm)) return true;
          if (digitTerm && entry.digits.includes(digitTerm)) return true;
          if (normalizedMoneyTerm && entry.money.some((moneyValue) => moneyValue === normalizedMoneyTerm)) {
            return true;
          }
          return false;
        });

        if (matchingRows.length > 0) {
          const firstRow = matchingRows[0].row;
          firstRow.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          firstRow.style.outline = "3px solid #f59e0b";
          firstRow.style.background = "#fde68a";
          return matchingRows.length;
        }

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
          const normalizedNodeText = normalizeText(text);
          const digitNodeText = normalizeDigits(text);
          const exactMatch = normalizedNodeText.indexOf(normalizedTerm) >= 0;
          const digitMatch = !!digitTerm && digitNodeText.indexOf(digitTerm) >= 0;
          const flexibleDigitMatch = digitRegex ? digitRegex.exec(text) : null;

          let startOffset = text.toLowerCase().indexOf(String(term).toLowerCase());
          let endOffset = startOffset >= 0 ? startOffset + String(term).length : -1;

          if (startOffset < 0 && digitTerm) {
            const digitIndex = digitNodeText.indexOf(digitTerm);
            if (digitIndex >= 0) {
              const digitMap = buildDigitIndexMap(text);
              const startDigitPos = digitMap[digitIndex];
              const endDigitPos = digitMap[digitIndex + digitTerm.length - 1];
              if (startDigitPos !== undefined && endDigitPos !== undefined) {
                startOffset = startDigitPos;
                endOffset = endDigitPos + 1;
              }
            }
          }

          if (startOffset < 0 && flexibleDigitMatch) {
            startOffset = flexibleDigitMatch.index;
            endOffset = flexibleDigitMatch.index + flexibleDigitMatch[0].length;
          }

          if (!exactMatch && !digitMatch) return;
          if (startOffset < 0 || endOffset < 0) return;

          const range = document.createRange();
          range.setStart(node, startOffset);
          range.setEnd(node, endOffset);

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
          return { found: true, term, matches, frameUrl: window.location.href };
        }
      }

      clearPreviousHighlights();
      cleanup();
      return { found: false, term: "", matches: 0, frameUrl: window.location.href };
    },
    args: [searchTerms],
  });

  if (!frameResults?.length) {
    return { ok: false, message: "No se pudo ejecutar la búsqueda." };
  }

  const result =
    frameResults.find((entry) => entry?.result?.found)?.result || frameResults[0]?.result || null;

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
