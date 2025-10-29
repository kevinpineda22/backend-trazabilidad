import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// CORS Abierto: permite cualquier origen y el envío de credenciales.
const corsOptions = {
  // CONFIGURACIÓN CLAVE: Permite cualquier origen (origin: true)
  origin: (origin, callback) => {
    callback(null, true);
  },
  
  // CRÍTICO: Debe ser true para permitir el envío de tokens (si estuvieran activos).
  credentials: true, 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

export const corsMiddleware = cors(corsOptions);