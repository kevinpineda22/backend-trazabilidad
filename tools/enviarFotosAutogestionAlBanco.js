// tools/enviarFotosAutogestionAlBanco.js
//
// Script de UNA SOLA VEZ (2026-09-30). Copia al banco de fotos las fotos de
// autogestión de los empleados que se aprobaron ANTES de que existiera el
// reenvío automático en `aprobarRegistro`.
//
// Usa exactamente el mismo camino que la aprobación (`enviarFotoAlBanco` →
// Edge Function `foto-empleado-autogestion`), así que valen las mismas reglas:
//   - solo empleados con `autoriza_uso_imagen = true` (NULL = no consta un
//     "sí": no se envía);
//   - entra con `verificada = false`, Gestión Humana la aprueba en el panel;
//   - NUNCA pisa una foto ya verificada (queda como `ya_aprobada`).
//
// Se puede correr más de una vez: lo ya enviado vuelve a entrar como pendiente
// (misma imagen) o se salta si ya está aprobado.
//
// Uso (desde la raíz de backendTrazabilidad, con el .env que tenga
// SUPABASE_URL, SUPABASE_KEY, FOTOS_AUTOGESTION_URL y FOTOS_AUTOGESTION_CLAVE):
//
//   node tools/enviarFotosAutogestionAlBanco.js            # simulación: no envía nada
//   node tools/enviarFotosAutogestionAlBanco.js --aplicar  # envía

import { supabaseAxios } from "../services/supabaseClient.js";
import { enviarFotoAlBanco } from "../services/bancoFotosService.js";

const APLICAR = process.argv.includes("--aplicar");
// Una a la vez y con pausa: el proyecto B es plan free, y esto no tiene apuro.
const PAUSA_MS = 300;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const { data: conFoto } = await supabaseAxios.get(
    "/empleados_contabilidad?select=cedula,nombre,apellidos,url_foto_perfil,autoriza_uso_imagen" +
      "&url_foto_perfil=not.is.null&order=cedula.asc",
  );

  const autorizados = conFoto.filter((e) => e.autoriza_uso_imagen === true);
  const noAutorizaron = conFoto.filter((e) => e.autoriza_uso_imagen === false);
  const sinDato = conFoto.filter((e) => e.autoriza_uso_imagen === null);

  console.log(`Empleados con foto de autogestión: ${conFoto.length}`);
  console.log(`  autorizaron el uso ........ ${autorizados.length}  → se envían`);
  console.log(`  NO autorizaron ............ ${noAutorizaron.length}  → se omiten`);
  console.log(`  sin dato de autorización .. ${sinDato.length}  → se omiten (no consta un "sí")`);

  if (!APLICAR) {
    console.log("\nSimulación: no se envió nada. Para enviar, agregue --aplicar.");
    return;
  }

  if (!process.env.FOTOS_AUTOGESTION_URL || !process.env.FOTOS_AUTOGESTION_CLAVE) {
    console.error("\nFaltan FOTOS_AUTOGESTION_URL / FOTOS_AUTOGESTION_CLAVE en el .env.");
    process.exitCode = 1;
    return;
  }

  const conteo = {};
  const fallidos = [];

  for (const [i, e] of autorizados.entries()) {
    const r = await enviarFotoAlBanco({
      cedula: e.cedula,
      urlFoto: e.url_foto_perfil,
      autorizaUso: e.autoriza_uso_imagen,
    });
    conteo[r.estado] = (conteo[r.estado] ?? 0) + 1;
    if (r.estado === "error" || r.estado === "omitida") {
      fallidos.push({ cedula: e.cedula, nombre: `${e.nombre} ${e.apellidos}`, ...r });
    }
    console.log(`[${i + 1}/${autorizados.length}] ${e.cedula} → ${r.estado}${r.motivo ? ` (${r.motivo})` : ""}`);
    await esperar(PAUSA_MS);
  }

  console.log("\nResumen:", conteo);
  if (fallidos.length) {
    console.log("\nNo llegaron al banco (subirlas a mano desde el panel de fotos):");
    console.table(fallidos);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Falló el script:", error.response?.data || error.message);
  process.exitCode = 1;
});
