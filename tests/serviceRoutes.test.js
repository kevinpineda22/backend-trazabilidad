import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import express from "express";

vi.mock("../services/empleadosServicio.js", () => ({ listarEmpleadosActivosServicio: vi.fn() }));
vi.mock("../middlewares/authMiddleware.js", () => ({
  authMiddleware: vi.fn((req, res, next) => next()),
}));

const { listarEmpleadosActivosServicio } = await import("../services/empleadosServicio.js");
const { authMiddleware } = await import("../middlewares/authMiddleware.js");
const { default: serviceRoutes, crearServiceRouter } = await import("../routes/serviceRoutes.js");

let server;
let base;
beforeAll(async () => {
  const app = express();
  app.use("/api/trazabilidad/service", serviceRoutes);
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}/api/trazabilidad/service/empleados-activos`;
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SERVICE_API_KEYS = JSON.stringify({ horarios: "k1" });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.SERVICE_API_KEYS;
  vi.restoreAllMocks();
});

const fila = {
  cedula: "123",
  nombre: "Ana",
  cargo: "CAJERO",
  sede: "CENTRO",
  activo: true,
  restriccionOperativa: null,
};

describe("GET /api/trazabilidad/service/empleados-activos", () => {
  it("200 con {data,total,actualizado} y clave valida", async () => {
    listarEmpleadosActivosServicio.mockResolvedValue({ data: [fila], actualizado: "T" });
    const res = await fetch(base, { headers: { "x-api-key": "k1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [fila], total: 1, actualizado: "T" });
  });

  it("sin clave 401 y sin tocar el servicio", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(401);
    expect(listarEmpleadosActivosServicio).not.toHaveBeenCalled();
  });

  it("solo Bearer JWT 401; authMiddleware nunca se consulta", async () => {
    const res = await fetch(base, { headers: { authorization: "Bearer eyJ.a.b" } });
    expect(res.status).toBe(401);
    expect(authMiddleware).not.toHaveBeenCalled();
    expect(listarEmpleadosActivosServicio).not.toHaveBeenCalled();
  });

  it("R-g: fallo del servicio -> 502 sin datos parciales", async () => {
    listarEmpleadosActivosServicio.mockRejectedValue(new Error("db down"));
    const res = await fetch(base, { headers: { "x-api-key": "k1" } });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).not.toHaveProperty("data");
    expect(JSON.stringify(body)).not.toContain("db down");
  });

  it("solo GET", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(base, { method, headers: { "x-api-key": "k1" } });
      expect(res.status, method).toBe(404);
    }
    expect(listarEmpleadosActivosServicio).not.toHaveBeenCalled();
  });
});

describe("cableado de limitadores en el router", () => {
  let srv;
  let url;
  afterEach(() => srv?.close());
  const levantar = async (opts) => {
    const app = express();
    app.use("/s", crearServiceRouter(opts));
    await new Promise((r) => (srv = app.listen(0, r)));
    url = `http://127.0.0.1:${srv.address().port}/s/empleados-activos`;
  };
  const get = (key) => fetch(url, { headers: key ? { "x-api-key": key } : {} });

  it("fallos repetidos de clave -> 429 tras el limite (y bloquea tambien la clave valida)", async () => {
    await levantar({ fallosMax: 2, consumidorMax: 100 });
    expect((await get("mala")).status).toBe(401);
    expect((await get("mala")).status).toBe(401);
    expect((await get("mala")).status).toBe(429);
    expect((await get("k1")).status).toBe(429);
  });

  it("limiter por consumidor aplicado: clave valida excede el cupo -> 429", async () => {
    listarEmpleadosActivosServicio.mockResolvedValue({ data: [], actualizado: "T" });
    await levantar({ fallosMax: 100, consumidorMax: 2 });
    expect((await get("k1")).status).toBe(200);
    expect((await get("k1")).status).toBe(200);
    expect((await get("k1")).status).toBe(429);
  });
});

describe("app.js", () => {
  it("monta el router de servicio ANTES del globalLimiter", () => {
    const src = readFileSync(new URL("../app.js", import.meta.url), "utf8");
    const mount = src.indexOf('app.use("/api/trazabilidad/service", serviceRoutes)');
    const global = src.indexOf("app.use(globalLimiter)");
    expect(mount).toBeGreaterThan(-1);
    expect(global).toBeGreaterThan(-1);
    expect(mount).toBeLessThan(global);
  });
});
