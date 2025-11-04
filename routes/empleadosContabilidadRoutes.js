// src/routes/empleadosContabilidadRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createEmpleadoContabilidad,
  getHistorialEmpleados,
  getExpedienteEmpleadoAdmin,
  updateEmpleadoContabilidad, // <-- 1. IMPORTA LA NUEVA FUNCIÓN
} from "../controllers/empleadosContabilidadController.js";

const router = express.Router();

// Rutas de Empleados (Acceso Privado / Recibe JSON con URLs)

router.post("/", authMiddleware, createEmpleadoContabilidad);

router.get("/historial", authMiddleware, getHistorialEmpleados);

router.get(
  "/admin/expediente/:id", 
  authMiddleware,
  getExpedienteEmpleadoAdmin
);

// --- 2. AÑADE ESTA NUEVA RUTA PATCH ---
router.patch(
  "/:id", // :id es el ID del registro de empleado
  authMiddleware,
  updateEmpleadoContabilidad
);
// ---------------------------------

export default router;