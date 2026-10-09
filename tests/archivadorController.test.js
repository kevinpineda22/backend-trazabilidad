import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/supabaseClient.js", () => ({
  supabaseAxios: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const { supabaseAxios } = await import("../services/supabaseClient.js");
const { llaveExpediente, listarCarpetas, crearCarpeta } = await import(
  "../controllers/archivadorController.js"
);

const respuesta = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe("llaveExpediente", () => {
  it("empleados van por cédula normalizada: con puntos o sin ellos es la MISMA persona", () => {
    expect(llaveExpediente("empleado", "1.036.123.456")).toEqual({ columna: "cedula", valor: "1036123456" });
    expect(llaveExpediente("empleado", "001036123456")).toEqual({ columna: "cedula", valor: "1036123456" });
  });

  it("un uuid no es una cédula: un empleado sin cédula válida no tiene llave", () => {
    expect(llaveExpediente("empleado", "abc")).toBeNull();
    expect(llaveExpediente("empleado", "")).toBeNull();
  });

  it("clientes y proveedores siguen por expediente_id", () => {
    expect(llaveExpediente("cliente", "9f0c")).toEqual({ columna: "expediente_id", valor: "9f0c" });
    expect(llaveExpediente("proveedor", "")).toBeNull();
  });
});

describe("archivador de empleados por cédula", () => {
  it("lista las carpetas filtrando por la cédula normalizada", async () => {
    supabaseAxios.get.mockResolvedValue({ data: [] });
    const res = respuesta();
    await listarCarpetas({ params: { tipo: "empleado", id: "1.036.123" } }, res);
    expect(supabaseAxios.get.mock.calls[0][0]).toContain("expediente_tipo=eq.empleado&cedula=eq.1036123&");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("crea la carpeta con la cédula y sin expediente_id", async () => {
    supabaseAxios.post.mockResolvedValue({ data: [{ id: "c1" }] });
    const res = respuesta();
    await crearCarpeta(
      { body: { expediente_tipo: "empleado", expediente_id: "1.036.123", nombre: " 2024 " }, user: { id: "u1" } },
      res,
    );
    expect(supabaseAxios.post.mock.calls[0][1]).toEqual({
      expediente_tipo: "empleado",
      cedula: "1036123",
      nombre: "2024",
      created_by: "u1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rechaza con 400 una cédula inválida sin tocar la base", async () => {
    const res = respuesta();
    await listarCarpetas({ params: { tipo: "empleado", id: "sin-cedula" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabaseAxios.get).not.toHaveBeenCalled();
  });
});
