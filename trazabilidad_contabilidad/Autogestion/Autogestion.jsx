import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  User,
  Home,
  Users,
  Briefcase,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  X,
  Download,
  Loader2,
  AlertCircle,
  Building,
  Heart,
  FileSignature,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Weight,
  MapPin,
  Map,
  Flag,
  HelpCircle,
} from "lucide-react";

// --- SERVICES & COMPONENTS ---
import { getAssetUrl } from "../../config/storage";
import { apiTrazabilidad } from "../../services/apiTrazabilidad.js";
import { uploadFileToBucket } from "../../supabaseClient.js";
import HabeasDataModal from "../trazabilidad_contabilidad/HabeasDataModal.jsx";

// --- STYLES ---
import "./Autogestion.css";

// --- HELPERS ---
const base64ToFile = (dataurl, filename) => {
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

// --- CONSTANTS ---
const URL_PLANTILLA_AUTORIZACION =
  "https://pitpougbnibmfrjykzet.supabase.co/storage/v1/object/public/documentos_contabilidad/empleados/ACUERDOFIRMAELECTRONICA.pdf";

const letterPattern = {
  value: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/,
  message: "Solo se permiten letras y espacios",
};

// Diccionario para traducir errores técnicos a lenguaje humano
const FIELD_LABELS = {
  // Paso 1
  empresa: "Empresa",
  nombres: "Nombres",
  apellidos: "Apellidos",
  tipoDocumento: "Tipo de Documento",
  numeroDocumento: "Número de Documento",
  celular: "Celular",
  correo: "Correo Electrónico",
  fechaNacimiento: "Fecha de Nacimiento",
  ciudadNacimiento: "Ciudad de Nacimiento",
  edad: "Edad",
  peso: "Peso",
  estatura: "Estatura",
  tallaCamisa: "Talla Camisa",
  tallaPantalon: "Talla Pantalón",
  tallaZapato: "Talla Zapato",

  // Paso 2
  direccion: "Dirección",
  barrio: "Barrio",
  municipioResidencia: "Municipio",
  estrato: "Estrato",
  zona: "Zona",
  tipoVivienda: "Tipo de Vivienda",
  caracteristicasVivienda: "Características Vivienda",
  paisOrigen: "País de Origen",

  // Paso 3
  genero: "Género",
  grupoEtnico: "Grupo Étnico",
  estadoCivil: "Estado Civil",
  gradoEscolaridad: "Grado de Escolaridad",
  poblacionMovilidad: "Población Movilidad",
  grupoReligioso: "Grupo Religioso",

  // Paso 4
  eps: "EPS",
  fondoPension: "Fondo de Pensión",
  tipoContrato: "Tipo de Contrato",
  antiguedad: "Antigüedad",
  sede: "Sede",
  cargoOperativo: "Cargo Operativo",
  fechaIngresoEmpresa: "Fecha de Ingreso",
  departamentoOperaciones: "Dpto. Operaciones",
  departamentoFinanciero: "Dpto. Financiero",
  departamentoComercial: "Dpto. Comercial",
  departamentoGestionHumana: "Dpto. Gestión Humana",
  soloGerencia: "Gerencia",

  // Paso 5
  grupoSanguineo: "Grupo Sanguíneo",
  dependientesEconomicos: "Personas a Cargo",
  embarazo: "Estado de Embarazo",
  sufreEnfermedad: "¿Sufre Enfermedad?",
  descripcionEnfermedad: "Descripción de Enfermedad",
  tieneHijos: "¿Tiene Hijos?",
  cuantosHijos: "Cantidad de Hijos",
  nombresHijos: "Nombres de Hijos",
  contactoNombres: "Nombre Contacto Emergencia",
  contactoCelular: "Celular Contacto",
  parentescoContacto: "Parentesco Contacto",
  contactoDireccion: "Dirección Contacto",
  contacto2Nombres: "Nombre 2do Contacto",
  contacto2Celular: "Celular 2do Contacto",
  contacto2Parentesco: "Parentesco 2do Contacto",
  contacto2Direccion: "Dirección 2do Contacto",

  // Paso 6
  aceptaTerminos: "Aceptar Términos",
};

const STEPS = [
  { title: "Personal", icon: <User size={18} /> },
  { title: "Ubicación", icon: <Home size={18} /> },
  { title: "Demográficos", icon: <Users size={18} /> },
  { title: "Laboral", icon: <Briefcase size={18} /> },
  { title: "Salud/Familia", icon: <Heart size={18} /> },
  { title: "Documentos", icon: <FileText size={18} /> },
];

const Autogestion = () => {
  const [searchParams] = useSearchParams();
  const tokenPublico = searchParams.get("token");

  // --- COMPONENT: Tooltip ---
  const InfoTooltip = ({ text }) => (
    <div className="ag-tooltip-container">
      <HelpCircle size={15} className="ag-tooltip-icon" />
      <span className="ag-tooltip-text">{text}</span>
    </div>
  );

  // --- STATE: AUTH & SECURITY ---
  const [tokenValido, setTokenValido] = useState(false);
  const [tokenVerificando, setTokenVerificando] = useState(true);
  const [tokenMensaje, setTokenMensaje] = useState("");

  // --- STATE: FILES ---
  const [hojaDeVida, setHojaDeVida] = useState(null);
  const [cedulaFile, setCedulaFile] = useState(null);
  const [certificadoBancario, setCertificadoBancario] = useState(null);
  const [habeasData, setHabeasData] = useState(null);
  const [autorizacionFirma, setAutorizacionFirma] = useState(null);

  // --- STATE: UI ---
  const [showHabeasModal, setShowHabeasModal] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      empresa: "",
      nombres: "",
      apellidos: "",
      tipoDocumento: "",
      numeroDocumento: "",
      celular: "",
      correo: "",
      fechaNacimiento: "",
      ciudadNacimiento: "",
      dv: "",
      edad: "",
      peso: "",
      estatura: "",
      tallaCamisa: "",
      tallaPantalon: "",
      tallaZapato: "",
      tipoVivienda: "",
      caracteristicasVivienda: "",
      estrato: "",
      zona: "",
      paisOrigen: "COLOMBIA",
      municipioResidencia: "",
      barrio: "",
      direccion: "",
      genero: "",
      grupoEtnico: "",
      poblacionMovilidad: "NO",
      grupoReligioso: "",
      eps: "",
      fondoPension: "",
      gradoEscolaridad: "",
      estadoCivil: "",
      tipoContrato: "",
      antiguedad: "",
      sede: "",
      cargoOperativo: "",
      fechaIngresoEmpresa: "",
      departamentoOperaciones: "",
      departamentoFinanciero: "",
      departamentoComercial: "",
      departamentoGestionHumana: "",
      soloGerencia: "",
      grupoSanguineo: "",
      dependientesEconomicos: "0",
      embarazo: "NO",
      sufreEnfermedad: "NO",
      descripcionEnfermedad: "",
      tieneHijos: "NO",
      cuantosHijos: "0",
      nombresHijos: "",
      edadesHijos: "",
      gradoEscolaridadHijos: "",
      contactoNombres: "",
      contactoCelular: "",
      parentescoContacto: "",
      contactoDireccion: "",
      contacto2Nombres: "",
      contacto2Celular: "",
      contacto2Parentesco: "",
      contacto2Direccion: "",
      aceptaTerminos: false,
    },
  });

  // --- WATCHERS ---
  const tipoDocumento = watch("tipoDocumento");
  const sufreEnfermedad = watch("sufreEnfermedad");
  const tieneHijos = watch("tieneHijos");

  // --- EFFECT: TOKEN VALIDATION ---
  useEffect(() => {
    if (!tokenPublico) {
      setTokenValido(false);
      setTokenVerificando(false);
      setTokenMensaje(
        "Acceso restringido. Se requiere un enlace válido para ingresar.",
      );
      return;
    }

    let isMounted = true;
    const validarToken = async () => {
      setTokenVerificando(true);
      try {
        const { data } = await apiTrazabilidad.get(
          `/trazabilidad/tokens/validar/${tokenPublico}`,
        );
        if (isMounted) {
          if (data?.valido) {
            setTokenValido(true);
            setTokenMensaje("");
          } else {
            setTokenValido(false);
            setTokenMensaje(data?.message || "Enlace caducado o inválido.");
          }
        }
      } catch (error) {
        if (isMounted) {
          setTokenValido(false);
          setTokenMensaje(
            "Error al validar el enlace. Contacte al administrador.",
          );
        }
      } finally {
        if (isMounted) setTokenVerificando(false);
      }
    };

    validarToken();
    return () => {
      isMounted = false;
    };
  }, [tokenPublico]);

  // --- EFFECT: LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("ag_form_data");
      const savedStep = localStorage.getItem("ag_step");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Solo restaurar si tiene los campos básicos esperados
          if (parsed && parsed.empresa !== undefined) {
            reset(parsed);
          }
        } catch (e) {
          console.error("Error cargando datos guardados, limpiando...", e);
          localStorage.removeItem("ag_form_data");
        }
      }
      if (savedStep) setStep(Number(savedStep));
    } catch {
      // localStorage no disponible (modo privado/incognito)
    }
  }, [reset]);

  useEffect(() => {
    const subscription = watch((value) => {
      try {
        localStorage.setItem("ag_form_data", JSON.stringify(value));
      } catch {
        // localStorage no disponible o sin espacio — el formulario sigue funcionando
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    try {
      localStorage.setItem("ag_step", step);
    } catch {
      // localStorage no disponible
    }
  }, [step]);

  useEffect(() => {
    if (tipoDocumento !== "NIT") setValue("dv", "");
  }, [tipoDocumento, setValue]);

  // --- HANDLERS ---
  // Wrapper de register() que convierte a mayúsculas sin romper react-hook-form
  // (evita problemas de escritura en dispositivos móviles)
  const registerUpper = (name, options) => {
    const { onChange, ...rest } = register(name, options);
    return {
      ...rest,
      onChange: (e) => {
        e.target.value = e.target.value.toUpperCase();
        return onChange(e);
      },
    };
  };

  const handleSignatureSave = (dataUrl) => {
    const file = base64ToFile(dataUrl, "habeas_data_firmado.png");
    setHabeasData(file);
    setShowHabeasModal(false);
    toast.success("Habeas Data firmado correctamente");
  };

  // --- NAVIGATION LOGIC ---
  const getFieldsForStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return [
          "empresa",
          "nombres",
          "apellidos",
          "tipoDocumento",
          "numeroDocumento",
          "celular",
          "correo",
          "fechaNacimiento",
          "ciudadNacimiento",
          "edad",
          "peso",
          "estatura",
          "tallaCamisa",
          "tallaPantalon",
          "tallaZapato",
        ];
      case 2:
        return [
          "direccion",
          "barrio",
          "municipioResidencia",
          "estrato",
          "zona",
          "tipoVivienda",
          "caracteristicasVivienda",
          "paisOrigen",
        ];
      case 3:
        return [
          "genero",
          "grupoEtnico",
          "estadoCivil",
          "gradoEscolaridad",
          "poblacionMovilidad",
          "grupoReligioso",
        ];
      case 4:
        return ["eps", "fondoPension", "tipoContrato", "antiguedad"];
      case 5:
        return [
          "grupoSanguineo",
          "dependientesEconomicos",
          "embarazo",
          "sufreEnfermedad",
          "descripcionEnfermedad",
          "tieneHijos",
          "cuantosHijos",
          "nombresHijos",
          "edadesHijos",
          "gradoEscolaridadHijos",
          "contactoNombres",
          "contactoCelular",
          "parentescoContacto",
          "contactoDireccion",
          "contacto2Nombres",
          "contacto2Celular",
          "contacto2Parentesco",
          "contacto2Direccion",
        ];
      default:
        return [];
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const currentErrors = Object.keys(errors).filter((field) =>
        fieldsToValidate.includes(field),
      );

      if (currentErrors.length > 0) {
        const missingFields = currentErrors.map(
          (field) => FIELD_LABELS[field] || field,
        );
        const messageList = missingFields.map((f) => `<li>${f}</li>`).join("");

        Swal.fire({
          title: "Datos Faltantes",
          html: `Por favor completa los siguientes campos obligatorios:<br/><ul style="text-align: left; margin-top: 10px; color: #ef4444; padding-left: 20px;">${messageList}</ul>`,
          icon: "warning",
          confirmButtonText: "Entendido",
          confirmButtonColor: "var(--ag-primary)",
        });
      } else {
        toast.error(
          "Por favor revisa el formulario, hay campos obligatorios sin completar.",
        );
      }
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --------------------------------------------------------------------------
  // LOGICA DE ENVÍO ADAPTADA AL BACKEND
  // --------------------------------------------------------------------------
  const onSubmit = async (data) => {
    // 1. Validaciones
    if (
      !hojaDeVida ||
      !cedulaFile ||
      !certificadoBancario ||
      !habeasData ||
      !autorizacionFirma
    ) {
      Swal.fire(
        "Documentos Faltantes",
        "Por favor adjunta todos los documentos requeridos (Solo PDF).",
        "warning",
      );
      return;
    }

    if (!data.aceptaTerminos) {
      Swal.fire(
        "Términos",
        "Debes aceptar la declaración de veracidad.",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading(
      "Guardando información en todos los sistemas...",
    );

    try {
      // 2. Subir Archivos a Supabase (uno por uno para detectar errores)
      const folderName = `AUTOGESTION_${data.numeroDocumento}_${Date.now()}`;
      const bucket = "documentos_contabilidad";
      const folderPath = `empleados/${folderName}`;

      const uploadSingle = async (file, name, label) => {
        try {
          const ext = file.name.split(".").pop();
          const url = await uploadFileToBucket({
            bucket,
            path: `${folderPath}/${name}.${ext}`,
            file,
          });
          if (!url) throw new Error("URL vacía");
          return url;
        } catch (err) {
          console.error(`❌ Error subiendo ${label}:`, err);
          throw new Error(`No se pudo subir "${label}". Verifica tu conexión e intenta de nuevo.`);
        }
      };

      toast.dismiss(loadToast);
      const loadToast2 = toast.loading("Subiendo documentos...");

      let urlHv, urlCedula, urlBanco, urlHabeas, urlFirma;
      try {
        [urlHv, urlCedula, urlBanco, urlHabeas, urlFirma] = await Promise.all([
          uploadSingle(hojaDeVida, "hoja_de_vida", "Hoja de Vida"),
          uploadSingle(cedulaFile, "cedula", "Cédula"),
          uploadSingle(certificadoBancario, "certificado_bancario", "Certificado Bancario"),
          uploadSingle(habeasData, "habeas_data", "Habeas Data"),
          uploadSingle(autorizacionFirma, "autorizacion_firma", "Autorización Firma"),
        ]);
      } catch (uploadErr) {
        toast.dismiss(loadToast2);
        Swal.fire("Error al subir documentos", uploadErr.message, "error");
        return;
      }

      toast.dismiss(loadToast2);
      const loadToast3 = toast.loading("Guardando información...");

      // 3. ENVIAR A SOCIODEMOGRÁFICO (Adaptado a tus formRoutes)
      try {
        // Lógica de Endpoint basada en tus archivos formRoutes.js
        let endpointSuffix = "";
        const empresaNormalizada = data.empresa.toUpperCase();

        if (empresaNormalizada === "MERKAHORRO") {
          endpointSuffix = "merkahorro";
        } else if (empresaNormalizada === "CONSTRUAHORRO") {
          endpointSuffix = "construahorro";
        } else if (empresaNormalizada === "MEGAMAYORISTA") {
          endpointSuffix = "megamayoristas";
        } else {
          throw new Error("Empresa no válida seleccionada");
        }

        // Construcción manual del objeto para evitar enviar campos basura
        const payloadSocio = {
          nombresApellidos: `${data.nombres} ${data.apellidos}`.trim(),
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento,
          celular: data.celular,
          correo: data.correo,
          fechaNacimiento: data.fechaNacimiento,
          ciudadNacimiento: data.ciudadNacimiento,
          edad: data.edad,
          peso: data.peso,
          estatura: data.estatura,
          tallaCamisa: data.tallaCamisa || "",
          tallaPantalon: data.tallaPantalon || "",
          tallaZapato: data.tallaZapato || "",

          tipoVivienda: data.tipoVivienda,
          caracteristicasVivienda: data.caracteristicasVivienda,
          estrato: data.estrato,
          zona: data.zona,
          paisOrigen: data.paisOrigen,
          municipioResidencia: data.municipioResidencia,
          barrio: data.barrio,
          direccion: data.direccion,

          genero: data.genero,
          grupoEtnico: data.grupoEtnico,
          poblacionMovilidad: data.poblacionMovilidad,
          grupoReligioso: data.grupoReligioso,

          eps: data.eps,
          fondoPension: data.fondoPension,
          gradoEscolaridad: data.gradoEscolaridad,
          estadoCivil: data.estadoCivil,
          tipoContrato: data.tipoContrato || "TERMINO FIJO",

          // --- CAMPOS PENDIENTES (Lógica del negocio) ---
          sede: "PENDIENTE",
          cargoOperativo: "PENDIENTE",
          fechaIngresoEmpresa: null,

          // Campos Administrativos (Si están vacíos, enviar "NO APLICA")
          departamentoOperaciones: data.departamentoOperaciones || "NO APLICA",
          departamentoFinanciero: data.departamentoFinanciero || "NO APLICA",
          departamentoComercial: data.departamentoComercial || "NO APLICA",
          departamentoGestionHumana:
            data.departamentoGestionHumana || "NO APLICA",
          soloGerencia: data.soloGerencia || "NO APLICA",

          antiguedad: data.antiguedad,
          grupoSanguineo: data.grupoSanguineo,
          dependientesEconomicos: data.dependientesEconomicos,
          embarazo: data.embarazo,
          sufreEnfermedad: data.sufreEnfermedad,
          descripcionEnfermedad: data.descripcionEnfermedad || "",
          tieneHijos: data.tieneHijos,
          cuantosHijos: data.cuantosHijos,
          nombresHijos: data.nombresHijos || "",
          edadesHijos: data.edadesHijos || "",
          gradoEscolaridadHijos: data.gradoEscolaridadHijos || "",

          contactoNombres: data.contactoNombres,
          contactoCelular: data.contactoCelular,
          parentescoContacto: data.parentescoContacto,
          contactoDireccion: data.contactoDireccion || "",
          contacto2Nombres: data.contacto2Nombres || "",
          contacto2Celular: data.contacto2Celular || "",
          contacto2Parentesco: data.contacto2Parentesco || "",
          contacto2Direccion: data.contacto2Direccion || "",

          fechaDiligenciamiento: new Date().toISOString().split("T")[0],
        };

        console.log(
          `Enviando a Sociodemográfico (${endpointSuffix}):`,
          payloadSocio,
        );

        const responseSocio = await fetch(
          `https://backend-formulario-ruby.vercel.app/api/form/save/${endpointSuffix}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadSocio),
          },
        );

        // Validar respuesta del backend
        if (!responseSocio.ok) {
          const errorText = await responseSocio.text();
          throw new Error(
            `Respuesta Servidor: ${responseSocio.status} ${errorText}`,
          );
        }

        console.log("✅ Datos guardados en Sociodemográfico correctamente.");
      } catch (errSocio) {
        console.error("❌ Error enviando a Sociodemográfico:", errSocio);
        // No lanzamos error para permitir que el proceso siga hacia Trazabilidad
      }

      // 4. ENVIAR A TRAZABILIDAD (Panel de Aprobaciones)
      const payloadTrazabilidad = {
        empresa: data.empresa,
        nombre: data.nombres,
        apellidos: data.apellidos,
        tipo_documento: data.tipoDocumento,
        cedula: data.numeroDocumento,
        dv: data.dv || null,
        contacto: data.celular,
        correo_electronico: data.correo,
        direccion: data.direccion,
        talla_camisa: data.tallaCamisa || null,
        talla_pantalon: data.tallaPantalon || null,
        talla_zapato: data.tallaZapato || null,
        barrio: data.barrio || null,
        municipio: data.municipioResidencia || null,

        // Estado inicial para el panel
        cargo: "PENDIENTE_APROBACION",
        sede_contrato: "PENDIENTE_APROBACION",

        url_hoja_de_vida: urlHv,
        url_cedula: urlCedula,
        url_certificado_bancario: urlBanco,
        url_habeas_data: urlHabeas,
        url_autorizacion_firma: urlFirma,
      };

      const endpoint = tokenPublico
        ? `/trazabilidad/registro-publico/empleado/${tokenPublico}`
        : "/trazabilidad/empleados";

      await apiTrazabilidad.post(endpoint, payloadTrazabilidad);

      // Limpieza y Redirección
      try {
        localStorage.removeItem("ag_form_data");
        localStorage.removeItem("ag_step");
      } catch {
        // localStorage no disponible
      }
      toast.dismiss(loadToast3);

      Swal.fire({
        title: "¡Registro Exitoso!",
        text: "Tu información ha sido enviada a Gestión Humana correctamente.",
        icon: "success",
        confirmButtonText: "Finalizar",
      }).then(() => {
        window.location.reload();
      });
    } catch (error) {
      console.error("❌ Error en el registro:", error);
      toast.dismiss();
      const mensaje =
        error?.response?.data?.message ||
        error?.message ||
        "Hubo un problema al guardar tu información. Intenta nuevamente.";
      Swal.fire("Error", mensaje, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COMPONENT: File Upload Field (PDF STRICT MODE) ---
  const FileUploadField = ({
    label,
    fileState,
    setFileState,
    required = true,
  }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validar PDF: verificar MIME type O extensión del archivo
        // (en móviles el MIME type puede ser incorrecto para PDFs válidos)
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          Swal.fire(
            "Formato Incorrecto",
            "Este sistema solo permite archivos PDF.",
            "error",
          );
          e.target.value = null;
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire(
            "Archivo muy pesado",
            "El archivo no debe superar los 5MB",
            "error",
          );
          e.target.value = null;
          return;
        }
        setFileState(file);
      }
    };

    return (
      <div
        className={`ag-form-group ${required && !fileState ? "ag-required-file" : ""}`}
      >
        <label className="ag-label">
          {label} {required && <span className="ag-required">*</span>}
        </label>
        <label
          className={`ag-file-upload ${fileState ? "has-file" : ""}`}
          htmlFor={`file-${label.replace(/\s/g, "_")}`}
        >
          <input
            type="file"
            id={`file-${label.replace(/\s/g, "_")}`}
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
          />
          {fileState ? (
            <>
              <Check className="ag-file-icon" size={32} />
              <div
                className="ag-upload-text"
                style={{ wordBreak: "break-all" }}
              >
                {fileState.name}
              </div>
              <button
                type="button"
                className="ag-file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setFileState(null);
                }}
                title="Eliminar archivo"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <UploadCloud className="ag-file-icon" size={32} />
              <div className="ag-upload-text">
                Selecciona o arrastra tu archivo PDF
              </div>
              <div className="ag-helper-text">
                Solo formato <strong>.PDF</strong> (Máx. 5MB)
              </div>
            </>
          )}
        </label>
      </div>
    );
  };

  // --- RENDER ---
  if (tokenVerificando) {
    return (
      <div className="ag-container ag-spinner-container">
        <Loader2 className="ag-spinner" size={48} />
        <h2>Verificando credenciales...</h2>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="ag-container ag-spinner-container">
        <div
          className="ag-wrapper"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <AlertCircle
            size={64}
            color="#ef4444"
            style={{ margin: "0 auto 1.5rem auto" }}
          />
          <h2 style={{ color: "#ef4444" }}>Enlace No Disponible</h2>
          <p>{tokenMensaje}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ag-container">
      <div className="ag-wrapper">
        <div className="ag-sticky-top">
          <header className="ag-header">
            <img
              src={getAssetUrl("logoMK.webp")}
              alt="Logo Merkahorro"
              style={{
                maxWidth: "160px",
                display: "block",
                margin: "0 auto 1rem",
                borderRadius: "8px",
              }}
            />
            <h1 className="ag-title">Autogestión de Ingreso</h1>
            <p className="ag-subtitle">Completa tu información</p>
          </header>

          {/* Steps Indicator */}
          <div className="ag-steps-container">
            <div className="ag-steps">
              {STEPS.map((s, idx) => (
                <div key={idx} className="ag-step-item">
                  <div
                    className={`ag-step-bubble ${step > idx + 1 ? "completed" : ""} ${step === idx + 1 ? "active" : ""}`}
                    title={s.title}
                  >
                    {step > idx + 1 ? <Check size={18} /> : idx + 1}
                  </div>
                  <span
                    className="ag-step-label"
                    style={{
                      color: step === idx + 1 ? "var(--ag-primary)" : "",
                    }}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form
          className="ag-form"
          onSubmit={handleSubmit(onSubmit)}
          ref={formRef}
        >
          {/* PASO 1: PERSONAL */}
          {step === 1 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <User size={24} /> Información Personal
              </h2>
              <div className="ag-grid">
                <div className="ag-form-group ag-col-full">
                  <label className="ag-label">
                    Empresa Contratante <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("empresa", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="MERKAHORRO">MERKAHORRO</option>
                    <option value="MEGAMAYORISTA">MEGAMAYORISTA</option>
                    <option value="CONSTRUAHORRO">CONSTRUAHORRO</option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Nombres Completos (Como en tu documento)
                    <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <User size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: JUAN ESTEBAN"
                      {...registerUpper("nombres", {
                        required: true,
                        pattern: letterPattern,
                      })}
                    />
                  </div>
                  {errors.nombres && (
                    <span className="ag-error-text">
                      {errors.nombres.message}
                    </span>
                  )}
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Apellidos Completos (Como en tu documento)
                    <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <User size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: PÉREZ GONZÁLEZ"
                      {...registerUpper("apellidos", {
                        required: true,
                        pattern: letterPattern,
                      })}
                    />
                  </div>
                  {errors.apellidos && (
                    <span className="ag-error-text">
                      {errors.apellidos.message}
                    </span>
                  )}
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Tipo Documento <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("tipoDocumento", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="CÉDULA DE CIUDADANÍA">
                      CÉDULA DE CIUDADANÍA (C.C)
                    </option>
                    <option value="TARJETA DE IDENTIDAD">
                      TARJETA DE IDENTIDAD (T.I)
                    </option>
                    <option value="PPT">
                      PPT (Permiso por Protección Temporal)
                    </option>
                    <option value="CÉDULA DE EXTRANJERÍA">
                      CÉDULA DE EXTRANJERÍA (C.E)
                    </option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Número Documento <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <CreditCard size={18} className="ag-input-icon" />
                    <input
                      type="number"
                      className="ag-input ag-input-with-icon"
                      placeholder="Sin puntos ni guiones"
                      {...register("numeroDocumento", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Celular <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Phone size={18} className="ag-input-icon" />
                    <input
                      type="tel"
                      className="ag-input ag-input-with-icon"
                      placeholder="Ej: 3001234567"
                      {...register("celular", {
                        required: true,
                        pattern: {
                          value: /^3\d{9}$/,
                          message: "Celular inválido",
                        },
                      })}
                    />
                  </div>
                  {errors.celular && (
                    <span className="ag-error-text">
                      {errors.celular.message}
                    </span>
                  )}
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Correo Electrónico <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Mail size={18} className="ag-input-icon" />
                    <input
                      type="email"
                      className="ag-input ag-input-with-icon"
                      placeholder="Ej: usuario@email.com"
                      {...register("correo", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Fecha Nacimiento <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Calendar size={18} className="ag-input-icon" />
                    <input
                      type="date"
                      className="ag-input ag-input-with-icon"
                      {...register("fechaNacimiento", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Ciudad Nacimiento <span className="ag-required">*</span>
                  </label>
                  <input
                    className="ag-input ag-input-uppercase"
                    placeholder="Ej: MEDELLÍN"
                    {...registerUpper("ciudadNacimiento", { required: true })}
                  />
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Edad</label>
                  <input
                    type="number"
                    className="ag-input"
                    {...register("edad", { required: true })}
                  />
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Peso (kg) <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Weight size={18} className="ag-input-icon" />
                    <input
                      type="number"
                      step="any"
                      className="ag-input ag-input-with-icon"
                      placeholder="Ej: 70"
                      {...register("peso", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Estatura (cm) <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Ruler size={18} className="ag-input-icon" />
                    <input
                      type="number"
                      step="any"
                      className="ag-input ag-input-with-icon"
                      {...register("estatura", { required: true })}
                      placeholder="Ej: 170"
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Talla Camisa</label>
                  <div className="ag-input-wrapper">
                    <select
                      className="ag-input"
                      {...register("tallaCamisa")}
                    >
                      <option value="">Seleccione...</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="XXXL">XXXL</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Talla Pantalón</label>
                  <div className="ag-input-wrapper">
                    <input
                      type="text"
                      className="ag-input"
                      {...register("tallaPantalon")}
                      placeholder="Ej: 30, 32, 34"
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Talla Zapato</label>
                  <div className="ag-input-wrapper">
                    <input
                      type="text"
                      className="ag-input"
                      {...register("tallaZapato")}
                      placeholder="Ej: 38, 40, 42"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: UBICACIÓN */}
          {step === 2 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <Home size={24} /> Vivienda y Ubicación
              </h2>
              <div className="ag-grid">
                <div className="ag-form-group ag-col-full">
                  <label className="ag-label">
                    Dirección Residencial Completa{" "}
                    <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <MapPin size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      {...registerUpper("direccion", { required: true })}
                      placeholder="Ej: CRA 50 # 20 - 10 APTO 201"
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Barrio <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Map size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: ROBLEDO"
                      {...registerUpper("barrio", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Municipio Residencia <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Building size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: MEDELLÍN"
                      {...registerUpper("municipioResidencia", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Estrato <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("estrato", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Zona <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("zona", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="URBANA">URBANA</option>
                    <option value="RURAL">RURAL</option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Tipo Vivienda <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("tipoVivienda", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="PROPIA">PROPIA</option>
                    <option value="ARRENDADA">ARRENDADA</option>
                    <option value="FAMILIAR">FAMILIAR</option>
                    <option value="OTRAS">OTRAS</option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Características Vivienda{" "}
                    <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("caracteristicasVivienda", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="FINCA">FINCA</option>
                    <option value="CASA LOTE">CASA LOTE</option>
                    <option value="CASA CONJUNTO CERRADO">
                      CASA CONJUNTO CERRADO
                    </option>
                    <option value="CASA BARRIO">CASA BARRIO</option>
                    <option value="APARTAMENTO">APARTAMENTO</option>
                    <option value="HABITACIÓN">HABITACIÓN</option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    País Origen <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Flag size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: COLOMBIA"
                      {...registerUpper("paisOrigen", { required: true })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: DEMOGRÁFICOS */}
          {step === 3 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <Users size={24} /> Datos Demográficos
              </h2>
              <div className="ag-grid">
                <div className="ag-form-group">
                  <label className="ag-label">
                    Género <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Users size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("genero", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="MASCULINO">MASCULINO</option>
                      <option value="FEMENINO">FEMENINO</option>
                      <option value="NO BINARIO">NO BINARIO</option>
                      <option value="LGTBIQ+">LGTBIQ+</option>
                      <option value="PREFIERO NO DECIRLO">
                        PREFIERO NO DECIRLO
                      </option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Estado Civil <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Heart size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("estadoCivil", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="SOLTERO/RA">SOLTERO/RA</option>
                      <option value="CASADO/DA">CASADO/DA</option>
                      <option value="UNIÓN LIBRE">UNIÓN LIBRE</option>
                      <option value="DIVORCIADO/DA">DIVORCIADO/DA</option>
                      <option value="VIUDO/DA">VIUDO/DA</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Grado Escolaridad <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <FileText size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("gradoEscolaridad", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="PRIMARIA COMPLETA">
                        PRIMARIA COMPLETA
                      </option>
                      <option value="BACHILLER COMPLETO">
                        BACHILLER COMPLETO
                      </option>
                      <option value="TECNICO/TECNOLOGO COMPLETO">
                        TECNICO/TECNOLOGO COMPLETO
                      </option>
                      <option value="PROFESIONAL COMPLETO">
                        PROFESIONAL COMPLETO
                      </option>
                      <option value="POSTGRADO">POSTGRADO</option>
                      <option value="NINGUNO">NINGUNO</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Grupo Étnico <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Users size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("grupoEtnico", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="INDÍGENA">INDÍGENA</option>
                      <option value="AFRO">AFRO</option>
                      <option value="RAIZAL">RAIZAL</option>
                      <option value="GITANO O RROM">GITANO O RROM</option>
                      <option value="NO ME IDENTIFICO">NO ME IDENTIFICO</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Población Movilidad <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <MapPin size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("poblacionMovilidad", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="NINGUNA">NINGUNA</option>
                      <option value="POBLACIÓN MIGRANTE">
                        POBLACIÓN MIGRANTE
                      </option>
                      <option value="DESPLAZADO">DESPLAZADO</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Grupo Religioso <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <FileText size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("grupoReligioso", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="CATOLICISMO">CATOLICISMO</option>
                      <option value="PROTESTANTISMO">PROTESTANTISMO</option>
                      <option value="NINGUNO">NINGUNO</option>
                      <option value="OTRAS">OTRAS</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: LABORAL */}
          {step === 4 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <Briefcase size={24} /> Afiliación y Laboral
              </h2>
              <div className="ag-grid">
                <div className="ag-form-group">
                  <label className="ag-label">
                    EPS <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Heart size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("eps", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="SURA">SURA</option>
                      <option value="SALUD TOTAL">SALUD TOTAL</option>
                      <option value="SANITAS">SANITAS</option>
                      <option value="NUEVA EPS">NUEVA EPS</option>
                      <option value="SAVIA SALUD">SAVIA SALUD</option>
                      <option value="OTRAS">OTRAS</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Fondo de Pensión <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <CreditCard size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("fondoPension", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="COLPENSIONES">COLPENSIONES</option>
                      <option value="PROTECCIÓN">PROTECCIÓN</option>
                      <option value="PORVENIR">PORVENIR</option>
                      <option value="COLFONDOS">COLFONDOS</option>
                      <option value="NO APLICA (APRENDIZ)">
                        NO APLICA (APRENDIZ)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Tipo de Contrato <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <FileText size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("tipoContrato", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="TERMINO INDEFINIDO">
                        TERMINO INDEFINIDO
                      </option>
                      <option value="TERMINO FIJO">TERMINO FIJO</option>
                      <option value="OBRA O LABOR">OBRA O LABOR</option>
                      <option value="APRENDIZAJE">APRENDIZAJE</option>
                    </select>
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Antigüedad (Si es nuevo, seleccione "Sin Antigüedad"){" "}
                    <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Calendar size={18} className="ag-input-icon" />
                    <select
                      className="ag-select ag-input-with-icon"
                      {...register("antiguedad", { required: true })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="SIN ANTIGÜEDAD (NUEVO)">
                        SIN ANTIGÜEDAD (NUEVO)
                      </option>
                      <option value="MENOS DE 6 MESES">MENOS DE 6 MESES</option>
                      <option value="6 MESES a 1 AÑO">6 MESES a 1 AÑO</option>
                      <option value="1 a 3 AÑOS">1 a 3 AÑOS</option>
                      <option value="4 a 6 AÑOS">4 a 6 AÑOS</option>
                      <option value="7 a 8 AÑOS">7 a 8 AÑOS</option>
                      <option value="MAS DE 3 AÑOS">MAS DE 3 AÑOS</option>
                    </select>
                  </div>
                </div>

                {/* Optional Admin Fields in a subtle container */}
                <div className="ag-col-full" style={{ marginTop: "1rem" }}>
                  <div className="ag-alert ag-alert-info">
                    <Building size={18} />
                    <span>
                      <strong>Área Administrativa:</strong> Solo diligenciar si
                      perteneces a una de estas áreas.
                    </span>
                  </div>
                  <div className="ag-grid">
                    {/* OPERACIONES */}
                    <div className="ag-form-group">
                      <label className="ag-label">Dpto. Operaciones</label>
                      <div className="ag-input-wrapper">
                        <Briefcase size={18} className="ag-input-icon" />
                        <select
                          className="ag-select ag-input-with-icon"
                          {...register("departamentoOperaciones")}
                        >
                          <option value="">Seleccione...</option>
                          <option value="ANALISTA OPERACIONES">
                            ANALISTA OPERACIONES
                          </option>
                          <option value="DIRECTOR OPERACIONES">
                            DIRECTOR OPERACIONES
                          </option>
                          <option value="AUXILIAR INVENTARIO">
                            AUXILIAR INVENTARIO
                          </option>
                          <option value="AUXILIAR RECIBO">
                            AUXILIAR RECIBO
                          </option>
                          <option value="AUXILIAR SISTEMAS">
                            AUXILIAR SISTEMAS
                          </option>
                          <option value="ALMACEN Y SUMINISTROS">
                            ALMACEN Y SUMINISTROS
                          </option>
                          <option value="LÍDER SISTEMAS">LÍDER SISTEMAS</option>
                          <option value="LÍDER DE PUNTO">LÍDER DE PUNTO</option>
                          <option value="COORDINADOR LOGÍSTICO">
                            COORDINADOR LOGÍSTICO
                          </option>
                          <option value="PRACTICANTE">PRACTICANTE</option>
                        </select>
                      </div>
                    </div>

                    {/* FINANCIERO */}
                    <div className="ag-form-group">
                      <label className="ag-label">Dpto. Financiero</label>
                      <div className="ag-input-wrapper">
                        <CreditCard size={18} className="ag-input-icon" />
                        <select
                          className="ag-select ag-input-with-icon"
                          {...register("departamentoFinanciero")}
                        >
                          <option value="">Seleccione...</option>
                          <option value="DIRECTORA ADMINISTRATIVA Y FINANCIERA">
                            DIRECTORA ADMINISTRATIVA Y FINANCIERA
                          </option>
                          <option value="AUXILIAR TESORERIA">
                            AUXILIAR TESORERIA
                          </option>
                          <option value="AUXILIAR CARTERA">
                            AUXILIAR CARTERA
                          </option>
                          <option value="AUXILIAR NÓMINA">
                            AUXILIAR NÓMINA
                          </option>
                          <option value="ANALISTA CONTABLE">
                            ANALISTA CONTABLE
                          </option>
                          <option value="AUXILIAR CONTABLE">
                            AUXILIAR CONTABLE
                          </option>
                          <option value="AUXILIAR CAUSACIONES">
                            AUXILIAR CAUSACIONES
                          </option>
                          <option value="LÍDER CONTABILIDAD">
                            LÍDER CONTABILIDAD
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* COMERCIAL */}
                    <div className="ag-form-group">
                      <label className="ag-label">Dpto. Comercial</label>
                      <div className="ag-input-wrapper">
                        <Briefcase size={18} className="ag-input-icon" />
                        <select
                          className="ag-select ag-input-with-icon"
                          {...register("departamentoComercial")}
                        >
                          <option value="">Seleccione...</option>
                          <option value="ASISTENTE COMERCIAL">
                            ASISTENTE COMERCIAL
                          </option>
                          <option value="AUXILIAR COMERCIAL">
                            AUXILIAR COMERCIAL
                          </option>
                          <option value="LÍDER COMPRAS">LÍDER COMPRAS</option>
                          <option value="AUXILIAR COMPRAS">
                            AUXILIAR COMPRAS
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* GESTIÓN HUMANA */}
                    <div className="ag-form-group">
                      <label className="ag-label">Dpto. Gestión Humana</label>
                      <div className="ag-input-wrapper">
                        <Users size={18} className="ag-input-icon" />
                        <select
                          className="ag-select ag-input-with-icon"
                          {...register("departamentoGestionHumana")}
                        >
                          <option value="">Seleccione...</option>
                          <option value="DIRECTOR GESTIÓN HUMANA">
                            DIRECTOR GESTIÓN HUMANA
                          </option>
                          <option value="ASISTENTE GESTIÓN HUMANA">
                            ASISTENTE GESTIÓN HUMANA
                          </option>
                          <option value="LÍDER DE DESARROLLO Y TALENTO HUMANO">
                            LÍDER DE DESARROLLO Y TALENTO HUMANO
                          </option>
                          <option value="AUXILIAR GESTIÓN HUMANA">
                            AUXILIAR GESTIÓN HUMANA
                          </option>
                          <option value="AUXILIAR SISTEMAS INTEGRADOS">
                            AUXILIAR SISTEMAS INTEGRADOS
                          </option>
                          <option value="PRACTICANTE SST">
                            PRACTICANTE SST
                          </option>
                          <option value="PRACTICANTE">PRACTICANTE</option>
                        </select>
                      </div>
                    </div>

                    {/* GERENCIA */}
                    <div className="ag-form-group">
                      <label className="ag-label">Gerencia</label>
                      <div className="ag-input-wrapper">
                        <Building size={18} className="ag-input-icon" />
                        <select
                          className="ag-select ag-input-with-icon"
                          {...register("soloGerencia")}
                        >
                          <option value="">Seleccione...</option>
                          <option value="GERENTE">GERENTE</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: SALUD Y FAMILIA */}
          {step === 5 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <Heart size={24} /> Salud y Familia
              </h2>
              <div className="ag-grid">
                <div className="ag-form-group">
                  <label className="ag-label">
                    Grupo Sanguíneo <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("grupoSanguineo", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Personas a Cargo <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("dependientesEconomicos", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    ¿Está en embarazo? <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("embarazo", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    ¿Sufre alguna enfermedad?{" "}
                    <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("sufreEnfermedad", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                {sufreEnfermedad === "SI" && (
                  <div className="ag-form-group ag-col-full">
                    <label className="ag-label">
                      Descripción de la enfermedad{" "}
                      <span className="ag-required">*</span>
                    </label>
                    <div className="ag-input-wrapper">
                      <AlertCircle size={18} className="ag-input-icon" />
                      <input
                        placeholder="Ej: GASTRITIS, MIGRAÑA..."
                        className="ag-input ag-input-uppercase ag-input-with-icon"
                        {...registerUpper("descripcionEnfermedad", {
                          required: true,
                        })}
                      />
                    </div>
                  </div>
                )}

                <div className="ag-form-group ag-col-full">
                  <hr
                    style={{
                      border: "0",
                      borderTop: "1px solid var(--ag-border)",
                      margin: "1rem 0",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "var(--ag-primary)",
                      marginBottom: "1rem",
                    }}
                  >
                    Información de Hijos
                  </h3>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    ¿Tiene Hijos? <span className="ag-required">*</span>
                  </label>
                  <select
                    className="ag-select"
                    {...register("tieneHijos", { required: true })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                {tieneHijos === "SI" && (
                  <>
                    <div className="ag-form-group">
                      <label className="ag-label">
                        Cantidad <span className="ag-required">*</span>
                      </label>
                      <select
                        className="ag-select"
                        {...register("cuantosHijos", { required: true })}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ag-form-group ag-col-full">
                      <label className="ag-label">
                        Nombres y Edades (Separar con punto y coma){" "}
                        <span className="ag-required">*</span>
                      </label>
                      <div className="ag-input-wrapper">
                        <Users size={18} className="ag-input-icon" />
                        <input
                          className="ag-input ag-input-uppercase ag-input-with-icon"
                          {...registerUpper("nombresHijos", { required: true })}
                          placeholder="Ej: JUAN (5); MARIA (10)"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="ag-form-group ag-col-full">
                  <hr
                    style={{
                      border: "0",
                      borderTop: "1px solid var(--ag-border)",
                      margin: "1rem 0",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "var(--ag-primary)",
                      marginBottom: "1rem",
                    }}
                  >
                    Contacto de Emergencia
                  </h3>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Nombre Contacto <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <User size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: MARÍA PÉREZ"
                      {...registerUpper("contactoNombres", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Celular Contacto <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Phone size={18} className="ag-input-icon" />
                    <input
                      type="number"
                      className="ag-input ag-input-with-icon"
                      placeholder="Ej: 3101234567"
                      {...register("contactoCelular", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Parentesco <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <Heart size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: MADRE"
                      {...registerUpper("parentescoContacto", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">
                    Dirección Contacto <span className="ag-required">*</span>
                  </label>
                  <div className="ag-input-wrapper">
                    <MapPin size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: CALLE 50 # 45 - 30"
                      {...registerUpper("contactoDireccion", { required: true })}
                    />
                  </div>
                </div>

                <div className="ag-form-group ag-col-full">
                  <hr
                    style={{
                      border: "0",
                      borderTop: "1px dashed #ccc",
                      margin: "1rem 0",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "#666",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Segundo Contacto de Emergencia (Opcional)
                  </h3>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Nombre Contacto 2</label>
                  <div className="ag-input-wrapper">
                    <User size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: JUAN LÓPEZ"
                      {...registerUpper("contacto2Nombres")}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Celular Contacto 2</label>
                  <div className="ag-input-wrapper">
                    <Phone size={18} className="ag-input-icon" />
                    <input
                      type="number"
                      className="ag-input ag-input-with-icon"
                      placeholder="Ej: 3101234567"
                      {...register("contacto2Celular")}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Parentesco Contacto 2</label>
                  <div className="ag-input-wrapper">
                    <Heart size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: HERMANO"
                      {...registerUpper("contacto2Parentesco")}
                    />
                  </div>
                </div>

                <div className="ag-form-group">
                  <label className="ag-label">Dirección Contacto 2</label>
                  <div className="ag-input-wrapper">
                    <MapPin size={18} className="ag-input-icon" />
                    <input
                      className="ag-input ag-input-uppercase ag-input-with-icon"
                      placeholder="Ej: CARRERA 10 # 20 - 30"
                      {...registerUpper("contacto2Direccion")}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 6: DOCUMENTOS */}
          {step === 6 && (
            <div className="ag-fade-in">
              <h2 className="ag-section-title">
                <FileText size={24} /> Documentación Digital
              </h2>

              <div className="ag-alert ag-alert-warning">
                <AlertCircle size={20} />
                <span>
                  Importante: <strong>SOLO se permiten archivos PDF</strong>.{" "}
                  <br />
                  Tamaño máximo por archivo: <strong>5MB</strong>.
                </span>
              </div>

              <div className="ag-grid">
                <div className="ag-col-full">
                  <FileUploadField
                    label="Hoja de Vida"
                    fileState={hojaDeVida}
                    setFileState={setHojaDeVida}
                  />
                  <FileUploadField
                    label="Cédula (Ambas caras en un PDF)"
                    fileState={cedulaFile}
                    setFileState={setCedulaFile}
                  />
                  <FileUploadField
                    label="Certificado Bancario"
                    fileState={certificadoBancario}
                    setFileState={setCertificadoBancario}
                  />

                  {/* Habeas Data Section */}
                  <div
                    className="ag-form-group ag-required-file"
                    style={{ marginTop: "1.5rem" }}
                  >
                    <label className="ag-label">
                      Autorización Habeas Data{" "}
                      <span className="ag-required">*</span>
                    </label>
                    <div
                      className={`ag-file-upload ${habeasData ? "has-file" : ""}`}
                    >
                      {habeasData ? (
                        <>
                          <Check className="ag-file-icon" size={32} />
                          <div className="ag-upload-text">
                            Documento Firmado Digitalmente
                          </div>
                          <button
                            type="button"
                            className="ag-file-remove"
                            onClick={() => setHabeasData(null)}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ag-btn ag-btn-secondary"
                          onClick={() => setShowHabeasModal(true)}
                        >
                          <FileSignature size={18} /> Firmar Habeas Data en
                          Pantalla
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Electronic Signature Agreement Card */}
                  <div className="ag-doc-card">
                    <h3 style={{ marginTop: 0, color: "var(--ag-primary)" }}>
                      Acuerdo de Firma Electrónica
                    </h3>
                    <p
                      className="ag-helper-text"
                      style={{
                        fontSize: "0.9rem",
                        marginBottom: "1rem",
                        color: "#0f172a",
                      }}
                    >
                      Para completar este requisito, debes descargar el formato,{" "}
                      <strong>imprimirlo</strong>, firmarlo{" "}
                      <strong>manualmente (con bolígrafo)</strong> y escanearlo
                      para adjuntarlo aquí en formato PDF.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <a
                        href={URL_PLANTILLA_AUTORIZACION}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ag-link-btn"
                      >
                        <Download size={16} /> Descargar Plantilla PDF
                      </a>
                      <FileUploadField
                        label="Adjuntar Acuerdo Impreso y Firmado"
                        fileState={autorizacionFirma}
                        setFileState={setAutorizacionFirma}
                        required={true}
                      />
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="ag-checkbox-card">
                    <label className="ag-checkbox-wrapper">
                      <input
                        type="checkbox"
                        className="ag-checkbox"
                        {...register("aceptaTerminos", { required: true })}
                      />
                    </label>
                    <div
                      className="ag-checkbox-label"
                      onClick={() =>
                        setValue("aceptaTerminos", !watch("aceptaTerminos"))
                      }
                    >
                      Declaro bajo la gravedad de juramento que la información
                      aquí consignada es veraz, completa y verificable. Autorizo
                      a la empresa para validar los datos suministrados.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER NAVEGACIÓN */}
          <div className="ag-footer">
            <div className="ag-footer-buttons">
              <button
                type="button"
                className="ag-btn ag-btn-secondary"
                onClick={prevStep}
                disabled={step === 1 || isSubmitting}
              >
                <ChevronLeft size={18} /> Atrás
              </button>

              {step < STEPS.length ? (
                <button
                  type="button"
                  className="ag-btn ag-btn-primary"
                  onClick={nextStep}
                >
                  Siguiente <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="ag-btn ag-btn-primary"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting
                      ? "var(--ag-muted-foreground)"
                      : "var(--ag-secondary)",
                    borderColor: "transparent",
                    color: "var(--ag-primary)",
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="ag-spinner" size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                  {isSubmitting
                    ? "Enviando Información..."
                    : "Finalizar Registro"}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* MODAL */}
        <HabeasDataModal
          isOpen={showHabeasModal}
          onClose={() => setShowHabeasModal(false)}
          onSave={handleSignatureSave}
        />
      </div>
    </div>
  );
};

export default Autogestion;
