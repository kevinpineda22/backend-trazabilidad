// Restricciones del empleado (texto libre) en la Hoja de Vida Digital.
//
// Van por cédula normalizada, no por id de registro: el archivador también
// muestra a quienes solo están en SIESA, y una restricción no debe perderse si
// la persona vuelve a llenar autogestión. Tablas en sql/restricciones_empleados.sql.
//
// Dos personas pueden tener la misma Hoja de Vida abierta. Para que la segunda
// no borre sin saberlo lo que guardó la primera, cada guardado dice sobre qué
// versión editó (`updated_at`) y la escritura es CONDICIONAL en la misma
// sentencia (PATCH ... &updated_at=eq.<versión>). Leer y después escribir
// dejaría una ventana en la que las dos pasan.
import { supabaseAxios } from "./supabaseClient.js";
import { normalizarCedula } from "./empleadosSiesaService.js";

export const MAX_CARACTERES = 4000;
const HISTORIAL_VISIBLE = 20;

export class ConflictoVersion extends Error {
  constructor(actual) {
    super("Otra persona guardó cambios mientras usted editaba.");
    this.actual = actual;
  }
}

/**
 * @returns {{ ok: true, texto: string } | { ok: false, mensaje: string }}
 */
export const validarTexto = (valor) => {
  if (typeof valor !== "string") return { ok: false, mensaje: "Las observaciones deben ser texto." };
  // Se respetan los saltos de línea (suelen ser una lista); solo se recortan
  // los bordes y los espacios al final de cada línea.
  const texto = valor.replace(/[ \t]+$/gm, "").trim();
  if (texto.length > MAX_CARACTERES) {
    return { ok: false, mensaje: `Máximo ${MAX_CARACTERES} caracteres (tiene ${texto.length}).` };
  }
  return { ok: true, texto };
};

export const llaveCedula = (cedula) => {
  const llave = normalizarCedula(cedula);
  return /^[0-9]{3,15}$/.test(llave) ? llave : null;
};

const mapear = (fila) =>
  fila
    ? {
        restricciones: fila.restricciones || "",
        actualizadoPor: fila.actualizado_por_nombre || null,
        actualizadoEn: fila.updated_at || null,
      }
    : { restricciones: "", actualizadoPor: null, actualizadoEn: null };

const leerActual = async (cedula) => {
  const { data } = await supabaseAxios.get(
    `/empleados_restricciones?cedula=eq.${cedula}&select=restricciones,actualizado_por_nombre,updated_at`,
  );
  return data?.[0] || null;
};

export const obtenerRestricciones = async (cedula) => {
  const [actual, { data: historial }] = await Promise.all([
    leerActual(cedula),
    supabaseAxios.get(
      `/empleados_restricciones_historial?cedula=eq.${cedula}` +
        `&select=restricciones,actualizado_por_nombre,created_at&order=created_at.desc&limit=${HISTORIAL_VISIBLE}`,
    ),
  ]);
  return {
    ...mapear(actual),
    historial: (historial || []).map((h) => ({
      restricciones: h.restricciones,
      actualizadoPor: h.actualizado_por_nombre || null,
      actualizadoEn: h.created_at,
    })),
  };
};

/**
 * @param {{ cedula: string, texto: string, versionAnterior: string|null, usuario: { id, nombre } }}
 * `versionAnterior` = el `actualizadoEn` que vio quien edita (null si estaba vacío).
 */
export const guardarRestricciones = async ({ cedula, texto, versionAnterior, usuario }) => {
  const ahora = new Date().toISOString();
  const cambios = {
    restricciones: texto,
    actualizado_por: usuario?.id || null,
    actualizado_por_nombre: usuario?.nombre || null,
    updated_at: ahora,
  };
  const representacion = { headers: { Prefer: "return=representation" } };

  let guardada;
  if (versionAnterior) {
    const { data } = await supabaseAxios.patch(
      `/empleados_restricciones?cedula=eq.${cedula}&updated_at=eq.${encodeURIComponent(versionAnterior)}`,
      cambios,
      representacion,
    );
    guardada = data?.[0];
  } else {
    try {
      const { data } = await supabaseAxios.post(
        "/empleados_restricciones",
        { cedula, ...cambios },
        representacion,
      );
      guardada = data?.[0];
    } catch (error) {
      // 409 de PostgREST = la fila ya existe: alguien la creó mientras tanto.
      if (error?.response?.status !== 409) throw error;
    }
  }

  if (!guardada) throw new ConflictoVersion(mapear(await leerActual(cedula)));

  // El historial es la constancia; si falla, lo vigente ya quedó guardado y no
  // se le dice al usuario que perdió su cambio.
  try {
    await supabaseAxios.post("/empleados_restricciones_historial", {
      cedula,
      restricciones: texto,
      actualizado_por: cambios.actualizado_por,
      actualizado_por_nombre: cambios.actualizado_por_nombre,
    });
  } catch (error) {
    console.error("No se pudo guardar el historial de restricciones:", error?.message);
  }

  return mapear(guardada);
};
