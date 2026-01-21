import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  FaUserTie,
  FaUser,
  FaTruck,
  FaCopy,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaClock,
  FaList,
  FaLink,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import "./GestionTokens.css";
import { apiTrazabilidad } from "../../services/apiTrazabilidad";

const GestionTokens = ({ userRole }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // 'success' o 'error'
  const [filtroEstado, setFiltroEstado] = useState("activo"); // 'activo', 'todos', 'usado', 'expirado'
  const [nuevoTokenId, setNuevoTokenId] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  // Definir permisos basados en el rol
  const puedeGestionar = (tipo) => {
    if (!userRole) return false; // Esperar a que se cargue el rol

    if (userRole === "admin" || userRole === "super_admin") return true;
    // Mapeo de roles a tipos permitidos
    // admin_empleado -> empleado
    if (userRole === "admin_empleado" && tipo === "empleado") return true;

    // admin_cliente -> cliente
    if (["admin_cliente", "admin_clientes"].includes(userRole)) {
      return tipo === "cliente";
    }

    // admin_proveedor -> proveedor
    if (["admin_proveedor", "admin_proveedores"].includes(userRole)) {
      return tipo === "proveedor";
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

      const response = await apiTrazabilidad.get(`/trazabilidad/tokens/listar`);

      // Validar que la respuesta sea un array
      if (Array.isArray(response.data)) {
        // Ordenar por fecha de creación descendente (más reciente primero)
        const tokensOrdenados = response.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        setTokens(tokensOrdenados);
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
          "error",
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
      const response = await apiTrazabilidad.post(
        `/trazabilidad/tokens/generar`,
        { tipo },
      );

      mostrarMensaje(`Token de ${tipo} generado exitosamente.`, "success");

      // Si el backend devuelve el token creado, lo usamos para resaltar
      if (response.data && response.data.id) {
        setNuevoTokenId(response.data.id);
      }

      await cargarTokens();
    } catch (error) {
      console.error("Error al generar token:", error);
      mostrarMensaje("Error al generar el token.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Efecto para resaltar el token más reciente después de generar uno nuevo
  useEffect(() => {
    // Si tenemos un nuevoTokenId, lo limpiamos después de unos segundos
    if (nuevoTokenId) {
      const timer = setTimeout(() => setNuevoTokenId(null), 10000); // 10 segundos de resaltado
      return () => clearTimeout(timer);
    }
  }, [nuevoTokenId]);

  const eliminarToken = async (id) => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "No podrás revertir esta acción. El enlace dejará de funcionar inmediatamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        await apiTrazabilidad.delete(`/trazabilidad/tokens/eliminar/${id}`);

        Swal.fire("¡Eliminado!", "El token ha sido eliminado.", "success");
        cargarTokens();
      } catch (error) {
        console.error("Error al eliminar token:", error);
        Swal.fire("Error", "No se pudo eliminar el token.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const copiarAlPortapapeles = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
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
      month: "short",
      day: "numeric",
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

  const obtenerIconoEstado = (estado) => {
    switch (estado) {
      case "activo":
        return <FaCheckCircle />;
      case "usado":
        return <FaCheck />;
      case "expirado":
        return <FaClock />;
      default:
        return null;
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
      <div className="tokens-header">
        <h1>
          <FaLink className="tokens-header-icon" /> Gestión de Links de Registro
        </h1>
        <p className="tokens-descripcion">
          Genera y administra enlaces de invitación únicos. Los enlaces activos
          expiran en 3 días.
        </p>
      </div>

      {mensaje && (
        <div
          className={`tokens-mensaje ${
            tipoMensaje === "success"
              ? "tokens-mensaje-exito"
              : "tokens-mensaje-error"
          }`}
        >
          {tipoMensaje === "success" ? (
            <FaCheckCircle />
          ) : (
            <FaExclamationTriangle />
          )}{" "}
          {mensaje}
        </div>
      )}

      {/* Botones para generar tokens */}
      <div className="tokens-acciones-panel">
        <h3>Generar Nuevo Link</h3>
        <div className="tokens-botones-generar">
          {puedeGestionar("empleado") && (
            <button
              className="tokens-btn-generar tokens-btn-empleado"
              onClick={() => generarNuevoToken("empleado")}
              disabled={loading}
            >
              <FaUserTie /> Empleado
            </button>
          )}
          {puedeGestionar("cliente") && (
            <button
              className="tokens-btn-generar tokens-btn-cliente"
              onClick={() => generarNuevoToken("cliente")}
              disabled={loading}
            >
              <FaUser /> Cliente
            </button>
          )}
          {puedeGestionar("proveedor") && (
            <button
              className="tokens-btn-generar tokens-btn-proveedor"
              onClick={() => generarNuevoToken("proveedor")}
              disabled={loading}
            >
              <FaTruck /> Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="tokens-filtros-container">
        <div className="tokens-filtros-estado">
          <button
            className={`tokens-filtro-btn ${
              filtroEstado === "activo" ? "tokens-activo" : ""
            }`}
            onClick={() => setFiltroEstado("activo")}
          >
            <FaCheckCircle /> Activos ({contadorEstados.activo})
          </button>
          <button
            className={`tokens-filtro-btn ${
              filtroEstado === "usado" ? "tokens-activo" : ""
            }`}
            onClick={() => setFiltroEstado("usado")}
          >
            <FaCheck /> Usados ({contadorEstados.usado})
          </button>
          <button
            className={`tokens-filtro-btn ${
              filtroEstado === "expirado" ? "tokens-activo" : ""
            }`}
            onClick={() => setFiltroEstado("expirado")}
          >
            <FaClock /> Expirados ({contadorEstados.expirado})
          </button>
          <button
            className={`tokens-filtro-btn ${
              filtroEstado === "todos" ? "tokens-activo" : ""
            }`}
            onClick={() => setFiltroEstado("todos")}
          >
            <FaList /> Todos ({contadorEstados.todos})
          </button>
        </div>
      </div>

      {/* Tabla de tokens generados */}
      <div className="tokens-tabla-wrapper">
        <div className="tokens-tabla-header">
          <h2>
            {filtroEstado === "activo"
              ? "Links Activos"
              : filtroEstado === "usado"
                ? "Links Usados"
                : filtroEstado === "expirado"
                  ? "Links Expirados"
                  : "Historial Completo"}
          </h2>
        </div>

        {loading && tokens.length === 0 ? (
          <div className="tokens-loader">
            <div className="spinner"></div> Cargando...
          </div>
        ) : tokensFiltrados.length === 0 ? (
          <div className="tokens-mensaje-vacio">
            <FaLink size={40} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>
              No hay links {filtroEstado === "todos" ? "" : filtroEstado} para
              mostrar.
            </p>
          </div>
        ) : (
          <table className="tokens-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Generado por</th>
                <th>Creación / Expiración</th>
                <th>Estado</th>
                <th>Link de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tokensFiltrados.map((token) => {
                const estado = calcularEstado(token);
                // Considerar nuevo si coincide con nuevoTokenId o si es el primero de la lista y fue creado hace menos de 1 minuto
                const esNuevo =
                  token.id === nuevoTokenId ||
                  (tokens.length > 0 &&
                    tokens[0].id === token.id &&
                    new Date() - new Date(token.created_at) < 60000);

                return (
                  <tr
                    key={token.id}
                    className={esNuevo ? "token-fila-nueva" : ""}
                  >
                    <td>
                      <span
                        className={`tokens-badge-tipo tokens-badge-${token.tipo}`}
                      >
                        {token.tipo === "empleado" && <FaUserTie />}
                        {token.tipo === "cliente" && <FaUser />}
                        {token.tipo === "proveedor" && <FaTruck />}
                        {token.tipo.charAt(0).toUpperCase() +
                          token.tipo.slice(1)}
                      </span>
                      {esNuevo && <span className="badge-nuevo">NUEVO</span>}
                    </td>
                    <td>
                      <div className="token-info-usuario">
                        <span className="token-usuario-nombre">
                          {token.profiles?.nombre || "Sistema"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="token-fechas">
                        <span title="Fecha Creación" className="fecha-creacion">
                          <FaPlus size={10} />{" "}
                          {formatearFecha(token.created_at)}
                        </span>
                        <span
                          title="Fecha Expiración"
                          className="fecha-expiracion"
                        >
                          <FaClock size={10} />{" "}
                          {formatearFecha(token.expiracion)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`tokens-badge-estado ${obtenerClaseEstado(
                          estado,
                        )}`}
                      >
                        {obtenerIconoEstado(estado)}
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </span>
                    </td>
                    <td className="tokens-celda-link">
                      <div className="token-link-container">
                        <code className="tokens-link-code">
                          {generarUrlRegistro(token.tipo, token.token)}
                        </code>
                      </div>
                    </td>
                    <td>
                      <div className="tokens-acciones">
                        <button
                          className={`tokens-btn-copiar ${
                            copiadoId === token.id ? "copiado" : ""
                          }`}
                          onClick={() =>
                            copiarAlPortapapeles(
                              generarUrlRegistro(token.tipo, token.token),
                              token.id,
                            )
                          }
                          disabled={estado !== "activo"}
                          title={
                            estado === "activo"
                              ? "Copiar link"
                              : "Link no disponible"
                          }
                        >
                          {copiadoId === token.id ? <FaCheck /> : <FaCopy />}
                          {copiadoId === token.id ? " ¡Copiado!" : " Copiar"}
                        </button>
                        <button
                          className="tokens-btn-eliminar"
                          onClick={() => eliminarToken(token.id)}
                          title="Eliminar token"
                        >
                          <FaTrash />
                        </button>
                      </div>
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
