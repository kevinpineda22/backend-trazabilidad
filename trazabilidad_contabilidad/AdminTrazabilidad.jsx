// src/pages/trazabilidad_contabilidad/AdminTrazabilidad.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaKey,
  FaCheckCircle,
  FaChartBar,
  FaFolderOpen,
  FaUsers,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../supabaseClient";
import { getAssetUrl } from "../../config/storage";

// Estilos
import "./AdminTrazabilidad.css";
// Importamos estilos de contabilidad para que funcionen las vistas compartidas
import "./SuperAdminContabilidad.css";

// Componentes
import PanelAprobaciones from "./PanelAprobaciones";
import GestionTokens from "./GestionTokens";
import GestionDocumentos from "./GestionDocumentos";
import DashboardView from "./views/DashboardView";
import FilePreviewModal from "./FilePreviewModal";

// Vistas compartidas
import HistorialEmpleadosAdminView from "./views/HistorialEmpleadosAdminView";
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView";
import HistorialClientesAdminView from "./views/HistorialClientesAdminView";
import ExpedienteClienteView from "./views/ExpedienteClienteView";
import HistorialProveedoresAdminView from "./views/HistorialProveedoresAdminView";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView";

const VISTAS = {
  DASHBOARD: "dashboard",
  TOKENS: "tokens",
  APROBACIONES: "aprobaciones",
  DOCUMENTOS: "documentos",
  EMPLEADOS: "empleados",
  EXPEDIENTE_EMPLEADO: "expediente_empleado",
  CLIENTES: "clientes",
  EXPEDIENTE_CLIENTE: "expediente_cliente",
  PROVEEDORES: "proveedores",
  EXPEDIENTE_PROVEEDOR: "expediente_proveedor",
};

const TITULOS_VISTA = {
  [VISTAS.DASHBOARD]: "Panel de Administración - Trazabilidad",
  [VISTAS.TOKENS]: "Gestión de Links",
  [VISTAS.APROBACIONES]: "Panel de Aprobaciones",
  [VISTAS.DOCUMENTOS]: "Gestión de Documentos",
  [VISTAS.EMPLEADOS]: "Archivador General de Empleados",
  [VISTAS.EXPEDIENTE_EMPLEADO]: "Expediente Digital del Empleado",
  [VISTAS.CLIENTES]: "Archivador General de Clientes",
  [VISTAS.EXPEDIENTE_CLIENTE]: "Expediente Digital del Cliente",
  [VISTAS.PROVEEDORES]: "Archivador General de Proveedores",
  [VISTAS.EXPEDIENTE_PROVEEDOR]: "Expediente Digital del Proveedor",
};

const AdminTrazabilidad = () => {
  const [vista, setVista] = useState(VISTAS.TOKENS);
  const [userRole, setUserRole] = useState(null);

  // Estado para el modal de previsualización y expedientes
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(null);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const userId = payload.sub || payload.user_id;

          // 1. Intentar obtener el rol actualizado desde la base de datos
          if (userId) {
            const { data, error } = await supabase
              .from("profiles")
              .select("role")
              .eq("user_id", userId)
              .single();

            if (data && data.role) {
              setUserRole(data.role);
              return;
            }
          }

          // 2. Fallback: rol en el token (user_metadata)
          const role =
            payload.user_metadata?.role ||
            payload.app_metadata?.role ||
            payload.role ||
            "authenticated";
          setUserRole(role);
        } catch (e) {
          console.error("Error decodificando token:", e);
        }
      }
    };
    fetchRole();
  }, []);

  // Función para renderizar la vista según la selección
  const renderVista = () => {
    switch (vista) {
      case VISTAS.DASHBOARD:
        return <DashboardView onNavigate={setVista} userRole={userRole} />;
      case VISTAS.TOKENS:
        return <GestionTokens userRole={userRole} />;
      case VISTAS.APROBACIONES:
        return <PanelAprobaciones userRole={userRole} />;
      case VISTAS.DOCUMENTOS:
        return <GestionDocumentos userRole={userRole} />;
      case VISTAS.EMPLEADOS:
        return (
          <HistorialEmpleadosAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteEmpleado}
          />
        );
      case VISTAS.EXPEDIENTE_EMPLEADO:
        return (
          <ExpedienteEmpleadoView
            empleadoId={selectedEmpleadoId}
            onBack={showEmpleadosList}
            onPreview={openPreview}
          />
        );
      case VISTAS.CLIENTES:
        return (
          <HistorialClientesAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteCliente}
          />
        );
      case VISTAS.EXPEDIENTE_CLIENTE:
        return (
          <ExpedienteClienteView
            clienteId={selectedClienteId}
            onBack={showClientesList}
            onPreview={openPreview}
          />
        );
      case VISTAS.PROVEEDORES:
        return (
          <HistorialProveedoresAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteProveedor}
          />
        );
      case VISTAS.EXPEDIENTE_PROVEEDOR:
        return (
          <ExpedienteProveedorView
            proveedorId={selectedProveedorId}
            onBack={showProveedoresList}
            onPreview={openPreview}
          />
        );
      default:
        return <DashboardView onNavigate={setVista} userRole={userRole} />;
    }
  };

  const openPreview = (url) => {
    setPreviewUrl(url);
    setModalOpen(true);
  };
  const closePreview = () => {
    setModalOpen(false);
    setPreviewUrl("");
  };

  // Funciones de navegación para empleados
  const openExpedienteEmpleado = (empleadoId) => {
    setSelectedEmpleadoId(empleadoId);
    setVista(VISTAS.EXPEDIENTE_EMPLEADO);
  };

  const showEmpleadosList = () => {
    setSelectedEmpleadoId(null);
    setVista(VISTAS.EMPLEADOS);
  };

  // Funciones de navegación para clientes
  const openExpedienteCliente = (clienteId) => {
    setSelectedClienteId(clienteId);
    setVista(VISTAS.EXPEDIENTE_CLIENTE);
  };

  const showClientesList = () => {
    setSelectedClienteId(null);
    setVista(VISTAS.CLIENTES);
  };

  // Funciones de navegación para proveedores
  const openExpedienteProveedor = (proveedorId) => {
    setSelectedProveedorId(proveedorId);
    setVista(VISTAS.EXPEDIENTE_PROVEEDOR);
  };

  const showProveedoresList = () => {
    setSelectedProveedorId(null);
    setVista(VISTAS.PROVEEDORES);
  };

  // Helper para verificar permisos
  const checkPermission = (allowedRoles) => {
    if (!userRole) return false;
    if (userRole === "admin" || userRole === "super_admin") return true;
    return allowedRoles.includes(userRole);
  };

  return (
    <div className="admin-traz-main-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <FilePreviewModal
        isOpen={modalOpen}
        onClose={closePreview}
        fileUrl={previewUrl}
      />

      {/* Sidebar */}
      <aside className="admin-traz-sidebar">
        <div className="admin-traz-sidebar-header">
          <Link to="/acceso" className="admin-traz-back-button">
            <FaArrowLeft size={18} />
          </Link>
          <img
            src={getAssetUrl("logoMK.webp")}
            alt="Logo Merkahorro"
            className="admin-traz-logo"
          />
          <h2 className="admin-traz-sidebar-title">Admin Trazabilidad</h2>
        </div>

        <nav className="admin-traz-sidebar-nav">
          <BotonSidebar
            icono={FaKey}
            texto="Gestión de Links"
            activo={vista === VISTAS.TOKENS}
            onClick={() => setVista(VISTAS.TOKENS)}
          />
          <BotonSidebar
            icono={FaCheckCircle}
            texto="Aprobaciones"
            activo={vista === VISTAS.APROBACIONES}
            onClick={() => setVista(VISTAS.APROBACIONES)}
          />

          {checkPermission(["admin_empleado"]) && (
            <BotonSidebar
              icono={FaUsers}
              texto="Archivador Empleados"
              activo={vista === VISTAS.EMPLEADOS}
              onClick={() => setVista(VISTAS.EMPLEADOS)}
            />
          )}

          {checkPermission(["admin_cliente", "admin_clientes"]) && (
            <BotonSidebar
              icono={FaUsers}
              texto="Archivador Clientes"
              activo={vista === VISTAS.CLIENTES}
              onClick={() => setVista(VISTAS.CLIENTES)}
            />
          )}

          {checkPermission(["admin_proveedor", "admin_proveedores"]) && (
            <BotonSidebar
              icono={FaUsers}
              texto="Archivador Proveedores"
              activo={vista === VISTAS.PROVEEDORES}
              onClick={() => setVista(VISTAS.PROVEEDORES)}
            />
          )}

          <BotonSidebar
            icono={FaFolderOpen}
            texto="Documentos"
            activo={vista === VISTAS.DOCUMENTOS}
            onClick={() => setVista(VISTAS.DOCUMENTOS)}
          />
          <BotonSidebar
            icono={FaChartBar}
            texto="Dashboard"
            activo={vista === VISTAS.DASHBOARD}
            onClick={() => setVista(VISTAS.DASHBOARD)}
          />
        </nav>

        <div className="admin-traz-sidebar-footer">
          <p>Sistema de Trazabilidad</p>
          <p>Merkahorro © 2026</p>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="admin-traz-content">
        <header className="admin-traz-header">
          <h1 className="admin-traz-title">{TITULOS_VISTA[vista]}</h1>
        </header>

        <div className="admin-traz-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={vista}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="admin-traz-view-container"
            >
              {renderVista()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// Componente Botón Sidebar
const BotonSidebar = ({ icono: Icono, texto, activo, onClick }) => (
  <button
    className={`admin-traz-sidebar-button ${activo ? "activo" : ""}`}
    onClick={onClick}
  >
    <Icono size={20} className="admin-traz-sidebar-icon" />
    <span className="admin-traz-sidebar-text">{texto}</span>
  </button>
);

export default AdminTrazabilidad;
