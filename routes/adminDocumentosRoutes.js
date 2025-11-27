import express from "express";
import {
  listarDocumentos,
  crearDocumento,
  eliminarDocumento,
} from "../controllers/adminDocumentosController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware); // Proteger todas las rutas de administración

router.get("/", listarDocumentos);
router.post("/", crearDocumento);
router.delete("/:id", eliminarDocumento);

export default router;
