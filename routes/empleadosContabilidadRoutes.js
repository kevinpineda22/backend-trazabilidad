import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // REACTIVAMOS AUTH
import {
    createEmpleadoContabilidad,
    getHistorialEmpleados,
} from "../controllers/empleadosContabilidadController.js";

const router = express.Router();

// Rutas de Empleados (Acceso Privado / Recibe JSON con URLs)

router.post(
    '/',
    authMiddleware, // AHORA REQUIERE TOKEN
    createEmpleadoContabilidad 
);

router.get(
    '/historial',
    authMiddleware, // AHORA REQUIERE TOKEN
    getHistorialEmpleados
);

export default router;