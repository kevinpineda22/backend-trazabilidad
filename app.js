// app.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// --- Importar las rutas que creamos ---
import empleadosContabilidadRoutes from "./src/routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./src/routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./src/routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./src/routes/adminContabilidadRoutes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares globales ---
// Configuración CORS más específica para Vercel
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (aplicaciones móviles, Postman, etc.)
      if (!origin) return callback(null, true);

      // Lista de dominios permitidos
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        "https://localhost:5173",
        /\.vercel\.app$/,
        /\.netlify\.app$/,
      ];

      // Verificar si el origin está permitido
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return allowed === origin;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        // En desarrollo, permitir todos los orígenes
        if (process.env.NODE_ENV === "development") {
          callback(null, true);
        } else {
          callback(null, true); // Por ahora permitir todos, cambiar en producción
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    optionsSuccessStatus: 200, // Para navegadores legacy
    preflightContinue: false,
  })
);

// Middleware adicional para manejar preflight requests
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        return res.sendStatus(200);
    }
    next();
});

// Aumentar el límite de payload para aceptar los archivos (ej. 50mb)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Definición de Rutas ---

// Definimos una ruta base para este nuevo módulo
const apiBase = "/api/trazabilidad";

// Conectar las rutas de empleados
// -> /api/trazabilidad/empleados
// -> /api/trazabilidad/empleados/historial
app.use(`${apiBase}/empleados`, empleadosContabilidadRoutes);

// Conectar las rutas de proveedores
// -> /api/trazabilidad/proveedores
// -> /api/trazabilidad/proveedores/historial
app.use(`${apiBase}/proveedores`, proveedoresContabilidadRoutes);

// Conectar las rutas de clientes
// -> /api/trazabilidad/clientes
// -> /api/trazabilidad/clientes/historial
app.use(`${apiBase}/clientes`, clientesContabilidadRoutes);

// Conectar las rutas de admin
// -> /api/trazabilidad/admin/historial-empleados
// -> /api/trazabilidad/admin/dashboard-stats
app.use(`${apiBase}/admin`, adminContabilidadRoutes);

// Ruta de bienvenida
app.get("/", (req, res) => {
  res.json({
    message: "ternero corriendoooooooooooo",
    status: "active",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Debug endpoint para verificar rutas disponibles
app.get("/api", (req, res) => {
  res.json({
    message: "API de Trazabilidad",
    endpoints: {
      empleados: "/api/trazabilidad/empleados",
      "empleados-historial": "/api/trazabilidad/empleados/historial",
      proveedores: "/api/trazabilidad/proveedores",
      "proveedores-historial": "/api/trazabilidad/proveedores/historial",
      clientes: "/api/trazabilidad/clientes",
      "clientes-historial": "/api/trazabilidad/clientes/historial",
      admin: "/api/trazabilidad/admin",
    },
  });
});

// --- Manejo de errores ---
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: "Ruta no encontrada",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handler global
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
