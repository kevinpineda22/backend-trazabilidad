// services/bancoFotosService.js
//
// Copia la foto de autogestión al banco de fotos (proyecto Supabase aparte,
// `fotos-empleados`), que es lo que lee n8n para los cumpleaños.
//
// Se llama al APROBAR el registro, no al recibirlo (decisión 2026-09-30): un
// registro rechazado nunca llega al banco. La cédula sale del registro
// aprobado, nunca del navegador: el token de /autogestion no identifica a
// nadie.
//
// Este backend NO tiene la service_role del proyecto B y no debe tenerla. Le
// pide el trabajo a la Edge Function `foto-empleado-autogestion` con una clave
// de servicio compartida (FOTOS_AUTOGESTION_CLAVE = AUTOGESTION_CLAVE en B).
//
// Nunca lanza. Si el banco falla, la aprobación ya está hecha y la foto sigue
// en el expediente: Gestión Humana puede subirla desde el panel de fotos.

const TIEMPO_MAXIMO_MS = 10000;

// Solo dígitos, tal como se digitó: el banco nombra el archivo `<cedula>.jpg`
// y n8n lo busca así. Sin quitar ceros (a diferencia de normalizarCedula de
// empleadosSiesaService, que compara contra SIESA).
const cedulaDelBanco = (cedula) => String(cedula ?? "").replace(/\D/g, "");

/**
 * @returns {Promise<{estado: "cargada"|"reemplazada"|"ya_aprobada"|"omitida"|"error", motivo?: string}>}
 */
export const enviarFotoAlBanco = async ({ cedula, urlFoto, autorizaUso }) => {
  if (!urlFoto) return { estado: "omitida", motivo: "sin_foto" };
  // La autorización es opcional en autogestión; sin ella la foto se queda
  // solo en el expediente. `null` = registro anterior a la casilla: tampoco
  // consta un "sí", así que no se envía.
  if (autorizaUso !== true) return { estado: "omitida", motivo: "sin_autorizacion" };

  const cedulaLimpia = cedulaDelBanco(cedula);
  if (!/^[0-9]{5,12}$/.test(cedulaLimpia)) {
    return { estado: "omitida", motivo: "cedula_no_valida_para_el_banco" };
  }

  const url = process.env.FOTOS_AUTOGESTION_URL;
  const clave = process.env.FOTOS_AUTOGESTION_CLAVE;
  if (!url || !clave) {
    console.warn("[Banco de fotos] Faltan FOTOS_AUTOGESTION_URL / FOTOS_AUTOGESTION_CLAVE.");
    return { estado: "error", motivo: "sin_configurar" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-clave-servicio": clave,
      },
      body: JSON.stringify({
        cedula: cedulaLimpia,
        url_foto: urlFoto,
        autoriza_uso: true,
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[Banco de fotos] ${res.status} para ${cedulaLimpia}:`, cuerpo?.error);
      return { estado: "error", motivo: cuerpo?.error || `HTTP ${res.status}` };
    }
    return { estado: cuerpo.resultado || "cargada" };
  } catch (error) {
    console.error(`[Banco de fotos] Falló el envío para ${cedulaLimpia}:`, error.message);
    return { estado: "error", motivo: error.message };
  }
};
