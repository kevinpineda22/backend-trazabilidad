// trazabilidad_contabilidad/RegistroPublico.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegistroPublico.css';

const RegistroPublico = () => {
  const { tipo, token } = useParams();
  const navigate = useNavigate();
  const [tokenValido, setTokenValido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // Estados para formularios
  const [formEmpleado, setFormEmpleado] = useState({
    nombre: '',
    apellidos: '',
    cedula: '',
    contacto: '',
    correo_electronico: '',
    direccion: '',
    codigo_ciudad: '',
    url_hoja_de_vida: '',
    url_cedula: '',
    url_certificado_bancario: '',
    url_habeas_data: '',
  });

  const [formCliente, setFormCliente] = useState({
    cupo: '',
    plazo: '',
    url_rut: '',
    url_camara_comercio: '',
    url_formato_sangrilaft: '',
    url_cedula: '',
  });

  const [formProveedor, setFormProveedor] = useState({
    url_rut: '',
    url_camara_comercio: '',
    url_certificacion_bancaria: '',
    url_formato_vinculacion: '',
    url_composicion_accionaria: '',
  });

  useEffect(() => {
    validarToken();
  }, [token]);

  const validarToken = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/trazabilidad/tokens/validar/${token}`
      );
      
      if (response.data.valido && response.data.tipo === tipo) {
        setTokenValido(true);
      } else {
        setTokenValido(false);
        setMensaje(response.data.message || 'Token inválido.');
        setTipoMensaje('error');
      }
    } catch (error) {
      setTokenValido(false);
      setMensaje(error.response?.data?.message || 'Token inválido o expirado.');
      setTipoMensaje('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEmpleado = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/trazabilidad/registro-publico/empleado/${token}`,
        formEmpleado
      );
      setRegistroExitoso(true);
      setMensaje('¡Registro enviado exitosamente! Su información será revisada.');
      setTipoMensaje('success');
    } catch (error) {
      setMensaje(error.response?.data?.message || 'Error al enviar el registro.');
      setTipoMensaje('error');
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmitCliente = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/trazabilidad/registro-publico/cliente/${token}`,
        formCliente
      );
      setRegistroExitoso(true);
      setMensaje('¡Registro enviado exitosamente! Su información será revisada.');
      setTipoMensaje('success');
    } catch (error) {
      setMensaje(error.response?.data?.message || 'Error al enviar el registro.');
      setTipoMensaje('error');
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmitProveedor = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/trazabilidad/registro-publico/proveedor/${token}`,
        formProveedor
      );
      setRegistroExitoso(true);
      setMensaje('¡Registro enviado exitosamente! Su información será revisada.');
      setTipoMensaje('success');
    } catch (error) {
      setMensaje(error.response?.data?.message || 'Error al enviar el registro.');
      setTipoMensaje('error');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="registro-publico-container">
        <div className="loader-grande">Verificando token...</div>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="registro-publico-container">
        <div className="mensaje-error-token">
          <h1>❌ Token Inválido</h1>
          <p>{mensaje || 'Este link no es válido, ha expirado o ya fue utilizado.'}</p>
        </div>
      </div>
    );
  }

  if (registroExitoso) {
    return (
      <div className="registro-publico-container">
        <div className="mensaje-exito-final">
          <h1>✅ Registro Exitoso</h1>
          <p>{mensaje}</p>
          <p className="texto-secundario">
            Recibirá una notificación una vez su información sea aprobada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="registro-publico-container">
      <div className="registro-card">
        <h1>Registro de {tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h1>
        <p className="descripcion-registro">
          Complete el formulario con su información. Los campos marcados con * son obligatorios.
        </p>

        {mensaje && (
          <div className={`mensaje ${tipoMensaje === 'success' ? 'mensaje-exito' : 'mensaje-error'}`}>
            {mensaje}
          </div>
        )}

        {tipo === 'empleado' && (
          <form onSubmit={handleSubmitEmpleado} className="form-registro">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                required
                value={formEmpleado.nombre}
                onChange={(e) => setFormEmpleado({...formEmpleado, nombre: e.target.value})}
                placeholder="Ingrese su nombre"
              />
            </div>

            <div className="form-group">
              <label>Apellidos *</label>
              <input
                type="text"
                required
                value={formEmpleado.apellidos}
                onChange={(e) => setFormEmpleado({...formEmpleado, apellidos: e.target.value})}
                placeholder="Ingrese sus apellidos"
              />
            </div>

            <div className="form-group">
              <label>Cédula *</label>
              <input
                type="text"
                required
                value={formEmpleado.cedula}
                onChange={(e) => setFormEmpleado({...formEmpleado, cedula: e.target.value})}
                placeholder="Número de cédula"
              />
            </div>

            <div className="form-group">
              <label>Contacto</label>
              <input
                type="text"
                value={formEmpleado.contacto}
                onChange={(e) => setFormEmpleado({...formEmpleado, contacto: e.target.value})}
                placeholder="Número de teléfono"
              />
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                value={formEmpleado.correo_electronico}
                onChange={(e) => setFormEmpleado({...formEmpleado, correo_electronico: e.target.value})}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formEmpleado.direccion}
                onChange={(e) => setFormEmpleado({...formEmpleado, direccion: e.target.value})}
                placeholder="Dirección de residencia"
              />
            </div>

            <div className="form-group">
              <label>Código Ciudad</label>
              <input
                type="text"
                value={formEmpleado.codigo_ciudad}
                onChange={(e) => setFormEmpleado({...formEmpleado, codigo_ciudad: e.target.value})}
                placeholder="Código de ciudad"
              />
            </div>

            <div className="separador-documentos">
              <h3>📄 Documentos Requeridos</h3>
              <p className="nota-documentos">
                Ingrese las URLs públicas de sus documentos (ej: Google Drive, Dropbox)
              </p>
            </div>

            <div className="form-group">
              <label>URL Hoja de Vida *</label>
              <input
                type="url"
                required
                value={formEmpleado.url_hoja_de_vida}
                onChange={(e) => setFormEmpleado({...formEmpleado, url_hoja_de_vida: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Cédula *</label>
              <input
                type="url"
                required
                value={formEmpleado.url_cedula}
                onChange={(e) => setFormEmpleado({...formEmpleado, url_cedula: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Certificado Bancario *</label>
              <input
                type="url"
                required
                value={formEmpleado.url_certificado_bancario}
                onChange={(e) => setFormEmpleado({...formEmpleado, url_certificado_bancario: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Habeas Data *</label>
              <input
                type="url"
                required
                value={formEmpleado.url_habeas_data}
                onChange={(e) => setFormEmpleado({...formEmpleado, url_habeas_data: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <button type="submit" className="btn-submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Registro'}
            </button>
          </form>
        )}

        {tipo === 'cliente' && (
          <form onSubmit={handleSubmitCliente} className="form-registro">
            <div className="form-group">
              <label>Cupo *</label>
              <input
                type="text"
                required
                value={formCliente.cupo}
                onChange={(e) => setFormCliente({...formCliente, cupo: e.target.value})}
                placeholder="Cupo solicitado"
              />
            </div>

            <div className="form-group">
              <label>Plazo *</label>
              <input
                type="text"
                required
                value={formCliente.plazo}
                onChange={(e) => setFormCliente({...formCliente, plazo: e.target.value})}
                placeholder="Plazo en días"
              />
            </div>

            <div className="separador-documentos">
              <h3>📄 Documentos Requeridos</h3>
              <p className="nota-documentos">
                Ingrese las URLs públicas de sus documentos
              </p>
            </div>

            <div className="form-group">
              <label>URL RUT *</label>
              <input
                type="url"
                required
                value={formCliente.url_rut}
                onChange={(e) => setFormCliente({...formCliente, url_rut: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Cámara de Comercio *</label>
              <input
                type="url"
                required
                value={formCliente.url_camara_comercio}
                onChange={(e) => setFormCliente({...formCliente, url_camara_comercio: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Formato SARLAFT *</label>
              <input
                type="url"
                required
                value={formCliente.url_formato_sangrilaft}
                onChange={(e) => setFormCliente({...formCliente, url_formato_sangrilaft: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Cédula *</label>
              <input
                type="url"
                required
                value={formCliente.url_cedula}
                onChange={(e) => setFormCliente({...formCliente, url_cedula: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <button type="submit" className="btn-submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Registro'}
            </button>
          </form>
        )}

        {tipo === 'proveedor' && (
          <form onSubmit={handleSubmitProveedor} className="form-registro">
            <div className="separador-documentos">
              <h3>📄 Documentos Requeridos</h3>
              <p className="nota-documentos">
                Ingrese las URLs públicas de sus documentos
              </p>
            </div>

            <div className="form-group">
              <label>URL RUT *</label>
              <input
                type="url"
                required
                value={formProveedor.url_rut}
                onChange={(e) => setFormProveedor({...formProveedor, url_rut: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Cámara de Comercio</label>
              <input
                type="url"
                value={formProveedor.url_camara_comercio}
                onChange={(e) => setFormProveedor({...formProveedor, url_camara_comercio: e.target.value})}
                placeholder="https://... (Opcional)"
              />
            </div>

            <div className="form-group">
              <label>URL Certificación Bancaria *</label>
              <input
                type="url"
                required
                value={formProveedor.url_certificacion_bancaria}
                onChange={(e) => setFormProveedor({...formProveedor, url_certificacion_bancaria: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Formato Vinculación *</label>
              <input
                type="url"
                required
                value={formProveedor.url_formato_vinculacion}
                onChange={(e) => setFormProveedor({...formProveedor, url_formato_vinculacion: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>URL Composición Accionaria *</label>
              <input
                type="url"
                required
                value={formProveedor.url_composicion_accionaria}
                onChange={(e) => setFormProveedor({...formProveedor, url_composicion_accionaria: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <button type="submit" className="btn-submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Registro'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegistroPublico;
