// src/routes/proveedoresContabilidadRoutes.js
import express from "express";
import multer from "multer";
import { preflightCorsMiddleware } from "../config/corsConfig.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createProveedorContabilidad,
  getHistorialProveedores,
} from "../controllers/proveedoresContabilidadController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const proveedorUploadFields = [
  { name: "rut", maxCount: 1 },
  { name: "camara_comercio", maxCount: 1 },
  { name: "formato_vinculacion", maxCount: 1 },
  { name: "composicion_accionaria", maxCount: 1 },
  { name: "certificacion_bancaria", maxCount: 1 },
];

router.options("/", preflightCorsMiddleware, (req, res) => {
  res.sendStatus(204);
});

router.post(
  "/",
  authMiddleware,
  upload.fields(proveedorUploadFields),
  createProveedorContabilidad
);

router.get("/historial", authMiddleware, getHistorialProveedores);

export default router;
