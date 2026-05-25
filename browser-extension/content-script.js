window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.type !== "LOAD_VOUCHER") return;

  chrome.runtime.sendMessage({
    type: "LOAD_VOUCHER",
    url: data.url,
    depositData: data.depositData || null,
    sourceUrl: window.location.href,
  });
});
