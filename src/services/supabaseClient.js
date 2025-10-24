// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Faltan las variables de entorno de Supabase (SUPABASE_URL o SUPABASE_KEY).");
    process.exit(1); // Detiene la aplicación si no puede conectar
}

/**
 * Cliente de Supabase (oficial).
 * Lo usaremos principalmente para interactuar con el 'Storage' (subir archivos).
 */
export const storageClient = createClient(supabaseUrl, supabaseKey);

/**
 * Cliente Axios para consultas a la base de datos (PostgREST).
 * Esto nos da un control más familiar sobre las solicitudes de API (GET, POST, PATCH).
 */
export const supabaseAxios = axios.create({
    baseURL: `${supabaseUrl}/rest/v1`, // Apunta a la API REST de Supabase
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`, // Clave de servicio para permisos de admin
        'Content-Type': 'application/json',
    }
});

// Opcional: Añadir un interceptor para manejar errores de Supabase
supabaseAxios.interceptors.response.use(
    (response) => response, // Pasa la respuesta exitosa
    (error) => {
        // Imprimir un error más claro en la consola del backend
        if (error.response) {
            console.error("Error de Supabase API:", {
                status: error.response.status,
                message: error.response.data.message,
                details: error.response.data.details,
                hint: error.response.data.hint,
                config: {
                    method: error.config.method,
                    url: error.config.url,
                    data: error.config.data,
                },
            });
        }
        // Rechazar la promesa para que el 'catch' en el controlador se active
        return Promise.reject(error);
    }
);