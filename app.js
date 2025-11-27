import dotenv from "dotenv";
import express from "express";
import { corsMiddleware } from "./config/corsConfig.js";

// --- Importar las rutas (Asumo que tienen la extensión .js) ---
import empleadosContabilidadRoutes from "./routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./routes/adminContabilidadRoutes.js";
import tokensRoutes from "./routes/tokensRoutes.js";
import aprobacionesRoutes from "./routes/aprobacionesRoutes.js";
import registroPublicoRoutes from "./routes/registroPublicoRoutes.js";
import adminDocumentosRoutes from "./routes/adminDocumentosRoutes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Aplicar CORS middleware global
app.use(corsMiddleware);

// Aumentar el límite de payload para JSON complejos (ya no es Multer)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Definición de Rutas ---
const apiBase = "/api/trazabilidad";
app.use(`${apiBase}/empleados`, empleadosContabilidadRoutes);
app.use(`${apiBase}/proveedores`, proveedoresContabilidadRoutes);
app.use(`${apiBase}/clientes`, clientesContabilidadRoutes);
app.use(`${apiBase}/admin`, adminContabilidadRoutes);
app.use(`${apiBase}/tokens`, tokensRoutes);
app.use(`${apiBase}/aprobaciones`, aprobacionesRoutes);
app.use(`${apiBase}/registro-publico`, registroPublicoRoutes);
app.use(`${apiBase}/admin-documentos`, adminDocumentosRoutes);

// --- Rutas de Bienvenida y Salud ---
app.get("/", (req, res) => {
  res.json({
    message: "API de Trazabilidad de Contabilidad está corriendo.",
    status: "active",
  });
});

// --- Manejo de errores 404 (Rutas no encontradas) ---
app.use((req, res, next) => {
  res.status(404).json({
    message: "Ruta no encontrada",
  });
});

// --- Error handler global ---
app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  console.error(`Error global (Status: ${statusCode}):`, error);

  res.status(statusCode).json({
    message: error.message || "Error interno del servidor",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

export default app;
