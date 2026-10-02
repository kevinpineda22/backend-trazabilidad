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
import { descargarComprobanteAdmin } from "../controllers/comprobantesController.js";
import {
  listarContratosEmpleados,
  obtenerContratoEmpleado,
  obtenerContratoPorCedula,
} from "../controllers/contratosSiesaController.js";
import {
  verRestricciones,
  actualizarRestricciones,
} from "../controllers/restriccionesController.js";

const router = express.Router();

// --- Roles Permitidos ---
const ADMIN_ROLES = ["super_admin", "admin"];
const EMPLEADO_ROLES = [...ADMIN_ROLES, "admin_empleado", "admin_tesoreria"];
// Restricciones del empleado: suelen ser médicas o laborales (dato sensible).
// Tesorería solo ve certificado bancario y cédula; no entra acá.
const RESTRICCIONES_ROLES = [...ADMIN_ROLES, "admin_empleado"];
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

// Contrato en SIESA (estado, cargo, sede). Mismos roles que el historial de
// empleados. La lista trae la nómina completa (activos y retirados), sin el
// motivo de retiro; el motivo solo va en el detalle.
router.get("/contratos-empleados", authMiddleware, authorizeRoles(...EMPLEADO_ROLES), listarContratosEmpleados);
router.get("/contrato-empleado/:id", authMiddleware, authorizeRoles(...EMPLEADO_ROLES), obtenerContratoEmpleado);
router.get("/contrato-cedula/:cedula", authMiddleware, authorizeRoles(...EMPLEADO_ROLES), obtenerContratoPorCedula);

// Restricciones del empleado, por cédula (sirve con o sin Hoja de Vida).
router.get("/restricciones/:cedula", authMiddleware, authorizeRoles(...RESTRICCIONES_ROLES), verRestricciones);
router.put("/restricciones/:cedula", authMiddleware, authorizeRoles(...RESTRICCIONES_ROLES), actualizarRestricciones);

// Comprobante SAGRILAFT descargable (soporte de aceptación de cláusulas)
router.get("/comprobante/:tipo/:id", authMiddleware, authorizeRoles(...CLIENTE_PROVEEDOR_ROLES), descargarComprobanteAdmin);

// Rutas de Gestión (Archivar/Restaurar/Marcar Creado)
// Se permite a los roles respectivos gestionar sus entidades
router.post("/archivar-entidad", authMiddleware, archivarEntidad);
router.post("/restaurar-entidad", authMiddleware, restaurarEntidad);
router.post("/marcar-creado", authMiddleware, marcarEntidadCreada);

export default router;
