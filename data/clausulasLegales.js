// src/data/clausulasLegales.js
//
// ============================================================================
//  CATÁLOGO VERSIONADO DE CLÁUSULAS LEGALES — FUENTE ÚNICA DE VERDAD
// ============================================================================
//
//  ⚠️  TEXTO BORRADOR — PENDIENTE DE REVISIÓN JURÍDICA  ⚠️
//
//  Estos textos fueron redactados como punto de partida técnico para que el
//  mecanismo de consentimiento y el comprobante descargable puedan operar.
//  NO han sido validados por el área jurídica ni por el oficial de
//  cumplimiento. Antes de salir a producción, jurídico debe revisarlos,
//  ajustarlos y aprobarlos.
//
//  CÓMO ACTUALIZAR UN TEXTO (importante):
//  ---------------------------------------
//  NUNCA edite el texto de una cláusula existente dejando la misma `version`.
//  Los registros ya firmados apuntan a una versión concreta y el comprobante
//  se reconstruye a partir de ella: si se altera el texto de la v1, todos los
//  comprobantes históricos pasarían a decir algo que la contraparte nunca
//  aceptó. Eso destruye el valor probatorio de todo el módulo.
//
//  En su lugar:
//    1. Mueva la versión vigente al arreglo `HISTORICO` de esa cláusula.
//    2. Escriba la nueva versión como la vigente, subiendo el número.
//    3. Suba `BUNDLE_VERSION`.
//  Los comprobantes viejos seguirán reconstruyéndose con su texto original.
//
//  Marco normativo de referencia (Colombia):
//    - Ley 1581 de 2012 y Decreto 1074 de 2015 — protección de datos personales
//    - Ley 527 de 1999 — mensajes de datos y firma electrónica
//    - Circular Externa 100-000016 de 2020 (Supersociedades) — SAGRILAFT
// ============================================================================

import crypto from "node:crypto";

/** Versión del paquete completo de cláusulas presentado al usuario. */
export const BUNDLE_VERSION = "2026.08-borrador-1";

/**
 * Cláusulas vigentes. El orden define el orden de presentación en el
 * formulario y en el comprobante PDF.
 */
export const CLAUSULAS = [
  {
    clave: "habeas_data",
    version: 1,
    obligatoria: true,
    titulo: "Autorización de tratamiento de datos personales (Habeas Data)",
    resumen:
      "Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.",
    texto: [
      "En mi calidad de titular de la información, actuando libre y voluntariamente, autorizo de manera previa, expresa e informada a SUPERMERCADOS MERKAHORRO S.A.S., identificada con NIT 900.339.325-4, para recolectar, almacenar, usar, circular, actualizar, suprimir y en general tratar los datos personales que suministro en este formulario y los que se deriven de la relación comercial.",
      "La finalidad del tratamiento es: (i) adelantar los procesos de debida diligencia y conocimiento de la contraparte exigidos por el Sistema de Autocontrol y Gestión del Riesgo Integral de Lavado de Activos, Financiación del Terrorismo y Financiamiento de la Proliferación de Armas de Destrucción Masiva (SAGRILAFT); (ii) verificar mi identidad y la veracidad de la información aportada, incluida su consulta y reporte en listas restrictivas, centrales de riesgo y bases de datos públicas o privadas; (iii) ejecutar, administrar y hacer seguimiento a la relación contractual; y (iv) cumplir obligaciones legales, contables, tributarias y de reporte ante autoridades competentes.",
      "Declaro que conozco mis derechos como titular: conocer, actualizar y rectificar mis datos; solicitar prueba de esta autorización; ser informado sobre el uso dado a mis datos; presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la Ley 1581 de 2012; revocar la autorización y solicitar la supresión de mis datos cuando no exista un deber legal o contractual que lo impida; y acceder de forma gratuita a los datos que hayan sido objeto de tratamiento.",
      "Para ejercer estos derechos puedo dirigirme al canal de atención dispuesto por el responsable del tratamiento. Manifiesto que la información suministrada es veraz, completa, exacta y verificable, y que me encuentro facultado para entregarla.",
    ],
    HISTORICO: [],
  },
  {
    clave: "firma_digital",
    version: 1,
    obligatoria: true,
    titulo: "Autorización de firma electrónica y validez del mensaje de datos",
    resumen:
      "Acepto que mi diligenciamiento y envío electrónico equivale a mi firma, conforme a la Ley 527 de 1999.",
    texto: [
      "Manifiesto que acepto de forma expresa el uso de medios electrónicos para la celebración, perfeccionamiento y prueba de las manifestaciones contenidas en este formulario, y reconozco que el diligenciamiento y envío del mismo constituye una firma electrónica en los términos de la Ley 527 de 1999 y sus normas reglamentarias.",
      "Reconozco que este mensaje de datos tiene plena validez jurídica y fuerza probatoria, y que produce los mismos efectos que un documento suscrito de forma manuscrita. En consecuencia, acepto que la marcación de las casillas de aceptación, junto con el registro de la fecha y hora de envío, la dirección IP desde la cual se remitió y el enlace único de acceso empleado, constituyen evidencia suficiente de mi voluntad de obligarme.",
      "Declaro que soy la persona facultada para diligenciar y remitir este formulario, sea en nombre propio o en representación de la persona jurídica identificada en él, y que cuento con las facultades suficientes para hacerlo. Asumo la responsabilidad por el uso del enlace único de acceso que me fue entregado y por la custodia de los medios desde los cuales se realizó el envío.",
      "Acepto que el comprobante generado a partir de este formulario reproduce fielmente la información remitida y las cláusulas aceptadas, y que su integridad puede verificarse mediante el código de verificación impreso en él.",
    ],
    HISTORICO: [],
  },
  {
    clave: "origen_fondos",
    version: 1,
    obligatoria: true,
    titulo: "Declaración de origen de fondos y de bienes",
    resumen:
      "Declaro que mis recursos provienen de actividades lícitas y no están vinculados a LA/FT.",
    texto: [
      "Declaro bajo la gravedad del juramento, que se entiende prestado con la aceptación de esta cláusula y el envío de este formulario, que los recursos, bienes y fondos que poseo y que se deriven de la relación comercial con SUPERMERCADOS MERKAHORRO S.A.S. provienen de actividades lícitas y están ligados al desarrollo normal de mi actividad económica, y que no proceden de ninguna actividad ilícita de las contempladas en el Código Penal colombiano o en cualquier norma que lo modifique, adicione o sustituya.",
      "Declaro que no he ejecutado, no ejecuto ni permitiré que terceros ejecuten, en mi nombre o utilizando mis recursos, operaciones que puedan considerarse como lavado de activos, financiación del terrorismo, financiamiento de la proliferación de armas de destrucción masiva, corrupción o soborno transnacional.",
      "Declaro que la información y los documentos que he suministrado son veraces, completos y verificables, y me obligo a actualizarlos al menos una vez al año o cada vez que se produzca un cambio relevante, así como a suministrar la información adicional que me sea requerida en desarrollo de la debida diligencia.",
      "Autorizo a SUPERMERCADOS MERKAHORRO S.A.S. a verificar la información aquí consignada por los medios que estime pertinentes, a consultarme en listas restrictivas nacionales e internacionales, y a dar por terminada unilateralmente la relación comercial, sin lugar a indemnización alguna, en caso de que se detecte inexactitud en lo declarado, aparezca reporte negativo en dichas listas, o existan operaciones que no pueda justificar razonablemente.",
    ],
    HISTORICO: [],
  },
];

/** Claves de las cláusulas que deben estar aceptadas para admitir el envío. */
export const CLAVES_OBLIGATORIAS = CLAUSULAS.filter((c) => c.obligatoria).map(
  (c) => c.clave,
);

const PorClave = new Map(CLAUSULAS.map((c) => [c.clave, c]));

/**
 * Recupera el texto exacto de una cláusula en una versión dada.
 * Permite reconstruir comprobantes antiguos aunque el texto vigente haya
 * cambiado: sin esto, el valor probatorio del comprobante se pierde.
 */
export const getClausula = (clave, version) => {
  const vigente = PorClave.get(clave);
  if (!vigente) return null;
  if (version === undefined || version === null) return vigente;
  if (Number(version) === vigente.version) return vigente;
  return (
    vigente.HISTORICO.find((h) => Number(h.version) === Number(version)) || null
  );
};

/**
 * Serialización canónica de las cláusulas aceptadas. Es la entrada del hash:
 * cualquier cambio en clave, versión, título o texto produce un hash distinto.
 */
export const serializarClausulas = (aceptadas) =>
  aceptadas
    .map((a) => {
      const clausula = getClausula(a.clave, a.version);
      const texto = clausula ? clausula.texto.join("\n") : "";
      const titulo = clausula ? clausula.titulo : "";
      return [a.clave, a.version, a.aceptada ? "1" : "0", titulo, texto].join(
        "",
      );
    })
    .join("");

/** SHA-256 en hexadecimal de una cadena. */
export const sha256 = (valor) =>
  crypto.createHash("sha256").update(valor, "utf8").digest("hex");

/**
 * Vista pública del catálogo, para que el formulario muestre exactamente
 * los mismos textos que se van a firmar y a imprimir en el comprobante.
 */
export const getCatalogoPublico = () => ({
  bundleVersion: BUNDLE_VERSION,
  clausulas: CLAUSULAS.map(({ clave, version, obligatoria, titulo, resumen, texto }) => ({
    clave,
    version,
    obligatoria,
    titulo,
    resumen,
    texto,
  })),
});
