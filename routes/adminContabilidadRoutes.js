import express from "express";
import { authMiddleware, authorizeRoles } from "../middlewares/authMiddleware.js";
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

// --- Roles Permitidos ---
const ADMIN_ROLES = ["super_admin", "admin"];
const EMPLEADO_ROLES = [...ADMIN_ROLES, "admin_empleado"];
const CLIENTE_PROVEEDOR_ROLES = [...ADMIN_ROLES, "admin_cliente", "admin_proveedor", "admin_tesoreria"];

// Rutas de Historial (Solo lectura con roles específicos)
router.get("/historial-empleados", authMiddleware, authorizeRoles(...EMPLEADO_ROLES), getHistorialEmpleadosAdmin);
router.get("/historial-proveedores", authMiddleware, authorizeRoles(...CLIENTE_PROVEEDOR_ROLES), getHistorialProveedoresAdmin);
router.get("/historial-clientes", authMiddleware, authorizeRoles(...CLIENTE_PROVEEDOR_ROLES), getHistorialClientesAdmin);

// Dashboard (Acceso general para todos los admins)
router.get("/dashboard-stats", authMiddleware, getDashboardStats);

// Expedientes Detallados
router.get("/expediente-proveedor/:id", authMiddleware, authorizeRoles(...CLIENTE_PROVEEDOR_ROLES), getExpedienteProveedorAdmin);
router.get("/expediente-cliente/:id", authMiddleware, authorizeRoles(...CLIENTE_PROVEEDOR_ROLES), getExpedienteClienteAdmin);
router.get("/expediente-empleado/:id", authMiddleware, authorizeRoles(...EMPLEADO_ROLES), getExpedienteEmpleadoAdmin);

// Rutas de Gestión (Archivar/Restaurar/Marcar Creado)
// Se permite a los roles respectivos gestionar sus entidades
router.post("/archivar-entidad", authMiddleware, archivarEntidad);
router.post("/restaurar-entidad", authMiddleware, restaurarEntidad);
router.post("/marcar-creado", authMiddleware, marcarEntidadCreada);

export default router;
