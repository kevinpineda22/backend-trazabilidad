// src/routes/proveedoresContabilidadRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createProveedorContabilidad,
  getHistorialProveedores,
  updateProveedorContabilidad, // <-- 1. IMPORTA LA NUEVA FUNCIÓN
} from "../controllers/proveedoresContabilidadController.js";

const router = express.Router();

router.post("/", authMiddleware, createProveedorContabilidad);

router.get("/historial", authMiddleware, getHistorialProveedores);

// --- 2. AÑADE ESTA NUEVA RUTA PATCH ---
router.patch(
  "/:id", // :id es el ID del registro de proveedor
  authMiddleware,
  updateProveedorContabilidad
);
// ---------------------------------

export default router;