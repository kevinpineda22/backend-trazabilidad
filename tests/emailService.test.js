import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMail, post } = vi.hoisted(() => ({ sendMail: vi.fn(), post: vi.fn() }));

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
vi.mock("../services/supabaseClient.js", () => ({ supabaseAxios: { post } }));
vi.mock("../services/connektaService.js", () => ({ ejecutarConsulta: vi.fn() }));

const { sendEmail, registrarSinDestinatario } = await import("../services/emailService.js");

const META = { evento: "registro_aprobado", entidadTipo: "empleado", documento: "1.037.577.552" };

describe("sendEmail registra cada intento en correos_enviados", () => {
  beforeEach(() => {
    sendMail.mockReset();
    post.mockReset().mockResolvedValue({ data: [] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("enviado: guarda destinatarios, asunto y cédula normalizada", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@x>" });
    await sendEmail("a@x.com,b@x.com", "Asunto", "<p/>", META);
    expect(post).toHaveBeenCalledWith(
      "/correos_enviados",
      expect.objectContaining({
        evento: "registro_aprobado",
        entidad_tipo: "empleado",
        documento: "1037577552",
        destinatarios: "a@x.com,b@x.com",
        estado: "enviado",
        message_id: "<abc@x>",
      }),
    );
  });

  it("fallido: guarda el error y sigue lanzando como antes", async () => {
    sendMail.mockRejectedValue(new Error("535 Authentication unsuccessful"));
    await expect(sendEmail("a@x.com", "Asunto", "<p/>", META)).rejects.toThrow("535");
    expect(post).toHaveBeenCalledWith(
      "/correos_enviados",
      expect.objectContaining({ estado: "fallido", error: "535 Authentication unsuccessful" }),
    );
  });

  it("si la tabla no existe, el correo igual se da por enviado", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@x>" });
    post.mockRejectedValue(new Error("relation does not exist"));
    await expect(sendEmail("a@x.com", "Asunto", "<p/>", META)).resolves.toEqual({
      messageId: "<abc@x>",
    });
  });

  it("sin meta no registra nada (llamadas viejas siguen igual)", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@x>" });
    await sendEmail("a@x.com", "Asunto", "<p/>");
    expect(post).not.toHaveBeenCalled();
  });

  it("variable de destinatario vacía queda como sin_destinatario", async () => {
    await registrarSinDestinatario("ADMIN_CONTABILIDAD_EMAIL", "Registro Aprobado", META);
    expect(post).toHaveBeenCalledWith(
      "/correos_enviados",
      expect.objectContaining({
        estado: "sin_destinatario",
        error: "ADMIN_CONTABILIDAD_EMAIL no está configurado en el backend.",
      }),
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
});
