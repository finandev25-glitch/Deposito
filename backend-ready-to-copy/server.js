import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  registerDashboardApiRoutes,
  registerRequestLogger,
  registerDepositSseRoute,
  startDepositRealtimeHub,
} from "./backend/realtimeHub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GIT_SHA = process.env.GIT_SHA || "local";

app.use(express.json({ limit: "10mb" }));
registerRequestLogger(app);
startDepositRealtimeHub();
registerDashboardApiRoutes(app);
registerDepositSseRoute(app);

// Servir archivos estáticos del build
app.use(express.static(path.join(__dirname, "dist")));

// Manejar rutas de React Router (SPA) - usar middleware en lugar de ruta
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`🔴 SSE depositos: /api/events/depositos`);
  console.log(`📦 Build SHA: ${GIT_SHA}`);
});
