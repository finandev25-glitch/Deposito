export function getUiMode() {
  if (typeof window === "undefined") return "default";

  const query = new URLSearchParams(window.location.search);
  const uiParam = query.get("ui") || query.get("mode");
  const globalMode = window.__APP_UI_MODE__;

  if (uiParam === "extension" || globalMode === "extension") {
    return "extension";
  }

  return "default";
}
