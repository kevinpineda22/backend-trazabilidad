import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createClienteContabilidad,
  getHistorialClientes,
} from "../controllers/clientesContabilidadController.js";

const router = express.Router();

// Rutas de Clientes (Acceso Público / Recibe JSON con URLs)

router.post("/", authMiddleware, createClienteContabilidad);

router.get("/historial", authMiddleware, getHistorialClientes);

export default router;
