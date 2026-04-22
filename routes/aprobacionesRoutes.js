// routes/aprobacionesRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  obtenerPendientes,
  aprobarRegistro,
  rechazarRegistro,
  obtenerHistorial,
  obtenerArchivados,
  archivarRegistro,
  restaurarRegistro,
  actualizarRegistroPendiente,
} from "../controllers/aprobacionesController.js";

const router = express.Router();

// Roles permitidos para gestionar aprobaciones
const ALL_ADMIN_ROLES = [
  "super_admin", 
  "admin", 
  "admin_empleado", 
  "admin_cliente", 
  "admin_proveedor", 
  "admin_tesoreria"
];

// Todas las rutas requieren autenticación y rol de administrador
router.get("/pendientes", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), obtenerPendientes);
router.post("/aprobar/:id", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), aprobarRegistro);
router.put("/actualizar/:id", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), actualizarRegistroPendiente);
router.post("/rechazar/:id", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), rechazarRegistro);
router.get("/historial", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), obtenerHistorial);
router.get("/archivados", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), obtenerArchivados);
router.post("/archivar/:id", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), archivarRegistro);
router.post("/restaurar/:id", authMiddleware, authorizeRoles(...ALL_ADMIN_ROLES), restaurarRegistro);

export default router;
