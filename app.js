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

// Configuración CORS laxa para evitar bloqueos por origen durante el desarrollo
// Si en el futuro necesitas restringir, reemplaza origin:true por una función que valide contra una lista.
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como aplicaciones móviles) o desde cualquier origin en desarrollo
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'https://localhost:5173',
      'https://localhost:4173'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // En producción, cambiar a false si quieres restringir
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware manual para manejar CORS antes que express.cors()
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Siempre establecer los headers CORS
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id');
  
  // Responder inmediatamente a las peticiones OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Aplicar la configuración CORS (como respaldo)
const corsMiddleware = cors(corsOptions);
app.use(corsMiddleware);

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
