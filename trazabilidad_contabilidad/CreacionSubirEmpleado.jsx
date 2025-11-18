import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
} from "react-icons/fa";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

// Importaciones locales
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../supabaseClient";
import FilePreviewModal from "./FilePreviewModal";
import "./CreacionSubirEmpleado.css"; // Clases tc-

// CONFIGURACIÓN CENTRALIZADA
const BUCKET_NAME = "documentos_contabilidad";
const FOLDER_BASE = "empleados";
const SWAL_CUSTOM_CLASSES = {
  container: "tc-swal-container",
  title: "tc-swal-title",
  confirmButton: "tc-swal-confirm",
  cancelButton: "tc-swal-cancel",
};

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

const validateEmail = (email) => {
  // (Esta función no cambia)
  if (!email) return "";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase())
    ? ""
    : "Correo electrónico no válido.";
};
const validatePhone = (phone) => {
  // (Esta función no cambia)
  if (!phone) return "";
  const re = /^\d{7,10}$/;
  return re.test(String(phone)) ? "" : "Debe tener entre 7 y 10 dígitos.";
};
// ==================================================================

//==================================================================
// 3. COMPONENTE PRINCIPAL
//==================================================================
const CreacionSubirEmpleado = () => {
  // Detectar si hay token en la URL (modo público)
  const [searchParams] = useSearchParams();
  const tokenPublico = searchParams.get("token");
  const modoPublico = !!tokenPublico;
  const [tokenValido, setTokenValido] = useState(!modoPublico);
  const [tokenVerificando, setTokenVerificando] = useState(modoPublico);
  const [tokenMensaje, setTokenMensaje] = useState("");

  // --- (Estados no cambian) ---
  const [idParaEditar, setIdParaEditar] = useState(null);
  const enModoEdicion = idParaEditar !== null;
  const formCardRef = useRef(null);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedulaInput, setCedulaInput] = useState("");
  const [contacto, setContacto] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [hojaDeVida, setHojaDeVida] = useState(null);
  const [cedulaFile, setCedulaFile] = useState(null);
  const [certificadoBancario, setCertificadoBancario] = useState(null);
  const [habeasData, setHabeasData] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef(null);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const openPreview = (url) => {
    setPreviewUrl(url);
    setModalOpen(true);
  };
  const closePreview = () => {
    setModalOpen(false);
    setPreviewUrl("");
  };

  // --- (fetchHistorial no cambia) ---
  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const { data } = await apiTrazabilidad.get(
        "/trazabilidad/empleados/historial"
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

  // --- (resetForm no cambia) ---
  const resetForm = () => {
    setIdParaEditar(null);
    setNombre("");
    setApellidos("");
    setCedulaInput("");
    setContacto("");
    setCorreo("");
    setDireccion("");
    setHojaDeVida(null);
    setCedulaFile(null);
    setCertificadoBancario(null);
    setHabeasData(null);
    setFormErrors({});

    const inputs = [
      "hoja_de_vida",
      "cedula_file",
      "certificado_bancario",
      "habeas_data",
    ];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = null;
    });
  };

  // --- (handleCargarParaEditar no cambia) ---
  const handleCargarParaEditar = (item) => {
    setIdParaEditar(item.id);
    setNombre(item.nombre || "");
    setApellidos(item.apellidos || "");
    setCedulaInput(item.cedula || "");
    setContacto(item.contacto || "");
    setCorreo(item.correo_electronico || "");
    setDireccion(item.direccion || "");
    setHojaDeVida(item.url_hoja_de_vida || null);
    setCedulaFile(item.url_cedula || null);
    setCertificadoBancario(item.url_certificado_bancario || null);
    setHabeasData(item.url_habeas_data || null);
    setFormErrors({});
    if (formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: "smooth" });
    }
    toast.info(
      "Modo de edición activado. Los datos han sido cargados en el formulario."
    );
  };

  // --- (handleApiSubmit no cambia) ---
  const handleApiSubmit = async (
    payload,
    confirmationDetails,
    successMessage
  ) => {
    if (isSubmitting || loading) {
      toast.warning("Ya se está procesando una solicitud. Por favor, espere.");
      return;
    }

    const confirmResult = await Swal.fire({
      ...confirmationDetails,
      customClass: SWAL_CUSTOM_CLASSES,
      showCancelButton: true,
      confirmButtonText: `✅ Sí, ${enModoEdicion ? "actualizar" : "crear"}`,
      cancelButtonText: "❌ Cancelar",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    setLoading(true);
    const savingToast = toast.loading(
      `${
        enModoEdicion ? "Actualizando" : "Subiendo"
      } archivos y guardando datos...`
    );

    try {
      const safeFolderName =
        `CC${payload.cedula}_${payload.nombre}_${payload.apellidos}`
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .replace(/ /g, "_")
          .toUpperCase();
      const folderPath = `${FOLDER_BASE}/${safeFolderName}`;

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
        url_hoja_de_vida,
        url_cedula,
        url_certificado_bancario,
        url_habeas_data,
      ] = await Promise.all([
        uploadFileOrKeepUrl(hojaDeVida, "hoja_de_vida"),
        uploadFileOrKeepUrl(cedulaFile, "cedula"),
        uploadFileOrKeepUrl(certificadoBancario, "certificado_bancario"),
        uploadFileOrKeepUrl(habeasData, "habeas_data"),
      ]);

      const finalPayload = {
        ...payload,
        url_hoja_de_vida,
        url_cedula,
        url_certificado_bancario,
        url_habeas_data,
      };

      // Modo público: enviar a registro-publico
      if (modoPublico) {
        await axios.post(
          `${
            import.meta.env.VITE_BACKEND_TRAZABILIDAD_URL
          }/api/trazabilidad/registro-publico/empleado/${tokenPublico}`,
          finalPayload,
          { headers: { "Content-Type": "application/json" } }
        );
      }
      // Modo normal: enviar directo a empleados
      else {
        if (enModoEdicion) {
          await apiTrazabilidad.patch(
            `/trazabilidad/empleados/${idParaEditar}`,
            finalPayload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          await apiTrazabilidad.post("/trazabilidad/empleados", finalPayload, {
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // --- ¡CAMBIO! Cierra el toast y muestra el modal de éxito ---
      toast.dismiss(savingToast);

      if (modoPublico) {
        Swal.fire({
          title: "¡Registro Enviado!",
          text: "Tu registro ha sido enviado y está pendiente de aprobación. Serás notificado una vez sea revisado.",
          icon: "success",
          customClass: SWAL_CUSTOM_CLASSES,
          confirmButtonText: "✅ Entendido",
        });
      } else {
        Swal.fire({
          title: enModoEdicion ? "¡Actualizado!" : "¡Creado!",
          text: successMessage,
          icon: "success",
          customClass: SWAL_CUSTOM_CLASSES,
          confirmButtonText: "✅ Entendido",
        });
      }
      // ----------------------------------------------------

      resetForm();
      if (!modoPublico) {
        fetchHistorial();
      }
    } catch (error) {
      console.error(
        `Error al ${enModoEdicion ? "actualizar" : "crear"} empleado:`,
        error
      );
      const errorMsg = parseApiError(error);
      toast.update(savingToast, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 6000,
      });
      Swal.fire({
        icon: "error",
        title: `Error de ${enModoEdicion ? "Actualización" : "Creación"}`,
        text: errorMsg,
        customClass: SWAL_CUSTOM_CLASSES,
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // --- (validateForm no cambia) ---
  useEffect(() => {
    setFormErrors((errors) => ({
      ...errors,
      correo: correo ? validateEmail(correo) : "",
    }));
  }, [correo]);
  useEffect(() => {
    setFormErrors((errors) => ({
      ...errors,
      contacto: contacto ? validatePhone(contacto) : "",
    }));
  }, [contacto]);

  const validateForm = () => {
    const errors = {};
    if (!nombre.trim()) errors.nombre = "Nombre es requerido.";
    if (!apellidos.trim()) errors.apellidos = "Apellidos son requeridos.";
    if (!cedulaInput.trim()) errors.cedulaInput = "Cédula es requerida.";
    if (!hojaDeVida) errors.hojaDeVida = "Hoja de Vida es requerida.";
    if (!cedulaFile) errors.cedulaFile = "Cédula adjunta es requerida.";
    if (!certificadoBancario)
      errors.certificadoBancario = "Certificado bancario es requerido.";
    if (!habeasData) errors.habeasData = "Habeas Data es requerido.";

    const emailError = validateEmail(correo);
    if (correo && emailError) errors.correo = emailError;
    const phoneError = validatePhone(contacto);
    if (contacto && phoneError) errors.contacto = phoneError;

    const validErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, v]) => v)
    );
    setFormErrors(validErrors);
    return Object.keys(validErrors).length === 0;
  };

  // --- ¡handleFormSubmit ACTUALIZADO! ---
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

    if (!validateForm()) {
      Swal.fire({
        title: "Campos Incompletos",
        text: "Por favor, revise los campos obligatorios y los errores marcados en rojo.",
        icon: "warning",
        customClass: SWAL_CUSTOM_CLASSES,
      });
      return;
    }

    const payload = {
      nombre,
      apellidos,
      cedula: cedulaInput,
      contacto,
      correo_electronico: correo,
      direccion,
    };

    const confirmationDetails = {
      title: modoPublico
        ? "¿Confirmar envío de registro?"
        : `¿Confirmar ${
            enModoEdicion ? "actualización" : "creación"
          } del empleado?`,
      html: `<div style="text-align: left; margin-top: 1rem;"><p><strong>Nombre:</strong> ${nombre} ${apellidos}</p><p><strong>Cédula:</strong> ${cedulaInput}</p></div>`,
      icon: "question",
    };

    const successMessage = modoPublico
      ? "Registro enviado para aprobación."
      : enModoEdicion
      ? "Empleado actualizado correctamente."
      : "Empleado creado correctamente.";

    await handleApiSubmit(payload, confirmationDetails, successMessage);
  };

  // --- (columns no cambia) ---
  const columns = [
    {
      header: "Creado Por",
      key: "profiles",
      sortable: true,
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => (
        <div className="tc-user-cell">
          <FaUser />
          {item.profiles?.nombre || "N/A"}
        </div>
      ),
    },
    {
      header: "Fecha Creación",
      key: "created_at",
      sortable: true,
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => format(parseISO(item.created_at), "dd/MM/yy hh:mm a"),
    },
    {
      header: "Nombre Completo",
      key: "nombre",
      sortable: true,
      cell: (item) => `${item.nombre} ${item.apellidos}`,
    },
    {
      header: "Cédula",
      key: "cedula",
      sortable: true,
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => item.cedula || "N/A",
    },
    {
      header: "Correo Electrónico",
      key: "correo_electronico",
      sortable: true,
      cell: (item) => item.correo_electronico || "N/A",
    },
    {
      header: "Contacto",
      key: "contacto",
      centered: true,
      className: "tc-centered-cell",
      cell: (item) => item.contacto || "N/A",
    },
    {
      header: "Documentos (Ver)",
      key: "documentos",
      className: "tc-doc-links-cell tc-centered-cell",
      cell: (item) => (
        <div className="tc-doc-list">
          <DocLink
            url={item.url_hoja_de_vida}
            label="Hoja de Vida"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_cedula}
            label="Cédula"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_certificado_bancario}
            label="Cert. Bancario"
            onPreview={openPreview}
          />
          <DocLink
            url={item.url_habeas_data}
            label="Habeas Data"
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

  // --- (formContent no cambia) ---
  const formulario = (
    <form onSubmit={handleFormSubmit} className="tc-form">
      {/* Campos de Texto */}
      <div className="tc-form-grid">
        {/* Fila 1 */}
        <div className="tc-form-group">
          <label htmlFor="nombre">
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ana"
            required
            className={`tc-form-input ${formErrors.nombre ? "is-invalid" : ""}`}
          />
          {formErrors.nombre && (
            <span className="tc-validation-error">{formErrors.nombre}</span>
          )}
        </div>
        <div className="tc-form-group">
          <label htmlFor="apellidos">
            Apellidos <span className="required">*</span>
          </label>
          <input
            type="text"
            id="apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            placeholder="Ej: Pérez"
            required
            className={`tc-form-input ${
              formErrors.apellidos ? "is-invalid" : ""
            }`}
          />
          {formErrors.apellidos && (
            <span className="tc-validation-error">{formErrors.apellidos}</span>
          )}
        </div>
        <div className="tc-form-group">
          <label htmlFor="cedula_input">
            Cédula (N°) <span className="required">*</span>
          </label>
          <input
            type="text"
            id="cedula_input"
            value={cedulaInput}
            onChange={(e) => setCedulaInput(e.target.value)}
            placeholder="Ej: 10203040"
            required
            className={`tc-form-input ${
              formErrors.cedulaInput ? "is-invalid" : ""
            }`}
          />
          {formErrors.cedulaInput && (
            <span className="tc-validation-error">
              {formErrors.cedulaInput}
            </span>
          )}
        </div>

        {/* Fila 2 */}
        <div className="tc-form-group">
          <label htmlFor="contacto">Contacto (Celular)</label>
          <input
            type="tel"
            id="contacto"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="Ej: 3001234567"
            className={`tc-form-input ${
              formErrors.contacto ? "is-invalid" : ""
            }`}
          />
          {formErrors.contacto && (
            <span className="tc-validation-error">{formErrors.contacto}</span>
          )}
        </div>
        <div className="tc-form-group">
          <label htmlFor="correo">Correo Electrónico</label>
          <input
            type="email"
            id="correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Ej: ana.perez@email.com"
            className={`tc-form-input ${formErrors.correo ? "is-invalid" : ""}`}
          />
          {formErrors.correo && (
            <span className="tc-validation-error">{formErrors.correo}</span>
          )}
        </div>
        <div className="tc-form-group">
          <label htmlFor="direccion">Dirección</label>
          <input
            type="text"
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Calle 50 # 45 - 30"
            className="tc-form-input"
          />
        </div>

        {/* Fila 3 - Códigos */}
      </div>

      {/* Separador */}
      <div className="tc-form-separator">
        <span>Documentos Requeridos</span>
      </div>

      {/* Campos de Archivo */}
      <div
        className="tc-form-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        <FileInput
          label="Hoja de Vida"
          name="hoja_de_vida"
          file={hojaDeVida}
          setFile={setHojaDeVida}
          isRequired={true}
        />
        <FileInput
          label="Cédula Adjunta"
          name="cedula_file"
          file={cedulaFile}
          setFile={setCedulaFile}
          isRequired={true}
        />
        <FileInput
          label="Certificado Bancario"
          name="certificado_bancario"
          file={certificadoBancario}
          setFile={setCertificadoBancario}
          isRequired={true}
        />
        <FileInput
          label="Habeas Data"
          name="habeas_data"
          file={habeasData}
          setFile={setHabeasData}
          isRequired={true}
        />
      </div>

      {/* Errores de validación */}
      {(formErrors.hojaDeVida ||
        formErrors.cedulaFile ||
        formErrors.certificadoBancario ||
        formErrors.habeasData) && (
        <div className="tc-error-summary">
          {formErrors.hojaDeVida && (
            <span className="tc-validation-error">
              ⚠️ {formErrors.hojaDeVida}
            </span>
          )}
          {formErrors.cedulaFile && (
            <span className="tc-validation-error">
              ⚠️ {formErrors.cedulaFile}
            </span>
          )}
          {formErrors.certificadoBancario && (
            <span className="tc-validation-error">
              ⚠️ {formErrors.certificadoBancario}
            </span>
          )}
          {formErrors.habeasData && (
            <span className="tc-validation-error">
              ⚠️ {formErrors.habeasData}
            </span>
          )}
        </div>
      )}

      {/* Botones de Acción */}
      <div className="tc-form-actions">
        {enModoEdicion && (
          <button type="button" className="tc-cancel-btn" onClick={resetForm}>
            Cancelar Edición
          </button>
        )}

        <button
          type="submit"
          className={`tc-submit-btn ${isSubmitting ? "submitting" : ""}`}
          disabled={
            loading ||
            isSubmitting ||
            !hojaDeVida ||
            !cedulaFile ||
            !certificadoBancario ||
            !habeasData
          }
        >
          {loading || isSubmitting ? (
            <FaSpinner className="tc-spinner" />
          ) : enModoEdicion ? (
            <FaEdit />
          ) : (
            <FaUserPlus />
          )}
          {loading || isSubmitting
            ? enModoEdicion
              ? "Actualizando..."
              : "Guardando..."
            : enModoEdicion
            ? "Actualizar Empleado"
            : "Guardar Empleado"}
        </button>
      </div>
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
          enModoEdicion
            ? "Editar Empleado (Contabilidad)"
            : "Crear Nuevo Empleado (Contabilidad)"
        }
        icon={
          enModoEdicion ? (
            <FaEdit style={{ fontSize: "1.25em" }} />
          ) : (
            <FaUserPlus style={{ fontSize: "1.25em" }} />
          )
        }
        subtitle={
          enModoEdicion
            ? `Editando a: ${nombre} ${apellidos} (CC: ${cedulaInput})`
            : "Diligencia los datos y adjunta los documentos requeridos para el ingreso del nuevo empleado."
        }
        formContent={formContent}
        historialTitle="Historial de Creaciones"
        historialContent={
          <HistorialTable
            isLoading={loadingHistorial}
            data={historial}
            columns={columns}
            emptyMessage="No has creado ningún empleado todavía."
          />
        }
        formCardRef={formCardRef}
        modoPublico={modoPublico}
      />
    </>
  );
};

export default CreacionSubirEmpleado;
