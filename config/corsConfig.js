import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (rawOrigins = "") =>
  rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = Array.from(new Set(parseOrigins(rawAllowedOrigins)));

const isProduction = (process.env.NODE_ENV || "development") === "production";

if (!isProduction && !allowedOrigins.includes("http://localhost:5173")) {
  allowedOrigins.push("http://localhost:5173");
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`CORS Blocked: Origin ${origin} not allowed.`);
    return callback(new Error("Not allowed by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

export const corsMiddleware = cors(corsOptions);
export const preflightCorsMiddleware = cors(corsOptions);
export const allowedCorsOrigins = allowedOrigins;
