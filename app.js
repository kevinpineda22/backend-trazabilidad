// app.js
import dotenv from "dotenv";
import express from "express";
import { corsMiddleware } from "./config/corsConfig.js";

// Rutas
import empleadosContabilidadRoutes from "./routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./routes/adminContabilidadRoutes.js";

dotenv.config();

const app = express();

// ============================
// CORS (global, antes de todo)
// ============================
app.use(corsMiddleware);

// Responder explícito a preflight (opcional si cors() ya lo hace, pero ayuda en Edge/CDN)
app.options("*", corsMiddleware);

// Payload limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ================
// Rutas de la API
// ================
const apiBase = "/api/trazabilidad";
app.use(`${apiBase}/empleados`, empleadosContabilidadRoutes);
app.use(`${apiBase}/proveedores`, proveedoresContabilidadRoutes);
app.use(`${apiBase}/clientes`, clientesContabilidadRoutes);
app.use(`${apiBase}/admin`, adminContabilidadRoutes);

// ========================
// Rutas básicas de salud
// ========================
app.get("/", (req, res) => {
  res.json({
    message: "API de Trazabilidad de Contabilidad está corriendo.",
    status: "active",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "✅ API funcionando correctamente",
    timestamp: new Date().toISOString(),
    server: "backend-trazabilidad.vercel.app",
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API de Trazabilidad",
    endpoints: {
      empleados: "/api/trazabilidad/empleados",
      proveedores: "/api/trazabilidad/proveedores",
      clientes: "/api/trazabilidad/clientes",
      admin: "/api/trazabilidad/admin",
    },
  });
});

// ===================
// Favicons de cortesía
// ===================
app.get(["/favicon.ico", "/favicon.png"], (req, res) => res.status(204).end());

// ========================
// 404 y Error handler CORS
// ========================
app.use((req, res, next) => {
  // Asegura CORS también en 404
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(404).json({ message: "Ruta no encontrada", path: req.path });
});

app.use((error, req, res, next) => {
  console.error("Error global:", error);
  // Asegura CORS también en 5xx
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(error.status || 500).json({
    message: error.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// =============================
// Export para Vercel (@vercel/node)
// =============================
export default function handler(req, res) {
  return app(req, res);
}

// Server local solo en dev (opcional)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
