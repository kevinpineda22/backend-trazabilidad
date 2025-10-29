import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Configuración de CORS Abierto: permite cualquier origen y el envío de credenciales.
const corsOptions = {
  // CONFIGURACIÓN CLAVE: Se configura la función 'origin' para devolver true
  // Esto permite cualquier origen y hace que el paquete 'cors' maneje la respuesta
  // para 'Access-Control-Allow-Origin' correctamente para solicitudes con credenciales.
  origin: (origin, callback) => {
    callback(null, true);
  },
  
  // CRÍTICO: Debe ser true para permitir que el frontend envíe el token (JWT) en el header.
  credentials: true, 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

// Exportamos un único middleware para usar en app.js
export const corsMiddleware = cors(corsOptions);

// Se elimina 'preflightCorsMiddleware' y 'allowedCorsOrigins' no utilizados.