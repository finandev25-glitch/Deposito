const originalError = console.error.bind(console);

const shouldShowVerboseLogs =
  import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" ||
  localStorage.getItem("enable_debug_logs") === "true";

if (!shouldShowVerboseLogs) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.group = () => {};
  console.groupCollapsed = () => {};
  console.groupEnd = () => {};
  console.table = () => {};
}

console.error = (...args) => {
  originalError(...args);
};

