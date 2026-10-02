// Contrato vigente (o el último, si ya se retiró) de cada persona en SIESA.
//
// Para qué: el archivador de empleados lista a quienes se registraron por
// autogestión, con el cargo y la sede que digitaron ESE día. No sabía si la
// persona seguía en la empresa. Esto le pone a cada registro su estado real.
//
// La consulta trae una fila por CÉDULA, de las dos compañías: 1 = Merkahorro y
// 2 = Megamayorista (convenio). Se agrupa por cédula y no por tercero porque el
// tercero es distinto en cada compañía: quien pasó de una a otra tenía una fila
// retirada y otra activa. Medido el 2026-10-02: 1.660 personas, 421 activas
// (las mismas 421 cédulas que `merkahorro_empleados_activos`), 0 activos sin
// cargo, 0 retirados sin motivo, nadie con contrato vigente en dos compañías.
import { ejecutarConsulta } from "./connektaService.js";
import { normalizarCedula, limpiarNombre, soloFecha } from "./empleadosSiesaService.js";

// Connekta le antepone `merkahorro_` a la descripción al crearla: se registró
// como "merkahorro_empleados_contratos" y quedó con el prefijo doble. Un nombre
// mal escrito responde el mismo 401 "verifique permisos" que una consulta no
// asignada; si esto falla con 401, revisar primero el nombre en Connekta.
export const CONSULTA = "merkahorro_merkahorro_empleados_contratos";

// Connekta rechaza tamPag > 1000 con un 400.
const TAM_PAGINA = 1000;

const TTL_MS = 15 * 60 * 1000;

const EMPRESAS = { 1: "Merkahorro", 2: "Megamayorista" };

const texto = (valor) => {
  const t = limpiarNombre(valor);
  return t || null;
};

/**
 * Fila cruda → contrato. El estado sale de la consulta (fecha_retiro) y se
 * verificó que coincide siempre con `c0550_ind_estado`. Si llegara otra cosa,
 * queda `null`: el panel no afirma "retirado" sobre un dato que no entiende.
 */
export const mapearContrato = (fila) => {
  const idCia = Number(fila?.id_cia) || null;
  const estado = String(fila?.estado ?? "").trim().toUpperCase();
  return {
    cedula: String(fila?.nit ?? "").replace(/\D/g, ""),
    nombre: texto(fila?.nombre_empleado),
    idCia,
    empresa: EMPRESAS[idCia] || (idCia ? `Compañía ${idCia}` : null),
    estado: estado === "ACTIVO" ? "activo" : estado === "RETIRADO" ? "retirado" : null,
    sede: texto(fila?.sede),
    cargo: texto(fila?.cargo),
    fechaIngreso: soloFecha(fila?.fecha_ingreso),
    fechaRetiro: soloFecha(fila?.fecha_retiro),
    esIndefinido: Number(fila?.es_indefinido) === 1,
    fechaFinContrato: soloFecha(fila?.fecha_fin_contrato_vigente),
    prorroga: Number(fila?.ultima_prorroga_nro) || null,
    contratosTotal: Number(fila?.contratos_total) || 1,
    motivoRetiro: texto(fila?.motivo_retiro),
  };
};

// Si una cédula llegara repetida, gana el contrato activo y, entre iguales, el
// de ingreso más reciente. Con la consulta actual no pasa (una fila por
// cédula), pero un cambio en Connekta no debe convertir a un activo en retirado.
const prefiere = (nuevo, previo) => {
  if (!previo) return true;
  if ((nuevo.estado === "activo") !== (previo.estado === "activo")) {
    return nuevo.estado === "activo";
  }
  return (nuevo.fechaIngreso || "") > (previo.fechaIngreso || "");
};

export const indexarContratos = (filas = []) => {
  const indice = {};
  for (const fila of filas) {
    const contrato = mapearContrato(fila);
    if (!contrato.cedula) continue;
    const llave = normalizarCedula(contrato.cedula);
    if (prefiere(contrato, indice[llave])) indice[llave] = contrato;
  }
  return indice;
};

/**
 * Lo que va a la LISTA del archivador. El motivo de retiro ("con justa causa")
 * insinúa una falta disciplinaria: solo se muestra en la Hoja de Vida Digital.
 */
export const paraLista = (contrato) => {
  if (!contrato) return contrato;
  const { motivoRetiro, nombre, ...resto } = contrato;
  return resto;
};

let cache = { datos: null, expira: 0 };

export const limpiarCache = () => {
  cache = { datos: null, expira: 0 };
};

/**
 * @returns {Promise<{ contratos: Record<string, object>, actualizado: string }>}
 */
export const obtenerContratos = async ({ forzar = false } = {}) => {
  const ahora = Date.now();
  if (!forzar && cache.datos && cache.expira > ahora) return cache.datos;

  const primera = await ejecutarConsulta(CONSULTA, { pagina: 1, tamPag: TAM_PAGINA });
  const filas = [...primera.datos];
  for (let pagina = 2; pagina <= primera.totalPaginas; pagina++) {
    const siguiente = await ejecutarConsulta(CONSULTA, { pagina, tamPag: TAM_PAGINA });
    filas.push(...siguiente.datos);
  }

  const datos = { contratos: indexarContratos(filas), actualizado: new Date().toISOString() };
  cache = { datos, expira: ahora + TTL_MS };
  return datos;
};

/**
 * Busca el contrato de una cédula. `null` = SIESA respondió y esa cédula no
 * tiene ningún contrato (registrado pero nunca creado en nómina, o digitada
 * mal). Distinto de un error, que se lanza: no saber no es "no está".
 */
export const contratoDe = (contratos, cedula) => {
  const llave = normalizarCedula(cedula);
  if (!llave) return null;
  return contratos[llave] || null;
};
