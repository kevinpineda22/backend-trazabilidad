import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
    console.error("Error: Falta SUPABASE_JWT_SECRET en .env. El middleware de autenticación no puede funcionar.");
    // No salimos para permitir que Vercel build exitosamente, pero el log queda.
}

/**
 * Middleware para verificar el token JWT de Supabase, terminando la petición
 * OPTIONS si es el caso.
 */
export const authMiddleware = (req, res, next) => {
    // === SOLUCIÓN CLAVE: Terminar la petición OPTIONS ===
    // Si es una petición OPTIONS, significa que solo estamos pidiendo los headers
    // de CORS. Si el corsMiddleware global ya actuó, podemos responder 204.
    if (req.method === 'OPTIONS') {
        // En Express, después de que CORS global actuó (en app.js), la petición
        // OPTIONS debería tener los headers. Responder 204 (No Content) y finalizar.
        return res.sendStatus(204); 
    }

    // 1. Obtener el header de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Acceso denegado. No se proporcionó token." });
    }

    // 2. Extraer el token (formato: "Bearer TOKEN...")
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. Token mal formado." });
    }

    try {
        // 3. Verificar el token con el secreto de Supabase
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        
        // 4. Adjuntar la información del usuario a la solicitud (req)
        req.user = {
            id: decoded.sub, 
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
        return res.status(500).json({ message: "Error interno al validar la autenticación." });
    }
};