// app.js
import dotenv from "dotenv";
import express from "express";
import {
  corsMiddleware,
} from "./config/corsConfig.js";

// --- Importar las rutas ---
import empleadosContabilidadRoutes from "./routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./routes/adminContabilidadRoutes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// =======================================================
// MANEJO DE CORS LIMPIO Y ROBUSTO (Solo middleware global)
// =======================================================
// 1. Aplicar CORS middleware al inicio. Esto maneja automáticamente OPTIONS
//    para todas las rutas.
app.use(corsMiddleware);
app.options("*", corsMiddleware);

// 2. Manejador manual de OPTIONS ELIMINADO.
// =======================================================

// Aumentar el límite de payload para archivos grandes (50mb)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Definición de Rutas ---
const apiBase = "/api/trazabilidad";
app.use(`${apiBase}/empleados`, empleadosContabilidadRoutes);
app.use(`${apiBase}/proveedores`, proveedoresContabilidadRoutes);
app.use(`${apiBase}/clientes`, clientesContabilidadRoutes);
app.use(`${apiBase}/admin`, adminContabilidadRoutes);

// --- Rutas de Bienvenida y Salud ---
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

// --- Manejo de errores 404 (Rutas no encontradas) ---
app.use((req, res, next) => {
  res.status(404).json({
    message: "Ruta no encontrada",
    path: req.path,
  });
});

// --- Error handler global ---
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  res.status(error.status || 500).json({
    message: error.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// --- Iniciar el servidor (solo si no es producción) ---
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

export default app;