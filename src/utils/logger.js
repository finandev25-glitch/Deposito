export const logger = {
  log: () => {},
  warn: () => {},
  debug: () => {},
  info: () => {},
  group: (_label, fn) => {
    if (typeof fn === "function") fn();
  },
  table: () => {},
  error: (...args) => {
    console.error(...args);
  },
};

export default logger;
