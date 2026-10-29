import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { serviceApiKey, crearLimitadores } from "../middlewares/serviceApiKey.js";

const KEY = "k-secret-abc123";
const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};
const run = (headers = {}) => {
  const req = { headers, method: "GET", originalUrl: "/x" };
  const res = mockRes();
  const next = vi.fn();
  serviceApiKey(req, res, next);
  return { req, res, next };
};

describe("serviceApiKey", () => {
  beforeEach(() => {
    process.env.SERVICE_API_KEYS = JSON.stringify({ horarios: KEY, otro: "k-otro" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.SERVICE_API_KEYS;
    vi.restoreAllMocks();
  });

  it("clave valida: pasa y fija req.serviceConsumer", () => {
    const { req, next, res } = run({ "x-api-key": KEY });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(req.serviceConsumer).toBe("horarios");
  });

  it("acepta el formato corto nombre:clave", () => {
    process.env.SERVICE_API_KEYS = "horarios:abc,otro:def";
    const { req, next } = run({ "x-api-key": "def" });
    expect(next).toHaveBeenCalled();
    expect(req.serviceConsumer).toBe("otro");
  });

  it("sin header: 401", () => {
    const { res, next } = run({});
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("clave incorrecta: 401", () => {
    const { res, next } = run({ "x-api-key": "nope" });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("solo Bearer JWT: 401 (el JWT nunca se acepta)", () => {
    const { res, next } = run({ authorization: "Bearer eyJ.fake.jwt" });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sin configurar: 503 fail-closed", () => {
    delete process.env.SERVICE_API_KEYS;
    const { res, next } = run({ "x-api-key": KEY });
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("JSON invalido: 503 fail-closed", () => {
    process.env.SERVICE_API_KEYS = "{roto";
    const { res, next } = run({ "x-api-key": KEY });
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("valores JSON no string se ignoran: {a:{x:1}} -> 503, '[object Object]' no se acepta", () => {
    process.env.SERVICE_API_KEYS = JSON.stringify({ a: { x: 1 } });
    const { res, next } = run({ "x-api-key": "[object Object]" });
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("valores numericos/null/vacios se ignoran: solo k1 funciona", () => {
    process.env.SERVICE_API_KEYS = JSON.stringify({ a: "k1", b: 5, c: null, d: "  " });
    expect(run({ "x-api-key": "k1" }).next).toHaveBeenCalled();
    const num = run({ "x-api-key": "5" });
    expect(num.res.statusCode).toBe(401);
    expect(num.next).not.toHaveBeenCalled();
    const nul = run({ "x-api-key": "null" });
    expect(nul.res.statusCode).toBe(401);
  });

  it("clave duplicada entre consumidores -> 503 fail-closed (JSON)", () => {
    process.env.SERVICE_API_KEYS = JSON.stringify({ a: "same", b: "same" });
    const { res, next } = run({ "x-api-key": "same" });
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
    expect(JSON.stringify(console.error.mock.calls)).not.toContain("same");
  });

  it("clave duplicada entre consumidores -> 503 fail-closed (formato corto)", () => {
    process.env.SERVICE_API_KEYS = "a:same,b:same";
    const { res, next } = run({ "x-api-key": "same" });
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("la clave nunca se escribe en logs ni en la respuesta", () => {
    const ok = run({ "x-api-key": KEY });
    const mala = run({ "x-api-key": "otra-clave-mala" });
    const logs = JSON.stringify([...console.log.mock.calls, ...console.error.mock.calls]);
    expect(logs).not.toContain(KEY);
    expect(logs).not.toContain("otra-clave-mala");
    expect(JSON.stringify(mala.res.body)).not.toContain("otra-clave-mala");
    expect(ok.next).toHaveBeenCalled();
  });
});

describe("crearLimitadores", () => {
  let server;
  let base;
  afterEach(() => {
    server?.close();
    delete process.env.SERVICE_API_KEYS;
    vi.restoreAllMocks();
  });

  const levantar = async (opts) => {
    process.env.SERVICE_API_KEYS = JSON.stringify({ a: "ka", b: "kb" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { fallosPorIp, porConsumidor } = crearLimitadores(opts);
    const app = express();
    app.use(fallosPorIp, serviceApiKey, porConsumidor, (req, res) => res.json({ ok: true }));
    await new Promise((r) => (server = app.listen(0, r)));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const get = (key) => fetch(base, { headers: key ? { "x-api-key": key } : {} });

  it("el limiter por IP cuenta solo intentos fallidos: los exitos no lo agotan", async () => {
    await levantar({ fallosMax: 2, consumidorMax: 100 });
    for (let i = 0; i < 5; i++) expect((await get("ka")).status).toBe(200);
    expect((await get("mala")).status).toBe(401);
    expect((await get("mala")).status).toBe(401);
    expect((await get("mala")).status).toBe(429);
    // IP bloqueada: incluso una clave valida se frena ANTES del chequeo de clave
    expect((await get("ka")).status).toBe(429);
  });

  it("el limiter por consumidor es independiente entre consumidores", async () => {
    await levantar({ fallosMax: 100, consumidorMax: 2 });
    expect((await get("ka")).status).toBe(200);
    expect((await get("ka")).status).toBe(200);
    expect((await get("ka")).status).toBe(429);
    expect((await get("kb")).status).toBe(200);
  });
});
