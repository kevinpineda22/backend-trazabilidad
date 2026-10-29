import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/supabaseClient.js", () => ({
  supabaseAxios: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const { supabaseAxios } = await import("../services/supabaseClient.js");
const { actualizarRestricciones } = await import("../controllers/restriccionesController.js");

const respuesta = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};
const peticion = (body) => ({
  params: { cedula: "123456" },
  body,
  user: { id: "u1", nombre: "Luna" },
});
const filaDb = (extra = {}) => ({
  restricciones: "Texto",
  restriccion_operativa: "Op",
  actualizado_por_nombre: "Luna",
  updated_at: "t2",
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("actualizarRestricciones (campo operativo)", () => {
  it("400 si el operativo pasa de 500 caracteres y no persiste nada", async () => {
    const res = respuesta();
    await actualizarRestricciones(
      peticion({ restricciones: "ok", restriccionOperativa: "x".repeat(501), versionAnterior: "v1" }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(supabaseAxios.patch).not.toHaveBeenCalled();
    expect(supabaseAxios.post).not.toHaveBeenCalled();
  });

  it("400 si el operativo no es texto", async () => {
    const res = respuesta();
    await actualizarRestricciones(
      peticion({ restricciones: "ok", restriccionOperativa: 5, versionAnterior: "v1" }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it("guarda ambos campos y responde con ambos", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [filaDb({ restriccion_operativa: "Op nueva" })] });
    supabaseAxios.post.mockResolvedValue({ data: [] });
    const res = respuesta();

    await actualizarRestricciones(
      peticion({ restricciones: "Texto", restriccionOperativa: "  Op nueva ", versionAnterior: "v1" }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(supabaseAxios.patch.mock.calls[0][1].restriccion_operativa).toBe("Op nueva");
    expect(res.body.restriccionOperativa).toBe("Op nueva");
  });

  it("un cliente viejo que solo manda `restricciones` no borra el operativo", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [filaDb()] });
    supabaseAxios.post.mockResolvedValue({ data: [] });
    const res = respuesta();

    await actualizarRestricciones(peticion({ restricciones: "Texto", versionAnterior: "v1" }), res);

    expect(res.statusCode).toBe(200);
    expect(supabaseAxios.patch.mock.calls[0][1]).not.toHaveProperty("restriccion_operativa");
  });

  it("restriccionOperativa vacía ('') llega al servicio como '' (limpiar funciona)", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [filaDb({ restriccion_operativa: "" })] });
    supabaseAxios.post.mockResolvedValue({ data: [] });
    const res = respuesta();

    await actualizarRestricciones(
      peticion({ restricciones: "Texto", restriccionOperativa: "", versionAnterior: "v1" }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(supabaseAxios.patch.mock.calls[0][1].restriccion_operativa).toBe("");
  });

  it("503 nombra sql/restricciones_operativas.sql si falta la columna (42703)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseAxios.patch.mockRejectedValue({
      response: { status: 400, data: { code: "42703", message: "column empleados_restricciones.restriccion_operativa does not exist" } },
    });
    const res = respuesta();

    await actualizarRestricciones(peticion({ restricciones: "Texto", versionAnterior: "v1" }), res);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toContain("sql/restricciones_operativas.sql");
  });

  it("503 nombra la columna aunque solo el mensaje la mencione", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseAxios.patch.mockRejectedValue({
      response: { status: 400, data: { message: "Could not find the 'restriccion_operativa' column" } },
    });
    const res = respuesta();

    await actualizarRestricciones(peticion({ restricciones: "Texto", versionAnterior: "v1" }), res);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toContain("sql/restricciones_operativas.sql");
  });

  it("503 conserva el mensaje original cuando faltan las tablas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseAxios.patch.mockRejectedValue({
      response: { status: 404, data: { code: "PGRST205", message: "Could not find the table" } },
    });
    const res = respuesta();

    await actualizarRestricciones(peticion({ restricciones: "Texto", versionAnterior: "v1" }), res);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toContain("sql/restricciones_empleados.sql");
    expect(res.body.message).not.toContain("restricciones_operativas.sql");
  });

  it("409 trae ambos campos en `actual`", async () => {
    supabaseAxios.patch.mockResolvedValue({ data: [] });
    supabaseAxios.get.mockResolvedValue({ data: [filaDb({ restriccion_operativa: "De la otra" })] });
    const res = respuesta();

    await actualizarRestricciones(
      peticion({ restricciones: "Mi cambio", restriccionOperativa: "Mi op", versionAnterior: "viejo" }),
      res,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.actual).toMatchObject({ restricciones: "Texto", restriccionOperativa: "De la otra" });
  });
});
