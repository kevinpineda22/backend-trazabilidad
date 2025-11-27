import express from "express";
import {
  listarDocumentos,
  crearDocumento,
  eliminarDocumento,
} from "../controllers/adminDocumentosController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // Proteger todas las rutas de administración

router.get("/", listarDocumentos);
router.post("/", crearDocumento);
router.delete("/:id", eliminarDocumento);

export default router;
