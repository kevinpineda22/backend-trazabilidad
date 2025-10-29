import express from 'express';
import multer from 'multer';
import { 
    createProveedorContabilidad, 
    getHistorialProveedores 
} from '../controllers/proveedoresContabilidadController.js';

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
        { name: 'rut', maxCount: 1 },
        { name: 'camara_comercio', maxCount: 1 },
        { name: 'certificacion_bancaria', maxCount: 1 },
        { name: 'formato_vinculacion', maxCount: 1 },
        { name: 'composicion_accionaria', maxCount: 1 },
    ]),
    createProveedorContabilidad
);

// =========================================================================
// RUTA DE LECTURA (GET) - ACCESO PÚBLICO
// =========================================================================
router.get(
    '/historial', 
    getHistorialProveedores
);


export default router;