// trazabilidad_contabilidad/GestionTokens.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionTokens.css';

const GestionTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState(''); // 'success' o 'error'

  // Cargar tokens al montar el componente
  useEffect(() => {
    cargarTokens();
  }, []);

  const cargarTokens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        mostrarMensaje('No se encontró token de autenticación.', 'error');
        setTokens([]);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/tokens/listar`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Validar que la respuesta sea un array
      if (Array.isArray(response.data)) {
        setTokens(response.data);
      } else {
        console.error('La respuesta no es un array:', response.data);
        setTokens([]);
        mostrarMensaje('Error: Respuesta inválida del servidor.', 'error');
      }
    } catch (error) {
      console.error('Error al cargar tokens:', error);
      setTokens([]); // Asegurar que tokens sea un array vacío
      if (error.response?.status === 401) {
        mostrarMensaje('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
      } else {
        mostrarMensaje('Error al cargar los tokens.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const generarNuevoToken = async (tipo) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/tokens/generar`,
        { tipo },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      mostrarMensaje(`Token de ${tipo} generado exitosamente.`, 'success');
      cargarTokens(); // Recargar la lista
    } catch (error) {
      console.error('Error al generar token:', error);
      mostrarMensaje('Error al generar el token.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = (url) => {
    navigator.clipboard.writeText(url);
    mostrarMensaje('Link copiado al portapapeles', 'success');
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => {
      setMensaje('');
      setTipoMensaje('');
    }, 4000);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularEstado = (token) => {
    if (token.usado) return 'usado';
    const ahora = new Date();
    const expiracion = new Date(token.expiracion);
    if (ahora > expiracion) return 'expirado';
    return 'activo';
  };

  const obtenerClaseEstado = (estado) => {
    switch (estado) {
      case 'activo': return 'estado-activo';
      case 'usado': return 'estado-usado';
      case 'expirado': return 'estado-expirado';
      default: return '';
    }
  };

  return (
    <div className="gestion-tokens-container">
      <h1>Gestión de Links de Registro</h1>
      <p className="descripcion">
        Genera links únicos para que terceros se registren. 
        Los links tienen validez de 3 días o hasta que sean usados.
      </p>

      {mensaje && (
        <div className={`mensaje ${tipoMensaje === 'success' ? 'mensaje-exito' : 'mensaje-error'}`}>
          {mensaje}
        </div>
      )}

      {/* Botones para generar tokens */}
      <div className="botones-generar">
        <button 
          className="btn-generar btn-empleado"
          onClick={() => generarNuevoToken('empleado')}
          disabled={loading}
        >
          ➕ Generar Link Empleado
        </button>
        <button 
          className="btn-generar btn-cliente"
          onClick={() => generarNuevoToken('cliente')}
          disabled={loading}
        >
          ➕ Generar Link Cliente
        </button>
        <button 
          className="btn-generar btn-proveedor"
          onClick={() => generarNuevoToken('proveedor')}
          disabled={loading}
        >
          ➕ Generar Link Proveedor
        </button>
      </div>

      {/* Tabla de tokens generados */}
      <div className="tabla-tokens-wrapper">
        <h2>Links Generados</h2>
        {loading && tokens.length === 0 ? (
          <div className="loader">Cargando...</div>
        ) : tokens.length === 0 ? (
          <p className="mensaje-vacio">No hay links generados aún.</p>
        ) : (
          <table className="tabla-tokens">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha Creación</th>
                <th>Expira</th>
                <th>Estado</th>
                <th>Link</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => {
                const estado = calcularEstado(token);
                return (
                  <tr key={token.id}>
                    <td>
                      <span className={`badge-tipo ${token.tipo}`}>
                        {token.tipo.charAt(0).toUpperCase() + token.tipo.slice(1)}
                      </span>
                    </td>
                    <td>{formatearFecha(token.created_at)}</td>
                    <td>{formatearFecha(token.expiracion)}</td>
                    <td>
                      <span className={`badge-estado ${obtenerClaseEstado(estado)}`}>
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </span>
                    </td>
                    <td className="celda-link">
                      <code className="link-code">
                        {token.url_registro || `${window.location.origin}/registro/${token.tipo}/${token.token}`}
                      </code>
                    </td>
                    <td>
                      <button
                        className="btn-copiar"
                        onClick={() => copiarAlPortapapeles(
                          token.url_registro || `${window.location.origin}/registro/${token.tipo}/${token.token}`
                        )}
                        disabled={estado !== 'activo'}
                        title={estado === 'activo' ? 'Copiar link' : 'Link no disponible'}
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
