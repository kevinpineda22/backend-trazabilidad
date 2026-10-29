import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

/**
 * Autenticacion servicio-a-servicio por API key nombrada (por consumidor).
 * Port de Backend-traslados/src/middleware/apiKey.js. Esta superficie NO usa el
 * JWT de Supabase: un Bearer solo nunca autentica aqui.
 *
 * Variable de entorno `SERVICE_API_KEYS`:
 *   JSON:  {"horarios":"<clave>","otro":"<clave>"}
 *   corto: horarios:<clave>,otro:<clave>
 * Quitar una entrada y reiniciar revoca a ese consumidor sin afectar a los demas.
 * Solo se aceptan valores string no vacios; una misma clave repetida entre
 * consumidores invalida toda la configuracion (503 fail-closed).
 *
 * Runbook:
 * - Rotar: agregar la clave nueva como otro consumidor (o reemplazar el valor),
 *   desplegar/reiniciar, migrar al consumidor y luego quitar la clave vieja.
 * - Revocar: borrar la entrada del consumidor en SERVICE_API_KEYS y reiniciar.
 * - Bloqueo: el limiter de fallos cuenta por IP. Si varios consumidores salen
 *   por una IP compartida (NAT/proxy) y acumulan 401 repetidos, una clave valida
 *   tambien recibe 429 hasta que expire la ventana (15 min por defecto).
 *   Corregir la clave mal configurada y esperar la ventana (o reiniciar el proceso).
 */
const HEADER = "x-api-key";
const DUPLICADA = "SERVICE_API_KEYS tiene la misma clave en mas de un consumidor.";

/** @returns {{llaves: Record<string,string>, problema: string|null}} mapa llave -> consumidor */
function leerLlaves() {
  const raw = String(process.env.SERVICE_API_KEYS || "").trim();
  if (!raw) return { llaves: {}, problema: "Falta la variable de entorno SERVICE_API_KEYS." };

  const porLlave = {};
  if (raw.startsWith("{")) {
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      return { llaves: {}, problema: "SERVICE_API_KEYS empieza con '{' pero no es JSON valido." };
    }
    for (const [nombre, llave] of Object.entries(obj && typeof obj === "object" ? obj : {})) {
      // Solo strings no vacios: objetos/numeros/null se ignoran (nunca "[object Object]").
      if (typeof llave !== "string") continue;
      const l = llave.trim();
      if (!l) continue;
      if (Object.hasOwn(porLlave, l)) return { llaves: {}, problema: DUPLICADA };
      porLlave[l] = String(nombre).trim();
    }
  } else {
    for (const par of raw.split(",")) {
      const i = par.indexOf(":");
      const nombre = i > 0 ? par.slice(0, i).trim() : "";
      const llave = i > 0 ? par.slice(i + 1).trim() : "";
      if (!nombre || !llave) continue;
      if (Object.hasOwn(porLlave, llave)) return { llaves: {}, problema: DUPLICADA };
      porLlave[llave] = nombre;
    }
  }

  return Object.keys(porLlave).length > 0
    ? { llaves: porLlave, problema: null }
    : { llaves: {}, problema: 'SERVICE_API_KEYS no tiene ninguna entrada valida ("nombre:clave").' };
}

// SHA-256 + timingSafeEqual: iguala el largo sin filtrar cuantos caracteres tiene la clave real.
function igualSeguro(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Exige `x-api-key` valido y fija `req.serviceConsumer`. Sin configuracion
 * responde 503 (fail-closed). Nunca registra el valor de la clave.
 */
export function serviceApiKey(req, res, next) {
  const { llaves, problema } = leerLlaves();
  if (problema) {
    console.error(`Servicio mal configurado: ${problema}`);
    return res.status(503).json({ message: "Servicio no configurado en este entorno." });
  }

  const recibida = String(req.headers[HEADER] || "").trim();
  if (!recibida) return res.status(401).json({ message: "Falta el header x-api-key." });

  for (const [llave, nombre] of Object.entries(llaves)) {
    if (igualSeguro(recibida, llave)) {
      req.serviceConsumer = nombre;
      console.log(`service "${nombre}" -> ${req.method} ${req.originalUrl}`);
      return next();
    }
  }
  return res.status(401).json({ message: "API key invalida." });
}

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
};

/**
 * - `fallosPorIp`: va ANTES de la clave y cuenta solo los intentos rechazados
 *   (401) por IP; los exitos no lo agotan, pero una IP bloqueada se frena antes
 *   de comparar claves.
 * - `porConsumidor`: va DESPUES de la clave, un cupo por consumidor.
 */
export function crearLimitadores({
  fallosMax = 10,
  fallosVentanaMs = 15 * 60 * 1000,
  consumidorMax = 120,
  consumidorVentanaMs = 60 * 1000,
} = {}) {
  const fallosPorIp = rateLimit({
    ...base,
    windowMs: fallosVentanaMs,
    limit: fallosMax,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => res.statusCode !== 401,
    message: { message: "Demasiados intentos fallidos, intenta mas tarde." },
  });
  const porConsumidor = rateLimit({
    ...base,
    windowMs: consumidorVentanaMs,
    limit: consumidorMax,
    keyGenerator: (req) => req.serviceConsumer,
    message: { message: "Demasiadas solicitudes del consumidor." },
  });
  return { fallosPorIp, porConsumidor };
}
