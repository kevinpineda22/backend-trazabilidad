import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Importa el guardia
import {
    getHistorialEmpleadosAdmin,
    getHistorialProveedoresAdmin,
    getHistorialClientesAdmin,
    getDashboardStats,
} from "../controllers/adminContabilidadController.js"; // Importa las acciones del admin

const router = express.Router();

// Todas las rutas aquí están protegidas por authMiddleware
router.get(
    '/historial-empleados',
    authMiddleware,
    getHistorialEmpleadosAdmin
);

router.get(
    '/historial-proveedores',
    authMiddleware,
    getHistorialProveedoresAdmin
);

router.get(
    '/historial-clientes',
    authMiddleware,
    getHistorialClientesAdmin
);

router.get(
    '/dashboard-stats',
    authMiddleware,
    getDashboardStats
);

export default router;