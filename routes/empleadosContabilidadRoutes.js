// src/routes/empleadosContabilidadRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // REACTIVAMOS AUTH
import {
  createEmpleadoContabilidad,
  getHistorialEmpleados,
  getExpedienteEmpleadoAdmin, // <-- 1. IMPORTA LA NUEVA FUNCIÓN
} from "../controllers/empleadosContabilidadController.js";

const router = express.Router();

// Rutas de Empleados (Acceso Privado / Recibe JSON con URLs)

router.post("/", authMiddleware, createEmpleadoContabilidad);

router.get("/historial", authMiddleware, getHistorialEmpleados);

// --- 2. AÑADE ESTA NUEVA RUTA ---
router.get(
  "/admin/expediente/:id", // :id es el ID del empleado
  authMiddleware,
  getExpedienteEmpleadoAdmin
);
// ---------------------------------

export default router;