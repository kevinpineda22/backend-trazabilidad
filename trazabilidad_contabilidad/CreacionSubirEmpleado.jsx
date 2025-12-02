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
  FaFileSignature,
  FaCheckCircle,
  FaEdit,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import { format } from "date-fns";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

// Importaciones locales
import { apiTrazabilidad } from "../../services/apiTrazabilidad";
import { uploadFileToBucket } from "../../supabaseClient";
import FilePreviewModal from "./FilePreviewModal";
import HabeasDataModal from "./HabeasDataModal";
import "./CreacionSubirEmpleado.css"; // Clases tc-

// CONFIGURACIÓN CENTRALIZADA
const BUCKET_NAME = "documentos_contabilidad";
const FOLDER_BASE = "empleados";
// TODO: Reemplaza esta URL con la URL pública real de tu archivo en Supabase
const URL_PLANTILLA_AUTORIZACION =
  "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/documentos_contabilidad/empleados/ACUERDOFIRMAELECTRONICA.pdf";

const SWAL_CUSTOM_CLASSES = {
  container: "tc-swal-container",
  title: "tc-swal-title",
  confirmButton: "tc-swal-confirm",
  cancelButton: "tc-swal-cancel",
};

const DOCUMENT_OPTIONS = [
  { value: "Cedula de ciudadanía", label: "Cédula de ciudadanía" },
  { value: "Cedula de extranjería", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "NIT", label: "NIT" },
  { value: "PEP", label: "PEP" },
  { value: "PPT", label: "PPT" },
];

const calculateDV = (nit) => {
  if (!nit || isNaN(nit)) return "";
  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  const nitReverse = nit.toString().split("").reverse();

  for (let i = 0; i < nitReverse.length && i < primes.length; i++) {
    sum += parseInt(nitReverse[i]) * primes[i];
  }

  const mod = sum % 11;
  if (mod === 0 || mod === 1) return mod.toString();
  return (11 - mod).toString();
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
    const cleanName = nameToTest.split("?")[0].toLowerCase();
    if (cleanName.endsWith(".pdf"))
      return <FaFilePdf style={{ color: "#E53E3E" }} />;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleanName))
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

  const cleanUrl = url.split("?")[0].toLowerCase();
  const isPdf = cleanUrl.endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanUrl);
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

const TrazabilidadPageLayout = ({
  title,
  icon,
  subtitle,
  formContent,
  formCardRef,
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
  const [tipoDocumento, setTipoDocumento] = useState("Cedula de ciudadanía");
  const [cedulaInput, setCedulaInput] = useState("");
  const [dv, setDv] = useState("");
  const [contacto, setContacto] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [hojaDeVida, setHojaDeVida] = useState(null);
  const [cedulaFile, setCedulaFile] = useState(null);
  const [certificadoBancario, setCertificadoBancario] = useState(null);
  const [habeasData, setHabeasData] = useState(null);
  const [autorizacionFirma, setAutorizacionFirma] = useState(null); // Nuevo estado
  const [habeasModalOpen, setHabeasModalOpen] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [formErrors, setFormErrors] = useState({});
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

  useEffect(() => {
    // Solo cargar historial si NO está en modo público
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

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
    setTipoDocumento("Cedula de ciudadanía");
    setCedulaInput("");
    setDv("");
    setContacto("");
    setCorreo("");
    setDireccion("");
    setHojaDeVida(null);
    setCedulaFile(null);
    setCertificadoBancario(null);
    setHabeasData(null);
    setAutorizacionFirma(null);
    setAceptaTerminos(false);
    setFormErrors({});

    const inputs = [
      "hoja_de_vida",
      "cedula_file",
      "certificado_bancario",
      "autorizacion_firma",
    ];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = null;
    });
  };

  // Helper para convertir dataURL a File
  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSaveHabeasSignature = (dataURL) => {
    // Convertir la firma (imagen base64) a un archivo
    const file = dataURLtoFile(
      dataURL,
      `habeas_data_firmado_${Date.now()}.png`
    );
    setHabeasData(file);
    setFormErrors((prev) => ({ ...prev, habeasData: null }));
  };

  // --- (handleCargarParaEditar no cambia) ---
  const handleCargarParaEditar = (item) => {
    setIdParaEditar(item.id);
    setNombre(item.nombre || "");
    setApellidos(item.apellidos || "");
    setTipoDocumento(item.tipo_documento || "Cedula de ciudadanía");
    setCedulaInput(item.cedula || "");
    setDv(item.dv || "");
    setContacto(item.contacto || "");
    setCorreo(item.correo_electronico || "");
    setDireccion(item.direccion || "");
    setHojaDeVida(item.url_hoja_de_vida || null);
    setCedulaFile(item.url_cedula || null);
    setCertificadoBancario(item.url_certificado_bancario || null);
    setHabeasData(item.url_habeas_data || null);
    setAutorizacionFirma(item.url_autorizacion_firma || null);
    setAceptaTerminos(true); // Si ya existe, asumimos que aceptó
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
      const docPrefix = payload.tipo_documento === "NIT" ? "NIT" : "DOC";
      const safeFolderName =
        `${docPrefix}${payload.cedula}_${payload.nombre}_${payload.apellidos}`
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
        url_autorizacion_firma,
      ] = await Promise.all([
        uploadFileOrKeepUrl(hojaDeVida, "hoja_de_vida"),
        uploadFileOrKeepUrl(cedulaFile, "cedula"),
        uploadFileOrKeepUrl(certificadoBancario, "certificado_bancario"),
        uploadFileOrKeepUrl(habeasData, "habeas_data"),
        uploadFileOrKeepUrl(autorizacionFirma, "autorizacion_firma"),
      ]);

      const finalPayload = {
        ...payload,
        url_hoja_de_vida,
        url_cedula,
        url_certificado_bancario,
        url_habeas_data,
        url_autorizacion_firma,
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
    if (!tipoDocumento)
      errors.tipoDocumento = "Tipo de documento es requerido.";
    if (!cedulaInput.trim())
      errors.cedulaInput = "Número de documento es requerido.";
    if (tipoDocumento === "NIT" && !dv)
      errors.dv = "Dígito de verificación es requerido.";

    if (!hojaDeVida) errors.hojaDeVida = "Hoja de Vida es requerida.";
    if (!cedulaFile) errors.cedulaFile = "Documento adjunto es requerido.";
    if (!certificadoBancario)
      errors.certificadoBancario = "Certificado bancario es requerido.";
    if (!habeasData) errors.habeasData = "Habeas Data es requerido.";
    if (!autorizacionFirma)
      errors.autorizacionFirma = "Autorización de firma es requerida.";
    if (!aceptaTerminos)
      errors.aceptaTerminos = "Debes aceptar el tratamiento de datos.";

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
      tipo_documento: tipoDocumento,
      cedula: cedulaInput,
      dv: tipoDocumento === "NIT" ? dv : null,
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
      html: `<div style="text-align: left; margin-top: 1rem;"><p><strong>Nombre:</strong> ${nombre} ${apellidos}</p><p><strong>Documento:</strong> ${tipoDocumento} ${cedulaInput}${
        dv ? `-${dv}` : ""
      }</p></div>`,
      icon: "question",
    };

    const successMessage = modoPublico
      ? "Registro enviado para aprobación."
      : enModoEdicion
      ? "Empleado actualizado correctamente."
      : "Empleado creado correctamente.";

    await handleApiSubmit(payload, confirmationDetails, successMessage);
  };

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
          <label htmlFor="tipo_documento">
            Tipo de Documento <span className="required">*</span>
          </label>
          <select
            id="tipo_documento"
            value={tipoDocumento}
            onChange={(e) => {
              setTipoDocumento(e.target.value);
              if (e.target.value === "NIT") {
                setDv(calculateDV(cedulaInput));
              } else {
                setDv("");
              }
            }}
            className={`tc-form-input ${
              formErrors.tipoDocumento ? "is-invalid" : ""
            }`}
          >
            {DOCUMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {formErrors.tipoDocumento && (
            <span className="tc-validation-error">
              {formErrors.tipoDocumento}
            </span>
          )}
        </div>

        <div className="tc-form-group">
          <label htmlFor="cedula_input">
            Número de Documento <span className="required">*</span>
          </label>
          <input
            type="text"
            id="cedula_input"
            value={cedulaInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setCedulaInput(val);
              if (tipoDocumento === "NIT") {
                setDv(calculateDV(val));
              }
            }}
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

        {tipoDocumento === "NIT" && (
          <div className="tc-form-group">
            <label htmlFor="dv">
              DV <span className="required">*</span>
            </label>
            <input
              type="text"
              id="dv"
              value={dv}
              readOnly
              className={`tc-form-input ${formErrors.dv ? "is-invalid" : ""}`}
              style={{ backgroundColor: "#f0f0f0" }}
            />
            {formErrors.dv && (
              <span className="tc-validation-error">{formErrors.dv}</span>
            )}
          </div>
        )}

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
          label="Documento de Identidad Adjunto"
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

        {/* Campo Especial para Habeas Data */}
        <div
          className={`tc-form-group ${habeasData ? "tc-file-selected" : ""}`}
        >
          <label>
            Habeas Data y Autorización <span className="required">*</span>
          </label>
          <div className="tc-file-input-wrapper">
            {!habeasData ? (
              <button
                type="button"
                className="tc-file-label"
                onClick={() => setHabeasModalOpen(true)}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                }}
              >
                <FaFileSignature /> <span>Leer y Firmar Documento</span>
              </button>
            ) : (
              <div className="tc-file-preview tc-file-new">
                <FaCheckCircle style={{ color: "#38A169" }} />
                <span className="tc-file-name">Documento Firmado</span>
                <button
                  type="button"
                  onClick={() => setHabeasModalOpen(true)}
                  className="tc-file-change-btn"
                  title="Volver a firmar"
                  style={{ marginRight: "10px" }}
                >
                  Ver/Firmar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHabeasData(null);
                  }}
                  className="tc-file-remove-btn"
                  title="Quitar firma"
                >
                  <FaTimesCircle />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Campo Especial para Autorización de Firma */}
        <div className="tc-form-group" style={{ gridColumn: "1 / -1" }}>
          <label>
            Autorización de Firma <span className="required">*</span>
          </label>
          <div
            className="tc-instruction-box"
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Instrucciones:</strong>
            </p>
            <ol style={{ marginLeft: "1.5rem", marginBottom: "1rem" }}>
              <li>Descarga el formato de autorización.</li>
              <li>Imprímelo y fírmalo físicamente.</li>
              <li>Escanea el documento firmado.</li>
              <li>Sube el archivo escaneado en el campo de abajo.</li>
            </ol>
            <button
              type="button"
              onClick={() => openPreview(URL_PLANTILLA_AUTORIZACION)}
              className="tc-download-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#3182ce",
                color: "white",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <FaFilePdf /> Visualizar y Descargar Formato
            </button>
          </div>
          <FileInput
            label="Subir Autorización Firmada"
            name="autorizacion_firma"
            file={autorizacionFirma}
            setFile={setAutorizacionFirma}
            isRequired={true}
          />
        </div>
      </div>

      {/* Errores de validación */}
      {(formErrors.hojaDeVida ||
        formErrors.cedulaFile ||
        formErrors.certificadoBancario ||
        formErrors.habeasData ||
        formErrors.autorizacionFirma) && (
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
          {formErrors.autorizacionFirma && (
            <span className="tc-validation-error">
              ⚠️ {formErrors.autorizacionFirma}
            </span>
          )}
        </div>
      )}

      <div
        className={`tc-terms-group ${
          formErrors.aceptaTerminos ? "has-error" : ""
        }`}
        style={{ marginTop: "2rem" }}
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
        <span className="tc-validation-error">{formErrors.aceptaTerminos}</span>
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
            !habeasData ||
            !autorizacionFirma
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
      <HabeasDataModal
        isOpen={habeasModalOpen}
        onClose={() => setHabeasModalOpen(false)}
        onSave={handleSaveHabeasSignature}
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
        formCardRef={formCardRef}
        modoPublico={modoPublico}
      />
    </>
  );
};

export default CreacionSubirEmpleado;
