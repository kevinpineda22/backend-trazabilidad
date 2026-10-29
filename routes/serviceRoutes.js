import express from "express";
import { serviceApiKey, crearLimitadores } from "../middlewares/serviceApiKey.js";
import { listarEmpleadosActivosServicio } from "../services/empleadosServicio.js";

// Superficie servicio-a-servicio: solo x-api-key, nunca el JWT de usuario
// (authMiddleware no se consulta). Orden: limiter de fallos por IP -> clave ->
// limiter por consumidor.
// `limites` permite bajar los topes en pruebas; en produccion se usan los defaults.
export function crearServiceRouter(limites) {
  const router = express.Router();
  const { fallosPorIp, porConsumidor } = crearLimitadores(limites);

  router.use(fallosPorIp, serviceApiKey, porConsumidor);

  router.get("/empleados-activos", async (_req, res) => {
    try {
      const { data, actualizado } = await listarEmpleadosActivosServicio();
      return res.json({ data, total: data.length, actualizado });
    } catch (error) {
      console.error("service/empleados-activos fallo:", error?.message || error);
      return res.status(502).json({ message: "No se pudo consultar la fuente de empleados." });
    }
  });

  return router;
}

export default crearServiceRouter();
