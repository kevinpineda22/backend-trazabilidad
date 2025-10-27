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

// Obtener los orígenes permitidos del .env y convertirlos en un array
// Esto es una mejora de seguridad respecto a usar 'origin: true'
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
    : [];

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (ej. Postman) o si el origen está en la lista de permitidos
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Rechazar el origen
            console.error(`CORS Blocked: Origin ${origin} not in allowed list.`);
            callback(new Error('Not allowed by CORS policy'), false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

const app = express();
const PORT = process.env.PORT || 3000;

// Aplicar la configuración CORS
app.use(cors(corsOptions));

app.options('*', cors(corsOptions)); 


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
