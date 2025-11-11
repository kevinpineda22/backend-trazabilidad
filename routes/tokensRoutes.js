// routes/tokensRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  generarToken,
  validarToken,
  listarTokens,
} from "../controllers/tokensController.js";

const router = express.Router();

// Rutas protegidas (requieren autenticación)
router.post("/generar", authMiddleware, generarToken);
router.get("/listar", authMiddleware, listarTokens);

// Ruta pública (no requiere autenticación)
router.get("/validar/:token", validarToken);

export default router;
