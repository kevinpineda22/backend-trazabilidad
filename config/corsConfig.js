// src/config/corsConfig.js
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

/**
 * Abrimos CORS a cualquier origen (origin: true) y permitimos credenciales.
 * Agregamos:
 * - optionsSuccessStatus: 204  (mejor para algunos navegadores)
 * - maxAge: 86400              (cachea preflight 24h)
 * - exposedHeaders: Content-Disposition (para descargas)
 */
const corsOptions = {
  origin: (origin, callback) => {
    // permite todos los orígenes; si necesitas cerrar en futuro, aquí es el punto
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Disposition"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
  preflightContinue: false,
};

export const corsMiddleware = cors(corsOptions);
export const preflightCorsMiddleware = cors(corsOptions);
