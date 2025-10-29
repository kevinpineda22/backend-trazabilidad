import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
    console.error("Error: Falta SUPABASE_JWT_SECRET en .env. El middleware de autenticación no puede funcionar.");
}

/**
 * Middleware para verificar el token JWT de Supabase, terminando la petición
 * OPTIONS si es el caso.
 */
export const authMiddleware = (req, res, next) => {
    // === Solución de CORS/Vercel: Responder 204 a OPTIONS ===
    if (req.method === 'OPTIONS') {
        // Asumiendo que el corsMiddleware global (en app.js) ya añadió los headers, 
        // terminamos la petición de preflight con 204.
        return res.sendStatus(204); 
    }

    // 1. Obtener el header de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Acceso denegado. No se proporcionó token válido." });
    }

    // 2. Extraer el token (formato: "Bearer TOKEN...")
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verificar el token con el secreto de Supabase
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        
        // 4. Adjuntar la información del usuario a la solicitud (req)
        req.user = {
            id: decoded.sub, // CRÍTICO: El sub es el user_id
            email: decoded.email,
            role: decoded.role,
        };

        // 5. Continuar con el siguiente middleware o controlador
        next();

    } catch (error) {
        // Manejar errores de token (inválido, expirado, etc.)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expirado. Por favor, inicia sesión de nuevo." });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Token inválido." });
        }
        
        console.error("Error en middleware de autenticación:", error);
        return res.status(401).json({ message: "Error de autenticación: Token inválido o no reconocido." });
    }
};