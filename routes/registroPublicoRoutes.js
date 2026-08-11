// routes/registroPublicoRoutes.js
import express from "express";
import {
  registrarEmpleadoPublico,
  registrarClientePublico,
  registrarProveedorPublico,
} from "../controllers/registroPublicoController.js";
import { listarDocumentosPublicos } from "../controllers/adminDocumentosController.js";
import {
  getClausulasVigentes,
  descargarComprobantePublico,
} from "../controllers/comprobantesController.js";

const router = express.Router();

// Rutas públicas (NO requieren autenticación)
router.get("/documentos/:tipo", listarDocumentosPublicos);

// Texto legal vigente que debe mostrar y firmar el formulario
router.get("/clausulas", getClausulasVigentes);

// Comprobante descargable por la contraparte tras enviar el formulario
router.get("/comprobante/:tipo/:token", descargarComprobantePublico);
router.post("/empleado/:token", registrarEmpleadoPublico);
router.post("/cliente/:token", registrarClientePublico);
router.post("/proveedor/:token", registrarProveedorPublico);

export default router;
