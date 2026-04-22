import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import FilePreviewModal from "./FilePreviewModal";
import SearchableSelect from "./components/SearchableSelect";
import { DEPARTMENTS, findDepartmentByName } from "./data/colombiaLocations";
import { CIIU_CODES } from "./data/ciiuCodes";
import { uploadFileToBucket } from "../../supabaseClient";
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import "./PanelAprobaciones.css";

// Importar componentes de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView";
import ExpedienteClienteView from "./views/ExpedienteClienteView";
import {
  FaCheck,
  FaTimes,
  FaFilter,
  FaClock,
  FaEdit,
  FaUpload,
  FaFileAlt,
  FaTimesCircle,
  FaFilePdf,
  FaFileImage,
  FaUser,
  FaFolderOpen,
  FaTshirt,
  FaSpinner,
  FaSave,
} from "react-icons/fa";
import Swal from "sweetalert2";

const BUCKET_NAME = "documentos_contabilidad";

// --- Constantes de Dotación (integradas desde FormularioDotación) ---
const dotacionTipoMap = {
  "Auxiliar Cárnico": "carnicero",
  "Auxiliar Fruver": "fruver",
  "Surtidor y Bodeguero": "surtidorBodeguero",
  Domiciliario: "domiciliario",
  "Servicio Generales": "servicioGenerales",
  "Lider Punto": "liderPunto",
  Administrativos: "administrativos",
  Cajera: "cajera",
  "Monitor de Servicio": "monitorServicio",
};

const dotacionItems = {
  carnicero: [
    { key: "conjunto", label: "Conjunto Carnicería" },
    { key: "cofia", label: "Cofia", soloUnidades: true },
    { key: "gorra", label: "Gorra", soloUnidades: true },
    { key: "tapabocas", label: "Tapabocas", soloUnidades: true },
    { key: "botas", label: "Botas" },
  ],
  fruver: [
    { key: "delantal", label: "Delantal", soloUnidades: true },
    { key: "camisa", label: "Camisa" },
    { key: "pantalon", label: "Pantalón" },
    { key: "guantes", label: "Guantes", soloUnidades: true },
    { key: "botas", label: "Botas" },
  ],
  surtidorBodeguero: [
    { key: "camisa", label: "Camisa" },
    { key: "pantalon", label: "Pantalón" },
    { key: "botas", label: "Botas" },
  ],
  domiciliario: [
    { key: "camibuso", label: "Camibuso" },
    { key: "pantalon", label: "Pantalón" },
    { key: "botas", label: "Botas" },
    { key: "impermeable", label: "Impermeable" },
  ],
  servicioGenerales: [
    { key: "conjuntoAseo", label: "Conjunto Aseo General" },
    { key: "calzado", label: "Calzado" },
  ],
  liderPunto: [
    { key: "camisa", label: "Camisa" },
    { key: "pantalonCargo", label: "Pantalón Cargo" },
    { key: "bonoCalzado", label: "Bono de Calzado" },
  ],
  administrativos: [
    { key: "camisa", label: "Camisa" },
    { key: "pantalon", label: "Pantalón" },
    { key: "botasSeguridad", label: "Botas de Seguridad" },
    { key: "bonoCalzado", label: "Bono de Calzado" },
  ],
  cajera: [
    { key: "camisa", label: "Camisa" },
    { key: "pantalon", label: "Pantalón" },
    { key: "botas", label: "Botas" },
    { key: "bonoCalzado", label: "Bono de Calzado" },
  ],
  monitorServicio: [
    { key: "camisa", label: "Camisa" },
    { key: "pantalon", label: "Pantalón" },
    { key: "botas", label: "Botas" },
    { key: "bonoCalzado", label: "Bono de Calzado" },
  ],
};

const TALLAS_CIRCULO = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const INPUT_TALLA_NUMERICA_KEYS = [
  "botas",
  "botasSeguridad",
  "pantalon",
  "pantalonCargo",
  "calzado",
];

const SEDES_OPTIONS = [
  "Copacabana Plaza",
  "Villa Hermosa",
  "Girardota Parque",
  "Girardota Llano",
  "Copacabana Vegas",
  "Copacabana San Juan",
  "Supermercados Barbosa",
];

const INITIAL_DOTACION_STATE = {
  carnicero: {
    conjunto: { checked: false, talla: "", unidades: "" },
    cofia: { checked: false, talla: "", unidades: "" },
    gorra: { checked: false, talla: "", unidades: "" },
    tapabocas: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
  },
  fruver: {
    delantal: { checked: false, talla: "", unidades: "" },
    camisa: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    guantes: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
  },
  surtidorBodeguero: {
    camisa: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
  },
  domiciliario: {
    camibuso: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
    impermeable: { checked: false, talla: "", unidades: "" },
  },
  servicioGenerales: {
    conjuntoAseo: { checked: false, talla: "", unidades: "" },
    calzado: { checked: false, talla: "", unidades: "" },
  },
  liderPunto: {
    camisa: { checked: false, talla: "", unidades: "" },
    pantalonCargo: { checked: false, talla: "", unidades: "" },
    bonoCalzado: { checked: false, valor: 70000 },
  },
  administrativos: {
    camisa: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    botasSeguridad: { checked: false, talla: "", unidades: "" },
    bonoCalzado: { checked: false, valor: 70000 },
  },
  cajera: {
    camisa: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
    bonoCalzado: { checked: false, valor: 70000 },
  },
  monitorServicio: {
    camisa: { checked: false, talla: "", unidades: "" },
    pantalon: { checked: false, talla: "", unidades: "" },
    botas: { checked: false, talla: "", unidades: "" },
    bonoCalzado: { checked: false, valor: 70000 },
  },
};

// --- Componente FileInput ---
const FileInput = ({
  label,
  name,
  file,
  existingUrl,
  onFileChange,
  onRemove,
  isRequired = false,
}) => {
  const fileInputRef = useRef(null);
  const isFile = file instanceof File;

  let displayName = "N/A";
  if (isFile) {
    displayName = file.name;
  } else if (existingUrl) {
    const match = existingUrl.match(/[^/]*$/);
    displayName = match ? match[0].split("?")[0] : "Archivo Cargado";
    try {
      displayName = decodeURIComponent(displayName);
    } catch (e) {}
  }

  const getIcon = () => {
    const nameToTest = isFile ? file.name : existingUrl || "";
    const cleanName = nameToTest.split("?")[0].toLowerCase();
    if (cleanName.endsWith(".pdf"))
      return <FaFilePdf style={{ color: "#E53E3E", fontSize: "2rem" }} />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleanName))
      return <FaFileImage style={{ color: "#38A169", fontSize: "2rem" }} />;
    return <FaFileAlt style={{ color: "#718096", fontSize: "2rem" }} />;
  };

  const handleTriggerInput = (e) => {
    e.preventDefault();
    fileInputRef.current.click();
  };

  return (
    <div
      className={`tc-edit-item-group ${file || existingUrl ? "has-file" : ""}`}
    >
      <label htmlFor={name} className="tc-edit-label">
        {label} {isRequired && <span className="required">*</span>}
      </label>
      <div className="tc-edit-input-wrapper">
        <input
          type="file"
          id={name}
          name={name}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => onFileChange(name, e.target.files[0])}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        {!file && !existingUrl && (
          <label htmlFor={name} className="tc-edit-dropzone">
            <FaUpload /> <span>Cargar</span>
          </label>
        )}
        {(file || existingUrl) && (
          <div
            className={`tc-edit-card-preview ${
              file ? "status-new" : "status-existing"
            }`}
          >
            <div className="tc-edit-card-body">
              <div className="tc-edit-icon-box">{getIcon()}</div>
              <div className="tc-edit-file-details">
                <span className="tc-edit-filename" title={displayName}>
                  {displayName}
                </span>
                <span className="tc-edit-status-text">
                  {file ? "Nuevo archivo" : "Disponible"}
                </span>
              </div>
            </div>
            <div className="tc-edit-card-footer">
              <button
                type="button"
                onClick={handleTriggerInput}
                className="tc-edit-btn-action change"
                title="Cambiar archivo"
              >
                <FaEdit /> Cambiar
              </button>
              <button
                type="button"
                onClick={() => onRemove(name)}
                className="tc-edit-btn-action remove"
                title="Quitar archivo"
              >
                <FaTimesCircle />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Listas de Opciones y Campos ---
const TIPOS_FILTRO = [
  { value: "todos", label: "Todos" },
  { value: "empleado", label: "Empleados" },
  { value: "cliente", label: "Clientes" },
  { value: "proveedor", label: "Proveedores" },
];
const DOCUMENT_OPTIONS = [
  { value: "NIT", label: "NIT" },
  { value: "Cedula de ciudadanía", label: "Cédula de ciudadanía" },
  { value: "Cedula de extranjería", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "PPT", label: "PPT" },
  { value: "PEP", label: "PEP" },
];
const TIPO_REGIMEN_OPTIONS = [
  { value: "persona_juridica", label: "Persona Jurídica" },
  { value: "persona_natural", label: "Persona Natural" },
];
const RESPUESTA_PREGUNTA = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const CLIENTE_FIELDS = [
  {
    key: "fecha_diligenciamiento",
    label: "Fecha diligenciamiento",
    type: "date",
  },
  { key: "tipo_regimen", label: "Tipo de régimen" },
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "nit", label: "NIT" },
  { key: "dv", label: "DV" },
  { key: "razon_social", label: "Razón social" },
  { key: "nombre_establecimiento", label: "Nombre establecimiento" },
  { key: "primer_nombre", label: "Primer nombre" },
  { key: "segundo_nombre", label: "Segundo nombre" },
  { key: "primer_apellido", label: "Primer apellido" },
  { key: "segundo_apellido", label: "Segundo apellido" },
  { key: "codigo_ciiu", label: "Código CIIU" },
  { key: "direccion_domicilio", label: "Dirección domicilio" },
  { key: "departamento", label: "Departamento" },
  { key: "ciudad", label: "Ciudad" },
  { key: "email_factura_electronica", label: "Email factura electrónica" },
  { key: "nombre_contacto", label: "Nombre contacto" },
  { key: "email_contacto", label: "Email contacto" },
  { key: "telefono_contacto", label: "Teléfono contacto" },
  { key: "rep_legal_nombre", label: "Rep. Legal - Nombre" },
  { key: "rep_legal_apellidos", label: "Rep. Legal - Apellidos" },
  { key: "rep_legal_tipo_doc", label: "Rep. Legal - Tipo doc." },
  { key: "rep_legal_num_doc", label: "Rep. Legal - Núm. doc." },
  { key: "declara_pep", label: "Declara PEP" },
  { key: "declara_recursos_publicos", label: "Declara recursos públicos" },
  {
    key: "declara_obligaciones_tributarias",
    label: "Declara obligaciones tributarias",
  },
  { key: "cupo", label: "Cupo solicitado" },
  { key: "plazo", label: "Plazo" },
];

const EMPLEADO_FIELDS = [
  { key: "nombre", label: "Nombre" },
  { key: "apellidos", label: "Apellidos" },
  { key: "cedula", label: "Cédula" },
  { key: "contacto", label: "Contacto" },
  { key: "correo_electronico", label: "Correo electrónico" },
  { key: "direccion", label: "Dirección" },
  { key: "barrio", label: "Barrio" },
  { key: "municipio", label: "Municipio" },
  { key: "talla_camisa", label: "Talla Camisa" },
  { key: "talla_pantalon", label: "Talla Pantalón" },
  { key: "talla_zapato", label: "Talla Zapato" },
];

const PROVEEDOR_FIELDS = [
  {
    key: "fecha_diligenciamiento",
    label: "Fecha diligenciamiento",
    type: "date",
  },
  { key: "tipo_regimen", label: "Tipo de régimen" },
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "nit", label: "NIT" },
  { key: "dv", label: "DV" },
  { key: "razon_social", label: "Razón social" },
  { key: "nombre_establecimiento", label: "Nombre establecimiento" },
  { key: "codigo_ciiu", label: "Código CIIU" },
  { key: "direccion_domicilio", label: "Dirección domicilio" },
  { key: "departamento", label: "Departamento" },
  { key: "ciudad", label: "Ciudad" },
  { key: "email_factura_electronica", label: "Email factura electrónica" },

  // NUEVOS CONTACTOS
  { key: "contacto_cartera_nombre", label: "Contacto Cartera: Nombre" },
  { key: "contacto_cartera_email", label: "Contacto Cartera: Email" },
  { key: "contacto_cartera_telefono", label: "Contacto Cartera: Teléfono" },
  { key: "contacto_tesoreria_nombre", label: "Contacto Tesorería: Nombre" },
  { key: "contacto_tesoreria_email", label: "Contacto Tesorería: Email" },
  { key: "contacto_tesoreria_telefono", label: "Contacto Tesorería: Teléfono" },
  { key: "contacto_compras_nombre", label: "Contacto Compras: Nombre" },
  { key: "contacto_compras_email", label: "Contacto Compras: Email" },
  { key: "contacto_compras_telefono", label: "Contacto Compras: Teléfono" },

  { key: "rep_legal_nombre", label: "Rep. Legal - Nombre" },
  { key: "rep_legal_apellidos", label: "Rep. Legal - Apellidos" },
  { key: "rep_legal_tipo_doc", label: "Rep. Legal - Tipo doc." },
  { key: "rep_legal_num_doc", label: "Rep. Legal - Núm. doc." },
  { key: "declara_pep", label: "Declara PEP" },
  { key: "declara_recursos_publicos", label: "Declara recursos públicos" },
  {
    key: "declara_obligaciones_tributarias",
    label: "Declara obligaciones tributarias",
  },
  // Nuevos campos
  { key: "registra_en_bolsa", label: "Registra en Bolsa" },
  { key: "tipo_proveedor", label: "Tipo de Proveedor" },
  { key: "federaciones_recaudo", label: "Federaciones" },
];
const CLIENTE_DOCS = [
  { key: "url_rut", label: "RUT" },
  { key: "url_camara_comercio", label: "Cámara de Comercio" },
  { key: "url_certificacion_bancaria", label: "Certificación Bancaria" },
  { key: "url_cedula", label: "Cédula" },
  { key: "url_certificado_sagrilaft", label: "Certificado SAGRILAFT" },
  { key: "url_composicion_accionaria", label: "Composición Accionaria" },
];
const EMPLEADO_DOCS = [
  { key: "url_hoja_de_vida", label: "Hoja de Vida" },
  { key: "url_cedula", label: "Cédula" },
  { key: "url_certificado_bancario", label: "Certificado Bancario" },
  { key: "url_habeas_data", label: "Habeas Data" },
  { key: "url_autorizacion_firma", label: "Autorización Firma" },
];
const PROVEEDOR_DOCS = [
  { key: "url_rut", label: "RUT" },
  { key: "url_camara_comercio", label: "Cámara de Comercio" },
  { key: "url_certificacion_bancaria", label: "Certificación Bancaria" },
  { key: "url_doc_identidad_rep_legal", label: "Documento Rep. Legal" },
  { key: "url_certificado_sagrilaft", label: "Certificado SAGRILAFT" },
  { key: "url_composicion_accionaria", label: "Composición Accionaria" },
  // Nuevos documentos
  { key: "url_certificado_bolsa", label: "Certificado Bolsa" },
  { key: "url_certificado_fenalce", label: "Certificado FENALCE" },
  { key: "url_certificado_asohofrucol", label: "Certificado ASOHOFRUCOL" },
  { key: "url_certificado_fedepapa", label: "Certificado FEDEPAPA" },
];
const PanelAprobaciones = ({ userRole }) => {
  const [registrosPendientes, setRegistrosPendientes] = useState([]);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [archivoPreview, setArchivoPreview] = useState(null);

  // Campos de enriquecimiento
  const [cupoAprobado, setCupoAprobado] = useState("");
  const [condicionPago, setCondicionPago] = useState(""); // Nuevo estado
  const [fechaContratacion, setFechaContratacion] = useState("");
  const [nombreCargo, setNombreCargo] = useState("");
  const [sede, setSede] = useState("");
  const [necesitaUsuarioSiesa, setNecesitaUsuarioSiesa] = useState("");

  // Estados de Dotación (para empleados)
  const [dotacionTipo, setDotacionTipo] = useState("");
  const [showDotacionOptions, setShowDotacionOptions] = useState(false);
  const [dotacionData, setDotacionData] = useState(
    JSON.parse(JSON.stringify(INITIAL_DOTACION_STATE)),
  );
  const [fechaEntregaDotacion, setFechaEntregaDotacion] = useState("");

  const [datosEditables, setDatosEditables] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [errorCampo, setErrorCampo] = useState(null);
  const [archivosNuevos, setArchivosNuevos] = useState({});
  const mensajeTimeout = useRef(null);

  // Estados Expediente
  const [vistaExpediente, setVistaExpediente] = useState(null);
  const [expedienteId, setExpedienteId] = useState(null);

  // --- MEMOS DE OPCIONES ---
  const ciiuOptions = useMemo(
    () => CIIU_CODES.map(({ code, label }) => ({ value: code, label })),
    [],
  );
  const departmentOptions = useMemo(
    () =>
      DEPARTMENTS.map((dep) => ({
        value: dep.code,
        label: `${dep.code} - ${dep.name}`,
        name: dep.name,
      })),
    [],
  );

  const selectedDepartment = useMemo(() => {
    if (datosEditables.departamento_codigo)
      return (
        DEPARTMENTS.find(
          (dep) => dep.code === datosEditables.departamento_codigo,
        ) || null
      );
    if (datosEditables.departamento)
      return findDepartmentByName(datosEditables.departamento) || null;
    return null;
  }, [datosEditables.departamento_codigo, datosEditables.departamento]);

  const cityOptions = useMemo(() => {
    if (!selectedDepartment) return [];
    return selectedDepartment.cities.map((city) => ({
      value: city.code,
      label: `${city.code} - ${city.name}`,
      name: city.name,
    }));
  }, [selectedDepartment]);

  const tiposPermitidos = useMemo(() => {
    if (!userRole) return [];
    
    const role = userRole.toLowerCase().trim();
    
    if (role === "admin" || role === "super_admin")
      return ["empleado", "cliente", "proveedor"];
    
    if (role === "admin_cliente" || role === "admin_clientes")
      return ["cliente"];
    
    if (role === "admin_proveedor" || role === "admin_proveedores")
      return ["proveedor"];
      
    if (role === "admin_tesoreria")
      return ["cliente", "proveedor"];
      
    if (role === "admin_empleado" || role === "admin_empleados")
      return ["empleado"];
      
    const tipo = role.replace("admin_", "");
    return [tipo];
  }, [userRole]);

  useEffect(() => {
    if (!userRole) return;
    
    const role = userRole.toLowerCase().trim();
    const isAdmin = ["admin", "super_admin", "authenticated"].includes(role);
    
    if (!isAdmin) {
      if (role === "admin_cliente" || role === "admin_clientes")
        setFiltroTipo("cliente");
      else if (role === "admin_proveedor" || role === "admin_proveedores")
        setFiltroTipo("proveedor");
      else if (role === "admin_tesoreria")
        setFiltroTipo("todos"); // Tesorería ve ambos por defecto
      else {
        const tipo = role.replace("admin_", "");
        setFiltroTipo(tipo);
      }
    }
  }, [userRole]);

  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const response = await apiTrazabilidad.get(
        `/trazabilidad/aprobaciones/pendientes`,
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setRegistrosPendientes(data);
    } catch (error) {
      mostrarMensaje("Error al cargar registros pendientes.", "error");
      setRegistrosPendientes([]);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    if (mensajeTimeout.current) clearTimeout(mensajeTimeout.current);
    mensajeTimeout.current = setTimeout(() => {
      setMensaje("");
      setTipoMensaje("");
    }, 4000);
  };

  const pendientesFiltrados = useMemo(() => {
    const filtradosPorRol = registrosPendientes.filter((r) =>
      tiposPermitidos.includes(r.tipo),
    );
    if (filtroTipo === "todos") return filtradosPorRol;
    return filtradosPorRol.filter((registro) => registro.tipo === filtroTipo);
  }, [registrosPendientes, filtroTipo, tiposPermitidos]);

  const contadorPorTipo = useMemo(() => {
    let base = registrosPendientes;
    const basePermitida = base.filter((r) => tiposPermitidos.includes(r.tipo));
    const conteo = {
      todos: basePermitida.length,
      empleado: 0,
      cliente: 0,
      proveedor: 0,
    };
    basePermitida.forEach((registro) => {
      if (conteo[registro.tipo] !== undefined) conteo[registro.tipo] += 1;
    });
    return conteo;
  }, [registrosPendientes, tiposPermitidos]);

  useEffect(() => {
    if (!registroSeleccionado) return;
    const sigueDisponible = pendientesFiltrados.some(
      (r) => r.id === registroSeleccionado.id,
    );
    if (!sigueDisponible) setRegistroSeleccionado(null);
  }, [pendientesFiltrados, registroSeleccionado]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    return new Date(fecha).toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toTitle = (valor) => {
    if (!valor) return "N/A";
    return valor
      .toString()
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const contarDocumentos = (datos = {}) =>
    Object.keys(datos).filter(
      (clave) => clave.startsWith("url_") && datos[clave],
    ).length;
  const mapDocs = (documentos = []) =>
    documentos.filter((doc) => Boolean(doc.url));

  const obtenerDetalleRegistro = (registro) => {
    if (!registro) return { resumen: "", campos: [], documentos: [] };
    const { tipo, datos = {} } = registro;
    const labelTipoDoc = datos.tipo_documento
      ? toTitle(datos.tipo_documento)
      : "NIT";

    switch (tipo) {
      case "empleado": {
        const nombreCompleto =
          `${datos.nombre || ""} ${datos.apellidos || ""}`.trim();
        return {
          resumen: nombreCompleto || "Empleado",
          campos: [
            {
              label: "Empresa",
              value: datos.empresa || "NO REGISTRADA",
            },
            { label: "Nombre", value: datos.nombre || "N/A" },
            { label: "Apellidos", value: datos.apellidos || "N/A" },
            { label: "Cédula", value: datos.cedula || "N/A" },
            { label: "Contacto", value: datos.contacto || "N/A" },
            {
              label: "Correo electrónico",
              value: datos.correo_electronico || "N/A",
            },
            { label: "Dirección", value: datos.direccion || "N/A" },
            { label: "Barrio", value: datos.barrio || "N/A" },
            { label: "Municipio", value: datos.municipio || "N/A" },
            { label: "Talla Camisa", value: datos.talla_camisa || "N/A" },
            { label: "Talla Pantalón", value: datos.talla_pantalon || "N/A" },
            { label: "Talla Zapato", value: datos.talla_zapato || "N/A" },
          ],
          documentos: mapDocs([
            { label: "Hoja de Vida", url: datos.url_hoja_de_vida },
            { label: "Cédula", url: datos.url_cedula },
            {
              label: "Certificado Bancario",
              url: datos.url_certificado_bancario,
            },
            { label: "Habeas Data", url: datos.url_habeas_data },
            { label: "Autorización Firma", url: datos.url_autorizacion_firma },
          ]),
        };
      }
      case "cliente": {
        const razonSocialCliente =
          datos.razon_social ||
          `${datos.primer_nombre || ""} ${
            datos.primer_apellido || ""
          }`.trim() ||
          "Cliente";
        return {
          resumen: razonSocialCliente,
          campos: [
            {
              label: "Fecha diligenciamiento",
              value: datos.fecha_diligenciamiento
                ? new Date(datos.fecha_diligenciamiento).toLocaleDateString(
                    "es-CO",
                  )
                : "N/A",
            },
            { label: "Tipo de régimen", value: toTitle(datos.tipo_regimen) },
            {
              label: "Tipo de documento",
              value: toTitle(datos.tipo_documento),
            },
            { label: labelTipoDoc, value: datos.nit || "N/A" },
            { label: "DV", value: datos.dv || "N/A" },
            { label: "Razón social", value: datos.razon_social || "N/A" },
            {
              label: "Nombre establecimiento",
              value: datos.nombre_establecimiento || "N/A",
            },
            { label: "Ciudad", value: datos.ciudad || "N/A" },
            { label: "Nombre contacto", value: datos.nombre_contacto || "N/A" },
            { label: "Cupo solicitado", value: datos.cupo || "N/A" },
            { label: "Plazo", value: datos.plazo || "N/A" },
          ],
          documentos: mapDocs([
            { label: "RUT", url: datos.url_rut },
            { label: "Cámara de Comercio", url: datos.url_camara_comercio },
            {
              label: "Certificación Bancaria",
              url: datos.url_certificacion_bancaria,
            },
            { label: "Cédula", url: datos.url_cedula },
            {
              label: "Certificado SAGRILAFT",
              url: datos.url_certificado_sagrilaft,
            },
            {
              label: "Composición Accionaria",
              url: datos.url_composicion_accionaria,
            },
          ]),
        };
      }
      case "proveedor": {
        const razonSocial =
          datos.razon_social || datos.contacto_cartera_nombre || "Proveedor";
        return {
          resumen: razonSocial,
          campos: [
            {
              label: "Fecha diligenciamiento",
              value: datos.fecha_diligenciamiento
                ? new Date(datos.fecha_diligenciamiento).toLocaleDateString(
                    "es-CO",
                  )
                : "N/A",
            },
            { label: "Tipo de régimen", value: toTitle(datos.tipo_regimen) },
            {
              label: "Tipo de documento",
              value: toTitle(datos.tipo_documento),
            },
            { label: labelTipoDoc, value: datos.nit || "N/A" },
            { label: "DV", value: datos.dv || "N/A" },
            { label: "Razón social", value: datos.razon_social || "N/A" },
            { label: "Ciudad", value: datos.ciudad || "N/A" },
            {
              label: "Email Fact. Electrónica",
              value: datos.email_factura_electronica || "N/A",
            },

            // NUEVO CONTACTO CARTERA
            { label: "Cartera", value: datos.contacto_cartera_nombre || "N/A" },
            // NUEVO CONTACTO TESORERIA
            {
              label: "Tesorería",
              value: datos.contacto_tesoreria_nombre || "N/A",
            },
            // NUEVO CONTACTO COMPRAS
            { label: "Compras", value: datos.contacto_compras_nombre || "N/A" },
            {
              label: "Cupo Solicitado",
              value: datos.cupo
                ? new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(datos.cupo)
                : "N/A",
            },
          ],
          documentos: mapDocs([
            { label: "RUT", url: datos.url_rut },
            { label: "Cámara de Comercio", url: datos.url_camara_comercio },
            {
              label: "Certificación Bancaria",
              url: datos.url_certificacion_bancaria,
            },
            {
              label: "Documento Rep. Legal",
              url: datos.url_doc_identidad_rep_legal,
            },
            {
              label: "Certificado SAGRILAFT",
              url: datos.url_certificado_sagrilaft,
            },
            {
              label: "Composición Accionaria",
              url: datos.url_composicion_accionaria,
            },
            { label: "Certificado Bolsa", url: datos.url_certificado_bolsa },
            {
              label: "Certificado FENALCE",
              url: datos.url_certificado_fenalce,
            },
            {
              label: "Certificado ASOHOFRUCOL",
              url: datos.url_certificado_asohofrucol,
            },
            {
              label: "Certificado FEDEPAPA",
              url: datos.url_certificado_fedepapa,
            },
          ]),
        };
      }
      default:
        return { resumen: "Registro", campos: [], documentos: [] };
    }
  };

  const obtenerResumenLista = (registro) => {
    const { tipo, datos = {} } = registro;
    const totalDocumentos = contarDocumentos(datos);
    const documentosLabel = `${totalDocumentos} doc${
      totalDocumentos === 1 ? "" : "s"
    }`;
    const labelDoc = datos.tipo_documento
      ? toTitle(datos.tipo_documento)
      : "NIT";

    switch (tipo) {
      case "empleado": {
        const nombreCompleto =
          `${datos.nombre || ""} ${datos.apellidos || ""}`.trim();
        return {
          titulo: nombreCompleto || "Empleado pendiente",
          meta: documentosLabel,
        };
      }
      case "cliente": {
        const razonSocialClienteTitulo =
          datos.razon_social ||
          `${datos.primer_nombre || ""} ${
            datos.primer_apellido || ""
          }`.trim() ||
          "Cliente pendiente";
        const nitDisplay = datos.nit
          ? `${labelDoc}: ${datos.nit}`
          : `Sin ${labelDoc}`;
        return {
          titulo: razonSocialClienteTitulo,
          meta: `${nitDisplay} • ${documentosLabel}`,
        };
      }
      case "proveedor":
        return {
          titulo: datos.razon_social || "Proveedor pendiente",
          meta: documentosLabel,
        };
      default:
        return { titulo: "Registro pendiente", meta: documentosLabel };
    }
  };

  const detalleSeleccionado = useMemo(
    () => obtenerDetalleRegistro(registroSeleccionado),
    [registroSeleccionado],
  );

  const handleSeleccionRegistro = (registro) => {
    setRegistroSeleccionado(registro);
    setCupoAprobado("");
    setFechaContratacion("");
    setNombreCargo("");
    setSede("");
    setNecesitaUsuarioSiesa("");
    setDotacionTipo("");
    setShowDotacionOptions(false);
    setDotacionData(JSON.parse(JSON.stringify(INITIAL_DOTACION_STATE)));
    setFechaEntregaDotacion("");
    setModoEdicion(false);
    setErrorCampo(null);
    setArchivosNuevos({});
    if (registro?.datos) {
      setDatosEditables({ ...registro.datos });
    } else {
      setDatosEditables({});
    }
  };

  const handleFileChange = (name, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return Swal.fire({
        icon: "error",
        title: "Archivo demasiado pesado",
        text: "El tamaño máximo permitido es 5MB.",
      });
    }
    setArchivosNuevos((prev) => ({ ...prev, [name]: file }));
  };

  const handleRemoveFile = (name) => {
    if (archivosNuevos[name]) {
      const newArchivos = { ...archivosNuevos };
      delete newArchivos[name];
      setArchivosNuevos(newArchivos);
    } else {
      setDatosEditables((prev) => ({ ...prev, [name]: null }));
    }
  };

  // --- Handlers de Dotación ---
  const handleDotacionTipoChange = (value) => {
    setDotacionTipo(value);
    setShowDotacionOptions(!!value);
  };

  const handleDotacionChange = (tipo, item, field, value) => {
    setDotacionData((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [item]: { ...prev[tipo][item], [field]: value },
      },
    }));
  };

  const getSedeOptionsForEmpleado = () => {
    const empresa = registroSeleccionado?.datos?.empresa || "";
    const lower = empresa.toLowerCase();
    if (lower === "megamayorista") return ["Megamayorista"];
    if (lower === "construahorro") return ["Construahorro"];
    return SEDES_OPTIONS;
  };

  const guardarEdicion = async () => {
    if (!registroSeleccionado) return;

    try {
      setLoading(true);
      setLoadingText("Guardando cambios...");
      const datosActualizados = { ...datosEditables };

      // Subir archivos nuevos si existen
      if (Object.keys(archivosNuevos).length > 0) {
        setLoadingText("Subiendo documentos actualizados...");
        const folderBase =
          registroSeleccionado.tipo === "cliente"
            ? "clientes"
            : registroSeleccionado.tipo === "proveedor"
              ? "proveedores"
              : "empleados";
        const identificador =
          datosActualizados.nit || datosActualizados.cedula || "sin_id";
        for (const [key, file] of Object.entries(archivosNuevos)) {
          try {
            const extension = file.name.split(".").pop();
            const fileName = `${key}_${Date.now()}.${extension}`;
            const url = await uploadFileToBucket({
              bucket: BUCKET_NAME,
              path: `${folderBase}/${identificador}/${fileName}`,
              file,
            });
            if (url) datosActualizados[key] = url;
          } catch (uploadError) {
            setLoading(false);
            return mostrarMensaje(
              `Error al subir el archivo para ${key}`,
              "error",
            );
          }
        }
      }

      await apiTrazabilidad.put(
        `/trazabilidad/aprobaciones/actualizar/${registroSeleccionado.id}`,
        { datosAprobados: datosActualizados },
      );

      mostrarMensaje("Cambios guardados con éxito.", "success");
      setModoEdicion(false);

      // Actualizar el estado local para reflejar los cambios
      setRegistroSeleccionado((prev) => ({
        ...prev,
        datos: datosActualizados,
      }));
      setDatosEditables({ ...datosActualizados });
      setArchivosNuevos({});
      await cargarPendientes();
    } catch (error) {
      console.error("Error al guardar edición:", error);
      Swal.fire(
        "Error",
        "Ocurrió un error al intentar guardar los cambios.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- APROBACIÓN MAESTRA ---
  const aprobarRegistro = async () => {
    if (!registroSeleccionado) return;

    if (registroSeleccionado.tipo === "proveedor") {
      const condicionRaw = (condicionPago || "").trim();
      if (!condicionRaw) {
        return Swal.fire({
          title: "Campos Requeridos",
          text: "Para aprobar un proveedor, debes asignar una 'Condición de Pago'.",
          icon: "warning",
          confirmButtonColor: "#f59e0b",
        });
      }
    }

    if (registroSeleccionado.tipo === "empleado") {
      if (!fechaContratacion || !nombreCargo || !sede) {
        return Swal.fire(
          "Atención",
          "Todos los campos de contratación (Fecha, Cargo, Sede) son obligatorios.",
          "warning",
        );
      }
      // Validar dotación
      if (!dotacionTipo) {
        return Swal.fire(
          "Atención",
          "Debes seleccionar un Tipo de Dotación.",
          "warning",
        );
      }
      if (!fechaEntregaDotacion) {
        return Swal.fire(
          "Atención",
          "Debes indicar la Fecha de Entrega de Dotación.",
          "warning",
        );
      }
      const tipoKey = dotacionTipoMap[dotacionTipo];
      const hasSelectedItems =
        tipoKey &&
        Object.entries(dotacionData[tipoKey]).some(([key, item]) => {
          if (key === "bonoCalzado") return item.checked;
          return item.checked && item.unidades && item.talla !== undefined;
        });
      if (!hasSelectedItems) {
        return Swal.fire(
          "Atención",
          "Selecciona al menos un ítem de dotación con talla y unidades.",
          "warning",
        );
      }
    }

    if (!window.confirm("¿Estás seguro de aprobar este registro?")) return;

    try {
      setLoading(true);
      setLoadingText("Iniciando...");
      const datosActualizados = { ...datosEditables };

      // 1. Subir archivos nuevos
      if (Object.keys(archivosNuevos).length > 0) {
        setLoadingText("Subiendo documentos...");
        const folderBase =
          registroSeleccionado.tipo === "cliente"
            ? "clientes"
            : registroSeleccionado.tipo === "proveedor"
              ? "proveedores"
              : "empleados";
        const identificador =
          datosActualizados.nit || datosActualizados.cedula || "sin_id";
        for (const [key, file] of Object.entries(archivosNuevos)) {
          try {
            const extension = file.name.split(".").pop();
            const fileName = `${key}_${Date.now()}.${extension}`;
            const url = await uploadFileToBucket({
              bucket: BUCKET_NAME,
              path: `${folderBase}/${identificador}/${fileName}`,
              file,
            });
            if (url) datosActualizados[key] = url;
          } catch (uploadError) {
            setLoading(false);
            return mostrarMensaje(
              `Error al subir el archivo para ${key}`,
              "error",
            );
          }
        }
      }

      const payload = {};
      if (registroSeleccionado.tipo === "proveedor") {
        // Cupo viene del formulario del proveedor (datos)
        const cupoFromDatos = (registroSeleccionado.datos?.cupo || "").toString().replace(/\D/g, "");
        payload.cupoAprobado = cupoFromDatos;
        payload.condicionPago = condicionPago;
      }

      datosActualizados.sede = sede;
      datosActualizados.cargo = nombreCargo;
      datosActualizados.fecha_contratacion = fechaContratacion;

      payload.datosAprobados = datosActualizados;

      if (registroSeleccionado.tipo === "empleado") {
        payload.fechaContratacion = fechaContratacion;
        payload.nombreCargo = nombreCargo;
        payload.sede = sede;
        payload.necesitaUsuarioSiesa = (
          necesitaUsuarioSiesa || "no"
        ).toLowerCase();

        // --------------------------------------------------------
        // ACTUALIZACIÓN DE PERFIL EN SOCIODEMOGRÁFICO
        // --------------------------------------------------------
        try {
          const raw = registroSeleccionado.datos || {};
          let empresaSlug = raw.empresa ? raw.empresa.toLowerCase() : "";

          console.log("Empresa detectada para actualización:", empresaSlug);
          setLoadingText("Actualizando info...");

          let endpointSuffix = empresaSlug;
          if (empresaSlug === "megamayorista")
            endpointSuffix = "megamayoristas";
          if (empresaSlug === "construahorro") endpointSuffix = "construahorro";
          if (empresaSlug === "merkahorro") endpointSuffix = "merkahorro";

          if (endpointSuffix && empresaSlug) {
            const payloadUpdateSocio = {
              numeroDocumento: raw.cedula || raw.numeroDocumento,
              // CAMPOS NUEVOS A ACTUALIZAR
              sede: sede,
              cargoOperativo: nombreCargo,
              fechaIngresoEmpresa: fechaContratacion,
              // IMPORTANTE: NO se envía 'empresa' aquí para evitar error 500
            };

            const urlRuby = `https://backend-formulario-ruby.vercel.app/api/form/save/${endpointSuffix}`;

            await fetch(urlRuby, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payloadUpdateSocio),
            });

            console.log("Perfil Sociodemográfico completado con éxito.");
          } else {
            console.warn(
              `No se pudo actualizar Sociodemográfico. Empresa no detectada o inválida: ${empresaSlug}`,
            );
            Swal.fire({
              icon: "warning",
              title: "Advertencia",
              text: "El registro se aprobará en Trazabilidad, pero NO se pudo actualizar el Sociodemográfico porque el registro original no tenía una empresa válida asignada.",
            });
          }
        } catch (errSocio) {
          console.error("Error actualizando Sociodemográfico:", errSocio);
        }

        // --------------------------------------------------------
        // REGISTRO AUTOMÁTICO DE DOTACIÓN
        // --------------------------------------------------------
        try {
          setLoadingText("Registrando dotación...");
          const raw = registroSeleccionado.datos || {};

          const dotacionPayload = {
            nombre: `${raw.nombre || ""} ${raw.apellidos || ""}`.trim(),
            empresa: raw.empresa || "",
            documento: raw.cedula || "",
            sede: sede,
            cargo: nombreCargo,
            fechaIngreso: fechaContratacion,
            fechaEntrega: fechaEntregaDotacion,
            dotacionTipo: dotacionTipo,
            registradoPor: "Panel de Aprobaciones",
            fechaRegistro: new Date().toISOString(),
            dotacion: dotacionData,
          };

          const dotResponse = await fetch(
            "https://backend-dotacion.vercel.app/api/dotacion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(dotacionPayload),
            },
          );
          const dotResult = await dotResponse.json();
          if (!dotResponse.ok) {
            console.error("Error registrando dotación:", dotResult.error);
            // Si el documento ya existe en dotación, solo advertir, no bloquear
            if (
              dotResult.error &&
              dotResult.error.includes("documento ya existe")
            ) {
              console.warn(
                "El documento ya existe en dotación, se omite registro.",
              );
            }
          } else {
            console.log("Dotación registrada con éxito.");
          }
        } catch (errDot) {
          console.error("Error registrando dotación:", errDot);
        }
      }

      console.log("Aprobando en Trazabilidad...");
      setLoadingText("Guardando...");
      await apiTrazabilidad.post(
        `/trazabilidad/aprobaciones/aprobar/${registroSeleccionado.id}`,
        payload,
      );

      mostrarMensaje("Registro aprobado y sincronizado.", "success");
      setRegistroSeleccionado(null);
      await cargarPendientes();
    } catch (error) {
      console.error("Error general en aprobación:", error);
      const backendMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      Swal.fire(
        "Error en Aprobación",
        `Falló el proceso: ${backendMsg}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRechazo = () => {
    if (!registroSeleccionado) return;
    setModalRechazoAbierto(true);
  };
  const cerrarModalRechazo = () => {
    setModalRechazoAbierto(false);
    setMotivoRechazo("");
  };

  const rechazarRegistro = async () => {
    if (!registroSeleccionado) return;
    if (!motivoRechazo.trim()) {
      return mostrarMensaje(
        "Indica un motivo para rechazar el registro.",
        "error",
      );
    }
    try {
      setLoading(true);
      await apiTrazabilidad.post(
        `/trazabilidad/aprobaciones/rechazar/${registroSeleccionado.id}`,
        { motivo: motivoRechazo },
      );
      mostrarMensaje("Registro rechazado.", "success");
      cerrarModalRechazo();
      setRegistroSeleccionado(null);
      await cargarPendientes();
    } catch (error) {
      mostrarMensaje("Error al rechazar el registro.", "error");
    } finally {
      setLoading(false);
    }
  };

  const abrirPreviewArchivo = (url, nombre) => {
    setArchivoPreview({ url, nombre });
  };
  const abrirExpediente = (tipo, id) => {
    setVistaExpediente(tipo);
    setExpedienteId(id);
  };
  const cerrarExpediente = () => {
    setVistaExpediente(null);
    setExpedienteId(null);
  };

  if (vistaExpediente && expedienteId) {
    if (vistaExpediente === "empleado")
      return (
        <ExpedienteEmpleadoView
          empleadoId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    if (vistaExpediente === "proveedor")
      return (
        <ExpedienteProveedorView
          proveedorId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
    if (vistaExpediente === "cliente")
      return (
        <ExpedienteClienteView
          clienteId={expedienteId}
          onBack={cerrarExpediente}
          onPreview={(url) => setArchivoPreview({ url, nombre: "Documento" })}
        />
      );
  }

  return (
    <div className="tc-panel-container">
      <div className="tc-header-main">
        <div className="header-content">
          <h1>Panel de Aprobaciones</h1>
          <p className="panel-subtitle">
            Gestión centralizada de solicitudes pendientes.
          </p>
        </div>
        <div className="tc-header-stats">
          <div className="tc-stat-item">
            <span className="stat-value">{registrosPendientes.length}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`tc-alert-message ${
            tipoMensaje === "success" ? "alert-success" : "alert-error"
          }`}
        >
          {tipoMensaje === "success" ? <FaCheck /> : <FaTimes />} {mensaje}
        </div>
      )}

      <div className="tc-controls-wrapper">
        <div className="tc-filtros-container">
          <FaFilter className="tc-filter-icon" />
          {TIPOS_FILTRO.filter((f) => {
            if (
              !userRole ||
              ["admin", "super_admin", "authenticated"].includes(userRole)
            )
              return true;
            if (["admin_cliente", "admin_clientes"].includes(userRole))
              return f.value === "cliente";
            if (["admin_proveedor", "admin_proveedores"].includes(userRole))
              return f.value === "proveedor";
            if (userRole === "admin_empleado") return f.value === "empleado";
            return f.value === userRole.replace("admin_", "");
          }).map(({ value, label }) => {
            const count = contadorPorTipo[value] ?? 0;
            return (
              <button
                key={value}
                type="button"
                className={`tc-filtro-chip ${
                  filtroTipo === value ? "active" : ""
                }`}
                onClick={() => setFiltroTipo(value)}
              >
                {label} <span className="tc-filtro-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="tc-panel-content">
        <div className="tc-layout-split">
          <aside className="tc-lista-registros">
            <div className="tc-lista-header">
              <h3>Solicitudes Pendientes</h3>
            </div>
            {pendientesFiltrados.length === 0 ? (
              <div className="tc-estado-vacio-lista">
                <p>No hay registros.</p>
              </div>
            ) : (
              <ul className="tc-registro-lista">
                {pendientesFiltrados.map((registro) => {
                  const resumen = obtenerResumenLista(registro);
                  const activo = registroSeleccionado?.id === registro.id;
                  return (
                    <li
                      key={registro.id}
                      className={`tc-registro-item ${activo ? "active" : ""}`}
                      onClick={() => handleSeleccionRegistro(registro)}
                    >
                      <div className="tc-item-top">
                        <span className={`tc-badge-tipo ${registro.tipo}`}>
                          {registro.tipo}
                        </span>
                        <span className="tc-item-fecha">
                          {formatearFecha(registro.created_at).split(",")[0]}
                        </span>
                      </div>
                      <div className="tc-item-content">
                        <h4 className="tc-item-titulo">{resumen.titulo}</h4>
                        <p className="tc-item-meta">{resumen.meta}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="tc-detalle-panel">
            {registroSeleccionado ? (
              <>
                <div className="tc-detalle-header">
                  <div className="tc-detalle-info-head">
                    <div className="tc-detalle-meta">
                      <span
                        className={`tc-badge-tipo ${registroSeleccionado.tipo}`}
                      >
                        {registroSeleccionado.tipo}
                      </span>
                      <span>
                        <FaClock style={{ marginRight: "4px" }} />
                        {formatearFecha(registroSeleccionado.created_at)}
                      </span>
                    </div>
                    <h2 className="tc-detalle-titulo">
                      {detalleSeleccionado.resumen}
                    </h2>
                  </div>
                  {["cliente", "empleado", "proveedor"].includes(
                    registroSeleccionado.tipo,
                  ) &&
                    !modoEdicion && (
                      <button
                        className="tc-btn-editar"
                        onClick={() => setModoEdicion(true)}
                        disabled={loading}
                      >
                        <FaEdit /> Editar Datos
                      </button>
                    )}
                </div>

                <div className="tc-detalle-content-scroll">
                  {modoEdicion ? (
                    <div className="tc-grid-editable">
                      <div className="tc-editable-header">
                        <h3>Editando Información</h3>
                        <div className="tc-editable-actions">
                          <button
                            className="tc-btn-cancelar-edicion"
                            onClick={() => setModoEdicion(false)}
                            disabled={loading}
                          >
                            Cancelar
                          </button>
                          <button
                            className="tc-btn-guardar-edicion"
                            onClick={guardarEdicion}
                            disabled={loading}
                          >
                            <FaSave /> Guardar Cambios
                          </button>
                        </div>
                      </div>

                      {(registroSeleccionado.tipo === "cliente"
                        ? CLIENTE_FIELDS
                        : registroSeleccionado.tipo === "empleado"
                          ? EMPLEADO_FIELDS
                          : registroSeleccionado.tipo === "proveedor"
                            ? PROVEEDOR_FIELDS
                            : []
                      ).map((field) => {
                        const isError = errorCampo === field.key;
                        let displayLabel = field.label;
                        if (
                          field.key === "nit" &&
                          datosEditables.tipo_documento
                        )
                          displayLabel = toTitle(datosEditables.tipo_documento);

                        if (field.key === "tipo_regimen")
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <select
                                value={datosEditables[field.key] || ""}
                                onChange={(e) =>
                                  setDatosEditables({
                                    ...datosEditables,
                                    [field.key]: e.target.value,
                                  })
                                }
                                className={`tc-input tc-select-styled ${isError ? "error" : ""}`}
                                disabled={loading}
                              >
                                <option value="">Seleccione...</option>
                                {TIPO_REGIMEN_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        if (
                          field.key === "tipo_documento" ||
                          field.key === "rep_legal_tipo_doc"
                        )
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <select
                                value={datosEditables[field.key] || ""}
                                onChange={(e) =>
                                  setDatosEditables({
                                    ...datosEditables,
                                    [field.key]: e.target.value,
                                  })
                                }
                                className={`tc-input tc-select-styled ${isError ? "error" : ""}`}
                                disabled={loading}
                              >
                                <option value="">Seleccione...</option>
                                {DOCUMENT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        if (field.key.startsWith("declara_"))
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <select
                                value={datosEditables[field.key] || ""}
                                onChange={(e) =>
                                  setDatosEditables({
                                    ...datosEditables,
                                    [field.key]: e.target.value,
                                  })
                                }
                                className={`tc-input tc-select-styled ${isError ? "error" : ""}`}
                                disabled={loading}
                              >
                                <option value="">Seleccione...</option>
                                {RESPUESTA_PREGUNTA.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        if (field.key === "codigo_ciiu")
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <SearchableSelect
                                id="codigo_ciiu"
                                options={ciiuOptions}
                                value={datosEditables.codigo_ciiu}
                                onChange={(option) =>
                                  setDatosEditables((prev) => ({
                                    ...prev,
                                    codigo_ciiu: option ? option.value : "",
                                    descripcion_ciiu: option
                                      ? option.label
                                      : "",
                                  }))
                                }
                                placeholder="Buscar..."
                                disabled={loading}
                                isInvalid={isError}
                              />
                            </div>
                          );
                        if (field.key === "departamento")
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <SearchableSelect
                                id="departamento"
                                options={departmentOptions}
                                value={datosEditables.departamento_codigo}
                                onChange={(option) =>
                                  setDatosEditables((prev) => ({
                                    ...prev,
                                    departamento_codigo: option
                                      ? option.value
                                      : "",
                                    departamento: option ? option.name : "",
                                    ciudad_codigo: "",
                                    ciudad: "",
                                  }))
                                }
                                placeholder="Buscar..."
                                disabled={loading}
                                isInvalid={isError}
                              />
                            </div>
                          );
                        if (field.key === "ciudad")
                          return (
                            <div key={field.key} className="tc-field-group">
                              <label className={isError ? "error" : ""}>
                                {field.label}
                              </label>
                              <SearchableSelect
                                id="ciudad"
                                options={cityOptions}
                                value={datosEditables.ciudad_codigo}
                                onChange={(option) =>
                                  setDatosEditables((prev) => ({
                                    ...prev,
                                    ciudad_codigo: option ? option.value : "",
                                    ciudad: option ? option.name : "",
                                  }))
                                }
                                placeholder="Buscar..."
                                disabled={
                                  loading || !datosEditables.departamento_codigo
                                }
                                isInvalid={isError}
                              />
                            </div>
                          );
                        if (field.key === "descripcion_ciiu") return null;

                        return (
                          <div key={field.key} className="tc-field-group">
                            <label
                              className={
                                errorCampo === field.key ? "error" : ""
                              }
                            >
                              {displayLabel}{" "}
                              {errorCampo === field.key && "(Duplicado)"}
                            </label>
                            <input
                              type={field.type || "text"}
                              value={datosEditables[field.key] || ""}
                              onChange={(e) => {
                                setDatosEditables({
                                  ...datosEditables,
                                  [field.key]: e.target.value,
                                });
                                if (errorCampo === field.key)
                                  setErrorCampo(null);
                              }}
                              className={`tc-input ${
                                errorCampo === field.key ? "error" : ""
                              }`}
                              disabled={loading}
                            />
                          </div>
                        );
                      })}

                      <div
                        className="tc-section-title"
                        style={{ marginTop: "2rem" }}
                      >
                        <FaFolderOpen /> <span>Documentos (Edición)</span>
                      </div>
                      <div className="tc-docs-grid-edit">
                        {(registroSeleccionado.tipo === "cliente"
                          ? CLIENTE_DOCS
                          : registroSeleccionado.tipo === "empleado"
                            ? EMPLEADO_DOCS
                            : registroSeleccionado.tipo === "proveedor"
                              ? PROVEEDOR_DOCS
                              : []
                        ).map((doc) => (
                          <FileInput
                            key={doc.key}
                            label={doc.label}
                            name={doc.key}
                            file={archivosNuevos[doc.key]}
                            existingUrl={datosEditables[doc.key]}
                            onFileChange={handleFileChange}
                            onRemove={handleRemoveFile}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {detalleSeleccionado.campos.length > 0 && (
                        <div className="tc-grid-lectura">
                          {detalleSeleccionado.campos.map((campo) => (
                            <div key={campo.label} className="tc-field-lectura">
                              <label>{campo.label}</label>
                              <span title={campo.value}>
                                {campo.value || "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="tc-section-title">
                        <FaFolderOpen />
                        <span>Documentos adjuntos</span>
                      </div>
                      <div className="tc-docs-grid-read">
                        {detalleSeleccionado.documentos.length > 0 ? (
                          detalleSeleccionado.documentos.map((doc) => (
                            <button
                              key={doc.label}
                              type="button"
                              className="tc-doc-card"
                              onClick={() =>
                                abrirPreviewArchivo(doc.url, doc.label)
                              }
                            >
                              <div className="tc-doc-icon">
                                {doc.label.toLowerCase().includes("pdf") ? (
                                  <FaFilePdf style={{ color: "#E53E3E" }} />
                                ) : (
                                  <FaFileImage style={{ color: "#10b981" }} />
                                )}
                              </div>
                              <span className="tc-doc-name">{doc.label}</span>
                            </button>
                          ))
                        ) : (
                          <span className="tc-no-docs">
                            No se adjuntaron documentos.
                          </span>
                        )}
                      </div>

                      {registroSeleccionado.tipo === "proveedor" && (
                        <div className="tc-enrichment-box">
                          <div className="tc-enrichment-header">
                            <FaCheck /> Datos de Aprobación (Requeridos)
                          </div>
                          <div className="tc-enrichment-grid">
                            <div className="tc-enrichment-field">
                              <label>
                                Condición de Pago{" "}
                                <span className="tc-required-mark">*</span>
                              </label>
                              <input
                                type="text"
                                className="tc-enrichment-input"
                                value={condicionPago}
                                onChange={(e) =>
                                  setCondicionPago(e.target.value)
                                }
                                placeholder="Ej: 30 días"
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {registroSeleccionado.tipo === "empleado" && (
                        <div
                          className="tc-extra-inputs-grid-full"
                          style={{
                            marginTop: "2rem",
                            borderTop: "1px solid #eee",
                            paddingTop: "1rem",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "1rem",
                              color: "#210d65",
                              marginBottom: "1rem",
                            }}
                          >
                            <FaTshirt /> Asignación de Contrato
                          </h3>
                          <div className="tc-extra-inputs-grid">
                            <div>
                              <label>Fecha Contratación</label>
                              <input
                                type="date"
                                className="tc-input"
                                value={fechaContratacion}
                                onChange={(e) =>
                                  setFechaContratacion(e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label>Cargo</label>
                              <input
                                type="text"
                                className="tc-input"
                                value={nombreCargo}
                                onChange={(e) => setNombreCargo(e.target.value)}
                                placeholder="Ej: Cajero"
                              />
                            </div>
                            <div>
                              <label>Sede <span className="tc-required-mark">*</span></label>
                              <select
                                className="tc-input tc-select-styled"
                                value={sede}
                                onChange={(e) => setSede(e.target.value)}
                                disabled={loading}
                              >
                                <option value="">Selecciona una sede</option>
                                {getSedeOptionsForEmpleado().map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {[
                            "admin",
                            "super_admin",
                            "admin_empleado",
                            "admin_empleados",
                          ].includes(userRole) && (
                            <div
                              className="tc-extra-inputs-grid-full"
                              style={{
                                marginTop: "1rem",
                                borderTop: "1px dashed #ccc",
                                paddingTop: "1rem",
                              }}
                            >
                              <label
                                style={{
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  fontWeight: "bold",
                                  color: "#2d3748",
                                }}
                              >
                                ¿Necesita usuario en Siesa?
                              </label>
                              <div style={{ display: "flex", gap: "2rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="siesa_check"
                                    value="si"
                                    checked={necesitaUsuarioSiesa === "si"}
                                    onChange={(e) =>
                                      setNecesitaUsuarioSiesa(e.target.value)
                                    }
                                  />
                                  Sí, necesita usuario
                                </label>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="siesa_check"
                                    value="no"
                                    checked={necesitaUsuarioSiesa === "no"}
                                    onChange={(e) =>
                                      setNecesitaUsuarioSiesa(e.target.value)
                                    }
                                  />
                                  No
                                </label>
                              </div>
                            </div>
                          )}

                          {/* --- SECCIÓN DE DOTACIÓN --- */}
                          <div
                            style={{
                              marginTop: "1.5rem",
                              borderTop: "2px solid #210d65",
                              paddingTop: "1rem",
                            }}
                          >
                            <h3
                              style={{
                                fontSize: "1rem",
                                color: "#210d65",
                                marginBottom: "1rem",
                              }}
                            >
                              <FaTshirt /> Asignación de Dotación
                            </h3>
                            <div className="tc-extra-inputs-grid">
                              <div>
                                <label>
                                  Fecha Entrega Dotación{" "}
                                  <span className="tc-required-mark">*</span>
                                </label>
                                <input
                                  type="date"
                                  className="tc-input"
                                  value={fechaEntregaDotacion}
                                  onChange={(e) =>
                                    setFechaEntregaDotacion(e.target.value)
                                  }
                                  disabled={loading}
                                />
                              </div>
                              <div>
                                <label>
                                  Tipo Dotación{" "}
                                  <span className="tc-required-mark">*</span>
                                </label>
                                <select
                                  className="tc-input tc-select-styled"
                                  value={dotacionTipo}
                                  onChange={(e) =>
                                    handleDotacionTipoChange(e.target.value)
                                  }
                                  disabled={loading}
                                >
                                  <option value="">
                                    Seleccione una opción
                                  </option>
                                  {Object.keys(dotacionTipoMap).map((tipo) => (
                                    <option key={tipo} value={tipo}>
                                      {tipo}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {showDotacionOptions && dotacionTipo && (
                              <div
                                className="tc-dotacion-items-section"
                                style={{ marginTop: "1rem" }}
                              >
                                <h4
                                  style={{
                                    fontSize: "0.95rem",
                                    color: "#2d3748",
                                    marginBottom: "0.75rem",
                                  }}
                                >
                                  Seleccione la Dotación - {dotacionTipo}
                                </h4>
                                {dotacionItems[
                                  dotacionTipoMap[dotacionTipo]
                                ].map((item) => {
                                  const tipoKey =
                                    dotacionTipoMap[dotacionTipo];
                                  const itemData =
                                    dotacionData[tipoKey][item.key];
                                  return (
                                    <div
                                      key={item.key}
                                      className="tc-dotacion-item-row"
                                    >
                                      <label className="tc-dotacion-checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={itemData.checked}
                                          onChange={(e) =>
                                            handleDotacionChange(
                                              tipoKey,
                                              item.key,
                                              "checked",
                                              e.target.checked,
                                            )
                                          }
                                        />
                                        {item.label}
                                      </label>

                                      {itemData.checked &&
                                        item.key !== "bonoCalzado" && (
                                          <div className="tc-dotacion-item-details">
                                            {item.soloUnidades ? (
                                              <>
                                                <label>Unidades</label>
                                                <input
                                                  type="number"
                                                  className="tc-input"
                                                  min="1"
                                                  value={itemData.unidades}
                                                  onChange={(e) =>
                                                    handleDotacionChange(
                                                      tipoKey,
                                                      item.key,
                                                      "unidades",
                                                      e.target.value,
                                                    )
                                                  }
                                                />
                                              </>
                                            ) : (
                                              <>
                                                <label>Talla</label>
                                                {INPUT_TALLA_NUMERICA_KEYS.includes(
                                                  item.key,
                                                ) ? (
                                                  <input
                                                    type="text"
                                                    className="tc-input"
                                                    placeholder="Ej: 38, 40, 42"
                                                    value={itemData.talla}
                                                    onChange={(e) =>
                                                      handleDotacionChange(
                                                        tipoKey,
                                                        item.key,
                                                        "talla",
                                                        e.target.value,
                                                      )
                                                    }
                                                  />
                                                ) : (
                                                  <div className="tc-dotacion-tallas-circulo">
                                                    {TALLAS_CIRCULO.map(
                                                      (talla) => (
                                                        <label
                                                          key={talla}
                                                          className={`tc-dotacion-talla-circulo ${
                                                            itemData.talla ===
                                                            talla
                                                              ? "selected"
                                                              : ""
                                                          }`}
                                                        >
                                                          <input
                                                            type="radio"
                                                            name={`talla-${tipoKey}-${item.key}`}
                                                            value={talla}
                                                            checked={
                                                              itemData.talla ===
                                                              talla
                                                            }
                                                            onChange={() =>
                                                              handleDotacionChange(
                                                                tipoKey,
                                                                item.key,
                                                                "talla",
                                                                talla,
                                                              )
                                                            }
                                                          />
                                                          <span>{talla}</span>
                                                        </label>
                                                      ),
                                                    )}
                                                  </div>
                                                )}
                                                <label
                                                  style={{
                                                    marginTop: "0.5rem",
                                                  }}
                                                >
                                                  Unidades
                                                </label>
                                                <input
                                                  type="number"
                                                  className="tc-input"
                                                  min="1"
                                                  value={itemData.unidades}
                                                  onChange={(e) =>
                                                    handleDotacionChange(
                                                      tipoKey,
                                                      item.key,
                                                      "unidades",
                                                      e.target.value,
                                                    )
                                                  }
                                                />
                                              </>
                                            )}
                                          </div>
                                        )}

                                      {itemData.checked &&
                                        item.key === "bonoCalzado" && (
                                          <div className="tc-dotacion-item-details">
                                            <label>Valor</label>
                                            <input
                                              type="text"
                                              className="tc-input"
                                              value={`$${itemData.valor.toLocaleString("es-CO")}`}
                                              disabled
                                            />
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="tc-detalle-footer">
                  <button
                    type="button"
                    className="tc-btn-rechazar"
                    onClick={abrirModalRechazo}
                    disabled={loading}
                  >
                    <FaTimes /> Rechazar
                  </button>
                  <button
                    type="button"
                    className="tc-btn-aprobar"
                    onClick={aprobarRegistro}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="icon-spin" /> {loadingText}
                      </>
                    ) : (
                      <>
                        <FaCheck /> Aprobar
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="tc-panel-vacio-seleccion">
                <div className="tc-icono-vacio">
                  <FaUser />
                </div>
                <h3>Selecciona una Solicitud</h3>
                <p>
                  Haz clic en un registro de la lista izquierda para ver el
                  detalle completo.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {modalRechazoAbierto && (
        <div className="tc-modal-overlay" onClick={cerrarModalRechazo}>
          <div
            className="tc-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tc-modal-header">
              <h2>Rechazar Solicitud</h2>
              <button className="tc-modal-close" onClick={cerrarModalRechazo}>
                <FaTimes />
              </button>
            </div>
            <div className="tc-modal-body">
              <p>
                Por favor, indica el motivo por el cual se rechaza esta
                solicitud.
              </p>
              <textarea
                className="tc-modal-textarea"
                placeholder="Escribe el motivo del rechazo aquí..."
                value={motivoRechazo}
                onChange={(event) => setMotivoRechazo(event.target.value)}
                autoFocus
              />
            </div>
            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn-modal-cancel"
                onClick={cerrarModalRechazo}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="tc-btn-modal-confirm"
                onClick={rechazarRegistro}
                disabled={loading || !motivoRechazo.trim()}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {archivoPreview && (
        <FilePreviewModal
          isOpen
          fileUrl={archivoPreview.url}
          onClose={() => setArchivoPreview(null)}
        />
      )}
    </div>
  );
};

export default PanelAprobaciones;
