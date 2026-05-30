window.__APP_UI_MODE__ = "extension";
window.__API_BASE_URL__ =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.85.50:3000";

import("./main.jsx");
