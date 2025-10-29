import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createProveedorContabilidad,
  getHistorialProveedores,
} from "../controllers/proveedoresContabilidadController.js";

const router = express.Router();

// Rutas de Proveedores (Acceso Público / Recibe JSON con URLs)

router.post("/", authMiddleware, createProveedorContabilidad);

router.get("/historial", authMiddleware, getHistorialProveedores);

export default router;
