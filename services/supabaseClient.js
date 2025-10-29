import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Usamos la Service Role Key para tener acceso de escritura total en el backend (Axios/PostgREST)
const supabaseKey = process.env.SUPABASE_KEY; 

// 1. Cliente Axios para PostgREST (Base de Datos)
export const supabaseAxios = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 2. Cliente de Supabase JS para Storage (EL FRONTEND LO USARÁ PARA SUBIR ARCHIVOS)
// Lo exportamos para que el Frontend lo pueda usar para obtener la URL base si lo necesita,
// pero el cliente final lo configurará en el Frontend con la clave pública si usas el SDK en el browser.
// Para el backend (Admin/Lectura), mantenemos el cliente con la clave de servicio.
export const storageClient = createClient(supabaseUrl, supabaseKey);