// emailservice.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { supabaseAxios } from "./supabaseClient.js";
import { normalizarCedula } from "./empleadosSiesaService.js";

dotenv.config();

// Configuración corregida para Outlook/Office 365
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true", // false para STARTTLS en puerto 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Deja constancia de un intento de envío en `correos_enviados`
 * (sql/correos_enviados.sql). Nunca lanza: si la tabla no existe o Supabase
 * falla, el correo ya salió (o ya falló) y eso no debe tumbar la aprobación.
 *
 * @param {object} meta { evento, entidadTipo, documento }
 * @param {object} resultado { destinatarios, asunto, estado, error, messageId }
 */
export const registrarCorreo = async (meta = {}, resultado = {}) => {
  if (!meta.evento) return;
  try {
    await supabaseAxios.post("/correos_enviados", {
      evento: meta.evento,
      entidad_tipo: meta.entidadTipo || null,
      documento: meta.documento ? normalizarCedula(meta.documento) : null,
      destinatarios: resultado.destinatarios || null,
      asunto: resultado.asunto || null,
      estado: resultado.estado,
      error: resultado.error ? String(resultado.error).slice(0, 1000) : null,
      message_id: resultado.messageId || null,
    });
  } catch (error) {
    console.error(
      "No se pudo registrar el correo en correos_enviados:",
      error.response?.data || error.message,
    );
  }
};

/**
 * La variable de entorno del destinatario está vacía: antes era un
 * console.warn que nadie leía; ahora queda en el registro del empleado.
 */
export const registrarSinDestinatario = (variable, asunto, meta) =>
  registrarCorreo(meta, {
    asunto,
    estado: "sin_destinatario",
    error: `${variable} no está configurado en el backend.`,
  });

/**
 * @param {string} to correos separados por coma si son varios
 * @param {object} [meta] { evento, entidadTipo, documento } — si viene, el
 *   intento queda en `correos_enviados`.
 */
export const sendEmail = async (to, subject, htmlContent, meta) => {
  try {
    const info = await transporter.sendMail({
      from: `"Notificaciones Merkahorro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`📨 Correo enviado a ${to}:`, info.messageId);
    await registrarCorreo(meta, {
      destinatarios: to,
      asunto: subject,
      estado: "enviado",
      messageId: info.messageId,
    });
    return info; // Devolver información del envío exitoso
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
    await registrarCorreo(meta, {
      destinatarios: to,
      asunto: subject,
      estado: "fallido",
      error: error.message,
    });
    throw error;
  }
};
