// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Cargar variables de entorno (necesitamos el JWT_SECRET)
dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
    console.error("Error: Falta SUPABASE_JWT_SECRET en .env. El middleware de autenticación no puede funcionar.");
    process.exit(1);
}

/**
 * Middleware para verificar el token JWT de Supabase.
 * Extrae el token del header 'Authorization', lo verifica y
 * adjunta la información del usuario a 'req.user'.
 */
export const authMiddleware = (req, res, next) => {
    // Permitir peticiones OPTIONS (preflight) sin autenticación
    if (req.method === 'OPTIONS') {
        return next();
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
        // Supabase usa el 'sub' (subject) como el user_id
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        
        // 4. Adjuntar la información del usuario a la solicitud (req)
        // Nuestros controladores esperarán req.user.id
        req.user = {
            id: decoded.sub, // 'sub' es el User ID en los tokens de Supabase
            email: decoded.email,
            role: decoded.role,
            // ...puedes añadir más campos del token si los necesitas
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