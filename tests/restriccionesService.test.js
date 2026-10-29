import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/supabaseClient.js", () => ({
  supabaseAxios: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const { supabaseAxios } = await import("../services/supabaseClient.js");
const {
  validarTexto,
  llaveCedula,
  guardarRestricciones,
  obtenerRestricciones,
  validarTextoOperativo,
  ConflictoVersion,
  MAX_CARACTERES,
  MAX_CARACTERES_OPERATIVA,
} = await import("../services/restriccionesService.js");

const usuario = { id: "u1", nombre: "Luna Muñoz" };
const fila = (extra = {}) => ({
  restricciones: "No levantar más de 10 kg",
  restriccion_operativa: "No levantar más de 10 kg",
  actualizado_por_nombre: "Luna Muñoz",
  updated_at: "2026-10-02T15:00:00.123+00:00",
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("validarTexto", () => {
  it("conserva los saltos de línea y recorta los bordes", () => {
    expect(validarTexto("  - No cargar peso   \n- Sin turnos nocturnos  \n")).toEqual({
      ok: true,
      texto: "- No cargar peso\n- Sin turnos nocturnos",
    });
  });

  it("vacío es válido: así se borra una restricción que se levantó", () => {
    expect(validarTexto("   ")).toEqual({ ok: true, texto: "" });
  });

  it("rechaza lo que no es texto y lo que pasa del máximo", () => {
    expect(validarTexto(null).ok).toBe(false);
    expect(validarTexto("x".repeat(MAX_CARACTERES + 1)).ok).toBe(false);
  });
});

describe("llaveCedula", () => {
  it("normaliza igual que el cruce con SIESA", () => {
    expect(llaveCedula("0.012.345")).toBe("12345");
  });

  it("rechaza lo que no es una cédula, para no armar filtros con basura", () => {
    expect(llaveCedula("abc")).toBeNull();
    expect(llaveCedula("12")).toBeNull();
  });
});

describe("guardarRestricciones", () => {
  it("si ya existía, actualiza SOLO si nadie cambió la versión (filtro updated_at)", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [fila({ restricciones: "Nueva" })] });
    supabaseAxios.post.mockResolvedValue({ data: [] });

    const r = await guardarRestricciones({
      cedula: "123",
      texto: "Nueva",
      versionAnterior: "2026-10-02T15:00:00.123+00:00",
      usuario,
    });

    const url = supabaseAxios.patch.mock.calls[0][0];
    expect(url).toContain("cedula=eq.123");
    expect(url).toContain(`updated_at=eq.${encodeURIComponent("2026-10-02T15:00:00.123+00:00")}`);
    expect(r.restricciones).toBe("Nueva");
    // Deja constancia en el historial.
    expect(supabaseAxios.post).toHaveBeenCalledWith(
      "/empleados_restricciones_historial",
      expect.objectContaining({ cedula: "123", restricciones: "Nueva", actualizado_por_nombre: "Luna Muñoz" }),
    );
  });

  it("si otra persona guardó antes, no pisa nada y devuelve lo vigente", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [] }); // la versión ya no coincide
    supabaseAxios.get.mockResolvedValue({ data: [fila({ restricciones: "Lo que guardó la otra" })] });

    const error = await guardarRestricciones({
      cedula: "123",
      texto: "Mi cambio",
      versionAnterior: "2026-10-01T00:00:00+00:00",
      usuario,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictoVersion);
    expect(error.actual.restricciones).toBe("Lo que guardó la otra");
    expect(supabaseAxios.post).not.toHaveBeenCalled();
  });

  it("la primera vez inserta; si alguien la creó mientras tanto (409), es conflicto", async () => {
    supabaseAxios.post.mockRejectedValueOnce({ response: { status: 409 } });
    supabaseAxios.get.mockResolvedValue({ data: [fila()] });

    const error = await guardarRestricciones({
      cedula: "123",
      texto: "Mi cambio",
      versionAnterior: null,
      usuario,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictoVersion);
    expect(supabaseAxios.patch).not.toHaveBeenCalled();
  });

  it("un error que no es 409 al insertar se propaga (no se disfraza de conflicto)", async () => {
    supabaseAxios.post.mockRejectedValueOnce({ response: { status: 500 } });

    const error = await guardarRestricciones({
      cedula: "123",
      texto: "x",
      versionAnterior: null,
      usuario,
    }).catch((e) => e);

    expect(error).not.toBeInstanceOf(ConflictoVersion);
    expect(error.response.status).toBe(500);
  });

  it("si falla el historial, lo vigente igual queda guardado", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [fila({ restricciones: "Nueva" })] });
    supabaseAxios.post.mockRejectedValue(new Error("historial caído"));
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await guardarRestricciones({
      cedula: "123",
      texto: "Nueva",
      versionAnterior: "v1",
      usuario,
    });

    expect(r.restricciones).toBe("Nueva");
    consola.mockRestore();
  });
});

describe("validarTextoOperativo", () => {
  it("límite propio de 500 caracteres, distinto del de las observaciones", () => {
    expect(MAX_CARACTERES_OPERATIVA).toBe(500);
    expect(validarTextoOperativo("x".repeat(500)).ok).toBe(true);
    expect(validarTextoOperativo("x".repeat(501)).ok).toBe(false);
  });

  it("recorta los bordes y conserva el contenido", () => {
    expect(validarTextoOperativo("  No cargar peso \n")).toEqual({ ok: true, texto: "No cargar peso" });
  });

  it("quita espacios y tabs al final de cada línea y recorta los bordes", () => {
    expect(validarTextoOperativo("  uno  \ndos\t\t\ntres \t ").texto).toBe("uno\ndos\ntres");
  });

  it("vacío es válido y lo que no es texto se rechaza", () => {
    expect(validarTextoOperativo("  ")).toEqual({ ok: true, texto: "" });
    expect(validarTextoOperativo(null).ok).toBe(false);
    expect(validarTextoOperativo(12).ok).toBe(false);
  });
});

describe("obtenerRestricciones (campo operativo)", () => {
  it("devuelve ambos campos y pide la columna operativa en vigente e historial", async () => {
    supabaseAxios.get
      .mockResolvedValueOnce({
        data: [fila({ restricciones: "Dx privado", restriccion_operativa: "Sin turnos nocturnos" })],
      })
      .mockResolvedValueOnce({
        data: [{ restricciones: "Dx", restriccion_operativa: "Sin carga", actualizado_por_nombre: "Luna", created_at: "t1" }],
      });

    const r = await obtenerRestricciones("123");

    expect(r.restricciones).toBe("Dx privado");
    expect(r.restriccionOperativa).toBe("Sin turnos nocturnos");
    expect(r.historial[0].restriccionOperativa).toBe("Sin carga");
    expect(supabaseAxios.get.mock.calls[0][0]).toContain("restriccion_operativa");
    expect(supabaseAxios.get.mock.calls[1][0]).toContain("restriccion_operativa");
  });

  it("sin fila, el campo operativo es cadena vacía", async () => {
    supabaseAxios.get.mockResolvedValue({ data: [] });
    const r = await obtenerRestricciones("123");
    expect(r.restriccionOperativa).toBe("");
  });
});

describe("guardarRestricciones (campo operativo)", () => {
  it("escribe ambos campos en el PATCH condicional y en el historial", async () => {
    supabaseAxios.patch.mockResolvedValue({
      data: [fila({ restricciones: "Nueva", restriccion_operativa: "Op nueva" })],
    });
    supabaseAxios.post.mockResolvedValue({ data: [] });

    const r = await guardarRestricciones({
      cedula: "123",
      texto: "Nueva",
      textoOperativo: "Op nueva",
      versionAnterior: "v1",
      usuario,
    });

    expect(supabaseAxios.patch.mock.calls[0][0]).toContain("updated_at=eq.v1");
    expect(supabaseAxios.patch.mock.calls[0][1]).toMatchObject({
      restricciones: "Nueva",
      restriccion_operativa: "Op nueva",
    });
    expect(supabaseAxios.post).toHaveBeenCalledWith(
      "/empleados_restricciones_historial",
      expect.objectContaining({ restricciones: "Nueva", restriccion_operativa: "Op nueva" }),
    );
    expect(r.restriccionOperativa).toBe("Op nueva");
  });

  it("si se omite el operativo, el PATCH no toca la columna y el historial conserva el vigente", async () => {
    supabaseAxios.patch.mockResolvedValue({
      data: [fila({ restricciones: "Nueva", restriccion_operativa: "Vigente intacto" })],
    });
    supabaseAxios.post.mockResolvedValue({ data: [] });

    await guardarRestricciones({ cedula: "123", texto: "Nueva", versionAnterior: "v1", usuario });

    expect(supabaseAxios.patch.mock.calls[0][1]).not.toHaveProperty("restriccion_operativa");
    expect(supabaseAxios.post.mock.calls[0][1].restriccion_operativa).toBe("Vigente intacto");
  });

  it("un operativo vacío explícito sí se escribe (borra)", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [fila({ restriccion_operativa: "" })] });
    supabaseAxios.post.mockResolvedValue({ data: [] });

    await guardarRestricciones({ cedula: "123", texto: "x", textoOperativo: "", versionAnterior: "v1", usuario });

    expect(supabaseAxios.patch.mock.calls[0][1].restriccion_operativa).toBe("");
  });

  it("la primera vez, si se omite el operativo no manda la columna (default '')", async () => {
    supabaseAxios.post.mockResolvedValue({ data: [fila({ restriccion_operativa: "" })] });

    await guardarRestricciones({ cedula: "123", texto: "x", versionAnterior: null, usuario });

    expect(supabaseAxios.post.mock.calls[0][1]).not.toHaveProperty("restriccion_operativa");
  });

  it("el conflicto de versión sigue funcionando y trae ambos campos", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [] });
    supabaseAxios.get.mockResolvedValue({ data: [fila({ restriccion_operativa: "De la otra persona" })] });

    const error = await guardarRestricciones({
      cedula: "123",
      texto: "Mi cambio",
      textoOperativo: "Mi op",
      versionAnterior: "viejo",
      usuario,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictoVersion);
    expect(error.actual.restriccionOperativa).toBe("De la otra persona");
    expect(supabaseAxios.post).not.toHaveBeenCalled();
  });
});
