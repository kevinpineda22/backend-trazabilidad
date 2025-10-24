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
app.use(cors({
    origin: true, // Permite todos los orígenes. Ajusta en producción si es necesario.
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
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
    res.send("ternero corriendoooooooooooo");
});

// --- Iniciar el servidor ---
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}

export default app;
