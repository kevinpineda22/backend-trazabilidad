// routes/registroPublicoRoutes.js
import express from "express";
import {
  registrarEmpleadoPublico,
  registrarClientePublico,
  registrarProveedorPublico,
} from "../controllers/registroPublicoController.js";
import { listarDocumentosPublicos } from "../controllers/adminDocumentosController.js";

const router = express.Router();

// Rutas públicas (NO requieren autenticación)
router.get("/documentos/:tipo", listarDocumentosPublicos);
router.post("/empleado/:token", registrarEmpleadoPublico);
router.post("/cliente/:token", registrarClientePublico);
router.post("/proveedor/:token", registrarProveedorPublico);

export default router;
