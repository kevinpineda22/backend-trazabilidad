import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/contratosSiesaService.js", () => ({ obtenerContratos: vi.fn() }));
vi.mock("../services/restriccionesService.js", () => ({ obtenerRestriccionesOperativas: vi.fn() }));

const { obtenerContratos } = await import("../services/contratosSiesaService.js");
const { obtenerRestriccionesOperativas } = await import("../services/restriccionesService.js");
const { listarEmpleadosActivosServicio } = await import("../services/empleadosServicio.js");

const contrato = (extra = {}) => ({
  cedula: "123",
  nombre: "Ana Perez",
  estado: "activo",
  sede: "SUPER CENTRO",
  cargo: "CAJERO",
  empresa: "Merkahorro",
  fechaIngreso: "2020-01-01",
  contacto: { correo: "a@b.c", celular: "300" },
  motivoRetiro: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  obtenerRestriccionesOperativas.mockResolvedValue(new Map());
});

describe("listarEmpleadosActivosServicio", () => {
  it("devuelve exactamente las 6 llaves y nada mas", async () => {
    obtenerContratos.mockResolvedValue({ contratos: { 123: contrato() }, actualizado: "T" });
    const { data, actualizado } = await listarEmpleadosActivosServicio();
    expect(actualizado).toBe("T");
    expect(data).toHaveLength(1);
    expect(Object.keys(data[0]).sort()).toEqual(
      ["activo", "cargo", "cedula", "nombre", "restriccionOperativa", "sede"].sort(),
    );
    expect(data[0]).toEqual({
      cedula: "123",
      nombre: "Ana Perez",
      cargo: "CAJERO",
      sede: "SUPER CENTRO",
      activo: true,
      restriccionOperativa: null,
    });
    expect(data[0]).not.toHaveProperty("restricciones");
  });

  it("excluye inactivos y estado desconocido", async () => {
    obtenerContratos.mockResolvedValue({
      contratos: {
        1: contrato({ cedula: "1111" }),
        2: contrato({ cedula: "2222", estado: "retirado" }),
        3: contrato({ cedula: "3333", estado: null }),
      },
      actualizado: "T",
    });
    const { data } = await listarEmpleadosActivosServicio();
    expect(data.map((e) => e.cedula)).toEqual(["1111"]);
  });

  it("cruza la restriccion operativa por cedula normalizada", async () => {
    obtenerContratos.mockResolvedValue({ contratos: { 123: contrato({ cedula: "00123" }) }, actualizado: "T" });
    obtenerRestriccionesOperativas.mockResolvedValue(new Map([["123", "No cargar mas de 10 kg"]]));
    const { data } = await listarEmpleadosActivosServicio();
    expect(data[0].restriccionOperativa).toBe("No cargar mas de 10 kg");
  });

  it("texto vacio -> null", async () => {
    obtenerContratos.mockResolvedValue({ contratos: { 123: contrato() }, actualizado: "T" });
    obtenerRestriccionesOperativas.mockResolvedValue(new Map([["123", ""]]));
    const { data } = await listarEmpleadosActivosServicio();
    expect(data[0].restriccionOperativa).toBeNull();
  });

  it("R-g: si falla la lectura de restricciones falla todo (no filas con null)", async () => {
    obtenerContratos.mockResolvedValue({ contratos: { 123: contrato() }, actualizado: "T" });
    obtenerRestriccionesOperativas.mockRejectedValue(new Error("db down"));
    await expect(listarEmpleadosActivosServicio()).rejects.toThrow("db down");
  });

  it("propaga el fallo de SIESA", async () => {
    obtenerContratos.mockRejectedValue(new Error("siesa down"));
    await expect(listarEmpleadosActivosServicio()).rejects.toThrow("siesa down");
  });
});
