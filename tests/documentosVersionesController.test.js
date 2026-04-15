import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAxios BEFORE importing the controller
vi.mock("../services/supabaseClient.js", () => ({
  supabaseAxios: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import {
  reemplazarDocumento,
  getHistorialDocumento,
} from "../controllers/documentosVersionesController.js";
import { supabaseAxios } from "../services/supabaseClient.js";

// Helper to create mock req/res
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { id: 1, email: "admin@test.com" },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("reemplazarDocumento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // VALIDATION TESTS
  // ========================================

  it("should return 401 if user is not authenticated", async () => {
    const req = mockReq({ user: {} });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Usuario no autenticado." }),
    );
  });

  it("should return 400 if required fields are missing", async () => {
    const req = mockReq({
      body: { expediente_tipo: "cliente" },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Faltan datos requeridos"),
      }),
    );
  });

  it("should return 400 if motivo is empty", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "El motivo del reemplazo es obligatorio.",
      }),
    );
  });

  it("should return 400 if motivo is only whitespace", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "   ",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "El motivo del reemplazo es obligatorio.",
      }),
    );
  });

  it("should return 400 if motivo is not a string", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: 12345,
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "El motivo del reemplazo es obligatorio.",
      }),
    );
  });

  it("should return 400 for invalid expediente_tipo", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "invalido",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Documento vencido",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("expediente_tipo inválido"),
      }),
    );
  });

  it("should return 400 for disallowed campo_documento", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_malicioso_campo",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Campo de documento no permitido"),
      }),
    );
  });

  // ========================================
  // ALLOWED CAMPOS TESTS
  // ========================================

  const camposCliente = [
    "url_rut",
    "url_camara_comercio",
    "url_certificado_sagrilaft",
    "url_cedula",
    "url_certificacion_bancaria",
    "url_composicion_accionaria",
  ];

  const camposEmpleado = [
    "url_hoja_de_vida",
    "url_certificado_bancario",
    "url_habeas_data",
    "url_autorizacion_firma",
  ];

  const camposProveedor = [
    "url_doc_identidad_rep_legal",
    "url_certificado_bolsa",
    "url_certificado_fenalce",
    "url_certificado_asohofrucol",
    "url_certificado_fedepapa",
  ];

  it.each(camposCliente)(
    "should accept campo_documento '%s' for cliente",
    async (campo) => {
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ [campo]: "https://old.com/old.pdf" }],
      });
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ nombre: "Admin" }],
      });
      supabaseAxios.post.mockResolvedValueOnce({
        data: [{ id: 1 }],
      });
      supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });

      const req = mockReq({
        body: {
          expediente_tipo: "cliente",
          expediente_id: 1,
          campo_documento: campo,
          url_nueva: "https://example.com/new.pdf",
          motivo: "Actualización",
        },
      });
      const res = mockRes();

      await reemplazarDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    },
  );

  it.each(camposEmpleado)(
    "should accept campo_documento '%s' for empleado",
    async (campo) => {
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ [campo]: "https://old.com/old.pdf" }],
      });
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ nombre: "Admin" }],
      });
      supabaseAxios.post.mockResolvedValueOnce({
        data: [{ id: 1 }],
      });
      supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });

      const req = mockReq({
        body: {
          expediente_tipo: "empleado",
          expediente_id: 1,
          campo_documento: campo,
          url_nueva: "https://example.com/new.pdf",
          motivo: "Actualización",
        },
      });
      const res = mockRes();

      await reemplazarDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    },
  );

  it.each(camposProveedor)(
    "should accept campo_documento '%s' for proveedor",
    async (campo) => {
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ [campo]: "https://old.com/old.pdf" }],
      });
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ nombre: "Admin" }],
      });
      supabaseAxios.post.mockResolvedValueOnce({
        data: [{ id: 1 }],
      });
      supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });

      const req = mockReq({
        body: {
          expediente_tipo: "proveedor",
          expediente_id: 1,
          campo_documento: campo,
          url_nueva: "https://example.com/new.pdf",
          motivo: "Actualización",
        },
      });
      const res = mockRes();

      await reemplazarDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    },
  );

  // ========================================
  // EXPEDIENTE NOT FOUND / NO PREVIOUS DOC
  // ========================================

  it("should return 404 if expediente does not exist", async () => {
    supabaseAxios.get.mockResolvedValueOnce({ data: [] });

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 999,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Expediente no encontrado." }),
    );
  });

  it("should return 400 if the campo has no previous document URL", async () => {
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ url_rut: null }],
    });

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("no tiene un documento previo"),
      }),
    );
  });

  // ========================================
  // HAPPY PATH: FULL REPLACEMENT FLOW
  // ========================================

  it("should complete the full replacement flow correctly", async () => {
    const oldUrl = "https://storage.com/old_rut.pdf";
    const newUrl = "https://storage.com/new_rut.pdf";

    // 1. GET expediente → returns old URL
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ url_rut: oldUrl }],
    });

    // 2. GET profile → returns user name
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ nombre: "Juan Admin" }],
    });

    // 3. POST version → registers version
    supabaseAxios.post.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          expediente_tipo: "cliente",
          expediente_id: 1,
          campo_documento: "url_rut",
          url_anterior: oldUrl,
          url_nueva: newUrl,
          motivo: "Documento vencido",
          reemplazado_por_id: 1,
        },
      ],
    });

    // 4. PATCH expediente → updates URL
    supabaseAxios.patch.mockResolvedValueOnce({
      data: [{ url_rut: newUrl }],
    });

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: newUrl,
        motivo: "Documento vencido",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Documento reemplazado correctamente.",
        version: expect.objectContaining({ id: 42 }),
      }),
    );

    // Verify version was saved with correct data
    expect(supabaseAxios.post).toHaveBeenCalledWith(
      "/trazabilidad_documentos_versiones",
      expect.objectContaining({
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_anterior: oldUrl,
        url_nueva: newUrl,
        motivo: "Documento vencido",
        reemplazado_por_id: 1,
        reemplazado_por_email: "admin@test.com",
        reemplazado_por_nombre: "Juan Admin",
      }),
      expect.any(Object),
    );

    // Verify expediente was updated
    expect(supabaseAxios.patch).toHaveBeenCalledWith(
      "/clientes_contabilidad?id=eq.1",
      { url_rut: newUrl },
      expect.any(Object),
    );
  });

  it("should use correct table for each expediente_tipo", async () => {
    const setupMocks = () => {
      supabaseAxios.get.mockResolvedValueOnce({
        data: [{ url_rut: "https://old.com/old.pdf" }],
      });
      supabaseAxios.get.mockResolvedValueOnce({ data: [] });
      supabaseAxios.post.mockResolvedValueOnce({ data: [{ id: 1 }] });
      supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });
    };

    const tiposYTablas = [
      ["cliente", "clientes_contabilidad"],
      ["empleado", "empleados_contabilidad"],
      ["proveedor", "proveedores_contabilidad"],
    ];

    for (const [tipo, tabla] of tiposYTablas) {
      vi.clearAllMocks();
      setupMocks();

      const req = mockReq({
        body: {
          expediente_tipo: tipo,
          expediente_id: 5,
          campo_documento: "url_rut",
          url_nueva: "https://new.com/new.pdf",
          motivo: "Test",
        },
      });
      const res = mockRes();

      await reemplazarDocumento(req, res);

      // Verify GET used correct table
      expect(supabaseAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/${tabla}?`),
      );

      // Verify PATCH used correct table
      expect(supabaseAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining(`/${tabla}?`),
        expect.any(Object),
        expect.any(Object),
      );
    }
  });

  it("should trim motivo before saving", async () => {
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ url_rut: "https://old.com/old.pdf" }],
    });
    supabaseAxios.get.mockResolvedValueOnce({ data: [] });
    supabaseAxios.post.mockResolvedValueOnce({ data: [{ id: 1 }] });
    supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://new.com/new.pdf",
        motivo: "  Documento vencido  ",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(supabaseAxios.post).toHaveBeenCalledWith(
      "/trazabilidad_documentos_versiones",
      expect.objectContaining({ motivo: "Documento vencido" }),
      expect.any(Object),
    );
  });

  it("should continue if profile lookup fails", async () => {
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ url_rut: "https://old.com/old.pdf" }],
    });
    // profile GET throws
    supabaseAxios.get.mockRejectedValueOnce(new Error("profiles not found"));
    supabaseAxios.post.mockResolvedValueOnce({ data: [{ id: 1 }] });
    supabaseAxios.patch.mockResolvedValueOnce({ data: [{}] });

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://new.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(supabaseAxios.post).toHaveBeenCalledWith(
      "/trazabilidad_documentos_versiones",
      expect.objectContaining({ reemplazado_por_nombre: null }),
      expect.any(Object),
    );
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  it("should handle supabase error with response", async () => {
    supabaseAxios.get.mockResolvedValueOnce({
      data: [{ url_rut: "https://old.com/old.pdf" }],
    });
    supabaseAxios.get.mockResolvedValueOnce({ data: [] });

    const supabaseError = new Error("Supabase error");
    supabaseError.response = {
      status: 409,
      data: { message: "Conflict", details: "duplicate key" },
    };
    supabaseAxios.post.mockRejectedValueOnce(supabaseError);

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://new.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("should return 500 for unexpected errors", async () => {
    supabaseAxios.get.mockRejectedValueOnce(new Error("Network failure"));

    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://new.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Error interno del servidor.",
      }),
    );
  });

  // ========================================
  // SECURITY: SQL INJECTION / PATH TRAVERSAL
  // ========================================

  it("should reject campo_documento with SQL injection attempt", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "cliente",
        expediente_id: 1,
        campo_documento: "url_rut; DROP TABLE --",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Campo de documento no permitido"),
      }),
    );
  });

  it("should reject expediente_tipo not in whitelist", async () => {
    const req = mockReq({
      body: {
        expediente_tipo: "admin; DROP TABLE--",
        expediente_id: 1,
        campo_documento: "url_rut",
        url_nueva: "https://example.com/new.pdf",
        motivo: "Test",
      },
    });
    const res = mockRes();

    await reemplazarDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("getHistorialDocumento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const req = mockReq({ user: {}, params: { tipo: "cliente", id: "1" } });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 400 for invalid tipo", async () => {
    const req = mockReq({
      params: { tipo: "invalido", id: "1" },
      query: {},
    });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return historial for valid request without campo filter", async () => {
    const historialData = [
      {
        id: 1,
        campo_documento: "url_rut",
        url_anterior: "https://old.com/1.pdf",
        url_nueva: "https://new.com/2.pdf",
        motivo: "Vencido",
        reemplazado_en: "2026-04-15T10:00:00Z",
      },
    ];
    supabaseAxios.get.mockResolvedValueOnce({ data: historialData });

    const req = mockReq({
      params: { tipo: "cliente", id: "1" },
      query: {},
    });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(historialData);
    expect(supabaseAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("expediente_tipo=eq.cliente"),
    );
    expect(supabaseAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("expediente_id=eq.1"),
    );
    expect(supabaseAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("order=reemplazado_en.desc"),
    );
  });

  it("should filter by campo when provided", async () => {
    supabaseAxios.get.mockResolvedValueOnce({ data: [] });

    const req = mockReq({
      params: { tipo: "empleado", id: "5" },
      query: { campo: "url_cedula" },
    });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(supabaseAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("campo_documento=eq.url_cedula"),
    );
  });

  it("should return empty array if supabase returns null", async () => {
    supabaseAxios.get.mockResolvedValueOnce({ data: null });

    const req = mockReq({
      params: { tipo: "proveedor", id: "3" },
      query: {},
    });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return 500 on unexpected error", async () => {
    supabaseAxios.get.mockRejectedValueOnce(new Error("DB down"));

    const req = mockReq({
      params: { tipo: "cliente", id: "1" },
      query: {},
    });
    const res = mockRes();

    await getHistorialDocumento(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
