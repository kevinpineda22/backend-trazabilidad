// src/routes/clientesContabilidadRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createClienteContabilidad,
  getHistorialClientes,
  updateClienteContabilidad,
  getExpedienteClienteAdmin,
} from "../controllers/clientesContabilidadController.js";

const router = express.Router();

router.post("/", authMiddleware, createClienteContabilidad);

router.get("/historial", authMiddleware, getHistorialClientes);

router.get("/admin/expediente/:id", authMiddleware, getExpedienteClienteAdmin);

// --- 2. AÑADE ESTA NUEVA RUTA PATCH ---
router.patch(
  "/:id", // :id es el ID del registro de cliente
  authMiddleware,
  updateClienteContabilidad
);
// ---------------------------------

export default router;
