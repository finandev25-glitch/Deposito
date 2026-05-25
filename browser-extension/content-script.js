window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.type !== "LOAD_VOUCHER") return;

  console.debug("LOAD_VOUCHER recibido en content script:", {
    url: data.url,
    hasDepositData: !!data.depositData,
  });

  chrome.runtime.sendMessage({
    type: "LOAD_VOUCHER",
    url: data.url,
    depositData: data.depositData || null,
    sourceUrl: window.location.href,
  });
});
