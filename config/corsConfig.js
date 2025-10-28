// src/config/corsConfig.js
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// La seguridad real es el authMiddleware. Abrimos CORS para evitar problemas de despliegue.

// La lista de orígenes se mantiene solo para referencias, pero la lógica de CORS
// usará el comodín (origin: true) para permitir cualquier origen.
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = rawAllowedOrigins.split(",").map(o => o.trim()).filter(Boolean);

const corsOptions = {
  // Configuración clave: permitir cualquier origen
  origin: (origin, callback) => {
    callback(null, true);
  },
  
  // Es CRÍTICO que esto sea 'true' ya que el frontend envía tokens de autenticación.
  credentials: true, 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

// Exportamos ambos middlewares con la misma configuración
export const corsMiddleware = cors(corsOptions);
export const preflightCorsMiddleware = cors(corsOptions);
export const allowedCorsOrigins = allowedOrigins;