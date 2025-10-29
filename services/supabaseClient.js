import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js"; // Usar el SDK para Storage

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 1. Cliente Axios para PostgREST (Base de Datos)
export const supabaseAxios = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    // Usamos la Service Role Key para tener permiso para insertar y actualizar
    apikey: supabaseKey, 
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 2. Cliente de Supabase JS para Storage (Subida de Archivos)
export const storageClient = createClient(supabaseUrl, supabaseKey);