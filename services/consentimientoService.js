// src/services/consentimientoService.js
//
// Captura y sella el consentimiento de la contraparte.
//
// El valor probatorio del comprobante no está en el PDF (un PDF se edita),
// sino en que el registro guardado sea reconstruible y verificable:
//   - se guarda QUÉ cláusulas se aceptaron y en QUÉ VERSIÓN exacta;
//   - se guarda CUÁNDO, DESDE DÓNDE (IP) y CON QUÉ CLIENTE (user agent);
//   - se guarda un HASH SHA-256 que sella el conjunto.
//
// Si alguien altera la fila en base de datos, el hash recalculado deja de
// coincidir y la manipulación queda en evidencia. Por eso el hash se calcula
// sobre el texto íntegro de las cláusulas, no sobre un identificador.

import {
  BUNDLE_VERSION,
  CLAUSULAS,
  CLAVES_OBLIGATORIAS,
  serializarClausulas,
  sha256,
} from "../data/clausulasLegales.js";

/**
 * Deriva la identidad de la contraparte SIEMPRE de la misma forma.
 *
 * Es deliberado que ni el sellado ni la verificación reciban la identidad
 * como parámetro: si cada llamador la arma a su manera, el hash de sellado y
 * el de verificación divergen y todos los comprobantes salen marcados como
 * alterados. La identidad se deriva aquí, en un solo lugar, a partir de los
 * mismos campos, ya vengan del body del formulario o de la fila en base.
 */
export const identidadContraparte = (fuente = {}) => {
  const limpiar = (valor) =>
    valor === undefined || valor === null ? "" : String(valor).trim();

  const nit = limpiar(fuente.nit);
  const dv = limpiar(fuente.dv);
  const documento = nit
    ? `${nit}${dv ? `-${dv}` : ""}`
    : limpiar(fuente.cedula);

  const nombre =
    limpiar(fuente.razon_social) ||
    [
      fuente.primer_nombre,
      fuente.segundo_nombre,
      fuente.primer_apellido,
      fuente.segundo_apellido,
    ]
      .map(limpiar)
      .filter(Boolean)
      .join(" ") ||
    limpiar(fuente.nombre_establecimiento);

  return { documento, nombre };
};

/** Extrae la IP real del cliente. app.js tiene `trust proxy` para Vercel. */
const obtenerIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

/**
 * Normaliza lo que envía el formulario a la forma canónica
 * `[{ clave, version, aceptada }]`, siempre en el orden del catálogo.
 *
 * Acepta dos formas de entrada para no acoplar el front a una sola:
 *   - `{ habeas_data: true, firma_digital: true, origen_fondos: true }`
 *   - `[{ clave: "habeas_data", version: 1, aceptada: true }, ...]`
 */
export const normalizarAceptaciones = (entrada) => {
  const porClave = new Map();

  if (Array.isArray(entrada)) {
    for (const item of entrada) {
      if (item && item.clave) porClave.set(item.clave, item);
    }
  } else if (entrada && typeof entrada === "object") {
    for (const [clave, valor] of Object.entries(entrada)) {
      porClave.set(clave, { clave, aceptada: valor });
    }
  }

  return CLAUSULAS.map((clausula) => {
    const recibida = porClave.get(clausula.clave);
    return {
      clave: clausula.clave,
      // La versión SIEMPRE la fija el servidor: el cliente no decide qué
      // texto dice haber aceptado.
      version: clausula.version,
      aceptada: recibida?.aceptada === true || recibida?.aceptada === "true",
    };
  });
};

/**
 * Construye el bloque de consentimiento que se persiste junto al registro.
 *
 * @param {object} params
 * @param {object} params.req Request de Express (para IP, user agent y token).
 * @param {object} params.aceptaciones Lo que marcó el usuario en el formulario.
 * @param {object} params.fuente Datos de la contraparte (body o fila) de los
 *        que se deriva la identidad. No se recibe la identidad ya armada.
 * @returns {{ ok: true, consentimiento: object } | { ok: false, faltantes: string[] }}
 */
export const construirConsentimiento = ({ req, aceptaciones, fuente = {} }) => {
  const normalizadas = normalizarAceptaciones(aceptaciones);
  const identidad = identidadContraparte(fuente);

  const faltantes = normalizadas
    .filter((a) => CLAVES_OBLIGATORIAS.includes(a.clave) && !a.aceptada)
    .map((a) => a.clave);

  if (faltantes.length > 0) {
    return { ok: false, faltantes };
  }

  const fecha = new Date().toISOString();
  const ip = obtenerIp(req);
  const userAgent = req.headers["user-agent"] || null;
  const token = req.params?.token || null;

  // Canal por el que se recogió la aceptación. Es determinante para el valor
  // probatorio y NO puede quedar implícito:
  //   - enlace_publico: la contraparte diligenció con su enlace único. La IP
  //     y el navegador son suyos -> firma electrónica atribuible a ella.
  //   - panel_interno: lo registró personal de la empresa. La IP y el
  //     navegador son del EMPLEADO, no de la contraparte. Afirmar lo
  //     contrario en el comprobante sería una misatribución.
  const canal = token ? "enlace_publico" : "panel_interno";

  // El hash sella: cláusulas + textos + identidad + momento + origen + canal.
  const materialFirmado = [
    BUNDLE_VERSION,
    serializarClausulas(normalizadas),
    identidad.documento,
    identidad.nombre,
    fecha,
    ip ?? "",
    token ?? "",
    canal,
  ].join("");

  return {
    ok: true,
    consentimiento: {
      consentimiento_bundle_version: BUNDLE_VERSION,
      consentimiento_clausulas: normalizadas,
      consentimiento_fecha: fecha,
      consentimiento_ip: ip,
      consentimiento_user_agent: userAgent,
      consentimiento_token: token,
      consentimiento_canal: canal,
      consentimiento_hash: sha256(materialFirmado),
      // Banderas planas: permiten filtrar y auditar en SQL sin abrir el JSON.
      acepta_habeas_data: normalizadas.find((a) => a.clave === "habeas_data")
        ?.aceptada ?? false,
      acepta_firma_digital: normalizadas.find((a) => a.clave === "firma_digital")
        ?.aceptada ?? false,
      acepta_origen_fondos: normalizadas.find((a) => a.clave === "origen_fondos")
        ?.aceptada ?? false,
    },
  };
};

/**
 * Recalcula el hash de un consentimiento ya guardado y lo compara con el
 * almacenado. Es la verificación de integridad que respalda el comprobante.
 */
export const verificarIntegridad = (registro) => {
  if (!registro?.consentimiento_hash) {
    return { verificable: false, integro: false, motivo: "sin_consentimiento" };
  }

  const clausulas = registro.consentimiento_clausulas;
  if (!Array.isArray(clausulas)) {
    return { verificable: false, integro: false, motivo: "clausulas_invalidas" };
  }

  // La identidad se deriva del mismo registro, con la misma función que usó
  // el sellado. No se acepta desde fuera, justamente para que no puedan
  // divergir.
  const identidad = identidadContraparte(registro);

  const material = [
    registro.consentimiento_bundle_version ?? "",
    serializarClausulas(clausulas),
    identidad.documento,
    identidad.nombre,
    registro.consentimiento_fecha ?? "",
    registro.consentimiento_ip ?? "",
    registro.consentimiento_token ?? "",
    registro.consentimiento_canal ?? "",
  ].join("");

  const recalculado = sha256(material);
  return {
    verificable: true,
    integro: recalculado === registro.consentimiento_hash,
    hashAlmacenado: registro.consentimiento_hash,
    hashRecalculado: recalculado,
  };
};

/** Mensaje de error uniforme cuando faltan aceptaciones obligatorias. */
export const mensajeFaltantes = (faltantes) => {
  const nombres = {
    habeas_data: "autorización de tratamiento de datos (habeas data)",
    firma_digital: "autorización de firma electrónica",
    origen_fondos: "declaración de origen de fondos",
  };
  const lista = faltantes.map((f) => nombres[f] || f).join(", ");
  return `Debe aceptar las siguientes cláusulas obligatorias: ${lista}.`;
};
