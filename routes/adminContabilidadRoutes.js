import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getHistorialEmpleadosAdmin,
  getHistorialProveedoresAdmin,
  getHistorialClientesAdmin,
  getDashboardStats,
  getExpedienteProveedorAdmin,
  getExpedienteClienteAdmin,
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

router.get(
  "/expediente-proveedor/:id",
  authMiddleware,
  getExpedienteProveedorAdmin
);

router.get(
  "/expediente-cliente/:id",
  authMiddleware,
  getExpedienteClienteAdmin
);

export default router;
