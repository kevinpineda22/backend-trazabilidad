// Nómina activa desde SIESA, indexada por cédula.
//
// Para qué: el banco de fotos solo conoce la cédula. Con esto, cada foto del
// panel muestra de quién es, y —igual de importante— se ve cuando una cédula
// NO corresponde a ningún empleado activo: un retirado o un número mal
// digitado que, si nadie lo nota, termina en un saludo de cumpleaños.
//
// Medido el 2026-09-22 contra la consulta real: 409 empleados, 5 páginas de
// 100. Paginar trajo exactamente las mismas 409 cédulas que pedirlas de una
// sola vez, sin repetidas ni faltantes; aun así se pide en una sola página
// grande (menos viajes) y se pagina solo si la nómina crece.
import { ejecutarConsulta } from "./connektaService.js";

export const CONSULTA = "merkahorro_empleados_activos";

// Una sola llamada alcanza para la nómina actual y deja aire para crecer.
const TAM_PAGINA = 1000;

// La nómina cambia por contratación o retiro, no por minuto. 15 minutos evita
// castigar a Connekta (tiene rate limit) sin que el panel muestre algo viejo.
const TTL_MS = 15 * 60 * 1000;

/**
 * Llave de comparación entre SIESA y el banco de fotos.
 * SIESA guarda el NIT como número; la foto se llama con lo que digitó una
 * persona. Se comparan solo los dígitos y sin ceros a la izquierda: "0012345"
 * y "12345" son la misma cédula, y si no se normaliza el panel diría que ese
 * empleado no existe.
 */
export const normalizarCedula = (valor) => {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  const sinCeros = digitos.replace(/^0+/, "");
  return sinCeros || digitos; // "0000" no se convierte en cadena vacía
};

// Los nombres llegan con espacios dobles según cómo se digitaron en SIESA.
export const limpiarNombre = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();

// Las fechas llegan como "2026-02-27T00:00:00" o similar; al panel le sirve el
// día. Si viniera algo que no es fecha, se devuelve null antes que una fecha
// inventada.
export const soloFecha = (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(texto);
  if (m) return m[1];
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/**
 * Convierte una fila cruda de la consulta en lo que el panel necesita.
 * Exportada para poder probarla sin tocar la red.
 */
export const mapearEmpleado = (fila) => ({
  cedula: String(fila?.nit ?? "").replace(/\D/g, ""),
  nombre: limpiarNombre(fila?.nombre_empleado),
  fechaIngreso: soloFecha(fila?.fecha_ingreso),
  // `es_indefinido` llega como 1/0 desde SQL Server.
  esIndefinido: Number(fila?.es_indefinido) === 1,
  fechaFinContrato: soloFecha(fila?.fecha_fin_contrato_vigente),
});

/**
 * Indexa por cédula normalizada. Si una cédula viniera repetida (dos contratos
 * del mismo empleado), gana la de ingreso más reciente: es el contrato vigente
 * y es lo que Gestión Humana espera ver.
 */
export const indexarPorCedula = (filas = []) => {
  const indice = {};
  for (const fila of filas) {
    const emp = mapearEmpleado(fila);
    if (!emp.cedula) continue;
    const llave = normalizarCedula(emp.cedula);
    const previo = indice[llave];
    if (!previo || (emp.fechaIngreso || "") > (previo.fechaIngreso || "")) {
      indice[llave] = emp;
    }
  }
  return indice;
};

// Caché en memoria del proceso. En Vercel cada instancia tiene la suya: es un
// caché de cortesía, no una fuente de verdad.
let cache = { datos: null, expira: 0 };

export const limpiarCache = () => {
  cache = { datos: null, expira: 0 };
};

/**
 * @param {{ forzar?: boolean }} opciones
 * @returns {Promise<{ empleados: Record<string, object>, total: number, actualizado: string, desdeCache: boolean }>}
 */
export const obtenerEmpleadosActivos = async ({ forzar = false } = {}) => {
  const ahora = Date.now();
  if (!forzar && cache.datos && cache.expira > ahora) {
    return { ...cache.datos, desdeCache: true };
  }

  const primera = await ejecutarConsulta(CONSULTA, { pagina: 1, tamPag: TAM_PAGINA });
  const filas = [...primera.datos];

  // Si algún día la nómina pasa el tamaño de página, se piden las que faltan.
  for (let pagina = 2; pagina <= primera.totalPaginas; pagina++) {
    const siguiente = await ejecutarConsulta(CONSULTA, { pagina, tamPag: TAM_PAGINA });
    filas.push(...siguiente.datos);
  }

  const empleados = indexarPorCedula(filas);
  const datos = {
    empleados,
    total: Object.keys(empleados).length,
    actualizado: new Date().toISOString(),
  };

  cache = { datos, expira: ahora + TTL_MS };
  return { ...datos, desdeCache: false };
};
