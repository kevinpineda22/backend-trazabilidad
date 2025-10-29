import express from 'express';
import multer from 'multer';
import { 
    createClienteContabilidad, 
    getHistorialClientes 
} from '../controllers/clientesContabilidadController.js';

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
        { name: 'rut_cliente', maxCount: 1 },
    ]),
    createClienteContabilidad
);

// =========================================================================
// RUTA DE LECTURA (GET) - ACCESO PÚBLICO
// =========================================================================
router.get(
    '/historial', 
    getHistorialClientes
);


export default router;