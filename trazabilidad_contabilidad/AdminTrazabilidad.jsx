// src/pages/trazabilidad_contabilidad/AdminTrazabilidad.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaKey,
  FaCheckCircle,
  FaChartBar,
  FaUsers,
  FaHardHat,
  FaUserTie,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Estilos
import "./AdminTrazabilidad.css";

// Componentes
import PanelAprobaciones from "./PanelAprobaciones";
import GestionTokens from "./GestionTokens";
import FilePreviewModal from "./FilePreviewModal";

// Vistas de historial
import HistorialEmpleadosAdminView from "./views/HistorialEmpleadosAdminView";
import HistorialProveedoresAdminView from "./views/HistorialProveedoresAdminView";
import HistorialClientesAdminView from "./views/HistorialClientesAdminView";

// Vistas de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView";
import ExpedienteClienteView from "./views/ExpedienteClienteView";

const VISTAS = {
  DASHBOARD: "dashboard",
  TOKENS: "tokens",
  APROBACIONES: "aprobaciones",
  EMPLEADOS: "empleados",
  PROVEEDORES: "proveedores",
  CLIENTES: "clientes",
  EXPEDIENTE_EMPLEADO: "expediente_empleado",
  EXPEDIENTE_PROVEEDOR: "expediente_proveedor",
  EXPEDIENTE_CLIENTE: "expediente_cliente",
};

const TITULOS_VISTA = {
  [VISTAS.DASHBOARD]: "Panel de Administración - Trazabilidad",
  [VISTAS.TOKENS]: "Gestión de Tokens",
  [VISTAS.APROBACIONES]: "Panel de Aprobaciones",
  [VISTAS.EMPLEADOS]: "Archivador General de Empleados",
  [VISTAS.PROVEEDORES]: "Archivador General de Proveedores",
  [VISTAS.CLIENTES]: "Archivador General de Clientes",
  [VISTAS.EXPEDIENTE_EMPLEADO]: "Expediente Digital del Empleado",
  [VISTAS.EXPEDIENTE_PROVEEDOR]: "Expediente Digital del Proveedor",
  [VISTAS.EXPEDIENTE_CLIENTE]: "Expediente Digital del Cliente",
};

const AdminTrazabilidad = () => {
  const [vista, setVista] = useState(VISTAS.DASHBOARD);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);
  const [selectedClienteId, setSelectedClienteId] = useState(null);

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

  // Funciones de navegación para proveedores
  const openExpedienteProveedor = (proveedorId) => {
    setSelectedProveedorId(proveedorId);
    setVista(VISTAS.EXPEDIENTE_PROVEEDOR);
  };

  const showProveedoresList = () => {
    setSelectedProveedorId(null);
    setVista(VISTAS.PROVEEDORES);
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

  // Función para renderizar la vista según la selección
  const renderVista = () => {
    switch (vista) {
      case VISTAS.DASHBOARD:
        return <DashboardView onNavigate={setVista} />;
      case VISTAS.TOKENS:
        return <GestionTokens />;
      case VISTAS.APROBACIONES:
        return <PanelAprobaciones />;
      case VISTAS.EMPLEADOS:
        return (
          <HistorialEmpleadosAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteEmpleado}
            apiEndpoint="/trazabilidad/admin-trazabilidad/historial-empleados"
          />
        );
      case VISTAS.PROVEEDORES:
        return (
          <HistorialProveedoresAdminView
            onOpenExpediente={openExpedienteProveedor}
            apiEndpoint="/trazabilidad/admin-trazabilidad/historial-proveedores"
          />
        );
      case VISTAS.CLIENTES:
        return (
          <HistorialClientesAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteCliente}
            apiEndpoint="/trazabilidad/admin-trazabilidad/historial-clientes"
          />
        );
      case VISTAS.EXPEDIENTE_EMPLEADO:
        return (
          <ExpedienteEmpleadoView
            empleadoId={selectedEmpleadoId}
            onBack={showEmpleadosList}
            onPreview={openPreview}
            apiEndpoint={`/trazabilidad/admin-trazabilidad/expediente-empleado/${selectedEmpleadoId}`}
          />
        );
      case VISTAS.EXPEDIENTE_PROVEEDOR:
        return (
          <ExpedienteProveedorView
            proveedorId={selectedProveedorId}
            onBack={showProveedoresList}
            onPreview={openPreview}
            apiEndpoint={`/trazabilidad/admin-trazabilidad/expediente-proveedor/${selectedProveedorId}`}
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
      default:
        return <DashboardView onNavigate={setVista} />;
    }
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
            src="/logoMK.webp"
            alt="Logo Merkahorro"
            className="admin-traz-logo"
          />
          <h2 className="admin-traz-sidebar-title">Admin Trazabilidad</h2>
        </div>

        <nav className="admin-traz-sidebar-nav">
          <BotonSidebar
            icono={FaChartBar}
            texto="Dashboard"
            activo={vista === VISTAS.DASHBOARD}
            onClick={() => setVista(VISTAS.DASHBOARD)}
          />
          <BotonSidebar
            icono={FaKey}
            texto="Gestión de Tokens"
            activo={vista === VISTAS.TOKENS}
            onClick={() => setVista(VISTAS.TOKENS)}
          />
          <BotonSidebar
            icono={FaCheckCircle}
            texto="Aprobaciones"
            activo={vista === VISTAS.APROBACIONES}
            onClick={() => setVista(VISTAS.APROBACIONES)}
          />
          <BotonSidebar
            icono={FaUsers}
            texto="Archivador Empleados"
            activo={vista === VISTAS.EMPLEADOS}
            onClick={() => setVista(VISTAS.EMPLEADOS)}
          />
          <BotonSidebar
            icono={FaHardHat}
            texto="Archivador Proveedores"
            activo={vista === VISTAS.PROVEEDORES}
            onClick={() => setVista(VISTAS.PROVEEDORES)}
          />
          <BotonSidebar
            icono={FaUserTie}
            texto="Archivador Clientes"
            activo={vista === VISTAS.CLIENTES}
            onClick={() => setVista(VISTAS.CLIENTES)}
          />
        </nav>

        <div className="admin-traz-sidebar-footer">
          <p>Sistema de Trazabilidad</p>
          <p>Merkahorro © 2025</p>
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

// Vista del Dashboard
const DashboardView = ({ onNavigate }) => {
  return (
    <div className="admin-traz-dashboard">
      <div className="admin-traz-welcome">
        <h2>Bienvenido al Panel de Administración</h2>
        <p>
          Gestiona tokens, aprobaciones y visualiza todos los expedientes del
          sistema de trazabilidad
        </p>
      </div>

      <div className="admin-traz-cards-grid">
        <DashboardCard
          icono={FaKey}
          titulo="Gestión de Tokens"
          descripcion="Genera y administra tokens de acceso para empleados, clientes y proveedores"
          onClick={() => onNavigate(VISTAS.TOKENS)}
          color="blue"
        />
        <DashboardCard
          icono={FaCheckCircle}
          titulo="Panel de Aprobaciones"
          descripcion="Revisa y aprueba o rechaza los registros pendientes de validación"
          onClick={() => onNavigate(VISTAS.APROBACIONES)}
          color="green"
        />
        <DashboardCard
          icono={FaUsers}
          titulo="Archivador Empleados"
          descripcion="Accede al historial completo y expedientes digitales de todos los empleados"
          onClick={() => onNavigate(VISTAS.EMPLEADOS)}
          color="purple"
        />
        <DashboardCard
          icono={FaHardHat}
          titulo="Archivador Proveedores"
          descripcion="Consulta expedientes y documentación completa de todos los proveedores"
          onClick={() => onNavigate(VISTAS.PROVEEDORES)}
          color="orange"
        />
        <DashboardCard
          icono={FaUserTie}
          titulo="Archivador Clientes"
          descripcion="Revisa solicitudes y expedientes de clientes con acceso a toda la documentación"
          onClick={() => onNavigate(VISTAS.CLIENTES)}
          color="teal"
        />
      </div>

      <div className="admin-traz-info-section">
        <div className="admin-traz-info-card">
          <h3>Sistema de Trazabilidad</h3>
          <p>
            Este panel te permite gestionar de forma centralizada todos los
            aspectos relacionados con la trazabilidad de empleados, clientes y
            proveedores.
          </p>
          <ul>
            <li>✓ Generación de tokens únicos por tipo de registro</li>
            <li>✓ Validación y aprobación de documentos</li>
            <li>✓ Historial completo de aprobaciones y rechazos</li>
            <li>✓ Gestión de accesos públicos controlados</li>
            <li>✓ Expedientes digitales completos con toda la documentación</li>
            <li>✓ Vista previa y descarga de archivos adjuntos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Componente Card del Dashboard
const DashboardCard = ({
  icono: Icono,
  titulo,
  descripcion,
  onClick,
  color,
}) => (
  <motion.div
    className={`admin-traz-dashboard-card ${color}`}
    onClick={onClick}
    whileHover={{ scale: 1.02, y: -5 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="admin-traz-card-icon">
      <Icono size={32} />
    </div>
    <h3 className="admin-traz-card-title">{titulo}</h3>
    <p className="admin-traz-card-description">{descripcion}</p>
    <div className="admin-traz-card-arrow">→</div>
  </motion.div>
);

export default AdminTrazabilidad;
