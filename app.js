import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// --- Importar las rutas que creamos ---
import empleadosContabilidadRoutes from "./routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./routes/adminContabilidadRoutes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Manejar preflight requests (OPTIONS) para TODAS las rutas
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // Cache preflight por 24h
  return res.status(204).send(); // No content
});

// 2. Configuración CORS para requests reales
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"]; // Por defecto permite todos en desarrollo

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Si ALLOWED_ORIGINS es '*', permitir cualquier origen
      if (allowedOrigins.includes("*")) return callback(null, origin);

      // Verificar si el origen está en la whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Rechazar origen no autorizado
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // 24 horas
  })
);

// Aumentar el límite de payload para aceptar los archivos (ej. 50mb)
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

// --- Iniciar el servidor ---
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

export default app;
