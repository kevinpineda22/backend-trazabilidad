// Cliente de Connekta (las consultas registradas contra SIESA).
//
// Es una adaptación del cliente que ya corre en producción en
// `backend-traslado/src/config/connekta.js`. Se copia en vez de importarse
// porque son repositorios distintos; si se toca la lógica de reintentos acá,
// vale la pena mirar allá.
//
// Dos cosas aprendidas a los golpes y que no se ven en la documentación:
//
//  - Connekta corre sobre SQL Server y bajo carga devuelve 500 con un deadlock.
//    El propio motor dice qué hacer: reintentar. Es transitorio, no un error de
//    datos. También se reintenta el 429 (rate limit) y los cortes de red; un
//    4xx que no sea 429 es culpa nuestra (consulta mal escrita, credenciales) y
//    reintentarlo solo esconde el problema.
//
//  - La respuesta SIEMPRE llega con HTTP 200. El error real viene en
//    `body.codigo`, y `codigo: 0` es el único éxito.
import axios from "axios";

const MAX_INTENTOS = Number(process.env.CONNEKTA_MAX_INTENTOS) || 4;
const BACKOFF_BASE_MS = 800;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const esReintentable = (error) => {
  const status = error?.response?.status;
  if (!status) return true; // timeout / socket cortado / DNS
  if (status === 429) return true;
  return status >= 500;
};

const esperaAntesDeReintentar = (error, intento) => {
  // Cuando Connekta dice cuándo se libera el rate limit ("mm:ss"), se le hace caso.
  const reset = error?.response?.headers?.["connekta-rate-limit-reset"];
  if (error?.response?.status === 429 && typeof reset === "string") {
    const [mm, ss] = reset.split(":").map(Number);
    if (Number.isFinite(mm) && Number.isFinite(ss)) {
      return Math.min((mm * 60 + ss) * 1000 + 500, 60_000);
    }
  }
  // Jitter a propósito: sin él, los reintentos vuelven a chocar entre ellos.
  return Math.min(BACKOFF_BASE_MS * 2 ** (intento - 1), 15_000) + Math.random() * 500;
};

/**
 * Ejecuta una consulta registrada en Connekta.
 * @param {string} descripcion nombre de la consulta registrada
 * @param {{ pagina?: number, tamPag?: number }} opciones
 * @returns {Promise<{ datos: object[], total: number, totalPaginas: number }>}
 */
export const ejecutarConsulta = async (descripcion, { pagina = 1, tamPag = 100 } = {}) => {
  const baseUrl = process.env.CONNEKTA_BASE_URL;
  const idCompania = process.env.CONNEKTA_ID_COMPANIA;
  const conniKey = process.env.CONNI_KEY;
  const conniToken = process.env.CONNI_TOKEN;

  // Se nombra CUÁL falta: el nombre de la variable no es secreto, y sin esto un
  // despliegue al que le falta una variable se ve igual que SIESA caído.
  const faltantes = Object.entries({
    CONNEKTA_BASE_URL: baseUrl,
    CONNEKTA_ID_COMPANIA: idCompania,
    CONNI_KEY: conniKey,
    CONNI_TOKEN: conniToken,
  })
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length) {
    const err = new Error(`Faltan variables de entorno: ${faltantes.join(", ")}.`);
    err.faltantes = faltantes;
    throw err;
  }

  let ultimoError;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const { data } = await axios.get(`${baseUrl}/ejecutarconsulta`, {
        headers: { conniKey, conniToken },
        params: {
          idCompania,
          descripcion,
          paginacion: `numPag=${pagina}|tamPag=${tamPag}`,
        },
        timeout: 60_000,
      });

      if (data?.codigo !== 0) {
        // Error de negocio: no se reintenta, la consulta va a fallar igual.
        const err = new Error(
          `Connekta [${data?.codigo}]: ${data?.mensaje || ""} ${data?.detalle || ""}`.trim(),
        );
        err.esDeConnekta = true;
        throw err;
      }

      const detalle = data.detalle || {};
      return {
        datos: detalle.Datos || [],
        total: detalle.total_registros || 0,
        // La API responde con la clave acentuada; se acepta también sin tilde
        // por si cambia.
        totalPaginas: detalle["total_páginas"] || detalle.total_paginas || 1,
      };
    } catch (error) {
      ultimoError = error;
      if (error.esDeConnekta || !esReintentable(error) || intento === MAX_INTENTOS) break;
      await dormir(esperaAntesDeReintentar(error, intento));
    }
  }

  throw ultimoError;
};
