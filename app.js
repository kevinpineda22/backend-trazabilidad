import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";

import empleadosContabilidadRoutes from "./src/routes/empleadosContabilidadRoutes.js";
import proveedoresContabilidadRoutes from "./src/routes/proveedoresContabilidadRoutes.js";
import clientesContabilidadRoutes from "./src/routes/clientesContabilidadRoutes.js";
import adminContabilidadRoutes from "./src/routes/adminContabilidadRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS debe ir ANTES de las otras configuraciones
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const apiBase = "/api/trazabilidad";
app.use(`${apiBase}/empleados`, empleadosContabilidadRoutes);
app.use(`${apiBase}/proveedores`, proveedoresContabilidadRoutes);
app.use(`${apiBase}/clientes`, clientesContabilidadRoutes);
app.use(`${apiBase}/admin`, adminContabilidadRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API de Trazabilidad de Contabilidad está corriendo.",
    status: "active",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

export default app;
