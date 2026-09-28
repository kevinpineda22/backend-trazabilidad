import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
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
import documentosVersionesRoutes from "./routes/documentosVersionesRoutes.js";
import archivadorRoutes from "./routes/archivadorRoutes.js";
import empleadosSiesaRoutes from "./routes/empleadosSiesaRoutes.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar en el proxy de Vercel para obtener la IP real del cliente
app.set("trust proxy", 1);

// Aplicar CORS middleware global
app.use(corsMiddleware);

// Respuestas con datos de usuario: ninguna caché compartida (proxy, CDN) las
// guarda. Con `public`, una respuesta guardada para merkahorro.com le llegaba a
// www.merkahorro.com con el Allow-Origin equivocado y el navegador la bloqueaba.
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas solicitudes, intenta más tarde.",
  },
  validate: { xForwardedForHeader: false },
});
app.use(globalLimiter);

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
app.use(`${apiBase}/documentos-versiones`, documentosVersionesRoutes);
app.use(`${apiBase}/archivador`, archivadorRoutes);
// Nómina activa desde SIESA: la usa el panel de fotos para ponerle nombre a
// cada cédula. Solo lectura.
app.use(`${apiBase}/empleados-siesa`, empleadosSiesaRoutes);

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
