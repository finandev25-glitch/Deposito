import "./utils/consoleGuard.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { BrowserRouter } from "react-router-dom";

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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
);
