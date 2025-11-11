// routes/registroPublicoRoutes.js
import express from "express";
import {
  registrarEmpleadoPublico,
  registrarClientePublico,
  registrarProveedorPublico,
} from "../controllers/registroPublicoController.js";

const router = express.Router();

// Rutas públicas (NO requieren autenticación)
router.post("/empleado/:token", registrarEmpleadoPublico);
router.post("/cliente/:token", registrarClientePublico);
router.post("/proveedor/:token", registrarProveedorPublico);

export default router;
