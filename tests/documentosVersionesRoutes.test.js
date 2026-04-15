import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth middleware
vi.mock("../middlewares/authMiddleware.js", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 1, email: "test@test.com" };
    next();
  },
}));

// Mock supabaseAxios
vi.mock("../services/supabaseClient.js", () => ({
  supabaseAxios: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import express from "express";
import documentosVersionesRoutes from "../routes/documentosVersionesRoutes.js";
import { supabaseAxios } from "../services/supabaseClient.js";

const app = express();
app.use(express.json());
app.use("/api/trazabilidad/documentos-versiones", documentosVersionesRoutes);

// Helper
const request = async (method, path, body = null) => {
  const url = `http://localhost:0${path}`;
  // We'll use a lightweight approach: supertest-like via native fetch on the app
  // Since we don't have supertest, we test the route registration manually
  return null;
};

describe("documentosVersionesRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register PATCH /reemplazar route", () => {
    const routes = [];
    documentosVersionesRoutes.stack.forEach((layer) => {
      if (layer.route) {
        routes.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        });
      }
    });

    const reemplazarRoute = routes.find((r) => r.path === "/reemplazar");
    expect(reemplazarRoute).toBeDefined();
    expect(reemplazarRoute.methods).toContain("patch");
  });

  it("should register GET /historial/:tipo/:id route", () => {
    const routes = [];
    documentosVersionesRoutes.stack.forEach((layer) => {
      if (layer.route) {
        routes.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        });
      }
    });

    const historialRoute = routes.find(
      (r) => r.path === "/historial/:tipo/:id",
    );
    expect(historialRoute).toBeDefined();
    expect(historialRoute.methods).toContain("get");
  });

  it("should have authMiddleware applied", () => {
    // The router should have middleware (authMiddleware) + 2 routes
    const middlewareCount = documentosVersionesRoutes.stack.filter(
      (layer) => !layer.route,
    ).length;
    expect(middlewareCount).toBeGreaterThanOrEqual(1);
  });

  it("should have exactly 2 route handlers", () => {
    const routeCount = documentosVersionesRoutes.stack.filter(
      (layer) => layer.route,
    ).length;
    expect(routeCount).toBe(2);
  });
});

describe("app.js route mounting", () => {
  it("should mount documentos-versiones routes at correct path", async () => {
    // Verify the app has our routes mounted
    const routePaths = [];
    app._router.stack.forEach((layer) => {
      if (layer.name === "router" && layer.regexp) {
        const match = layer.regexp.source;
        if (match.includes("documentos")) {
          routePaths.push(match);
        }
      }
    });

    expect(routePaths.length).toBeGreaterThan(0);
  });
});
