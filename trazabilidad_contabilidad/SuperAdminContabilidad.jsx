// src/pages/trazabilidad_contabilidad/SuperAdminContabilidad.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaChartBar,
  FaUsers,
  FaHardHat,
  FaUserTie,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";

// Estilos
import "./SuperAdminContabilidad.css";

// Componentes compartidos
import FilePreviewModal from "./FilePreviewModal";
import BotonSidebar from "./components/BotonSidebar";

// Vistas (ahora importadas)
import DashboardView from "./views/DashboardView";
import HistorialEmpleadosAdminView from "./views/HistorialEmpleadosAdminView";
import HistorialProveedoresAdminView from "./views/HistorialProveedoresAdminView";
import HistorialClientesAdminView from "./views/HistorialClientesAdminView";
// Vistas de expedientes
import ExpedienteEmpleadoView from "./views/ExpedienteEmpleadoView.jsx";
import ExpedienteProveedorView from "./views/ExpedienteProveedorView.jsx";

const VISTAS = {
  DASHBOARD: "dashboard",
  EMPLEADOS: "empleados",
  PROVEEDORES: "proveedores",
  CLIENTES: "clientes",
  EXPEDIENTE_EMPLEADO: "expediente_empleado",
  EXPEDIENTE_PROVEEDOR: "expediente_proveedor",
};

const TITULOS_VISTA = {
  [VISTAS.DASHBOARD]: "Dashboard de Contabilidad",
  [VISTAS.EMPLEADOS]: "Archivador General de Empleados",
  [VISTAS.PROVEEDORES]: "Archivador General de Proveedores",
  [VISTAS.CLIENTES]: "Historial General de Clientes",
  [VISTAS.EXPEDIENTE_EMPLEADO]: "Expediente Digital del Empleado",
  [VISTAS.EXPEDIENTE_PROVEEDOR]: "Expediente Digital del Proveedor",
};

const SuperAdminContabilidad = () => {
  const [vista, setVista] = useState(VISTAS.DASHBOARD);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);

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

  // Este render es mucho más limpio
  const renderVista = () => {
    switch (vista) {
      case VISTAS.DASHBOARD:
        return <DashboardView />;
      case VISTAS.EMPLEADOS:
        return (
          <HistorialEmpleadosAdminView
            onPreview={openPreview}
            onOpenExpediente={openExpedienteEmpleado}
          />
        );
      case VISTAS.PROVEEDORES:
        return (
          <HistorialProveedoresAdminView
            onOpenExpediente={openExpedienteProveedor}
          />
        );
      case VISTAS.CLIENTES:
        return <HistorialClientesAdminView onPreview={openPreview} />;
      case VISTAS.EXPEDIENTE_EMPLEADO:
        return (
          <ExpedienteEmpleadoView
            empleadoId={selectedEmpleadoId}
            onBack={showEmpleadosList}
            onPreview={openPreview}
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
        return <DashboardView />;
    }
  };

  return (
    <div className="admin-cont-main-container">
      <ToastContainer position="top-center" autoClose={4000} />
      <FilePreviewModal
        isOpen={modalOpen}
        onClose={closePreview}
        fileUrl={previewUrl}
      />

      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 100,
          damping: 20,
        }}
        className="admin-cont-sidebar"
      >
        <div className="admin-cont-sidebar-header">
          <Link
            to="/acceso"
            className="admin-cont-back-button"
            title="Volver al acceso"
          >
            <FaArrowLeft />
          </Link>
          <img src="/logoMK.webp" alt="Logo" className="admin-cont-logo" />
          <h2 className="admin-cont-sidebar-title">Admin Contabilidad</h2>
        </div>

        <nav className="admin-cont-sidebar-nav">
          <BotonSidebar
            vista={VISTAS.DASHBOARD}
            vistaActual={vista}
            setVista={setVista}
            icono={<FaChartBar />}
            label="Dashboard"
          />
          <BotonSidebar
            vista={VISTAS.EMPLEADOS}
            vistaActual={vista}
            setVista={setVista}
            icono={<FaUsers />}
            label="Archivador Empleados"
          />
          <BotonSidebar
            vista={VISTAS.PROVEEDORES}
            vistaActual={vista}
            setVista={setVista}
            icono={<FaHardHat />}
            label="Archivador Proveedores"
          />
          <BotonSidebar
            vista={VISTAS.CLIENTES}
            vistaActual={vista}
            setVista={setVista}
            icono={<FaUserTie />}
            label="Historial Clientes"
          />
        </nav>
      </motion.div>

      <div className="admin-cont-content">
        <motion.h1
          key={TITULOS_VISTA[vista]} // La key se asegura que el título se re-anime
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="admin-cont-main-title"
        >
          {TITULOS_VISTA[vista]}
        </motion.h1>

        <AnimatePresence mode="wait">
          <motion.div
            key={vista}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderVista()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SuperAdminContabilidad;
