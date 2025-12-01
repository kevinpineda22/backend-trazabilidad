// routes/aprobacionesRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  obtenerPendientes,
  aprobarRegistro,
  rechazarRegistro,
  obtenerHistorial,
  obtenerArchivados,
  archivarRegistro,
  restaurarRegistro,
} from "../controllers/aprobacionesController.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.get("/pendientes", authMiddleware, obtenerPendientes);
router.post("/aprobar/:id", authMiddleware, aprobarRegistro);
router.post("/rechazar/:id", authMiddleware, rechazarRegistro);
router.get("/historial", authMiddleware, obtenerHistorial);
router.get("/archivados", authMiddleware, obtenerArchivados);
router.post("/archivar/:id", authMiddleware, archivarRegistro);
router.post("/restaurar/:id", authMiddleware, restaurarRegistro);

export default router;
