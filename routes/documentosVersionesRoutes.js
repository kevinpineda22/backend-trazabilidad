import express from "express";
import {
  reemplazarDocumento,
  getHistorialDocumento,
  cargarDocumento,
} from "../controllers/documentosVersionesController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.patch("/reemplazar", reemplazarDocumento);
router.post("/cargar", cargarDocumento);
router.get("/historial/:tipo/:id", getHistorialDocumento);

export default router;
