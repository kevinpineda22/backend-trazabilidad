import express from 'express';
import multer from 'multer';
import { 
    createEmpleadoContabilidad, 
    getHistorialEmpleados 
} from '../controllers/empleadosContabilidadController.js';

// NOTA: Se ha eliminado la importación de authMiddleware
// NOTA: El middleware de autenticación (authMiddleware) fue removido intencionalmente
// para permitir acceso público a las rutas de creación/historial.

const router = express.Router();
const upload = multer(); // Configuración de Multer para manejar archivos en memoria

// =========================================================================
// RUTA DE CREACIÓN (POST) - ACCESO PÚBLICO
// =========================================================================
router.post(
    '/',
    upload.fields([
        { name: 'url_hoja_de_vida', maxCount: 1 },
        { name: 'url_cedula', maxCount: 1 },
        { name: 'url_certificado_bancario', maxCount: 1 },
    ]),
    createEmpleadoContabilidad
);

// =========================================================================
// RUTA DE LECTURA (GET) - ACCESO PÚBLICO
// =========================================================================
router.get(
    '/historial', 
    getHistorialEmpleados
);


export default router;