// controllers/tokensController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import crypto from "crypto";

/**
 * @route POST /api/trazabilidad/tokens/generar
 * Genera un token único para registro (empleado, cliente o proveedor)
 */
export const generarToken = async (req, res) => {
  try {
    const { tipo } = req.body; // 'empleado', 'cliente', 'proveedor'
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    if (!tipo || !["empleado", "cliente", "proveedor"].includes(tipo)) {
      return res.status(400).json({
        message: "Tipo inválido. Debe ser: empleado, cliente o proveedor.",
      });
    }

    // Generar token único (32 caracteres hexadecimales)
    const token = crypto.randomBytes(32).toString("hex");

    // Fecha de expiración: 3 días desde ahora
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + 3);

    const payload = {
      token,
      tipo,
      expiracion: expiracion.toISOString(),
      usado: false,
      generado_por: user_id,
      created_at: new Date().toISOString(),
    };

    const { data } = await supabaseAxios.post("/tokens_registro", payload, {
      headers: { Prefer: "return=representation" },
    });

    // Mapeo de tipos a rutas del frontend
    const rutasPorTipo = {
      empleado: "/trazabilidad/crear-empleado",
      cliente: "/trazabilidad/crear-cliente",
      proveedor: "/trazabilidad/crear-proveedor",
    };

    // Construir URL completa con query param token
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const urlRegistro = `${baseUrl}${rutasPorTipo[tipo]}?token=${token}`;

    res.status(201).json({
      ...data[0],
      url_registro: urlRegistro,
    });
  } catch (error) {
    console.error(
      "Error al generar token:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Error al generar token.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/tokens/validar/:token
 * Valida si un token es válido (no usado y no expirado)
 */
export const validarToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Token no proporcionado." });
    }

    // Buscar el token
    const { data } = await supabaseAxios.get(
      `/tokens_registro?token=eq.${token}`
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        valido: false,
        message: "Token no encontrado.",
      });
    }

    const tokenData = data[0];

    // Verificar si ya fue usado
    if (tokenData.usado) {
      return res.status(400).json({
        valido: false,
        message: "Este token ya ha sido utilizado.",
      });
    }

    // Verificar si expiró
    const ahora = new Date();
    const fechaExpiracion = new Date(tokenData.expiracion);

    if (ahora > fechaExpiracion) {
      return res.status(400).json({
        valido: false,
        message: "Este token ha expirado.",
      });
    }

    // Token válido
    res.status(200).json({
      valido: true,
      tipo: tokenData.tipo,
      message: "Token válido.",
    });
  } catch (error) {
    console.error("Error al validar token:", error);
    res.status(500).json({
      message: "Error al validar token.",
      error: error.message,
    });
  }
};

/**
 * @route GET /api/trazabilidad/tokens/listar
 * Lista todos los tokens generados por el usuario autenticado
 */
export const listarTokens = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    const { data: tokens } = await supabaseAxios.get(
      `/tokens_registro?select=*&order=created_at.desc`
    );

    if (!tokens?.length) {
      return res.status(200).json([]);
    }

    const generadores = [
      ...new Set(tokens.map((token) => token.generado_por).filter(Boolean)),
    ];

    if (generadores.length === 0) {
      return res.status(200).json(tokens);
    }

    // PostgREST no permite la relación directa porque no hay FK, así que traemos los perfiles aparte.
    const filtroIds = generadores.map((id) => `"${id}"`).join(",");
    let perfilesPorId = {};

    try {
      const { data: perfiles } = await supabaseAxios.get("/profiles", {
        params: {
          select: "user_id,nombre",
          user_id: `in.(${filtroIds})`,
        },
      });

      perfilesPorId = Object.fromEntries(
        (perfiles || []).map((perfil) => [
          perfil.user_id || perfil.id,
          { nombre: perfil.nombre },
        ])
      );
    } catch (profileError) {
      console.warn(
        "No se pudo obtener perfiles para los tokens:",
        profileError.response?.data || profileError.message
      );
    }

    const tokensConPerfil = tokens.map((token) => ({
      ...token,
      profiles: perfilesPorId[token.generado_por] || null,
    }));

    res.status(200).json(tokensConPerfil);
  } catch (error) {
    console.error(
      "Error al listar tokens:",
      error.response?.data || error.message || error
    );
    res.status(500).json({
      message: "Error al listar tokens.",
      error: error.message,
    });
  }
};

/**
 * @route PATCH /api/trazabilidad/tokens/marcar-usado/:token
 * Marca un token como usado (llamado internamente después de un registro exitoso)
 */
export const marcarTokenUsado = async (token) => {
  try {
    const { data } = await supabaseAxios.patch(
      `/tokens_registro?token=eq.${token}`,
      { usado: true, fecha_uso: new Date().toISOString() },
      { headers: { Prefer: "return=representation" } }
    );
    return data[0];
  } catch (error) {
    console.error("Error al marcar token como usado:", error);
    throw error;
  }
};
