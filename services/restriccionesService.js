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
// Versión corta y sin diagnóstico para líderes (sql/restricciones_operativas.sql).
export const MAX_CARACTERES_OPERATIVA = 500;
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

export const validarTextoOperativo = (valor) => {
  if (typeof valor !== "string") return { ok: false, mensaje: "La restricción operativa debe ser texto." };
  const texto = valor.replace(/[ \t]+$/gm, "").trim();
  if (texto.length > MAX_CARACTERES_OPERATIVA) {
    return {
      ok: false,
      mensaje: `La restricción operativa admite máximo ${MAX_CARACTERES_OPERATIVA} caracteres (tiene ${texto.length}).`,
    };
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
        restriccionOperativa: fila.restriccion_operativa || "",
        actualizadoPor: fila.actualizado_por_nombre || null,
        actualizadoEn: fila.updated_at || null,
      }
    : { restricciones: "", restriccionOperativa: "", actualizadoPor: null, actualizadoEn: null };

const leerActual = async (cedula) => {
  const { data } = await supabaseAxios.get(
    `/empleados_restricciones?cedula=eq.${cedula}&select=restricciones,restriccion_operativa,actualizado_por_nombre,updated_at`,
  );
  return data?.[0] || null;
};

export const obtenerRestricciones = async (cedula) => {
  const [actual, { data: historial }] = await Promise.all([
    leerActual(cedula),
    supabaseAxios.get(
      `/empleados_restricciones_historial?cedula=eq.${cedula}` +
        `&select=restricciones,restriccion_operativa,actualizado_por_nombre,created_at&order=created_at.desc&limit=${HISTORIAL_VISIBLE}`,
    ),
  ]);
  return {
    ...mapear(actual),
    historial: (historial || []).map((h) => ({
      restricciones: h.restricciones,
      restriccionOperativa: h.restriccion_operativa || "",
      actualizadoPor: h.actualizado_por_nombre || null,
      actualizadoEn: h.created_at,
    })),
  };
};

const PAGINA_OPERATIVAS = 1000;
const MAX_PAGINAS_OPERATIVAS = 200;

/**
 * Restricciones operativas (solo cedula + restriccion_operativa, nunca el texto
 * libre sensible) de quienes tienen una cargada. Llave: cedula normalizada.
 * Cualquier fallo de lectura se propaga: un mapa vacio por error se leeria como
 * "sin restricciones".
 * @returns {Promise<Map<string, string>>}
 */
export const obtenerRestriccionesOperativas = async () => {
  const mapa = new Map();
  // Se pagina hasta una pagina VACIA: el max-rows de PostgREST puede ser < 1000.
  for (let pagina = 0; pagina < MAX_PAGINAS_OPERATIVAS; pagina++) {
    const desde = pagina * PAGINA_OPERATIVAS;
    const { data } = await supabaseAxios.get(
      `/empleados_restricciones?select=cedula,restriccion_operativa&restriccion_operativa=neq.` +
        `&order=cedula.asc&limit=${PAGINA_OPERATIVAS}&offset=${desde}`,
    );
    const filas = data || [];
    if (filas.length === 0) return mapa;
    for (const f of filas) {
      const llave = normalizarCedula(f.cedula);
      if (llave && f.restriccion_operativa) mapa.set(llave, f.restriccion_operativa);
    }
  }
  throw new Error(`obtenerRestriccionesOperativas: se supero el maximo de ${MAX_PAGINAS_OPERATIVAS} paginas`);
};

/**
 * @param {{ cedula: string, texto: string, textoOperativo?: string, versionAnterior: string|null, usuario: { id, nombre } }}
 * `textoOperativo` undefined = no tocar el campo operativo (clientes que solo envían `restricciones`).
 * `versionAnterior` = el `actualizadoEn` que vio quien edita (null si estaba vacío).
 */
export const guardarRestricciones = async ({ cedula, texto, textoOperativo, versionAnterior, usuario }) => {
  const ahora = new Date().toISOString();
  const cambios = {
    restricciones: texto,
    actualizado_por: usuario?.id || null,
    actualizado_por_nombre: usuario?.nombre || null,
    updated_at: ahora,
  };
  if (textoOperativo !== undefined) cambios.restriccion_operativa = textoOperativo;
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
      // Si no se envió, queda registrado el valor vigente que devolvió la escritura.
      restriccion_operativa: guardada.restriccion_operativa ?? textoOperativo ?? "",
      actualizado_por: cambios.actualizado_por,
      actualizado_por_nombre: cambios.actualizado_por_nombre,
    });
  } catch (error) {
    console.error("No se pudo guardar el historial de restricciones:", error?.message);
  }

  return mapear(guardada);
};
