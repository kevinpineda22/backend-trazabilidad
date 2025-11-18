import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getHistorialEmpleadosAdminTraz,
  getHistorialProveedoresAdminTraz,
  getHistorialClientesAdminTraz,
  getExpedienteEmpleadoAdminTraz,
  getExpedienteProveedorAdminTraz,
  getExpedienteClienteAdminTraz,
  getDashboardStatsAdminTraz,
} from "../controllers/adminTrazabilidadController.js";

const router = express.Router();

// Rutas de AdminTrazabilidad

router.get(
  "/historial-empleados",
  authMiddleware,
  getHistorialEmpleadosAdminTraz
);

router.get(
  "/historial-proveedores",
  authMiddleware,
  getHistorialProveedoresAdminTraz
);

router.get(
  "/historial-clientes",
  authMiddleware,
  getHistorialClientesAdminTraz
);

router.get(
  "/expediente-empleado/:id",
  authMiddleware,
  getExpedienteEmpleadoAdminTraz
);

router.get(
  "/expediente-proveedor/:id",
  authMiddleware,
  getExpedienteProveedorAdminTraz
);

router.get(
  "/expediente-cliente/:id",
  authMiddleware,
  getExpedienteClienteAdminTraz
);

router.get("/dashboard-stats", authMiddleware, getDashboardStatsAdminTraz);

export default router;
