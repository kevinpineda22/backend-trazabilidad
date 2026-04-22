import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { supabaseAxios } from '../services/supabaseClient.js';

dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
    console.error("Error: Falta SUPABASE_JWT_SECRET en .env. El middleware de autenticación no puede funcionar.");
}

/**
 * Middleware para verificar el token JWT de Supabase y cargar el perfil del usuario.
 */
export const authMiddleware = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204); 
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Acceso denegado. No se proporcionó token válido." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        const userId = decoded.sub;

        // Intentar obtener el rol desde la tabla profiles
        let userRole = decoded.role; // Fallback al rol del JWT
        let userData = {};

        try {
            const { data: profile } = await supabaseAxios.get(`/profiles?user_id=eq.${userId}&select=role,nombre,area`);
            if (profile && profile.length > 0) {
                userRole = profile[0].role;
                userData = profile[0];
            }
        } catch (dbError) {
            console.warn("No se pudo obtener el perfil del usuario desde la DB, usando rol del JWT:", dbError.message);
        }
        
        req.user = {
            id: userId,
            email: decoded.email,
            role: userRole,
            nombre: userData.nombre,
            area: userData.area
        };

        next();

    } catch (error) {
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

/**
 * Middleware para autorizar roles específicos.
 * @param {...string} allowedRoles - Roles permitidos para acceder a la ruta.
 */
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: "No autenticado o rol no encontrado." });
        }

        if (allowedRoles.includes(req.user.role) || req.user.role === 'super_admin') {
            return next();
        }

        return res.status(403).json({ 
            message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}` 
        });
    };
};