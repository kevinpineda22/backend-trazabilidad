// src/routes/clientesContabilidadRoutes.js
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
    { name: 'rut', maxCount: 1 }
];

/**
 * @route   POST /api/trazabilidad/clientes/
 * @desc    Crear un nuevo registro de cliente (con RUT)
 * @access  Privado
 */
router.post(
    '/',
    authMiddleware,
    upload.fields(clienteUploadFields),
    createClienteContabilidad
);

/**
 * @route   GET /api/trazabilidad/clientes/historial
 * @desc    Obtener el historial de clientes creados por el usuario
 * @access  Privado
 */
router.get(
    '/historial',
    authMiddleware,
    getHistorialClientes
);

export default router;
