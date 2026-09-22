import { describe, it, expect } from "vitest";
import {
  normalizarCedula,
  mapearEmpleado,
  indexarPorCedula,
} from "../services/empleadosSiesaService.js";

describe("normalizarCedula", () => {
  it("compara solo dígitos: la foto se nombra con lo que digitó una persona", () => {
    expect(normalizarCedula("1.017.924.321")).toBe("1017924321");
    expect(normalizarCedula(" 1017924321 ")).toBe("1017924321");
    expect(normalizarCedula(1017924321)).toBe("1017924321");
  });

  it("ignora los ceros a la izquierda: SIESA guarda el NIT como número", () => {
    expect(normalizarCedula("0012345")).toBe(normalizarCedula("12345"));
  });

  it("no convierte una cédula de ceros en cadena vacía", () => {
    expect(normalizarCedula("0000")).toBe("0000");
  });

  it("sin dato devuelve vacío, para poder descartarlo", () => {
    expect(normalizarCedula(null)).toBe("");
    expect(normalizarCedula("ABC")).toBe("");
  });
});

describe("mapearEmpleado", () => {
  const fila = {
    nit: "1017924321",
    nombre_empleado: "  JUAN  PEREZ  ",
    fecha_ingreso: "2026-02-27T00:00:00",
    fecha_fin_contrato_vigente: "2026-11-26T00:00:00",
    es_indefinido: 0,
  };

  it("deja el nombre y las fechas listos para mostrar", () => {
    expect(mapearEmpleado(fila)).toEqual({
      cedula: "1017924321",
      nombre: "JUAN PEREZ",
      fechaIngreso: "2026-02-27",
      fechaFinContrato: "2026-11-26",
      esIndefinido: false,
    });
  });

  it("es_indefinido llega como 1/0 desde SQL Server", () => {
    expect(mapearEmpleado({ ...fila, es_indefinido: 1 }).esIndefinido).toBe(true);
    expect(mapearEmpleado({ ...fila, es_indefinido: "1" }).esIndefinido).toBe(true);
  });

  it("una fecha ausente es null, nunca una fecha inventada", () => {
    expect(mapearEmpleado({ ...fila, fecha_fin_contrato_vigente: null }).fechaFinContrato).toBe(
      null,
    );
    expect(mapearEmpleado({ ...fila, fecha_ingreso: "sin fecha" }).fechaIngreso).toBe(null);
  });
});

describe("indexarPorCedula", () => {
  it("indexa por cédula normalizada, así la foto la encuentra", () => {
    const indice = indexarPorCedula([{ nit: "0012345", nombre_empleado: "ANA", es_indefinido: 1 }]);
    expect(indice["12345"].nombre).toBe("ANA");
  });

  it("con dos contratos del mismo empleado gana el ingreso más reciente", () => {
    const indice = indexarPorCedula([
      { nit: "77", nombre_empleado: "VIEJO", fecha_ingreso: "2020-01-01" },
      { nit: "77", nombre_empleado: "VIGENTE", fecha_ingreso: "2026-05-01" },
    ]);
    expect(indice["77"].nombre).toBe("VIGENTE");
  });

  it("descarta filas sin cédula en vez de crear una llave vacía", () => {
    expect(Object.keys(indexarPorCedula([{ nit: null, nombre_empleado: "X" }, {}]))).toHaveLength(
      0,
    );
  });
});
