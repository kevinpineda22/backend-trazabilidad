import express from "express";
import {
  listarCarpetas,
  crearCarpeta,
  eliminarCarpeta,
  listarArchivos,
  crearArchivo,
  eliminarArchivo,
} from "../controllers/archivadorController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware); // Todas las rutas del archivador requieren autenticación

// Carpetas
router.get("/carpetas/:tipo/:id", listarCarpetas);
router.post("/carpetas", crearCarpeta);
router.delete("/carpetas/:id", eliminarCarpeta);

// Archivos
router.get("/archivos/:carpetaId", listarArchivos);
router.post("/archivos", crearArchivo);
router.delete("/archivos/:id", eliminarArchivo);

export default router;
