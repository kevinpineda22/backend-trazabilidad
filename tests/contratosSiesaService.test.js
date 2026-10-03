import { describe, it, expect } from "vitest";
import {
  mapearContrato,
  indexarContratos,
  paraLista,
  contratoDe,
  cruzarConRegistros,
  registroDeCedula,
  expedienteDesdeContrato,
} from "../services/contratosSiesaService.js";

const fila = (extra = {}) => ({
  nit: "1017924321",
  nombre_empleado: "  JUAN  PEREZ ",
  id_cia: 1,
  estado: "ACTIVO",
  sede: "PRINCIPAL COPACABANA ",
  cargo: "CAJERO ",
  motivo_retiro: null,
  fecha_ingreso: "2024-02-01T00:00:00",
  fecha_retiro: null,
  es_indefinido: 0,
  fecha_fin_contrato_vigente: "2026-11-26T00:00:00",
  ultima_prorroga_nro: 2,
  contratos_total: 1,
  ...extra,
});

describe("mapearContrato", () => {
  it("deja los datos listos para mostrar", () => {
    expect(mapearContrato(fila())).toEqual({
      cedula: "1017924321",
      nombre: "JUAN PEREZ",
      idCia: 1,
      empresa: "Merkahorro",
      estado: "activo",
      sede: "PRINCIPAL COPACABANA",
      cargo: "CAJERO",
      fechaIngreso: "2024-02-01",
      fechaRetiro: null,
      esIndefinido: false,
      fechaFinContrato: "2026-11-26",
      prorroga: 2,
      contratosTotal: 1,
      motivoRetiro: null,
    });
  });

  it("la compañía 2 es Megamayorista", () => {
    expect(mapearContrato(fila({ id_cia: 2 })).empresa).toBe("Megamayorista");
  });

  it("un estado que no entiende queda null: no se afirma 'retirado' sin saber", () => {
    expect(mapearContrato(fila({ estado: "SUSPENDIDO" })).estado).toBeNull();
    expect(mapearContrato(fila({ estado: null })).estado).toBeNull();
  });
});

describe("indexarContratos", () => {
  it("indexa por cédula sin ceros a la izquierda", () => {
    const indice = indexarContratos([fila({ nit: "0012345" })]);
    expect(Object.keys(indice)).toEqual(["12345"]);
  });

  it("si una cédula se repite, gana el contrato ACTIVO aunque el retirado sea más nuevo", () => {
    // El caso real: pasó de Merkahorro a Megamayorista. Si ganara el retirado,
    // el panel diría que alguien que trabaja hoy ya se fue.
    const indice = indexarContratos([
      fila({ id_cia: 2, estado: "ACTIVO", fecha_ingreso: "2023-01-01" }),
      fila({ id_cia: 1, estado: "RETIRADO", fecha_retiro: "2025-01-01", fecha_ingreso: "2024-06-01" }),
    ]);
    expect(indice["1017924321"].estado).toBe("activo");
    expect(indice["1017924321"].empresa).toBe("Megamayorista");
  });

  it("entre dos del mismo estado gana el de ingreso más reciente", () => {
    const indice = indexarContratos([
      fila({ estado: "RETIRADO", fecha_ingreso: "2020-01-01", cargo: "VIEJO" }),
      fila({ estado: "RETIRADO", fecha_ingreso: "2022-01-01", cargo: "NUEVO" }),
    ]);
    expect(indice["1017924321"].cargo).toBe("NUEVO");
  });

  it("descarta filas sin cédula", () => {
    expect(indexarContratos([fila({ nit: null })])).toEqual({});
  });
});

describe("paraLista", () => {
  it("quita el motivo de retiro y el nombre: la lista no los muestra", () => {
    const c = mapearContrato(fila({ estado: "RETIRADO", motivo_retiro: "004 Con Justa Causa" }));
    const lista = paraLista(c);
    expect(lista).not.toHaveProperty("motivoRetiro");
    expect(lista).not.toHaveProperty("nombre");
    expect(lista.estado).toBe("retirado");
  });

  it("respeta el null de 'no está en SIESA'", () => {
    expect(paraLista(null)).toBeNull();
  });
});

describe("contratoDe", () => {
  const contratos = indexarContratos([fila({ nit: "12345" })]);

  it("encuentra la cédula aunque se haya digitado con puntos o ceros", () => {
    expect(contratoDe(contratos, "0.012.345")?.cedula).toBe("12345");
  });

  it("null cuando SIESA no tiene esa cédula", () => {
    expect(contratoDe(contratos, "999")).toBeNull();
    expect(contratoDe(contratos, "")).toBeNull();
  });
});

describe("cruzarConRegistros", () => {
  const contratos = indexarContratos([
    fila({ nit: "111", estado: "ACTIVO" }),
    fila({ nit: "222", estado: "RETIRADO", motivo_retiro: "Renuncia" }),
    fila({ nit: "333", estado: "ACTIVO", motivo_retiro: null }),
  ]);

  it("el registrado recibe su contrato por id; el que no está en SIESA, null", () => {
    const { porRegistro } = cruzarConRegistros(contratos, [
      { id: "r1", cedula: "1.11" },
      { id: "r2", cedula: "999" },
    ]);
    expect(porRegistro.r1.cedula).toBe("111");
    expect(porRegistro.r2).toBeNull();
  });

  it("sinRegistro trae al resto de la nómina, con nombre y sin motivo de retiro", () => {
    const { sinRegistro } = cruzarConRegistros(contratos, [{ id: "r1", cedula: "111" }]);
    expect(sinRegistro.map((c) => c.cedula).sort()).toEqual(["222", "333"]);
    const retirado = sinRegistro.find((c) => c.cedula === "222");
    expect(retirado.nombre).toBe("JUAN PEREZ");
    expect(retirado).not.toHaveProperty("motivoRetiro");
  });

  it("una cédula registrada dos veces no se repite en sinRegistro", () => {
    const { porRegistro, sinRegistro } = cruzarConRegistros(contratos, [
      { id: "a", cedula: "111" },
      { id: "b", cedula: "0111" },
    ]);
    expect(porRegistro.a.cedula).toBe("111");
    expect(porRegistro.b.cedula).toBe("111");
    expect(sinRegistro.some((c) => c.cedula === "111")).toBe(false);
  });

  it("sin registros, toda la nómina queda en sinRegistro", () => {
    expect(cruzarConRegistros(contratos, []).sinRegistro).toHaveLength(3);
  });
});

describe("registroDeCedula", () => {
  const registros = [
    { id: "a", cedula: "1.017.924.321" },
    { id: "b", cedula: "43000111" },
  ];

  it("encuentra el registro aunque la cédula se haya digitado con puntos", () => {
    expect(registroDeCedula(registros, "1017924321")?.id).toBe("a");
  });

  it("devuelve null si la cédula no tiene registro", () => {
    expect(registroDeCedula(registros, "999")).toBeNull();
    expect(registroDeCedula(registros, "")).toBeNull();
  });
});

describe("expedienteDesdeContrato", () => {
  it("arma el registro con los datos de SIESA y sin documentos", () => {
    const contrato = mapearContrato(fila());
    const exp = expedienteDesdeContrato(contrato, "user-1");
    expect(exp).toEqual({
      user_id: "user-1",
      empresa: "Merkahorro",
      nombre: "JUAN PEREZ",
      apellidos: "",
      tipo_documento: "Cedula de ciudadanía",
      cedula: "1017924321",
      nombre_cargo: "CAJERO",
      sede: "PRINCIPAL COPACABANA",
      fecha_contratacion: "2024-02-01",
    });
    expect(Object.keys(exp).some((k) => k.startsWith("url_"))).toBe(false);
  });
});
