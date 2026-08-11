// src/services/comprobantePdfService.js
//
// Genera el comprobante PDF de diligenciamiento del formulario SAGRILAFT.
//
// Se usa pdf-lib y no pdfkit a propósito: pdfkit carga sus métricas de fuente
// desde archivos .afm en disco, y el tracing de dependencias de Vercel los
// deja fuera del bundle, provocando un ENOENT solo en producción. pdf-lib
// trae las fuentes estándar embebidas.
//
// El PDF se genera SIEMPRE a partir del registro almacenado, nunca de lo que
// manda el navegador. Es reproducible: mismo registro, mismo documento.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getClausula } from "../data/clausulasLegales.js";
import { verificarIntegridad } from "./consentimientoService.js";

// --- Geometría de página (A4 en puntos) ---
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 50;
const ANCHO_UTIL = ANCHO - MARGEN * 2;

const NEGRO = rgb(0.06, 0.09, 0.16);
const GRIS = rgb(0.42, 0.45, 0.5);
const GRIS_CLARO = rgb(0.88, 0.91, 0.94);
const AZUL = rgb(0.15, 0.39, 0.92);
const VERDE = rgb(0.02, 0.47, 0.34);
const ROJO = rgb(0.73, 0.11, 0.11);

/**
 * pdf-lib codifica en WinAnsi con las fuentes estándar. Los acentos y la ñ
 * están cubiertos, pero caracteres como comillas tipográficas o guiones largos
 * fuera del set hacen fallar el encode. Se normalizan antes de escribir.
 */
const sanitizar = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x20-\xFF\n]/g, "");
};

/** Parte un texto en líneas que caben en `ancho` con la fuente dada. */
const partirLineas = (texto, fuente, tamano, ancho) => {
  const lineas = [];
  for (const parrafo of sanitizar(texto).split("\n")) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    if (palabras.length === 0) {
      lineas.push("");
      continue;
    }
    let actual = palabras[0];
    for (let i = 1; i < palabras.length; i += 1) {
      const tentativa = `${actual} ${palabras[i]}`;
      if (fuente.widthOfTextAtSize(tentativa, tamano) <= ancho) {
        actual = tentativa;
      } else {
        lineas.push(actual);
        actual = palabras[i];
      }
    }
    lineas.push(actual);
  }
  return lineas;
};

/** Cursor de escritura con salto de página automático. */
class Lienzo {
  constructor(doc, fuentes) {
    this.doc = doc;
    this.fuentes = fuentes;
    this.pagina = null;
    this.y = 0;
    this.paginas = [];
    this.nuevaPagina();
  }

  nuevaPagina() {
    this.pagina = this.doc.addPage([ANCHO, ALTO]);
    this.paginas.push(this.pagina);
    this.y = ALTO - MARGEN;
  }

  asegurar(alto) {
    if (this.y - alto < MARGEN + 40) this.nuevaPagina();
  }

  espacio(alto) {
    this.asegurar(alto);
    this.y -= alto;
  }

  texto(contenido, opciones = {}) {
    const {
      tamano = 9.5,
      fuente = this.fuentes.regular,
      color = NEGRO,
      interlineado = 1.35,
      x = MARGEN,
      ancho = ANCHO_UTIL,
    } = opciones;

    const alturaLinea = tamano * interlineado;
    for (const linea of partirLineas(contenido, fuente, tamano, ancho)) {
      this.asegurar(alturaLinea);
      this.y -= alturaLinea;
      if (linea) {
        this.pagina.drawText(linea, {
          x,
          y: this.y,
          size: tamano,
          font: fuente,
          color,
        });
      }
    }
  }

  linea(color = GRIS_CLARO) {
    this.asegurar(10);
    this.y -= 6;
    this.pagina.drawLine({
      start: { x: MARGEN, y: this.y },
      end: { x: ANCHO - MARGEN, y: this.y },
      thickness: 0.75,
      color,
    });
    this.y -= 6;
  }

  tituloSeccion(texto) {
    this.espacio(12);
    this.asegurar(20);
    this.pagina.drawRectangle({
      x: MARGEN,
      y: this.y - 15,
      width: ANCHO_UTIL,
      height: 18,
      color: rgb(0.95, 0.96, 0.98),
    });
    this.y -= 12;
    this.pagina.drawText(sanitizar(texto).toUpperCase(), {
      x: MARGEN + 6,
      y: this.y,
      size: 9,
      font: this.fuentes.negrita,
      color: NEGRO,
    });
    this.y -= 10;
  }

  /** Fila etiqueta/valor en dos columnas. */
  campo(etiqueta, valor) {
    const anchoEtiqueta = 165;
    const anchoValor = ANCHO_UTIL - anchoEtiqueta - 10;
    const texto = sanitizar(valor) || "No registrado";

    const lineasValor = partirLineas(
      texto,
      this.fuentes.regular,
      9,
      anchoValor,
    );
    const alto = Math.max(1, lineasValor.length) * 12 + 3;
    this.asegurar(alto);

    const yInicio = this.y - 11;
    this.pagina.drawText(sanitizar(etiqueta), {
      x: MARGEN,
      y: yInicio,
      size: 8.5,
      font: this.fuentes.negrita,
      color: GRIS,
    });

    let yValor = yInicio;
    for (const linea of lineasValor) {
      this.pagina.drawText(linea, {
        x: MARGEN + anchoEtiqueta,
        y: yValor,
        size: 9,
        font: this.fuentes.regular,
        color: NEGRO,
      });
      yValor -= 12;
    }
    this.y -= alto;
  }
}

/** Formatea una fecha ISO a texto legible en español. */
const formatearFecha = (iso) => {
  if (!iso) return "No registrada";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return String(iso);
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");
  const ss = String(fecha.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${fecha.getFullYear()} ${hh}:${mi}:${ss}`;
};

const nombreContraparte = (registro) => {
  if (registro.razon_social) return registro.razon_social;
  const partes = [
    registro.primer_nombre,
    registro.segundo_nombre,
    registro.primer_apellido,
    registro.segundo_apellido,
  ].filter(Boolean);
  return partes.join(" ") || "Sin nombre registrado";
};

const documentoContraparte = (registro) =>
  registro.nit
    ? `${registro.nit}${registro.dv ? `-${registro.dv}` : ""}`
    : registro.cedula || "No registrado";

/**
 * Genera el comprobante en PDF.
 *
 * @param {object} params
 * @param {"cliente"|"proveedor"} params.tipo
 * @param {object} params.registro Fila completa de la contraparte.
 * @returns {Promise<Uint8Array>}
 */
export const generarComprobantePdf = async ({ tipo, registro }) => {
  const doc = await PDFDocument.create();
  const fuentes = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    italica: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  const lienzo = new Lienzo(doc, fuentes);
  const nombre = nombreContraparte(registro);
  const documento = documentoContraparte(registro);
  const esProveedor = tipo === "proveedor";

  const integridad = verificarIntegridad(registro);

  // ---------- Encabezado ----------
  lienzo.pagina.drawRectangle({
    x: 0,
    y: ALTO - 78,
    width: ANCHO,
    height: 78,
    color: rgb(0.98, 0.98, 0.99),
  });
  lienzo.y = ALTO - 34;
  lienzo.pagina.drawText("SUPERMERCADOS MERKAHORRO S.A.S.", {
    x: MARGEN,
    y: lienzo.y,
    size: 13,
    font: fuentes.negrita,
    color: NEGRO,
  });
  lienzo.y -= 15;
  lienzo.pagina.drawText(
    sanitizar(
      `Comprobante de diligenciamiento - Formulario de vinculacion de ${esProveedor ? "proveedor" : "cliente"} (SAGRILAFT)`,
    ),
    { x: MARGEN, y: lienzo.y, size: 8.5, font: fuentes.regular, color: GRIS },
  );
  lienzo.y -= 12;
  lienzo.pagina.drawText(
    sanitizar(`Documento generado el ${formatearFecha(new Date().toISOString())}`),
    { x: MARGEN, y: lienzo.y, size: 8, font: fuentes.italica, color: GRIS },
  );
  lienzo.y -= 22;

  // ---------- Identificación ----------
  lienzo.tituloSeccion("Identificación de la contraparte");
  lienzo.campo("Nombre / Razón social", nombre);
  lienzo.campo("Tipo de documento", registro.tipo_documento);
  lienzo.campo("Número de documento", documento);
  lienzo.campo("Tipo de régimen", registro.tipo_regimen);
  if (registro.nombre_establecimiento)
    lienzo.campo("Establecimiento", registro.nombre_establecimiento);
  lienzo.campo("Fecha de diligenciamiento", registro.fecha_diligenciamiento);

  // ---------- Actividad económica ----------
  lienzo.tituloSeccion("Actividad económica");
  lienzo.campo("Código CIIU", registro.codigo_ciiu);
  lienzo.campo("Descripción", registro.descripcion_ciiu);

  // ---------- Ubicación y contacto ----------
  lienzo.tituloSeccion("Ubicación y contacto");
  lienzo.campo("Dirección", registro.direccion_domicilio);
  lienzo.campo("Departamento", registro.departamento);
  lienzo.campo("Ciudad", registro.ciudad);
  lienzo.campo("Email facturación", registro.email_factura_electronica);
  if (esProveedor) {
    lienzo.campo("Contacto cartera", registro.contacto_cartera_nombre);
    lienzo.campo("Email cartera", registro.contacto_cartera_email);
    lienzo.campo("Contacto compras", registro.contacto_compras_nombre);
    lienzo.campo("Email compras", registro.contacto_compras_email);
  } else {
    lienzo.campo("Nombre de contacto", registro.nombre_contacto);
    lienzo.campo("Email de contacto", registro.email_contacto);
    lienzo.campo("Teléfono", registro.telefono_contacto);
  }

  // ---------- Representante legal ----------
  lienzo.tituloSeccion("Representante legal");
  lienzo.campo(
    "Nombre",
    [registro.rep_legal_nombre, registro.rep_legal_apellidos]
      .filter(Boolean)
      .join(" "),
  );
  lienzo.campo("Tipo de documento", registro.rep_legal_tipo_doc);
  lienzo.campo("Número de documento", registro.rep_legal_num_doc);

  // ---------- Declaraciones ----------
  lienzo.tituloSeccion("Declaraciones de debida diligencia");
  lienzo.campo("¿Es PEP?", registro.declara_pep);
  lienzo.campo("¿Administra recursos públicos?", registro.declara_recursos_publicos);
  lienzo.campo(
    "¿Cumple obligaciones tributarias?",
    registro.declara_obligaciones_tributarias,
  );

  // ---------- Cláusulas aceptadas (el corazón del comprobante) ----------
  lienzo.tituloSeccion("Cláusulas aceptadas por la contraparte");

  const clausulas = Array.isArray(registro.consentimiento_clausulas)
    ? registro.consentimiento_clausulas
    : [];

  if (clausulas.length === 0) {
    lienzo.espacio(4);
    lienzo.texto(
      "ADVERTENCIA: este registro no cuenta con evidencia de aceptacion de clausulas. Fue creado antes de la implementacion del mecanismo de consentimiento, o mediante un canal que no lo captura. No debe considerarse soporte de aceptacion.",
      { tamano: 9, fuente: fuentes.negrita, color: ROJO },
    );
  } else {
    lienzo.espacio(4);
    lienzo.texto(
      `Aceptadas el ${formatearFecha(registro.consentimiento_fecha)} desde la direccion IP ${registro.consentimiento_ip || "no registrada"}.`,
      { tamano: 9, fuente: fuentes.negrita },
    );
    lienzo.espacio(6);

    for (const aceptada of clausulas) {
      const clausula = getClausula(aceptada.clave, aceptada.version);
      if (!clausula) continue;

      lienzo.espacio(8);
      lienzo.texto(
        `[${aceptada.aceptada ? "X" : " "}]  ${clausula.titulo}  (version ${aceptada.version})`,
        {
          tamano: 9.5,
          fuente: fuentes.negrita,
          color: aceptada.aceptada ? VERDE : ROJO,
        },
      );
      lienzo.espacio(3);
      for (const parrafo of clausula.texto) {
        lienzo.texto(parrafo, { tamano: 8.5, color: NEGRO });
        lienzo.espacio(4);
      }
    }
  }

  // ---------- Evidencia técnica ----------
  lienzo.tituloSeccion("Evidencia técnica del consentimiento");
  lienzo.campo("Fecha y hora de aceptación", formatearFecha(registro.consentimiento_fecha));
  lienzo.campo("Dirección IP de origen", registro.consentimiento_ip);
  lienzo.campo("Navegador (user agent)", registro.consentimiento_user_agent);
  lienzo.campo("Versión del texto legal", registro.consentimiento_bundle_version);
  lienzo.campo("Enlace único utilizado", registro.consentimiento_token);
  lienzo.campo("Código de verificación (SHA-256)", registro.consentimiento_hash);

  lienzo.espacio(6);
  if (!integridad.verificable) {
    lienzo.texto(
      "Estado de integridad: NO VERIFICABLE - el registro no tiene sello de consentimiento.",
      { tamano: 9, fuente: fuentes.negrita, color: ROJO },
    );
  } else if (integridad.integro) {
    lienzo.texto(
      "Estado de integridad: VERIFICADO - el codigo de verificacion coincide con la informacion almacenada. La aceptacion no ha sido alterada desde su registro.",
      { tamano: 9, fuente: fuentes.negrita, color: VERDE },
    );
  } else {
    lienzo.texto(
      "Estado de integridad: ALERTA - el codigo de verificacion NO coincide con la informacion almacenada. El registro pudo haber sido modificado despues de la aceptacion.",
      { tamano: 9, fuente: fuentes.negrita, color: ROJO },
    );
  }

  lienzo.linea();
  lienzo.texto(
    "Este comprobante se genera a partir de la informacion almacenada por SUPERMERCADOS MERKAHORRO S.A.S. y reproduce el texto exacto de las clausulas en la version aceptada por la contraparte. La aceptacion se realizo por medios electronicos conforme a la Ley 527 de 1999; el registro de fecha, hora, direccion IP y enlace unico de acceso constituye la evidencia de dicha manifestacion de voluntad.",
    { tamano: 7.5, color: GRIS, fuente: fuentes.italica },
  );

  // ---------- Pie de página en todas las páginas ----------
  const total = lienzo.paginas.length;
  lienzo.paginas.forEach((pagina, indice) => {
    pagina.drawLine({
      start: { x: MARGEN, y: MARGEN - 8 },
      end: { x: ANCHO - MARGEN, y: MARGEN - 8 },
      thickness: 0.5,
      color: GRIS_CLARO,
    });
    pagina.drawText(sanitizar(`${nombre} - ${documento}`), {
      x: MARGEN,
      y: MARGEN - 20,
      size: 7,
      font: fuentes.regular,
      color: GRIS,
    });
    const pie = `Pagina ${indice + 1} de ${total}`;
    pagina.drawText(pie, {
      x: ANCHO - MARGEN - fuentes.regular.widthOfTextAtSize(pie, 7),
      y: MARGEN - 20,
      size: 7,
      font: fuentes.regular,
      color: GRIS,
    });
    if (registro.consentimiento_hash) {
      pagina.drawText(
        sanitizar(`Verificacion: ${registro.consentimiento_hash.slice(0, 32)}...`),
        { x: MARGEN, y: MARGEN - 30, size: 6, font: fuentes.regular, color: AZUL },
      );
    }
  });

  return doc.save();
};

/** Nombre de archivo sugerido, sin caracteres problemáticos. */
export const nombreArchivoComprobante = ({ tipo, registro }) => {
  const documento = documentoContraparte(registro).replace(/[^\w.-]/g, "");
  return `comprobante-${tipo}-${documento || "sin-documento"}.pdf`;
};
