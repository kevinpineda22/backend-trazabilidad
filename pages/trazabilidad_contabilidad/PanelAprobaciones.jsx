// trazabilidad_contabilidad/PanelAprobaciones.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FilePreviewModal from './FilePreviewModal';
import './PanelAprobaciones.css';

const PanelAprobaciones = () => {
  const [registrosPendientes, setRegistrosPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [vistaActual, setVistaActual] = useState('pendientes'); // 'pendientes' o 'historial'
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (vistaActual === 'pendientes') {
      cargarPendientes();
    } else {
      cargarHistorial();
    }
  }, [vistaActual]);

  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/aprobaciones/pendientes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Asegurar que siempre sea un array
      const data = Array.isArray(response.data) ? response.data : [];
      setRegistrosPendientes(data);
    } catch (error) {
      console.error('Error al cargar pendientes:', error);
      mostrarMensaje('Error al cargar registros pendientes.', 'error');
      setRegistrosPendientes([]); // Establecer array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/aprobaciones/historial`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Asegurar que siempre sea un array
      const data = Array.isArray(response.data) ? response.data : [];
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      mostrarMensaje('Error al cargar historial.', 'error');
      setHistorial([]); // Establecer array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const aprobarRegistro = async (id) => {
    if (!confirm('¿Está seguro de aprobar este registro?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/aprobaciones/aprobar/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      mostrarMensaje('Registro aprobado exitosamente.', 'success');
      cargarPendientes();
    } catch (error) {
      console.error('Error al aprobar:', error);
      mostrarMensaje('Error al aprobar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRechazo = (registro) => {
    setRegistroSeleccionado(registro);
    setModalRechazoAbierto(true);
  };

  const rechazarRegistro = async () => {
    if (!motivoRechazo.trim()) {
      alert('Debe proporcionar un motivo de rechazo.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL}/api/trazabilidad/aprobaciones/rechazar/${registroSeleccionado.id}`,
        { motivo: motivoRechazo },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      mostrarMensaje('Registro rechazado.', 'success');
      setModalRechazoAbierto(false);
      setMotivoRechazo('');
      cargarPendientes();
    } catch (error) {
      console.error('Error al rechazar:', error);
      mostrarMensaje('Error al rechazar el registro.', 'error');
    } finally {
      setLoading(false);
    }
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

  const abrirPreviewArchivo = (url, nombre) => {
    setArchivoPreview({ url, nombre });
  };

  const renderizarDatos = (datos, tipo) => {
    if (!datos) return <p>Sin datos</p>;

    switch (tipo) {
      case 'empleado':
        return (
          <div className="datos-detalle">
            <p><strong>Nombre:</strong> {datos.nombre} {datos.apellidos}</p>
            <p><strong>Cédula:</strong> {datos.cedula}</p>
            <p><strong>Contacto:</strong> {datos.contacto || 'N/A'}</p>
            <p><strong>Email:</strong> {datos.correo_electronico || 'N/A'}</p>
            <p><strong>Dirección:</strong> {datos.direccion || 'N/A'}</p>
            <div className="documentos-grid">
              {datos.url_hoja_de_vida && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_hoja_de_vida, 'Hoja de Vida')}>
                  📄 Hoja de Vida
                </button>
              )}
              {datos.url_cedula && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_cedula, 'Cédula')}>
                  📄 Cédula
                </button>
              )}
              {datos.url_certificado_bancario && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_certificado_bancario, 'Cert. Bancario')}>
                  📄 Cert. Bancario
                </button>
              )}
              {datos.url_habeas_data && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_habeas_data, 'Habeas Data')}>
                  📄 Habeas Data
                </button>
              )}
            </div>
          </div>
        );

      case 'cliente':
        return (
          <div className="datos-detalle">
            <p><strong>Cupo:</strong> {datos.cupo}</p>
            <p><strong>Plazo:</strong> {datos.plazo}</p>
            <div className="documentos-grid">
              {datos.url_rut && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_rut, 'RUT')}>
                  📄 RUT
                </button>
              )}
              {datos.url_camara_comercio && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_camara_comercio, 'Cámara Comercio')}>
                  📄 Cámara Comercio
                </button>
              )}
              {datos.url_formato_sangrilaft && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_formato_sangrilaft, 'Sangrilaft')}>
                  📄 Sangrilaft
                </button>
              )}
              {datos.url_cedula && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_cedula, 'Cédula')}>
                  📄 Cédula
                </button>
              )}
            </div>
          </div>
        );

      case 'proveedor':
        return (
          <div className="datos-detalle">
            <div className="documentos-grid">
              {datos.url_rut && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_rut, 'RUT')}>
                  📄 RUT
                </button>
              )}
              {datos.url_camara_comercio && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_camara_comercio, 'Cámara Comercio')}>
                  📄 Cámara Comercio
                </button>
              )}
              {datos.url_certificacion_bancaria && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_certificacion_bancaria, 'Cert. Bancaria')}>
                  📄 Cert. Bancaria
                </button>
              )}
              {datos.url_formato_vinculacion && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_formato_vinculacion, 'Vinculación')}>
                  📄 Vinculación
                </button>
              )}
              {datos.url_composicion_accionaria && (
                <button className="btn-doc" onClick={() => abrirPreviewArchivo(datos.url_composicion_accionaria, 'Comp. Accionaria')}>
                  📄 Comp. Accionaria
                </button>
              )}
            </div>
          </div>
        );

      default:
        return <p>Tipo desconocido</p>;
    }
  };

  return (
    <div className="panel-aprobaciones-container">
      <h1>Panel de Aprobaciones</h1>
      
      {mensaje && (
        <div className={`mensaje ${tipoMensaje === 'success' ? 'mensaje-exito' : 'mensaje-error'}`}>
          {mensaje}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${vistaActual === 'pendientes' ? 'tab-activa' : ''}`}
          onClick={() => setVistaActual('pendientes')}
        >
          Pendientes ({registrosPendientes.length})
        </button>
        <button 
          className={`tab ${vistaActual === 'historial' ? 'tab-activa' : ''}`}
          onClick={() => setVistaActual('historial')}
        >
          Historial
        </button>
      </div>

      {loading && registrosPendientes.length === 0 && historial.length === 0 ? (
        <div className="loader">Cargando...</div>
      ) : vistaActual === 'pendientes' ? (
        // Vista de Pendientes
        registrosPendientes.length === 0 ? (
          <div className="mensaje-vacio">
            ✅ No hay registros pendientes de aprobación.
          </div>
        ) : (
          <div className="registros-grid">
            {registrosPendientes.map((registro) => (
              <div key={registro.id} className="tarjeta-registro">
                <div className="tarjeta-header">
                  <span className={`badge-tipo ${registro.tipo}`}>
                    {registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1)}
                  </span>
                  <span className="fecha-registro">
                    {formatearFecha(registro.created_at)}
                  </span>
                </div>
                <div className="tarjeta-body">
                  {renderizarDatos(registro.datos, registro.tipo)}
                </div>
                <div className="tarjeta-footer">
                  <button 
                    className="btn-aprobar"
                    onClick={() => aprobarRegistro(registro.id)}
                    disabled={loading}
                  >
                    ✅ Aprobar
                  </button>
                  <button 
                    className="btn-rechazar"
                    onClick={() => abrirModalRechazo(registro)}
                    disabled={loading}
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Vista de Historial
        historial.length === 0 ? (
          <div className="mensaje-vacio">
            No hay historial disponible.
          </div>
        ) : (
          <div className="tabla-historial-wrapper">
            <table className="tabla-historial">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha Registro</th>
                  <th>Estado</th>
                  <th>Fecha Decisión</th>
                  <th>Motivo Rechazo</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((registro) => (
                  <tr key={registro.id}>
                    <td>
                      <span className={`badge-tipo ${registro.tipo}`}>
                        {registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1)}
                      </span>
                    </td>
                    <td>{formatearFecha(registro.created_at)}</td>
                    <td>
                      <span className={`badge-estado estado-${registro.estado}`}>
                        {registro.estado.charAt(0).toUpperCase() + registro.estado.slice(1)}
                      </span>
                    </td>
                    <td>
                      {registro.fecha_aprobacion 
                        ? formatearFecha(registro.fecha_aprobacion)
                        : registro.fecha_rechazo 
                        ? formatearFecha(registro.fecha_rechazo)
                        : 'N/A'
                      }
                    </td>
                    <td>{registro.motivo_rechazo || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal de Rechazo */}
      {modalRechazoAbierto && (
        <div className="modal-overlay" onClick={() => setModalRechazoAbierto(false)}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <h2>Rechazar Registro</h2>
            <p>¿Está seguro de rechazar este registro?</p>
            <textarea
              placeholder="Motivo del rechazo..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows="4"
              className="textarea-motivo"
            />
            <div className="modal-botones">
              <button 
                className="btn-confirmar-rechazo"
                onClick={rechazarRegistro}
                disabled={loading || !motivoRechazo.trim()}
              >
                Confirmar Rechazo
              </button>
              <button 
                className="btn-cancelar"
                onClick={() => setModalRechazoAbierto(false)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview de Archivos */}
      {archivoPreview && (
        <FilePreviewModal
          fileUrl={archivoPreview.url}
          fileName={archivoPreview.nombre}
          onClose={() => setArchivoPreview(null)}
        />
      )}
    </div>
  );
};

export default PanelAprobaciones;
