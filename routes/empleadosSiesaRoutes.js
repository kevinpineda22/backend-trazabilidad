import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { listarEmpleadosActivos } from "../controllers/empleadosSiesaController.js";

const router = express.Router();

// Solo lectura y con sesión. El permiso fino (panel de fotos) lo revisa el
// controlador.
router.get("/", authMiddleware, listarEmpleadosActivos);

export default router;
