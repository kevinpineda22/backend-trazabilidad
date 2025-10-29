// index.js (o server.js)
import express from "express";
import cors from "cors";

const app = express();

const allowlist = [
  "http://localhost:5173",           // dev
  "https://merkahorro.com/"   // prod (ajusta tu dominio)
];

const corsOptions = {
  origin(origin, cb) {
    // Permite también tools como Postman (sin origin)
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false, // si usas cookies pon true y NO uses "*"
  optionsSuccessStatus: 204,
};

// CORS global + preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ... tus middlewares y rutas:
app.use(express.json());
// app.use("/api/trazabilidad", trazabilidadRouter);
// etc.

app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;
