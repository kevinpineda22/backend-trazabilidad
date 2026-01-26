import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getHistorialEmpleadosAdmin,
  getHistorialProveedoresAdmin,
  getHistorialClientesAdmin,
  getDashboardStats,
  getExpedienteProveedorAdmin,
  getExpedienteClienteAdmin,
  getExpedienteEmpleadoAdmin,
  archivarEntidad,
  restaurarEntidad,
  marcarEntidadCreada, // Nuevo controlador
} from "../controllers/adminContabilidadController.js";

const router = express.Router();

// Rutas de Admin (Acceso Público / Recibe peticiones GET)

router.get("/historial-empleados", authMiddleware, getHistorialEmpleadosAdmin);

router.get(
  "/historial-proveedores",
  authMiddleware,
  getHistorialProveedoresAdmin,
);

router.get("/historial-clientes", authMiddleware, getHistorialClientesAdmin);

router.get("/dashboard-stats", authMiddleware, getDashboardStats);

router.get(
  "/expediente-proveedor/:id",
  authMiddleware,
  getExpedienteProveedorAdmin,
);

router.get(
  "/expediente-cliente/:id",
  authMiddleware,
  getExpedienteClienteAdmin,
);

router.get(
  "/expediente-empleado/:id",
  authMiddleware,
  getExpedienteEmpleadoAdmin,
);

// Rutas para archivar/restaurar entidades
router.post("/archivar-entidad", authMiddleware, archivarEntidad);
router.post("/restaurar-entidad", authMiddleware, restaurarEntidad);
router.post("/marcar-creado", authMiddleware, marcarEntidadCreada); // Nueva ruta

export default router;
