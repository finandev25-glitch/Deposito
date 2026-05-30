import "./utils/consoleGuard.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { getUiMode } from "./utils/uiMode.js";

function installExtensionApiBridge() {
  if (typeof window === "undefined") return;
  if (window.__APP_UI_MODE__ !== "extension") return;

  const apiBaseUrl =
    window.__API_BASE_URL__ ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://192.168.85.50:3000";
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      return originalFetch(`${apiBaseUrl}${input}`, init);
    }

    if (input instanceof Request && input.url.startsWith("/api")) {
      const absoluteUrl = `${apiBaseUrl}${input.url}`;
      const rewrittenRequest = new Request(absoluteUrl, input);
      return originalFetch(rewrittenRequest, init);
    }

    return originalFetch(input, init);
  };
}

installExtensionApiBridge();

window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("message channel closed") ||
    event.reason?.message?.includes("listener indicated an asynchronous response")
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        {getUiMode() === "extension" ? (
          <HashRouter>
            <App uiMode="extension" />
          </HashRouter>
        ) : (
          <BrowserRouter>
            <App uiMode="default" />
          </BrowserRouter>
        )}
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
