// src/services/apiTrazabilidad.js
import axios from "axios";
import { toast } from "react-toastify";

// Base URL sin slash final, desde env o fallback
const BASE =
  (import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL || "https://backend-trazabilidad.vercel.app").replace(/\/+$/, "");

// No fijamos Content-Type aquí para no romper FormData
const apiTrazabilidad = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
  withCredentials: false, // Usas Authorization: Bearer, no cookies
});

// Si cambias tu fuente de token (p. ej. Supabase), actualiza aquí
const getAuthToken = () => {
  const token = localStorage.getItem("token");
  return token || null;
};

// REQUEST: adjunta Authorization y maneja correctamente FormData
apiTrazabilidad.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      // Deja que el navegador ponga el boundary correcto
      if (config.headers && config.headers["Content-Type"]) {
        delete config.headers["Content-Type"];
      }
    } else {
      // Para JSON, refuerza Content-Type si no viene definido
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE: manejo 401/403/red
apiTrazabilidad.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      if (!location.pathname.startsWith("/login")) {
        toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } else if (error.message === "Network Error") {
      toast.error("Error de red. Verifica tu conexión o el servidor.");
    } else if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
      toast.error("La solicitud tardó demasiado. Intenta nuevamente.");
    }

    return Promise.reject(error);
  }
);

export { apiTrazabilidad };
