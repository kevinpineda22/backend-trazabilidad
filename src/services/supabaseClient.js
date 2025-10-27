// services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
// ⚠️ IMPORTANTE: Acepta tanto SUPABASE_KEY como SUPABASE_SERVICE_ROLE_KEY para compatibilidad
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Faltan variables de entorno críticas:");
  console.error("   - SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
  console.error(
    "   - SUPABASE_SERVICE_ROLE_KEY o SUPABASE_KEY:",
    SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗"
  );

  if (process.env.NODE_ENV !== "development") {
    process.exit(1);
  }
}

/**
 * Cliente de Supabase usando el Service Role Key
 * ⚠️ IMPORTANTE: Este cliente tiene permisos completos y bypasea RLS.
 * Solo usar en backend, NUNCA exponerlo al frontend.
 */
export const storageClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Cliente Axios pre-configurado para usar Supabase REST API
 * Útil para operaciones CRUD más directas con mejor manejo de errores
 */
export const supabaseAxios = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation", // Retorna el objeto creado/actualizado
  },
});

// Interceptor para logging en desarrollo
if (process.env.NODE_ENV === "development") {
  supabaseAxios.interceptors.request.use(
    (config) => {
      console.log(
        `📤 Supabase Request: ${config.method?.toUpperCase()} ${config.url}`
      );
      return config;
    },
    (error) => {
      console.error("❌ Supabase Request Error:", error);
      return Promise.reject(error);
    }
  );

  supabaseAxios.interceptors.response.use(
    (response) => {
      console.log(
        `✅ Supabase Response: ${response.status} ${response.config.url}`
      );
      return response;
    },
    (error) => {
      console.error("❌ Supabase Response Error:", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
      return Promise.reject(error);
    }
  );
}

export default storageClient;
