// src/routes/adminContabilidadRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Importa el guardia
import {
    getHistorialEmpleadosAdmin,
    getHistorialProveedoresAdmin,
    getHistorialClientesAdmin,
    getDashboardStats,
} from "../controllers/adminContabilidadController.js"; // Importa las acciones del admin

const router = express.Router();

// --- Definición de Rutas de Admin ---
// Todas las rutas aquí están protegidas y asumen un rol de administrador
// (La autorización específica del rol 'admin' se puede añadir en el middleware si es necesario)

/**
 * @route   GET /api/trazabilidad/admin/historial-empleados
 * @desc    Obtener el historial COMPLETO de empleados
 * @access  Privado (Admin)
 */
router.get(
    '/historial-empleados',
    authMiddleware,
    getHistorialEmpleadosAdmin
);

/**
 * @route   GET /api/trazabilidad/admin/historial-proveedores
 * @desc    Obtener el historial COMPLETO de proveedores
 * @access  Privado (Admin)
 */
router.get(
    '/historial-proveedores',
    authMiddleware,
    getHistorialProveedoresAdmin
);

/**
 * @route   GET /api/trazabilidad/admin/historial-clientes
 * @desc    Obtener el historial COMPLETO de clientes
 * @access  Privado (Admin)
 */
router.get(
    '/historial-clientes',
    authMiddleware,
    getHistorialClientesAdmin
);

/**
 * @route   GET /api/trazabilidad/admin/dashboard-stats
 * @desc    Obtener estadísticas para el dashboard del admin
 * @access  Privado (Admin)
 */
router.get(
    '/dashboard-stats',
    authMiddleware,
    getDashboardStats
);

export default router;
