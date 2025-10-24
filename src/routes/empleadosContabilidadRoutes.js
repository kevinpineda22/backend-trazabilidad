// src/routes/empleadosContabilidadRoutes.js
import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    createEmpleadoContabilidad,
    getHistorialEmpleados,
} from "../controllers/empleadosContabilidadController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Campos de archivo esperados
const empleadoUploadFields = [
    { name: 'hoja_de_vida', maxCount: 1 },
    { name: 'cedula_file', maxCount: 1 }, // Coincide con el FormData del frontend
    { name: 'certificado_bancario', maxCount: 1 }
];

router.post(
    '/',
    authMiddleware,
    upload.fields(empleadoUploadFields),
    createEmpleadoContabilidad
);

router.get(
    '/historial',
    authMiddleware,
    getHistorialEmpleados
);

export default router;
