import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    createClienteContabilidad,
    getHistorialClientes,
} from "../controllers/clientesContabilidadController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Definir el campo de archivo esperado
const clienteUploadFields = [
    { name: 'rut_cliente', maxCount: 1 }
];

router.post(
    '/',
    authMiddleware,
    upload.fields(clienteUploadFields),
    createClienteContabilidad
);

router.get(
    '/historial',
    authMiddleware,
    getHistorialClientes
);

export default router;