import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarFotoAlBanco } from "../services/bancoFotosService.js";

const URL_FOTO =
  "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/documentos_contabilidad/empleados/AUTOGESTION_1017924321/foto_perfil.jpg";

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

describe("enviarFotoAlBanco", () => {
  beforeEach(() => {
    process.env.FOTOS_AUTOGESTION_URL = "https://b.supabase.co/functions/v1/foto-empleado-autogestion";
    process.env.FOTOS_AUTOGESTION_CLAVE = "clave-de-prueba";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sin autorización NO se envía: la casilla es opcional en autogestión", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    for (const autorizaUso of [false, null, undefined]) {
      const r = await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: URL_FOTO, autorizaUso });
      expect(r).toEqual({ estado: "omitida", motivo: "sin_autorizacion" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sin foto no hay nada que enviar", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const r = await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: null, autorizaUso: true });
    expect(r.estado).toBe("omitida");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("manda la cédula en dígitos, sin quitar ceros, con la clave en el header", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { ok: true, resultado: "cargada" }));
    vi.stubGlobal("fetch", fetch);

    const r = await enviarFotoAlBanco({ cedula: "0.101.792", urlFoto: URL_FOTO, autorizaUso: true });

    expect(r).toEqual({ estado: "cargada" });
    const [, opciones] = fetch.mock.calls[0];
    expect(opciones.headers["x-clave-servicio"]).toBe("clave-de-prueba");
    expect(JSON.parse(opciones.body)).toEqual({
      cedula: "0101792",
      url_foto: URL_FOTO,
      autoriza_uso: true,
    });
  });

  it("un documento que no es cédula del banco (pasaporte) se omite", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const r = await enviarFotoAlBanco({ cedula: "AB12", urlFoto: URL_FOTO, autorizaUso: true });
    expect(r.estado).toBe("omitida");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("informa cuando ya había una foto aprobada (no la pisa)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta(200, { ok: true, resultado: "ya_aprobada" })),
    );
    const r = await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: URL_FOTO, autorizaUso: true });
    expect(r).toEqual({ estado: "ya_aprobada" });
  });

  it("nunca lanza: error HTTP, red caída o sin configurar devuelven estado error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(401, { error: "No autorizado." })));
    expect(
      await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: URL_FOTO, autorizaUso: true }),
    ).toEqual({ estado: "error", motivo: "No autorizado." });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(
      (await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: URL_FOTO, autorizaUso: true })).estado,
    ).toBe("error");

    delete process.env.FOTOS_AUTOGESTION_CLAVE;
    expect(
      await enviarFotoAlBanco({ cedula: "1017924321", urlFoto: URL_FOTO, autorizaUso: true }),
    ).toEqual({ estado: "error", motivo: "sin_configurar" });
  });
});
