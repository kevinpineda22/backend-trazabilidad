import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getHistorialEmpleadosAdmin,
  getHistorialProveedoresAdmin,
  getHistorialClientesAdmin,
  getDashboardStats,
} from "../controllers/adminContabilidadController.js";

const router = express.Router();

// Rutas de Admin (Acceso Público / Recibe peticiones GET)

router.get("/historial-empleados", authMiddleware, getHistorialEmpleadosAdmin);

router.get(
  "/historial-proveedores",
  authMiddleware,
  getHistorialProveedoresAdmin
);

router.get("/historial-clientes", authMiddleware, getHistorialClientesAdmin);

router.get("/dashboard-stats", authMiddleware, getDashboardStats);

export default router;
