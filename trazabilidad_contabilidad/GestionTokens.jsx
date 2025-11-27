// trazabilidad_contabilidad/GestionTokens.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./GestionTokens.css";

const GestionTokens = ({ userRole }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // 'success' o 'error'
  const [filtroEstado, setFiltroEstado] = useState("activo"); // 'activo', 'todos', 'usado', 'expirado'

  // Definir permisos basados en el rol
  const puedeGestionar = (tipo) => {
    if (!userRole) return false; // Esperar a que se cargue el rol

    if (userRole === "admin" || userRole === "super_admin") return true;
    // Mapeo de roles a tipos permitidos
    // admin_empleado -> empleado
    if (userRole === "admin_empleado" && tipo === "empleado") return true;

    // admin_cliente y admin_proveedor -> cliente y proveedor (Unificados)
    if (
      ["admin_cliente", "admin_proveedor", "admin_proveedores"].includes(
        userRole
      )
    ) {
      return ["cliente", "proveedor"].includes(tipo);
    }

    return false;
  };

  // Cargar tokens al montar el componente
  useEffect(() => {
    cargarTokens();
  }, []);

  const cargarTokens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        mostrarMensaje("No se encontró token de autenticación.", "error");
        setTokens([]);
        return;
      }

      const response = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/tokens/listar`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Validar que la respuesta sea un array
      if (Array.isArray(response.data)) {
        setTokens(response.data);
      } else {
        console.error("La respuesta no es un array:", response.data);
        setTokens([]);
        mostrarMensaje("Error: Respuesta inválida del servidor.", "error");
      }
    } catch (error) {
      console.error("Error al cargar tokens:", error);
      setTokens([]); // Asegurar que tokens sea un array vacío
      if (error.response?.status === 401) {
        mostrarMensaje(
          "Sesión expirada. Por favor, inicia sesión nuevamente.",
          "error"
        );
      } else {
        mostrarMensaje("Error al cargar los tokens.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const generarNuevoToken = async (tipo) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${
          import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
        }/api/trazabilidad/tokens/generar`,
        { tipo },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      mostrarMensaje(`Token de ${tipo} generado exitosamente.`, "success");
      cargarTokens(); // Recargar la lista
    } catch (error) {
      console.error("Error al generar token:", error);
      mostrarMensaje("Error al generar el token.", "error");
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = (url) => {
    navigator.clipboard.writeText(url);
    mostrarMensaje("Link copiado al portapapeles", "success");
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => {
      setMensaje("");
      setTipoMensaje("");
    }, 4000);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularEstado = (token) => {
    if (token.usado) return "usado";
    const ahora = new Date();
    const expiracion = new Date(token.expiracion);
    if (ahora > expiracion) return "expirado";
    return "activo";
  };

  const obtenerClaseEstado = (estado) => {
    switch (estado) {
      case "activo":
        return "tokens-estado-activo";
      case "usado":
        return "tokens-estado-usado";
      case "expirado":
        return "tokens-estado-expirado";
      default:
        return "";
    }
  };

  // Generar URL hacia los formularios existentes con parámetro token
  const generarUrlRegistro = (tipo, token) => {
    const rutas = {
      empleado: "/trazabilidad/crear-empleado",
      cliente: "/trazabilidad/crear-cliente",
      proveedor: "/trazabilidad/crear-proveedor",
    };
    return `${window.location.origin}${rutas[tipo]}?token=${token}`;
  };

  // Filtrar tokens según el estado seleccionado y el rol del usuario
  const tokensFiltrados = tokens.filter((token) => {
    // Filtro por rol
    if (!puedeGestionar(token.tipo)) return false;

    if (filtroEstado === "todos") return true;
    const estado = calcularEstado(token);
    return estado === filtroEstado;
  });

  // Contar tokens por estado (filtrados por rol)
  const tokensPermitidos = tokens.filter((t) => puedeGestionar(t.tipo));
  const contadorEstados = {
    activo: tokensPermitidos.filter((t) => calcularEstado(t) === "activo")
      .length,
    usado: tokensPermitidos.filter((t) => calcularEstado(t) === "usado").length,
    expirado: tokensPermitidos.filter((t) => calcularEstado(t) === "expirado")
      .length,
    todos: tokensPermitidos.length,
  };

  return (
    <div className="tokens-container">
      <h1>Gestión de Links de Registro</h1>
      <p className="tokens-descripcion">
        Genera links únicos para que terceros se registren. Los links tienen
        validez de 3 días o hasta que sean usados.
      </p>

      {mensaje && (
        <div
          className={`tokens-mensaje ${
            tipoMensaje === "success"
              ? "tokens-mensaje-exito"
              : "tokens-mensaje-error"
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Botones para generar tokens */}
      <div className="tokens-botones-generar">
        {puedeGestionar("empleado") && (
          <button
            className="tokens-btn-generar tokens-btn-empleado"
            onClick={() => generarNuevoToken("empleado")}
            disabled={loading}
          >
            ➕ Generar Link Empleado
          </button>
        )}
        {puedeGestionar("cliente") && (
          <button
            className="tokens-btn-generar tokens-btn-cliente"
            onClick={() => generarNuevoToken("cliente")}
            disabled={loading}
          >
            ➕ Generar Link Cliente
          </button>
        )}
        {puedeGestionar("proveedor") && (
          <button
            className="tokens-btn-generar tokens-btn-proveedor"
            onClick={() => generarNuevoToken("proveedor")}
            disabled={loading}
          >
            ➕ Generar Link Proveedor
          </button>
        )}
      </div>

      {/* Filtros de estado */}
      <div className="tokens-filtros-estado">
        <button
          className={`tokens-filtro-btn ${
            filtroEstado === "activo" ? "tokens-activo" : ""
          }`}
          onClick={() => setFiltroEstado("activo")}
        >
          ✅ Activos ({contadorEstados.activo})
        </button>
        <button
          className={`tokens-filtro-btn ${
            filtroEstado === "usado" ? "tokens-activo" : ""
          }`}
          onClick={() => setFiltroEstado("usado")}
        >
          ✔️ Usados ({contadorEstados.usado})
        </button>
        <button
          className={`tokens-filtro-btn ${
            filtroEstado === "expirado" ? "tokens-activo" : ""
          }`}
          onClick={() => setFiltroEstado("expirado")}
        >
          ⏰ Expirados ({contadorEstados.expirado})
        </button>
        <button
          className={`tokens-filtro-btn ${
            filtroEstado === "todos" ? "tokens-activo" : ""
          }`}
          onClick={() => setFiltroEstado("todos")}
        >
          📋 Todos ({contadorEstados.todos})
        </button>
      </div>

      {/* Tabla de tokens generados */}
      <div className="tokens-tabla-wrapper">
        <h2>
          Links Generados -{" "}
          {filtroEstado === "activo"
            ? "Activos"
            : filtroEstado === "usado"
            ? "Usados"
            : filtroEstado === "expirado"
            ? "Expirados"
            : "Todos"}
        </h2>
        {loading && tokens.length === 0 ? (
          <div className="tokens-loader">Cargando...</div>
        ) : tokensFiltrados.length === 0 ? (
          <p className="tokens-mensaje-vacio">
            No hay links{" "}
            {filtroEstado === "todos"
              ? ""
              : filtroEstado === "activo"
              ? "activos"
              : filtroEstado === "usado"
              ? "usados"
              : "expirados"}{" "}
            en este momento.
          </p>
        ) : (
          <table className="tokens-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Generado por</th>
                <th>Fecha Creación</th>
                <th>Expira</th>
                <th>Estado</th>
                <th>Link</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tokensFiltrados.map((token) => {
                const estado = calcularEstado(token);
                return (
                  <tr key={token.id}>
                    <td>
                      <span
                        className={`tokens-badge-tipo tokens-badge-${token.tipo}`}
                      >
                        {token.tipo.charAt(0).toUpperCase() +
                          token.tipo.slice(1)}
                      </span>
                    </td>
                    <td>{token.profiles?.nombre || "N/A"}</td>
                    <td>{formatearFecha(token.created_at)}</td>
                    <td>{formatearFecha(token.expiracion)}</td>
                    <td>
                      <span
                        className={`tokens-badge-estado ${obtenerClaseEstado(
                          estado
                        )}`}
                      >
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </span>
                    </td>
                    <td className="tokens-celda-link">
                      <code className="tokens-link-code">
                        {generarUrlRegistro(token.tipo, token.token)}
                      </code>
                    </td>
                    <td>
                      <button
                        className="tokens-btn-copiar"
                        onClick={() =>
                          copiarAlPortapapeles(
                            generarUrlRegistro(token.tipo, token.token)
                          )
                        }
                        disabled={estado !== "activo"}
                        title={
                          estado === "activo"
                            ? "Copiar link"
                            : "Link no disponible"
                        }
                      >
                        📋 Copiar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GestionTokens;
