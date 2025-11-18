import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHardHat,
  FaUserPlus,
  FaUser,
  FaUpload,
  FaFileAlt,
  FaTimesCircle,
  FaFilePdf,
  FaFileImage,
  FaHistory,
  FaSpinner,
  FaInfoCircle,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEdit,
  FaFileUpload,
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

// Importaciones locales
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../supabaseClient";
import FilePreviewModal from "./FilePreviewModal";
import SearchableSelect from "./components/SearchableSelect";
import { CIIU_CODES } from "./data/ciiuCodes";
import { DEPARTMENTS, findDepartmentByName } from "./data/colombiaLocations";
import "./CreacionSubirEmpleado.css";

// CONFIGURACIÓN CENTRALIZADA
const BUCKET_NAME = "documentos_contabilidad";
const FOLDER_BASE = "proveedores";
const SWAL_CUSTOM_CLASSES = {
  container: "tc-swal-container",
  title: "tc-swal-title",
  confirmButton: "tc-swal-confirm",
  cancelButton: "tc-swal-cancel",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{7,15}$/;
const DOCUMENT_NUMBER_REGEX = /^\d{5,15}$/;
const DV_REGEX = /^\d$/;
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]{2,}$/;
const ADDRESS_REGEX = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ#°º\s.,\-\/]+$/;

//==================================================================
// 1. COMPONENTE FileInput (¡NUEVA VERSIÓN INTELIGENTE!)
//==================================================================
const FileInput = ({ label, name, file, setFile, isRequired = false }) => {
  const fileInputRef = useRef(null);
  const isString = typeof file === "string" && file.length > 0;
  const isFile = file instanceof File;

  let displayName = "N/A";
  if (isString) {
    const match = file.match(/[^/]*$/);
    displayName = match ? match[0].split("?")[0] : "Archivo Cargado";
    try {
      displayName = decodeURIComponent(displayName);
    } catch (e) {
      /* No hacer nada */
    }
  } else if (isFile) {
    displayName = file.name;
  }

  const getIcon = () => {
    const nameToTest = isString ? file : isFile ? file.name : "";
    if (nameToTest.toLowerCase().endsWith(".pdf"))
      return <FaFilePdf style={{ color: "#E53E3E" }} />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(nameToTest))
      return <FaFileImage style={{ color: "#38A169" }} />;
    return <FaFileAlt />;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleTriggerInput = (e) => {
    e.preventDefault();
    fileInputRef.current.click();
  };

  return (
    <div className={`tc-form-group ${file ? "tc-file-selected" : ""}`}>
      <label htmlFor={name}>
        {label} {isRequired && <span className="required">*</span>}
      </label>
      <div className="tc-file-input-wrapper">
        <input
          type="file"
          id={name}
          name={name}
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        {!file && (
          <label htmlFor={name} className="tc-file-label">
            <FaUpload /> <span>Adjuntar documento</span>
          </label>
        )}
        {isFile && (
          <div className="tc-file-preview tc-file-new">
            {getIcon()}
            <span className="tc-file-name" title={displayName}>
              {displayName}
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="tc-file-remove-btn"
              title="Quitar archivo"
            >
              <FaTimesCircle />
            </button>
          </div>
        )}
        {isString && (
          <div className="tc-file-preview tc-file-existing">
            {getIcon()}
            <span className="tc-file-name" title={displayName}>
              ✔️ {displayName}
            </span>
            <button
              type="button"
              onClick={handleTriggerInput}
              className="tc-file-change-btn"
              title="Cambiar archivo"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="tc-file-remove-btn"
              title="Quitar archivo"
            >
              <FaTimesCircle />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

//==================================================================
// 2. COMPONENTES REUTILIZABLES (Sin cambios)
//==================================================================

const DocLink = ({ url, label, onPreview }) => {
  // (Esta función no cambia)
  if (!url)
    return <span className="tc-doc-item doc-link-empty">{label}: N/A</span>;

  const isPdf = url.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const icon = isPdf ? (
    <FaFilePdf style={{ color: "#E53E3E" }} />
  ) : isImage ? (
    <FaFileImage style={{ color: "#38A169" }} />
  ) : (
    <FaFileAlt />
  );

  const fileNameMatch = url.match(/[^/]*$/);
  const fileName = fileNameMatch ? fileNameMatch[0].split("?")[0] : "Documento";

  return (
    <div className="tc-doc-item">
      <span className="tc-doc-label">{label}:</span>
      <button
        type="button"
        className="tc-doc-button"
        onClick={() => onPreview(url)}
        title={`Ver ${label} (${fileName})`}
      >
        {icon}
      </button>
    </div>
  );
};

const useSortableData = (items, config = null) => {
  // (Esta función no cambia)
  const [sortConfig, setSortConfig] = useState(config);
  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };
  return { items: sortedItems, requestSort, sortConfig };
};

const HistorialTable = ({
  isLoading,
  data,
  columns,
  emptyMessage,
  defaultSortKey = "created_at",
}) => {
  // (Esta función no cambia)
  const { items, requestSort, sortConfig } = useSortableData(data, {
    key: defaultSortKey,
    direction: "descending",
  });

  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key)
      return <FaSort className="tc-sort-icon" />;
    return sortConfig.direction === "ascending" ? (
      <FaSortUp className="tc-sort-icon active" />
    ) : (
      <FaSortDown className="tc-sort-icon active" />
    );
  };

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          className="tc-historial-message loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FaSpinner className="tc-spinner" />{" "}
          <span>Cargando historial...</span>
        </motion.div>
      ) : items.length === 0 ? (
        <motion.div
          key="empty"
          className="tc-historial-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FaInfoCircle /> <span>{emptyMessage}</span>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="tc-historial-table-wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={col.sortable ? "tc-sortable-header" : ""}
                      style={{ textAlign: "center" }}
                      onClick={() =>
                        col.sortable ? requestSort(col.key) : null
                      }
                    >
                      {col.header}
                      {col.sortable && getSortIcon(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    {columns.map((col) => (
                      <td
                        key={`${item.id}-${col.key}`}
                        className={`${col.className || ""} ${
                          col.centered ? "tc-centered-cell" : ""
                        }`}
                      >
                        {col.cell ? col.cell(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TrazabilidadPageLayout = ({
  title,
  icon,
  subtitle,
  formContent,
  historialTitle,
  historialContent,
  formCardRef,
  modoPublico,
}) => {
  // (Esta función no cambia)
  return (
    <div className="tc-page-container">
      <motion.div
        className="tc-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        ref={formCardRef}
      >
        <h2 className="tc-title">
          {icon}
          {title}
        </h2>
        <p className="tc-subtitle">{subtitle}</p>
        {formContent}
      </motion.div>

      {/* Ocultar historial en modo público */}
      {!modoPublico && (
        <motion.div
          className="tc-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="tc-title">
            <FaHistory />
            {historialTitle}
          </h2>
          {historialContent}
        </motion.div>
      )}
    </div>
  );
};

const parseApiError = (error) => {
  // (Esta función no cambia)
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    if (error.message.includes("timeout")) {
      return "Tiempo de espera agotado. La solicitud tardó demasiado.";
    }
    if (error.message.includes("Network Error")) {
      return "Error de red. Verifique la conexión o la configuración del servidor.";
    }
    return error.message;
  }
  return "Ocurrió un error inesperado al procesar la solicitud.";
};

// ==================================================================

//==================================================================
// 3. COMPONENTE PRINCIPAL (¡ACTUALIZADO!)
//==================================================================
const EMPTY_FORM = {
  fecha_diligenciamiento: "",
  tipo_regimen: "",
  tipo_documento: "",
  nit: "",
  dv: "",
  razon_social: "",
  nombre_establecimiento: "",
  primer_nombre: "",
  segundo_nombre: "",
  primer_apellido: "",
  segundo_apellido: "",
  codigo_ciiu: "",
  descripcion_ciiu: "",
  direccion_domicilio: "",
  departamento: "",
  departamento_codigo: "",
  ciudad: "",
  ciudad_codigo: "",
  email_factura_electronica: "",
  nombre_contacto: "",
  email_contacto: "",
  telefono_contacto: "",
  rep_legal_nombre: "",
  rep_legal_apellidos: "",
  rep_legal_tipo_doc: "",
  rep_legal_num_doc: "",
  declara_pep: "",
  declara_recursos_publicos: "",
  declara_obligaciones_tributarias: "",
};

const DOCUMENT_OPTIONS = [
  { value: "NIT", label: "NIT" },
  { value: "Cedula de ciudadanía", label: "Cédula de ciudadanía" },
  { value: "Cedula de extranjería", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
  {
    value: "Documento de identidad extranjero",
    label: "Documento de identidad extranjero",
  },
  { value: "NUIP", label: "NUIP" },
  { value: "NIT de otro país", label: "NIT de otro país" },
];

const RESPUESTA_PREGUNTA = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const TIPO_REGIMEN_OPTIONS = [
  { value: "persona_juridica", label: "Persona Jurídica" },
  { value: "persona_natural", label: "Persona Natural" },
];

const CreacionProveedor = () => {
  // Detectar si hay token en la URL (modo público)
  const [searchParams] = useSearchParams();
  const tokenPublico = searchParams.get("token");
  const modoPublico = !!tokenPublico;
  const [tokenValido, setTokenValido] = useState(!modoPublico);
  const [tokenVerificando, setTokenVerificando] = useState(modoPublico);
  const [tokenMensaje, setTokenMensaje] = useState("");

  // --- (Estados actualizados) ---
  const formCardRef = useRef(null);
  // Estados de control de pasos (navegación visual)
  const [pasoActual, setPasoActual] = useState(1); // 1: datos, 2: documentos
  const [rut, setRut] = useState(null);
  const [camaraComercio, setCamaraComercio] = useState(null);
  const [docIdentidadRepLegal, setDocIdentidadRepLegal] = useState(null);
  const [certificadoSagrilaft, setCertificadoSagrilaft] = useState(null);
  const [composicionAccionaria, setComposicionAccionaria] = useState(null);
  const [certificacionBancaria, setCertificacionBancaria] = useState(null);
  const [formData, setFormData] = useState(() => ({
    ...EMPTY_FORM,
    fecha_diligenciamiento: format(new Date(), "yyyy-MM-dd"),
  }));
  const [formErrors, setFormErrors] = useState({});
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const ciiuOptions = useMemo(
    () =>
      CIIU_CODES.map(({ code, label }) => ({
        value: code,
        label,
      })),
    []
  );

  const ciiuMap = useMemo(() => {
    const map = new Map();
    CIIU_CODES.forEach(({ code, label }) => {
      map.set(code, label);
    });
    return map;
  }, []);

  const findCiiuLabel = useCallback(
    (code) => (code ? ciiuMap.get(code) || "" : ""),
    [ciiuMap]
  );

  const departmentOptions = useMemo(
    () =>
      DEPARTMENTS.map((dep) => ({
        value: dep.code,
        label: `${dep.code} - ${dep.name}`,
        name: dep.name,
      })),
    []
  );

  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const normalizeDateValue = useCallback((value) => {
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return format(parsed, "yyyy-MM-dd");
  }, []);

  const splitNombreNatural = useCallback((nombreCompleto) => {
    if (!nombreCompleto) {
      return {
        primer_nombre: "",
        segundo_nombre: "",
        primer_apellido: "",
        segundo_apellido: "",
      };
    }
    const partes = nombreCompleto.trim().split(/\s+/);
    const primer_nombre = partes.shift() || "";
    let segundo_nombre = "";
    let primer_apellido = partes.pop() || "";
    let segundo_apellido = "";

    if (partes.length > 0) {
      segundo_apellido = primer_apellido;
      primer_apellido = partes.pop() || "";
    }

    if (partes.length > 0) {
      segundo_nombre = partes.join(" ");
    }

    return {
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
    };
  }, []);

  const selectedDepartment = useMemo(() => {
    if (formData.departamento_codigo) {
      return (
        DEPARTMENTS.find((dep) => dep.code === formData.departamento_codigo) ||
        null
      );
    }
    if (formData.departamento) {
      return findDepartmentByName(formData.departamento) || null;
    }
    return null;
  }, [formData.departamento_codigo, formData.departamento]);

  const cityOptions = useMemo(() => {
    if (!selectedDepartment) return [];
    return selectedDepartment.cities.map((city) => ({
      value: city.code,
      label: `${city.code} - ${city.name}`,
      name: city.name,
    }));
  }, [selectedDepartment]);

  const isPersonaJuridica = formData.tipo_regimen === "persona_juridica";
  const isPersonaNatural = formData.tipo_regimen === "persona_natural";
  const documentoEsNit = formData.tipo_documento === "NIT";

  // --- (Estados de Carga y Modal no cambian) ---
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef(null);

  const openPreview = (url) => {
    setPreviewUrl(url);
    setModalOpen(true);
  };
  const closePreview = () => {
    setModalOpen(false);
    setPreviewUrl("");
  };

  // --- (Lógica de Historial no cambia) ---
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const { data } = await apiTrazabilidad.get(
        "/trazabilidad/proveedores/historial"
      );
      setHistorial(data || []);
    } catch (error) {
      console.error("Error al cargar el historial:", error);
      if (error.response?.status !== 404 && error.response?.status !== 401) {
        toast.error("No se pudo cargar el historial.");
      }
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    // Solo cargar historial si NO está en modo público
    if (!modoPublico) {
      fetchHistorial();
    }
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, [fetchHistorial, modoPublico]);

  useEffect(() => {
    if (!modoPublico || !tokenPublico) {
      setTokenValido(true);
      setTokenVerificando(false);
      return;
    }

    let isMounted = true;

    const validarTokenPublico = async () => {
      setTokenVerificando(true);
      try {
        const { data } = await axios.get(
          `${
            import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
          }/api/trazabilidad/tokens/validar/${tokenPublico}`
        );

        if (!isMounted) return;
        const esValido = Boolean(data?.valido);
        setTokenValido(esValido);
        setTokenMensaje(
          esValido
            ? ""
            : data?.message ||
                "Este formulario ya no está disponible. Solicita un nuevo enlace."
        );
      } catch (error) {
        if (!isMounted) return;
        const mensajeError =
          error.response?.data?.message ||
          "No fue posible validar este enlace. Solicita uno nuevo con la persona encargada.";
        setTokenValido(false);
        setTokenMensaje(mensajeError);
      } finally {
        if (isMounted) {
          setTokenVerificando(false);
        }
      }
    };

    validarTokenPublico();

    return () => {
      isMounted = false;
    };
  }, [modoPublico, tokenPublico]);

  useEffect(() => {
    if (formData.fecha_diligenciamiento !== todayIso) {
      setFormData((prev) => ({
        ...prev,
        fecha_diligenciamiento: todayIso,
      }));
    }
  }, [formData.fecha_diligenciamiento, todayIso]);

  useEffect(() => {
    setFormErrors((prev) => {
      let hasChanges = false;
      const nextErrors = { ...prev };
      if (rut && prev.rut) {
        nextErrors.rut = undefined;
        hasChanges = true;
      }
      if (certificacionBancaria && prev.certificacionBancaria) {
        nextErrors.certificacionBancaria = undefined;
        hasChanges = true;
      }
      if (docIdentidadRepLegal && prev.docIdentidadRepLegal) {
        nextErrors.docIdentidadRepLegal = undefined;
        hasChanges = true;
      }
      if (certificadoSagrilaft && prev.certificadoSagrilaft) {
        nextErrors.certificadoSagrilaft = undefined;
        hasChanges = true;
      }
      if (composicionAccionaria && prev.composicionAccionaria) {
        nextErrors.composicionAccionaria = undefined;
        hasChanges = true;
      }
      if (hasChanges) {
        return nextErrors;
      }
      return prev;
    });
  }, [
    rut,
    certificacionBancaria,
    docIdentidadRepLegal,
    certificadoSagrilaft,
    composicionAccionaria,
  ]);

  // --- (resetForm actualizado) ---
  const resetForm = () => {
    setPasoActual(1);
    setRut(null);
    setCamaraComercio(null);
    setDocIdentidadRepLegal(null);
    setCertificadoSagrilaft(null);
    setComposicionAccionaria(null);
    setCertificacionBancaria(null);
    setFormData({ ...EMPTY_FORM, fecha_diligenciamiento: todayIso });
    setFormErrors({});
    setAceptaTerminos(false);

    const inputs = [
      "rut",
      "camara_comercio",
      "doc_identidad_rep_legal",
      "certificado_sagrilaft",
      "composicion_accionaria",
      "certificacion_bancaria",
    ];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = null;
    });
  };

  // --- (handleCargarParaEditar deshabilitado en flujo de dos pasos) ---
  // La edición no está disponible con el nuevo flujo de dos pasos
  /*
  const handleCargarParaEditar = (item) => {
    setIdParaEditar(item.id);
    setRut(item.url_rut || null);
    setCamaraComercio(item.url_camara_comercio || null);
    setCertificacionBancaria(item.url_certificacion_bancaria || null);
    setDocIdentidadRepLegal(item.url_doc_identidad_rep_legal || null);
    setCertificadoSagrilaft(item.url_certificado_sagrilaft || null);
    setComposicionAccionaria(item.url_composicion_accionaria || null);

    const regimen = item.tipo_regimen || "";
    const departamentoInfo = item.departamento_codigo
      ? DEPARTMENTS.find((dep) => dep.code === item.departamento_codigo)
      : findDepartmentByName(item.departamento || "");
    const departamento_codigo =
      item.departamento_codigo || departamentoInfo?.code || "";
    const ciudadInfo = departamentoInfo
      ? departamentoInfo.cities.find(
          (city) =>
            city.code === item.ciudad_codigo ||
            city.name.toLowerCase() === (item.ciudad || "").toLowerCase()
        )
      : null;
    const ciudad_codigo = item.ciudad_codigo || ciudadInfo?.code || "";
    const ciudadNombre = item.ciudad || ciudadInfo?.name || "";

    const nombresNaturales =
      regimen === "persona_natural"
        ? splitNombreNatural(item.razon_social || item.nombre_contacto || "")
        : {
            primer_nombre: "",
            segundo_nombre: "",
            primer_apellido: "",
            segundo_apellido: "",
          };

    setFormData({
      ...EMPTY_FORM,
      fecha_diligenciamiento:
        normalizeDateValue(item.fecha_diligenciamiento) || todayIso,
      tipo_regimen: regimen,
      tipo_documento:
        item.tipo_documento ||
        (regimen === "persona_juridica"
          ? "NIT"
          : regimen === "persona_natural"
          ? "Cedula de ciudadanía"
          : ""),
      nit: item.nit || "",
      dv: item.dv || "",
      razon_social: item.razon_social || "",
      nombre_establecimiento: item.nombre_establecimiento || "",
      primer_nombre: nombresNaturales.primer_nombre,
      segundo_nombre: nombresNaturales.segundo_nombre,
      primer_apellido: nombresNaturales.primer_apellido,
      segundo_apellido: nombresNaturales.segundo_apellido,
      codigo_ciiu: item.codigo_ciiu || "",
      descripcion_ciiu:
        findCiiuLabel(item.codigo_ciiu) || item.descripcion_ciiu || "",
      direccion_domicilio: item.direccion_domicilio || "",
      departamento: departamentoInfo?.name || item.departamento || "",
      departamento_codigo,
      ciudad: ciudadNombre,
      ciudad_codigo,
      email_factura_electronica: item.email_factura_electronica || "",
      nombre_contacto: item.nombre_contacto || "",
      email_contacto: item.email_contacto || "",
      telefono_contacto: item.telefono_contacto || "",
      rep_legal_nombre: item.rep_legal_nombre || "",
      rep_legal_apellidos: item.rep_legal_apellidos || "",
      rep_legal_tipo_doc: item.rep_legal_tipo_doc || "",
      rep_legal_num_doc: item.rep_legal_num_doc || "",
      declara_pep: item.declara_pep || "",
      declara_recursos_publicos: item.declara_recursos_publicos || "",
      declara_obligaciones_tributarias:
        item.declara_obligaciones_tributarias || "",
    });
    setAceptaTerminos(true);
    setFormErrors({});
    if (formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: "smooth" });
    }
    toast.info(
      "Modo de edición activado. Los datos han sido cargados en el formulario."
    );
  };
  */

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    if (name === "fecha_diligenciamiento") {
      return;
    }
    const numericFields = new Set([
      "nit",
      "dv",
      "telefono_contacto",
      "rep_legal_num_doc",
    ]);
    const emailFields = new Set([
      "email_factura_electronica",
      "email_contacto",
    ]);

    const sanitisedValue = numericFields.has(name)
      ? value.replace(/[^0-9]/g, "")
      : value;
    const cleanedValue =
      typeof sanitisedValue === "string"
        ? sanitisedValue.replace(/\s+/g, " ").trim()
        : sanitisedValue;
    const finalValue =
      typeof cleanedValue === "string" && emailFields.has(name)
        ? cleanedValue.toLowerCase()
        : cleanedValue;

    setFormData((prev) => {
      const next = { ...prev, [name]: finalValue };

      if (name === "tipo_regimen") {
        if (finalValue === "persona_juridica") {
          next.tipo_documento = "NIT";
          next.primer_nombre = "";
          next.segundo_nombre = "";
          next.primer_apellido = "";
          next.segundo_apellido = "";
        } else if (finalValue === "persona_natural") {
          if (!next.tipo_documento || next.tipo_documento === "NIT") {
            next.tipo_documento = "Cedula de ciudadanía";
          }
          next.dv = "";
          next.razon_social = "";
          next.nombre_establecimiento = "";
          next.rep_legal_nombre = "";
          next.rep_legal_apellidos = "";
          next.rep_legal_tipo_doc = "";
          next.rep_legal_num_doc = "";
        }
      }

      if (name === "tipo_documento" && finalValue !== "NIT") {
        next.dv = "";
      }

      return next;
    });

    setFormErrors((prev) => {
      if (name === "tipo_regimen") {
        return {
          ...prev,
          tipo_regimen: undefined,
          razon_social: undefined,
          nombre_establecimiento: undefined,
          rep_legal_nombre: undefined,
          rep_legal_apellidos: undefined,
          rep_legal_tipo_doc: undefined,
          rep_legal_num_doc: undefined,
          primer_nombre: undefined,
          segundo_nombre: undefined,
          primer_apellido: undefined,
          segundo_apellido: undefined,
          nombre_contacto: undefined,
        };
      }
      if (name === "tipo_documento") {
        return {
          ...prev,
          tipo_documento: undefined,
          dv: undefined,
        };
      }
      return { ...prev, [name]: undefined };
    });
  };

  const handleCiiuChange = (option) => {
    setFormData((prev) => ({
      ...prev,
      codigo_ciiu: option ? option.value : "",
      descripcion_ciiu: option ? option.label : "",
    }));
    setFormErrors((prev) => ({ ...prev, codigo_ciiu: undefined }));
  };

  const handleDepartmentChange = (option) => {
    setFormData((prev) => ({
      ...prev,
      departamento_codigo: option ? option.value : "",
      departamento: option ? option.name : "",
      ciudad_codigo: "",
      ciudad: "",
    }));
    setFormErrors((prev) => ({
      ...prev,
      departamento: undefined,
      departamento_codigo: undefined,
      ciudad: undefined,
      ciudad_codigo: undefined,
    }));
  };

  const handleCityChange = (option) => {
    setFormData((prev) => ({
      ...prev,
      ciudad_codigo: option ? option.value : "",
      ciudad: option ? option.name : "",
    }));
    setFormErrors((prev) => ({
      ...prev,
      ciudad: undefined,
      ciudad_codigo: undefined,
    }));
  };

  const buildNombreNatural = useCallback(() => {
    const partes = [
      formData.primer_nombre,
      formData.segundo_nombre,
      formData.primer_apellido,
      formData.segundo_apellido,
    ]
      .map((parte) => (parte || "").trim())
      .filter(Boolean);
    return partes.join(" ");
  }, [
    formData.primer_nombre,
    formData.segundo_nombre,
    formData.primer_apellido,
    formData.segundo_apellido,
  ]);

  const buildProviderPayload = useCallback(() => {
    const toNull = (value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return value;
    };

    const nombreNatural = buildNombreNatural();
    const razonSocial = isPersonaJuridica
      ? toNull(formData.razon_social)
      : toNull(nombreNatural) || toNull(formData.razon_social);
    const nombreContacto =
      toNull(formData.nombre_contacto) || toNull(nombreNatural);
    const departamentoValor = formData.departamento
      ? toNull(
          formData.departamento_codigo
            ? `${formData.departamento_codigo} - ${formData.departamento}`
            : formData.departamento
        )
      : null;
    const ciudadValor = formData.ciudad
      ? toNull(
          formData.ciudad_codigo
            ? `${formData.ciudad_codigo} - ${formData.ciudad}`
            : formData.ciudad
        )
      : null;

    return {
      fecha_diligenciamiento: toNull(
        formData.fecha_diligenciamiento || todayIso
      ),
      tipo_regimen: toNull(formData.tipo_regimen),
      tipo_documento: toNull(formData.tipo_documento),
      nit: toNull(formData.nit),
      dv: documentoEsNit ? toNull(formData.dv) : null,
      razon_social: razonSocial,
      nombre_establecimiento: isPersonaJuridica
        ? toNull(formData.nombre_establecimiento)
        : null,
      codigo_ciiu: toNull(formData.codigo_ciiu),
      descripcion_ciiu: toNull(formData.descripcion_ciiu),
      direccion_domicilio: toNull(formData.direccion_domicilio),
      departamento: departamentoValor,
      departamento_codigo: toNull(formData.departamento_codigo),
      ciudad: ciudadValor,
      ciudad_codigo: toNull(formData.ciudad_codigo),
      email_factura_electronica: toNull(formData.email_factura_electronica),
      nombre_contacto: nombreContacto,
      email_contacto: toNull(formData.email_contacto),
      telefono_contacto: toNull(formData.telefono_contacto),
      rep_legal_nombre: isPersonaJuridica
        ? toNull(formData.rep_legal_nombre)
        : null,
      rep_legal_apellidos: isPersonaJuridica
        ? toNull(formData.rep_legal_apellidos)
        : null,
      rep_legal_tipo_doc: isPersonaJuridica
        ? toNull(formData.rep_legal_tipo_doc)
        : null,
      rep_legal_num_doc: isPersonaJuridica
        ? toNull(formData.rep_legal_num_doc)
        : null,
      declara_pep: toNull(formData.declara_pep),
      declara_recursos_publicos: toNull(formData.declara_recursos_publicos),
      declara_obligaciones_tributarias: toNull(
        formData.declara_obligaciones_tributarias
      ),
    };
  }, [
    buildNombreNatural,
    documentoEsNit,
    formData.codigo_ciiu,
    formData.ciudad,
    formData.ciudad_codigo,
    formData.declara_obligaciones_tributarias,
    formData.declara_pep,
    formData.declara_recursos_publicos,
    formData.direccion_domicilio,
    formData.dv,
    formData.email_contacto,
    formData.email_factura_electronica,
    formData.fecha_diligenciamiento,
    formData.descripcion_ciiu,
    formData.departamento_codigo,
    formData.ciudad_codigo,
    formData.nombre_contacto,
    formData.nombre_establecimiento,
    formData.nit,
    formData.razon_social,
    formData.rep_legal_apellidos,
    formData.rep_legal_nombre,
    formData.rep_legal_num_doc,
    formData.rep_legal_tipo_doc,
    formData.telefono_contacto,
    formData.tipo_documento,
    formData.tipo_regimen,
    formData.departamento,
    isPersonaJuridica,
    todayIso,
  ]);

  const validateCompleteForm = useCallback(
    (validarDocumentos = false) => {
      const errors = {};

      // Validar documentos solo si se solicita explícitamente (paso 2)
      if (validarDocumentos) {
        if (!rut) errors.rut = "RUT es requerido.";
        if (!certificacionBancaria)
          errors.certificacionBancaria = "Certificación Bancaria es requerida.";
        if (!docIdentidadRepLegal)
          errors.docIdentidadRepLegal =
            "Copia del documento de identidad del representante legal es requerida.";
        if (!certificadoSagrilaft)
          errors.certificadoSagrilaft =
            "Formato SAGRILAFT firmado por el oficial de cumplimiento es requerido.";
        if (!composicionAccionaria)
          errors.composicionAccionaria = "Composición Accionaria es requerida.";
      }

      const fechaValor = (formData.fecha_diligenciamiento || "").trim();
      if (!fechaValor) {
        errors.fecha_diligenciamiento =
          "La fecha se asigna automáticamente. Recarga el formulario si no aparece.";
      } else {
        const selectedDate = new Date(fechaValor);
        const today = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(selectedDate.getTime())) {
          errors.fecha_diligenciamiento = "La fecha seleccionada no es válida.";
        } else if (selectedDate > today) {
          errors.fecha_diligenciamiento =
            "La fecha no puede ser posterior al día de hoy.";
        }
      }

      if (!formData.tipo_regimen)
        errors.tipo_regimen = "Selecciona el tipo de régimen.";
      if (!formData.tipo_documento)
        errors.tipo_documento = "Selecciona el tipo de documento.";

      const nitValue = (formData.nit || "").trim();
      if (!nitValue) {
        errors.nit = "Ingresa el número de documento.";
      } else if (!DOCUMENT_NUMBER_REGEX.test(nitValue)) {
        errors.nit = "El número de documento debe tener entre 5 y 15 dígitos.";
      }

      if (documentoEsNit) {
        const dvValue = (formData.dv || "").trim();
        if (!dvValue) {
          errors.dv = "Ingresa el dígito de verificación.";
        } else if (!DV_REGEX.test(dvValue)) {
          errors.dv =
            "El dígito de verificación debe ser numérico y de un solo dígito.";
        }
      }

      if (!formData.codigo_ciiu)
        errors.codigo_ciiu = "Selecciona la actividad económica.";

      const direccionValor = (formData.direccion_domicilio || "").trim();
      if (!direccionValor) {
        errors.direccion_domicilio = "Ingresa la dirección del domicilio.";
      } else if (direccionValor.length < 5) {
        errors.direccion_domicilio =
          "La dirección debe tener al menos 5 caracteres.";
      } else if (!ADDRESS_REGEX.test(direccionValor)) {
        errors.direccion_domicilio =
          "La dirección solo puede incluir letras, números y caracteres válidos (#, -, ., /).";
      }

      if (!formData.departamento || !formData.departamento_codigo)
        errors.departamento = "Selecciona el departamento.";
      if (!formData.ciudad || !formData.ciudad_codigo)
        errors.ciudad = "Selecciona la ciudad.";

      const emailFactura = (formData.email_factura_electronica || "").trim();
      if (!emailFactura) {
        errors.email_factura_electronica =
          "Ingresa el correo de factura electrónica.";
      } else if (!EMAIL_REGEX.test(emailFactura)) {
        errors.email_factura_electronica =
          "Correo de factura electrónica inválido.";
      }

      const emailContacto = (formData.email_contacto || "").trim();
      if (!emailContacto) {
        errors.email_contacto = "Ingresa el correo de contacto.";
      } else if (!EMAIL_REGEX.test(emailContacto)) {
        errors.email_contacto = "Correo de contacto inválido.";
      }

      const telefonoValor = (formData.telefono_contacto || "").trim();
      if (!telefonoValor) {
        errors.telefono_contacto = "Ingresa el teléfono de contacto.";
      } else if (!PHONE_REGEX.test(telefonoValor)) {
        errors.telefono_contacto =
          "El teléfono debe tener entre 7 y 15 dígitos.";
      }

      if (isPersonaJuridica) {
        const razonSocialValor = (formData.razon_social || "").trim();
        if (!razonSocialValor) {
          errors.razon_social = "Ingresa la razón social.";
        } else if (razonSocialValor.length < 3) {
          errors.razon_social =
            "La razón social debe tener al menos 3 caracteres.";
        }

        const nombreEstablecimientoValor = (
          formData.nombre_establecimiento || ""
        ).trim();
        if (!nombreEstablecimientoValor) {
          errors.nombre_establecimiento =
            "Ingresa el nombre del establecimiento.";
        } else if (nombreEstablecimientoValor.length < 3) {
          errors.nombre_establecimiento =
            "El nombre del establecimiento debe tener al menos 3 caracteres.";
        }

        const repNombreValor = (formData.rep_legal_nombre || "").trim();
        if (!repNombreValor) {
          errors.rep_legal_nombre =
            "Ingresa el nombre del representante legal.";
        } else if (!NAME_REGEX.test(repNombreValor)) {
          errors.rep_legal_nombre =
            "El nombre del representante legal solo debe contener letras y espacios.";
        }

        const repApellidosValor = (formData.rep_legal_apellidos || "").trim();
        if (!repApellidosValor) {
          errors.rep_legal_apellidos =
            "Ingresa los apellidos del representante legal.";
        } else if (!NAME_REGEX.test(repApellidosValor)) {
          errors.rep_legal_apellidos =
            "Los apellidos del representante legal solo deben contener letras y espacios.";
        }

        if (!formData.rep_legal_tipo_doc)
          errors.rep_legal_tipo_doc =
            "Selecciona el tipo de documento del representante legal.";

        const repDocValor = (formData.rep_legal_num_doc || "").trim();
        if (!repDocValor) {
          errors.rep_legal_num_doc =
            "Ingresa el número de documento del representante legal.";
        } else if (!DOCUMENT_NUMBER_REGEX.test(repDocValor)) {
          errors.rep_legal_num_doc =
            "El documento del representante legal debe tener entre 5 y 15 dígitos.";
        }

        const nombreContactoValor = (formData.nombre_contacto || "").trim();
        if (!nombreContactoValor) {
          errors.nombre_contacto = "Ingresa el nombre de contacto.";
        } else if (!NAME_REGEX.test(nombreContactoValor)) {
          errors.nombre_contacto =
            "El nombre de contacto solo debe contener letras y espacios.";
        }
      }

      if (isPersonaNatural) {
        const primerNombreValor = (formData.primer_nombre || "").trim();
        if (!primerNombreValor) {
          errors.primer_nombre = "Ingresa el primer nombre.";
        } else if (!NAME_REGEX.test(primerNombreValor)) {
          errors.primer_nombre =
            "El primer nombre solo debe contener letras y espacios.";
        }

        const segundoNombreValor = (formData.segundo_nombre || "").trim();
        if (segundoNombreValor && !NAME_REGEX.test(segundoNombreValor)) {
          errors.segundo_nombre =
            "El segundo nombre solo debe contener letras y espacios.";
        }

        const primerApellidoValor = (formData.primer_apellido || "").trim();
        if (!primerApellidoValor) {
          errors.primer_apellido = "Ingresa el primer apellido.";
        } else if (!NAME_REGEX.test(primerApellidoValor)) {
          errors.primer_apellido =
            "El primer apellido solo debe contener letras y espacios.";
        }

        const segundoApellidoValor = (formData.segundo_apellido || "").trim();
        if (segundoApellidoValor && !NAME_REGEX.test(segundoApellidoValor)) {
          errors.segundo_apellido =
            "El segundo apellido solo debe contener letras y espacios.";
        }

        const nombreContactoValor = (formData.nombre_contacto || "").trim();
        if (nombreContactoValor && !NAME_REGEX.test(nombreContactoValor)) {
          errors.nombre_contacto =
            "El nombre de contacto solo debe contener letras y espacios.";
        }
      }

      if (!formData.declara_pep) errors.declara_pep = "Selecciona una opción.";
      if (!formData.declara_recursos_publicos)
        errors.declara_recursos_publicos = "Selecciona una opción.";
      if (!formData.declara_obligaciones_tributarias)
        errors.declara_obligaciones_tributarias = "Selecciona una opción.";

      if (!aceptaTerminos)
        errors.aceptaTerminos = "Debes aceptar el tratamiento de datos.";

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [
      aceptaTerminos,
      certificacionBancaria,
      composicionAccionaria,
      certificadoSagrilaft,
      docIdentidadRepLegal,
      documentoEsNit,
      formData,
      isPersonaJuridica,
      isPersonaNatural,
      rut,
    ]
  );

  // --- ¡handleFormSubmit ACTUALIZADO PARA DOS PASOS! ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (modoPublico) {
      if (tokenVerificando) {
        toast.info(
          "Estamos validando el enlace. Intenta nuevamente en un momento."
        );
        return;
      }
      if (!tokenValido) {
        Swal.fire({
          title: "Enlace no disponible",
          text:
            tokenMensaje ||
            "Este formulario ya no está disponible. Solicita un nuevo enlace.",
          icon: "warning",
          customClass: SWAL_CUSTOM_CLASSES,
        });
        return;
      }
    }

    // PASO 1: Validar datos y avanzar a paso 2 (sin crear en BD)
    if (pasoActual === 1) {
      if (!validateCompleteForm(false)) {
        Swal.fire({
          title: "Campos pendientes",
          text: "Revisa los campos obligatorios marcados en el formulario.",
          icon: "warning",
          customClass: SWAL_CUSTOM_CLASSES,
        });
        return;
      }

      // Solo avanzar al paso 2 sin crear nada en la base de datos
      toast.success(
        "Datos validados correctamente. Ahora adjunta los documentos."
      );
      setPasoActual(2);

      // Scroll al inicio del formulario
      if (formCardRef.current) {
        formCardRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }

    // PASO 2: Crear proveedor completo con datos y documentos
    else if (pasoActual === 2) {
      if (!validateCompleteForm(true)) {
        Swal.fire({
          title: "Documentos pendientes",
          text: "Adjunta todos los documentos obligatorios antes de finalizar.",
          icon: "warning",
          customClass: SWAL_CUSTOM_CLASSES,
        });
        return;
      }

      const razonSocialDisplay = formData.razon_social || buildNombreNatural();
      const confirmResult = await Swal.fire({
        title: "¿Finalizar registro?",
        html: `
          <div style="text-align: left; margin-top: 1rem;">
            <p>Se registrará el proveedor <strong>${razonSocialDisplay}</strong> con NIT/Documento <strong>${
          formData.nit
        }${formData.dv ? `-${formData.dv}` : ""}</strong>.</p>
            <p>Se adjuntarán 5 documentos obligatorios y 1 opcional.</p>
          </div>
        `,
        icon: "question",
        customClass: SWAL_CUSTOM_CLASSES,
        showCancelButton: true,
        confirmButtonText: "✅ Sí, finalizar",
        cancelButtonText: "❌ Cancelar",
      });

      if (!confirmResult.isConfirmed) return;

      setIsSubmitting(true);
      setLoading(true);
      const savingToast = toast.loading(
        "Subiendo documentos y guardando datos..."
      );

      const folderPath = `${FOLDER_BASE}/proveedor_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      try {
        const uploadFileOrKeepUrl = (file, fileName) => {
          if (file instanceof File) {
            return uploadFileToBucket({
              bucket: BUCKET_NAME,
              path: `${folderPath}/${fileName}.${file.name.split(".").pop()}`,
              file,
            });
          }
          return Promise.resolve(file);
        };

        const [
          url_rut,
          url_certificacion_bancaria,
          url_doc_identidad_rep_legal,
          url_certificado_sagrilaft,
          url_composicion_accionaria,
          url_camara_comercio,
        ] = await Promise.all([
          uploadFileOrKeepUrl(rut, "rut"),
          uploadFileOrKeepUrl(certificacionBancaria, "certificacion_bancaria"),
          uploadFileOrKeepUrl(docIdentidadRepLegal, "doc_identidad_rep_legal"),
          uploadFileOrKeepUrl(certificadoSagrilaft, "certificado_sagrilaft"),
          uploadFileOrKeepUrl(composicionAccionaria, "composicion_accionaria"),
          uploadFileOrKeepUrl(camaraComercio, "camara_comercio"),
        ]);

        // Construir payload completo con datos y documentos
        const payload = buildProviderPayload();
        const finalPayload = {
          ...payload,
          url_rut,
          url_camara_comercio,
          url_certificacion_bancaria,
          url_doc_identidad_rep_legal,
          url_certificado_sagrilaft,
          url_composicion_accionaria,
        };

        const payloadForRequest = modoPublico
          ? { ...finalPayload, estado: "pendiente" }
          : finalPayload;

        // Crear proveedor completo
        if (modoPublico) {
          await axios.post(
            `${
              import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
            }/api/trazabilidad/registro-publico/proveedor/${tokenPublico}`,
            payloadForRequest,
            { headers: { "Content-Type": "application/json" } }
          );
        } else {
          await apiTrazabilidad.post(
            "/trazabilidad/proveedores",
            payloadForRequest,
            { headers: { "Content-Type": "application/json" } }
          );
        }

        toast.dismiss(savingToast);

        Swal.fire({
          title: "¡Registro Completo!",
          text: modoPublico
            ? "Tu registro ha sido enviado y está pendiente de aprobación."
            : "Proveedor creado correctamente con todos sus documentos.",
          icon: "success",
          customClass: SWAL_CUSTOM_CLASSES,
          confirmButtonText: "✅ Entendido",
        });

        resetForm();
        if (!modoPublico) {
          fetchHistorial();
        }
      } catch (error) {
        console.error("Error al crear proveedor:", error);
        const errorMsg = parseApiError(error);
        toast.update(savingToast, {
          render: errorMsg,
          type: "error",
          isLoading: false,
          autoClose: 6000,
        });
        Swal.fire({
          icon: "error",
          title: "Error de Registro",
          text: errorMsg,
          customClass: SWAL_CUSTOM_CLASSES,
        });
      } finally {
        setLoading(false);
        setIsSubmitting(false);
      }
    }
  };

  // --- (columns no cambia) ---
  const columns = [
    {
      header: "Creado por",
      key: "profiles",
      sortable: true,
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => (
        <div className="tc-user-cell">
          <FaUser />
          {item.profiles?.nombre || "Usuario desconocido"}
        </div>
      ),
    },
    {
      header: "Fecha Creación",
      key: "created_at",
      sortable: true,
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => format(parseISO(item.created_at), "dd/MM/yyyy hh:mm a"),
    },
    {
      header: "Documentos Adjuntos (Ver)",
      key: "documentos",
      className: "tc-doc-links-cell tc-centered-cell",
      cell: (item) => (
        <div className="tc-doc-list">
          <DocLink url={item.url_rut} label="RUT" onPreview={openPreview} />
          <DocLink
            url={item.url_camara_comercio}
            label="Cámara de Comercio"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_certificacion_bancaria}
            label="Certificación Bancaria"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_doc_identidad_rep_legal}
            label="Doc. ident. representante"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_certificado_sagrilaft}
            label="Cert. SAGRILAFT"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_composicion_accionaria}
            label="Composición Accionaria"
            onPreview={openPreview}
          />
        </div>
      ),
    },
    {
      header: "Acciones",
      key: "acciones",
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => (
        <button
          className="tc-action-btn-edit"
          title="Editar este registro"
          onClick={() => handleCargarParaEditar(item)}
        >
          <FaEdit />
        </button>
      ),
    },
  ];

  const formulario = (
    <form onSubmit={handleFormSubmit} className="tc-form">
      {/* PASO 1: FORMULARIO DE DATOS */}
      {pasoActual === 1 && (
        <>
          <div className="tc-form-separator">
            <span>Información General</span>
          </div>

          <div className="tc-form-grid grid-2-cols">
            <div className="tc-form-group">
              <label htmlFor="fecha_diligenciamiento">
                Fecha de diligenciamiento<span className="required">*</span>
              </label>
              <input
                id="fecha_diligenciamiento"
                name="fecha_diligenciamiento"
                type="date"
                max={todayIso}
                value={formData.fecha_diligenciamiento || ""}
                readOnly
                className={`tc-form-input ${
                  formErrors.fecha_diligenciamiento ? "is-invalid" : ""
                }`}
              />
              <p className="tc-field-helper">
                Esta fecha se asigna automáticamente con el día actual.
              </p>
              {formErrors.fecha_diligenciamiento && (
                <span className="tc-validation-error">
                  {formErrors.fecha_diligenciamiento}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="tipo_regimen">
                Tipo de régimen<span className="required">*</span>
              </label>
              <select
                id="tipo_regimen"
                name="tipo_regimen"
                value={formData.tipo_regimen}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.tipo_regimen ? "is-invalid" : ""
                }`}
              >
                <option value="">Seleccione...</option>
                {TIPO_REGIMEN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.tipo_regimen && (
                <span className="tc-validation-error">
                  {formErrors.tipo_regimen}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="tipo_documento">
                Tipo de documento<span className="required">*</span>
              </label>
              <select
                id="tipo_documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.tipo_documento ? "is-invalid" : ""
                }`}
                disabled={isPersonaJuridica}
              >
                <option value="">Seleccione...</option>
                {DOCUMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.tipo_documento && (
                <span className="tc-validation-error">
                  {formErrors.tipo_documento}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="nit">
                {documentoEsNit ? "Número NIT" : "Número de documento"}
                <span className="required">*</span>
              </label>
              <input
                id="nit"
                name="nit"
                type="text"
                value={formData.nit}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.nit ? "is-invalid" : ""
                }`}
              />
              {formErrors.nit && (
                <span className="tc-validation-error">{formErrors.nit}</span>
              )}
            </div>

            {documentoEsNit && (
              <div className="tc-form-group">
                <label htmlFor="dv">
                  Dígito de verificación<span className="required">*</span>
                </label>
                <input
                  id="dv"
                  name="dv"
                  type="text"
                  maxLength={1}
                  value={formData.dv}
                  onChange={handleFieldChange}
                  className={`tc-form-input ${
                    formErrors.dv ? "is-invalid" : ""
                  }`}
                />
                {formErrors.dv && (
                  <span className="tc-validation-error">{formErrors.dv}</span>
                )}
              </div>
            )}
          </div>

          {isPersonaJuridica && (
            <>
              <div className="tc-form-separator">
                <span>Datos Persona Jurídica</span>
              </div>
              <div className="tc-form-grid grid-2-cols">
                <div className="tc-form-group">
                  <label htmlFor="razon_social">
                    Razón social<span className="required">*</span>
                  </label>
                  <input
                    id="razon_social"
                    name="razon_social"
                    type="text"
                    value={formData.razon_social}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.razon_social ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.razon_social && (
                    <span className="tc-validation-error">
                      {formErrors.razon_social}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="nombre_establecimiento">
                    Nombre comercial<span className="required">*</span>
                  </label>
                  <input
                    id="nombre_establecimiento"
                    name="nombre_establecimiento"
                    type="text"
                    value={formData.nombre_establecimiento}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.nombre_establecimiento ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.nombre_establecimiento && (
                    <span className="tc-validation-error">
                      {formErrors.nombre_establecimiento}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="rep_legal_nombre">
                    Nombre representante legal
                    <span className="required">*</span>
                  </label>
                  <input
                    id="rep_legal_nombre"
                    name="rep_legal_nombre"
                    type="text"
                    value={formData.rep_legal_nombre}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.rep_legal_nombre ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.rep_legal_nombre && (
                    <span className="tc-validation-error">
                      {formErrors.rep_legal_nombre}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="rep_legal_apellidos">
                    Apellidos representante legal
                    <span className="required">*</span>
                  </label>
                  <input
                    id="rep_legal_apellidos"
                    name="rep_legal_apellidos"
                    type="text"
                    value={formData.rep_legal_apellidos}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.rep_legal_apellidos ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.rep_legal_apellidos && (
                    <span className="tc-validation-error">
                      {formErrors.rep_legal_apellidos}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="rep_legal_tipo_doc">
                    Tipo documento representante
                    <span className="required">*</span>
                  </label>
                  <select
                    id="rep_legal_tipo_doc"
                    name="rep_legal_tipo_doc"
                    value={formData.rep_legal_tipo_doc}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.rep_legal_tipo_doc ? "is-invalid" : ""
                    }`}
                  >
                    <option value="">Seleccione...</option>
                    {DOCUMENT_OPTIONS.filter(
                      (option) => option.value !== "NIT"
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.rep_legal_tipo_doc && (
                    <span className="tc-validation-error">
                      {formErrors.rep_legal_tipo_doc}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="rep_legal_num_doc">
                    Número documento representante
                    <span className="required">*</span>
                  </label>
                  <input
                    id="rep_legal_num_doc"
                    name="rep_legal_num_doc"
                    type="text"
                    value={formData.rep_legal_num_doc}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.rep_legal_num_doc ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.rep_legal_num_doc && (
                    <span className="tc-validation-error">
                      {formErrors.rep_legal_num_doc}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {isPersonaNatural && (
            <>
              <div className="tc-form-separator">
                <span>Datos Persona Natural</span>
              </div>
              <div className="tc-form-grid grid-2-cols">
                <div className="tc-form-group">
                  <label htmlFor="primer_nombre">
                    Primer nombre<span className="required">*</span>
                  </label>
                  <input
                    id="primer_nombre"
                    name="primer_nombre"
                    type="text"
                    value={formData.primer_nombre}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.primer_nombre ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.primer_nombre && (
                    <span className="tc-validation-error">
                      {formErrors.primer_nombre}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="segundo_nombre">Segundo nombre</label>
                  <input
                    id="segundo_nombre"
                    name="segundo_nombre"
                    type="text"
                    value={formData.segundo_nombre}
                    onChange={handleFieldChange}
                    className="tc-form-input"
                  />
                </div>

                <div className="tc-form-group">
                  <label htmlFor="primer_apellido">
                    Primer apellido<span className="required">*</span>
                  </label>
                  <input
                    id="primer_apellido"
                    name="primer_apellido"
                    type="text"
                    value={formData.primer_apellido}
                    onChange={handleFieldChange}
                    className={`tc-form-input ${
                      formErrors.primer_apellido ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.primer_apellido && (
                    <span className="tc-validation-error">
                      {formErrors.primer_apellido}
                    </span>
                  )}
                </div>

                <div className="tc-form-group">
                  <label htmlFor="segundo_apellido">Segundo apellido</label>
                  <input
                    id="segundo_apellido"
                    name="segundo_apellido"
                    type="text"
                    value={formData.segundo_apellido}
                    onChange={handleFieldChange}
                    className="tc-form-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="tc-form-separator">
            <span>Actividad Económica y Ubicación</span>
          </div>

          <div className="tc-form-grid grid-2-cols">
            <div className="tc-form-group">
              <label htmlFor="codigo_ciiu">
                Actividad económica (CIIU)<span className="required">*</span>
              </label>
              <SearchableSelect
                id="codigo_ciiu"
                value={formData.codigo_ciiu}
                onChange={handleCiiuChange}
                options={ciiuOptions}
                placeholder="Buscar por código o descripción..."
                isInvalid={Boolean(formErrors.codigo_ciiu)}
              />
              {formData.descripcion_ciiu && (
                <p className="tc-field-helper">{formData.descripcion_ciiu}</p>
              )}
              {formErrors.codigo_ciiu && (
                <span className="tc-validation-error">
                  {formErrors.codigo_ciiu}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="direccion_domicilio">
                Dirección domicilio<span className="required">*</span>
              </label>
              <input
                id="direccion_domicilio"
                name="direccion_domicilio"
                type="text"
                value={formData.direccion_domicilio}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.direccion_domicilio ? "is-invalid" : ""
                }`}
              />
              {formErrors.direccion_domicilio && (
                <span className="tc-validation-error">
                  {formErrors.direccion_domicilio}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="departamento">
                Departamento<span className="required">*</span>
              </label>
              <SearchableSelect
                id="departamento"
                value={formData.departamento_codigo}
                onChange={handleDepartmentChange}
                options={departmentOptions}
                placeholder="Buscar departamento..."
                isInvalid={Boolean(
                  formErrors.departamento || formErrors.departamento_codigo
                )}
              />
              {formErrors.departamento && (
                <span className="tc-validation-error">
                  {formErrors.departamento}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="ciudad">
                Ciudad<span className="required">*</span>
              </label>
              <SearchableSelect
                id="ciudad"
                value={formData.ciudad_codigo}
                onChange={handleCityChange}
                options={selectedDepartment ? cityOptions : []}
                placeholder={
                  selectedDepartment
                    ? "Buscar ciudad..."
                    : "Selecciona un departamento"
                }
                disabled={!selectedDepartment}
                noOptionsText={
                  selectedDepartment
                    ? "Sin coincidencias"
                    : "Selecciona primero un departamento"
                }
                isInvalid={Boolean(
                  formErrors.ciudad || formErrors.ciudad_codigo
                )}
              />
              {formErrors.ciudad && (
                <span className="tc-validation-error">{formErrors.ciudad}</span>
              )}
            </div>
          </div>

          <div className="tc-form-separator">
            <span>Contacto y Notificación</span>
          </div>

          <div className="tc-form-grid grid-2-cols">
            <div className="tc-form-group">
              <label htmlFor="email_factura_electronica">
                Correo factura electrónica<span className="required">*</span>
              </label>
              <input
                id="email_factura_electronica"
                name="email_factura_electronica"
                type="email"
                value={formData.email_factura_electronica}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.email_factura_electronica ? "is-invalid" : ""
                }`}
              />
              {formErrors.email_factura_electronica && (
                <span className="tc-validation-error">
                  {formErrors.email_factura_electronica}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="email_contacto">
                Correo de contacto<span className="required">*</span>
              </label>
              <input
                id="email_contacto"
                name="email_contacto"
                type="email"
                value={formData.email_contacto}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.email_contacto ? "is-invalid" : ""
                }`}
              />
              {formErrors.email_contacto && (
                <span className="tc-validation-error">
                  {formErrors.email_contacto}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="nombre_contacto">
                Nombre de contacto
                {isPersonaJuridica && <span className="required">*</span>}
              </label>
              <input
                id="nombre_contacto"
                name="nombre_contacto"
                type="text"
                value={formData.nombre_contacto}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.nombre_contacto ? "is-invalid" : ""
                }`}
              />
              {formErrors.nombre_contacto && (
                <span className="tc-validation-error">
                  {formErrors.nombre_contacto}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <label htmlFor="telefono_contacto">
                Teléfono de contacto<span className="required">*</span>
              </label>
              <input
                id="telefono_contacto"
                name="telefono_contacto"
                type="tel"
                value={formData.telefono_contacto}
                onChange={handleFieldChange}
                className={`tc-form-input ${
                  formErrors.telefono_contacto ? "is-invalid" : ""
                }`}
              />
              {formErrors.telefono_contacto && (
                <span className="tc-validation-error">
                  {formErrors.telefono_contacto}
                </span>
              )}
            </div>
          </div>

          <div className="tc-form-separator">
            <span>Declaraciones y Tratamiento de Datos</span>
          </div>

          <div className="tc-form-grid grid-2-cols">
            <div className="tc-form-group">
              <p className="tc-radio-label">
                ¿Es PEP o asociado?<span className="required">*</span>
              </p>
              <div
                className={`tc-radio-group ${
                  formErrors.declara_pep ? "has-error" : ""
                }`}
              >
                {RESPUESTA_PREGUNTA.map((option) => {
                  const isSelected = formData.declara_pep === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`tc-radio-option ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="declara_pep"
                        value={option.value}
                        checked={isSelected}
                        onChange={handleFieldChange}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {formErrors.declara_pep && (
                <span className="tc-validation-error">
                  {formErrors.declara_pep}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <p className="tc-radio-label">
                ¿Maneja recursos públicos?<span className="required">*</span>
              </p>
              <div
                className={`tc-radio-group ${
                  formErrors.declara_recursos_publicos ? "has-error" : ""
                }`}
              >
                {RESPUESTA_PREGUNTA.map((option) => {
                  const isSelected =
                    formData.declara_recursos_publicos === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`tc-radio-option ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="declara_recursos_publicos"
                        value={option.value}
                        checked={isSelected}
                        onChange={handleFieldChange}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {formErrors.declara_recursos_publicos && (
                <span className="tc-validation-error">
                  {formErrors.declara_recursos_publicos}
                </span>
              )}
            </div>

            <div className="tc-form-group">
              <p className="tc-radio-label">
                ¿Está al día en obligaciones tributarias?
                <span className="required">*</span>
              </p>
              <div
                className={`tc-radio-group ${
                  formErrors.declara_obligaciones_tributarias ? "has-error" : ""
                }`}
              >
                {RESPUESTA_PREGUNTA.map((option) => {
                  const isSelected =
                    formData.declara_obligaciones_tributarias === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`tc-radio-option ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="declara_obligaciones_tributarias"
                        value={option.value}
                        checked={isSelected}
                        onChange={handleFieldChange}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {formErrors.declara_obligaciones_tributarias && (
                <span className="tc-validation-error">
                  {formErrors.declara_obligaciones_tributarias}
                </span>
              )}
            </div>
          </div>

          <div
            className={`tc-terms-group ${
              formErrors.aceptaTerminos ? "has-error" : ""
            }`}
          >
            <input
              id="aceptaTerminos"
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(event) => {
                setAceptaTerminos(event.target.checked);
                if (event.target.checked) {
                  setFormErrors((prev) => ({
                    ...prev,
                    aceptaTerminos: undefined,
                  }));
                }
              }}
            />
            <div className="tc-terms-text">
              <p className="tc-terms-title">
                Aceptar términos y condiciones de envío de información.
                <span className="tc-terms-links">
                  <Link
                    to="/politicas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tc-terms-link"
                  >
                    Tratamiento de datos
                  </Link>
                  <span className="tc-terms-divider">•</span>
                  <Link
                    to="/declaracion-origen-fondos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tc-terms-link"
                  >
                    Declaraciones legales
                  </Link>
                </span>
              </p>
              <label htmlFor="aceptaTerminos" className="tc-terms-label">
                He leído y estoy de acuerdo con las políticas y lineamientos
                generales de protección de datos personales, SAGRILAFT y las
                declaraciones de origen de fondos, transparencia y gestión de
                riesgos de SUPERMERCADOS MERKAHORRO S.A.S.
              </label>
            </div>
          </div>
          {formErrors.aceptaTerminos && (
            <span className="tc-validation-error">
              {formErrors.aceptaTerminos}
            </span>
          )}

          <div className="tc-form-actions">
            <button
              type="submit"
              className={`tc-submit-btn ${isSubmitting ? "submitting" : ""}`}
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? (
                <FaSpinner className="tc-spinner" />
              ) : (
                <FaUserPlus />
              )}
              {loading || isSubmitting
                ? "Guardando datos..."
                : "Continuar a Documentos →"}
            </button>
          </div>
        </>
      )}

      {/* PASO 2: CARGA DE DOCUMENTOS */}
      {pasoActual === 2 && (
        <>
          <div className="tc-form-separator">
            <span>✅ Datos Validados - Ahora Adjunta los Documentos</span>
          </div>

          <div
            className="tc-info-box"
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "#e7f5ff",
              borderRadius: "8px",
              border: "1px solid #339af0",
            }}
          >
            <p style={{ margin: 0, color: "#1864ab" }}>
              <strong>Proveedor:</strong>{" "}
              {formData.razon_social || buildNombreNatural()} <br />
              <strong>NIT/Documento:</strong> {formData.nit}
              {formData.dv ? `-${formData.dv}` : ""}
            </p>
          </div>

          <div className="tc-form-separator">
            <span>Documentos Requeridos y Opcionales</span>
          </div>

          <div className="tc-form-grid">
            <FileInput
              label="RUT"
              name="rut"
              file={rut}
              setFile={setRut}
              isRequired={true}
            />
            <FileInput
              label="Certificación Bancaria"
              name="certificacion_bancaria"
              file={certificacionBancaria}
              setFile={setCertificacionBancaria}
              isRequired={true}
            />
            <FileInput
              label="Copia documento representante legal"
              name="doc_identidad_rep_legal"
              file={docIdentidadRepLegal}
              setFile={setDocIdentidadRepLegal}
              isRequired={true}
            />
            <FileInput
              label="Formato SAGRILAFT firmado por el oficial de cumplimiento"
              name="certificado_sagrilaft"
              file={certificadoSagrilaft}
              setFile={setCertificadoSagrilaft}
              isRequired={true}
            />
            <FileInput
              label="Composición Accionaria"
              name="composicion_accionaria"
              file={composicionAccionaria}
              setFile={setComposicionAccionaria}
              isRequired={true}
            />
            <FileInput
              label="Cámara de Comercio (Opcional)"
              name="camara_comercio"
              file={camaraComercio}
              setFile={setCamaraComercio}
              isRequired={false}
            />
          </div>

          {(formErrors.rut ||
            formErrors.certificacionBancaria ||
            formErrors.docIdentidadRepLegal ||
            formErrors.certificadoSagrilaft ||
            formErrors.composicionAccionaria) && (
            <div className="tc-error-summary">
              {formErrors.rut && (
                <span className="tc-validation-error">⚠️ {formErrors.rut}</span>
              )}
              {formErrors.certificacionBancaria && (
                <span className="tc-validation-error">
                  ⚠️ {formErrors.certificacionBancaria}
                </span>
              )}
              {formErrors.docIdentidadRepLegal && (
                <span className="tc-validation-error">
                  ⚠️ {formErrors.docIdentidadRepLegal}
                </span>
              )}
              {formErrors.certificadoSagrilaft && (
                <span className="tc-validation-error">
                  ⚠️ {formErrors.certificadoSagrilaft}
                </span>
              )}
              {formErrors.composicionAccionaria && (
                <span className="tc-validation-error">
                  ⚠️ {formErrors.composicionAccionaria}
                </span>
              )}
            </div>
          )}

          <div className="tc-form-actions">
            <button
              type="button"
              className="tc-cancel-btn"
              onClick={() => {
                setPasoActual(1);
                if (formCardRef.current) {
                  formCardRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              disabled={loading || isSubmitting}
            >
              ← Volver a Datos
            </button>
            <button
              type="submit"
              className={`tc-submit-btn ${isSubmitting ? "submitting" : ""}`}
              disabled={
                loading ||
                isSubmitting ||
                !rut ||
                !certificacionBancaria ||
                !docIdentidadRepLegal ||
                !certificadoSagrilaft ||
                !composicionAccionaria
              }
            >
              {loading || isSubmitting ? (
                <FaSpinner className="tc-spinner" />
              ) : (
                <FaUserPlus />
              )}
              {loading || isSubmitting
                ? "Subiendo documentos..."
                : "Finalizar Registro"}
            </button>
          </div>
        </>
      )}
    </form>
  );

  const publicLoadingContent = (
    <div className="tc-public-token-message">
      <FaSpinner className="tc-spinner" />
      <span>Validando enlace. Por favor, espera...</span>
    </div>
  );

  const publicBlockedContent = (
    <div className="tc-public-token-message">
      <FaInfoCircle />
      <span>
        {tokenMensaje ||
          "Este formulario ya no está disponible. Solicita un nuevo enlace."}
      </span>
    </div>
  );

  const formContent = modoPublico
    ? tokenVerificando
      ? publicLoadingContent
      : tokenValido
      ? formulario
      : publicBlockedContent
    : formulario;

  // --- (Renderizado final no cambia) ---
  return (
    <>
      <FilePreviewModal
        isOpen={modalOpen}
        onClose={closePreview}
        fileUrl={previewUrl}
      />
      <TrazabilidadPageLayout
        title={
          pasoActual === 1
            ? "Crear Nuevo Proveedor - Paso 1: Datos Básicos"
            : pasoActual === 2
            ? "Crear Nuevo Proveedor - Paso 2: Documentos"
            : "Crear Nuevo Proveedor (Contabilidad)"
        }
        icon={
          pasoActual === 2 ? (
            <FaFileUpload style={{ fontSize: "1.25em" }} />
          ) : (
            <FaHardHat style={{ fontSize: "1.25em" }} />
          )
        }
        subtitle={
          pasoActual === 1
            ? "Completa los datos básicos del proveedor. Los documentos se adjuntarán en el siguiente paso."
            : pasoActual === 2
            ? "Adjunta todos los documentos requeridos para completar el registro del proveedor."
            : "Adjunta todos los documentos requeridos para la creación y vinculación del proveedor."
        }
        formContent={formContent}
        historialTitle="Historial de Proveedores Creados"
        historialContent={null}
        formCardRef={formCardRef}
        modoPublico={true}
      />
    </>
  );
};

export default CreacionProveedor;
