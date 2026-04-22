// controllers/tokensController.js
import { supabaseAxios } from "../services/supabaseClient.js";
import crypto from "crypto";

export const TOKEN_DISABLED_MESSAGES = {
  usado:
    "Este formulario ya no está disponible porque el enlace ya fue utilizado. Si necesitas otro, comunícate con la persona encargada de generar estos enlaces.",
  expirado:
    "Este formulario ya no está disponible porque el enlace ha expirado. Si necesitas otro, comunícate con la persona encargada de generar estos enlaces.",
};

export const TOKEN_NOT_FOUND_MESSAGE =
  "Este formulario no está disponible porque el enlace es inválido. Solicita uno nuevo a la persona encargada de generar estos enlaces.";

export const respondTokenDisabled = (res, motivo) =>
  res.status(410).json({
    valido: false,
    motivo,
    message: TOKEN_DISABLED_MESSAGES[motivo],
  });

/**
 * @route POST /api/trazabilidad/tokens/generar
 * Genera un token único para registro (empleado, cliente o proveedor)
 */
export const generarToken = async (req, res) => {
  try {
    const { tipo } = req.body; // 'empleado', 'cliente', 'proveedor'
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // --- LÓGICA DE PERMISOS ESTRICTA POR ROL ---
    const isSuperAdmin = user_role === "super_admin" || user_role === "admin";
    
    let hasPermission = false;

    if (isSuperAdmin) {
      hasPermission = true;
    } else if (tipo === "empleado" && user_role === "admin_empleado") {
      hasPermission = true;
    } else if (tipo === "cliente" && (user_role === "admin_cliente" || user_role === "admin_tesoreria")) {
      hasPermission = true;
    } else if (tipo === "proveedor" && (user_role === "admin_proveedor" || user_role === "admin_tesoreria")) {
      hasPermission = true;
    }

    if (!hasPermission) {
      return res.status(403).json({ 
        message: `No tienes permiso para generar tokens de tipo: ${tipo}.` 
      });
    }

    if (!tipo || !["empleado", "cliente", "proveedor"].includes(tipo)) {
      return res.status(400).json({
        message: "Tipo inválido. Debe ser: empleado, cliente o proveedor.",
      });
    }

    // Generar token único (32 caracteres hexadecimales)
    const token = crypto.randomBytes(32).toString("hex");

    // Días de expiración según tipo (proveedores tienen más plazo)
    const diasExpiracion = { empleado: 3, cliente: 3, proveedor: 10 };
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + (diasExpiracion[tipo] || 3));

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
      empleado: "/autogestion",
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
      error.response?.data || error.message,
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
      `/tokens_registro?token=eq.${token}`,
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        valido: false,
        message: TOKEN_NOT_FOUND_MESSAGE,
      });
    }

    const tokenData = data[0];

    // Verificar si ya fue usado
    if (tokenData.usado) {
      return respondTokenDisabled(res, "usado");
    }

    // Verificar si expiró
    const ahora = new Date();
    const fechaExpiracion = new Date(tokenData.expiracion);

    if (ahora > fechaExpiracion) {
      return respondTokenDisabled(res, "expirado");
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
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // --- FILTRO DE SEGURIDAD POR ROL ---
    const isSuperAdmin = user_role === "super_admin" || user_role === "admin";
    const canSeeEmployees = isSuperAdmin || user_role === "admin_empleado";
    const canSeeClientsProviders = isSuperAdmin || ["admin_cliente", "admin_proveedor", "admin_tesoreria"].includes(user_role);

    let queryPath = `/tokens_registro?select=*&order=created_at.desc`;

    // Si no es SuperAdmin, filtramos lo que puede ver
    if (!isSuperAdmin) {
      const allowedTypes = [];
      if (canSeeEmployees) allowedTypes.push("empleado");
      if (canSeeClientsProviders) {
        allowedTypes.push("cliente");
        allowedTypes.push("proveedor");
      }

      if (allowedTypes.length > 0) {
        queryPath += `&tipo=in.(${allowedTypes.join(",")})`;
      } else {
        // Si por alguna razón no tiene ningún permiso, devolvemos vacío
        return res.status(200).json([]);
      }
    }

    const { data: tokens } = await supabaseAxios.get(queryPath);

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
        ]),
      );
    } catch (profileError) {
      console.warn(
        "No se pudo obtener perfiles para los tokens:",
        profileError.response?.data || profileError.message,
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
      error.response?.data || error.message || error,
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
      { headers: { Prefer: "return=representation" } },
    );
    return data[0];
  } catch (error) {
    console.error("Error al marcar token como usado:", error);
    throw error;
  }
};

/**
 * @route DELETE /api/trazabilidad/tokens/eliminar/:id
 * Elimina un token generado
 */
export const eliminarToken = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    // Opcional: Verificar si el token pertenece al usuario o si es admin
    // Por ahora permitimos eliminar si está autenticado, asumiendo que el frontend filtra o que cualquier admin puede borrar.

    const { error } = await supabaseAxios.delete(
      `/tokens_registro?id=eq.${id}`,
    );

    if (error) throw error;

    res.status(200).json({ message: "Token eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar token:", error);
    res.status(500).json({
      message: "Error al eliminar token.",
      error: error.message,
    });
  }
};
