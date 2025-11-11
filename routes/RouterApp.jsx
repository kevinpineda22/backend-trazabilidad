// RouterApp.jsx
import { Home } from "../pages/Home";
import { Contribucion } from "../pages/Contribucion";
import { Promociones } from "../pages/Promociones";
import { Politicas } from "../pages/legal/Politicas";
import { Condiciones } from "../pages/legal/Condiciones";
import { Trabaja } from "../pages/entrevistasGH/Trabaja";
import { Login } from "../pages/admin/Login";
import { Vacantes } from "../pages/entrevistasGH/Vacantes";
import { Salones } from "../pages/reservaSalones/Salones";
import { ReservaForm } from "../pages/reservaSalones/Reserva";
import { PostulacionesTable } from "../contratacion_virtual/PostulacionesTable";
import { Gastos } from "../pages/flujo_gastos/Gastos/Gastos";
import { HistorialGastos } from "../pages/flujo_gastos/HistorialGastos";
import { Automatizacion } from "../pages/flujo_fruver/Automatizacion";
import { AprobarRechazar } from "../pages/AprobarRechazar";
import { HistorialRegistros } from "../pages/flujo_fruver/HistorialRegistros";
import { Acceso } from "../pages/admin/Acceso";
import { SolicitudAprobacion } from "../pages/flujo_perfil/SolicitudAprobacion";
import { DGdecision } from "../pages/flujo_perfil/DGdecision";
import { Transporte } from "../pages/flujo_transporte/Transporte";
import { HistorialTransporte } from "../pages/flujo_transporte/HistorialTransporte";
import { FormularioPerfilMerkahorro } from "../pages/Sociodemografico/socioMerkahorro/FormularioPerfilMerkahorro";
import { FormularioPerfilConstruahorro } from "../pages/Sociodemografico/socioConstruahorro/FormularioPerfilConstruahorro";
import { FormularioPerfilMegamayoristas } from "../pages/Sociodemografico/socioMegamayoristas/FormularioPerfilMegamayoristas";
import { HistorialFormulario } from "../pages/Sociodemografico/HistorialFormulario";
import { HistorialCartera } from "../pages/flujo_gastos/HistorialCartera";
import RutaProtegida from "../components/RutaProtegida.jsx";
import { Dashboards } from "../pages/Dashboards";
import { DashboardGastos } from "../Dashboards/DSH-gastos/DashboardGastos";
import { DashboardTransporte } from "../Dashboards/DSH-transporte/DashboardTransporte";
import { DashboardPostulaciones } from "../Dashboards/DSH-postulaciones/DashboardPostulaciones";
import { BuscadorPostulante } from "../contratacion_virtual/BuscadorPostulante";
import { PanelPostulante } from "../contratacion_virtual/PanelPostulante";
import { PanelGHDocumentos } from "../contratacion_virtual/PanelGHDocumentos";
import { PanelNotificacionesGH } from "../contratacion_virtual/PanelNotificacionesGH";
import { AdminContratacion } from "../contratacion_virtual/AdminContratacion";
import AdministradorMantenimiento from "../pages/Mantenimiento/AdministradorMantenimiento.jsx";
import DashboardFruver from "../Dashboards/DSH-Fruver/DashboardFruver.jsx";
import { Sociodemografico } from "../pages/Sociodemografico/Sociodemografico.jsx";
import { FormularioSolicitudPersonal } from "../contratacion_virtual/FormularioSolicitudPersonal.jsx";
import AdministradorInventario from "../Inventario/AdministradorInventario.jsx";
import { ReestablecerContraseña } from "../pages/admin/ReestablecerContraseña";
import { AgendarEntrevista } from "../pages/entrevistasGH/AgendarEntrevista";
import GestionEntrevistas from "../pages/entrevistasGH/GestionEntrevistasGH";
import OperarioPadre from "../Inventario/Operario.jsx";
import NotificacionesElectronicas from "../pages/legal/NotificacionesElectronicas";
import { AdminDotacion } from "../pages/Dotación/AdminDotación.jsx";
import { EmpleadoDotacion } from "../pages/Dotación/EmpleadoDotacion.jsx";
import { AdminProgramadorHorarios } from "../pages/Programador_horarios/AdminProgramadorHorarios.jsx";
import ConsultaHorariosPublica from "../pages/Programador_horarios/ConsultaHorariosPublica.jsx";
import RegistroActividad from "../pages/Mantenimiento/RegistroActividad.jsx";
import InventarioMantenimiento from "../pages/Mantenimiento/InventarioMantenimiento.jsx";
import HojaDeVidaMantenimiento from "../pages/Mantenimiento/HojaDeVidaMantenimiento.jsx";
import DashboardMantenimiento from "../pages/Mantenimiento/DashboardMantenimiento.jsx";
import { AdminUsuarios } from "../pages/admin/AdminUsuarios.jsx";
import { MonitorActividad } from "../pages/admin/MonitorActividad.jsx";
import AsignarTarea from "../pages/Mantenimiento/AsignarTarea.jsx";
import HistorialTareas from "../pages/Mantenimiento/HistorialTareas.jsx";
import HistorialActividadesPage from "../pages/Mantenimiento/HistorialActividadesPage.jsx";
import LiderSST from "../pages/Mantenimiento/LiderSST.jsx";
import TareasRecibidas from "../pages/Mantenimiento/TareasRecibidas.jsx";
import DashboardSociodemografico from "../pages/Sociodemografico/dashboards/DashboardSociodemografico.jsx";
import { SolicitudDesarrollo } from "../pages/Solicitud_Desarrollo/SolicitudDesarrollo.jsx";
import AdminDesarrollo from "../pages/Solicitud_Desarrollo/AdminDesarrollo.jsx";
import FormularioDotacion from "../pages/Dotación/FormularioDotación.jsx";
// --- Nuevas importaciones de Trazabilidad de Contabilidad ---
import CreacionSubirEmpleado from "../pages/trazabilidad_contabilidad/CreacionSubirEmpleado.jsx";
import CreacionProveedor from "../pages/trazabilidad_contabilidad/CreacionProveedor.jsx";
import CreacionCliente from "../pages/trazabilidad_contabilidad/CreacionCliente.jsx";
import SuperAdminContabilidad from "../pages/trazabilidad_contabilidad/SuperAdminContabilidad.jsx";
import GestionTokens from '../pages/trazabilidad_contabilidad/GestionTokens';
import PanelAprobaciones from '../pages/trazabilidad_contabilidad/PanelAprobaciones';
import RegistroPublico from '../pages/trazabilidad_contabilidad/RegistroPublico';


import AdminDirecciones from "../pages/Tareas_dirreciones/Admin.jsx"; 
const AulaRedirect = () => {
    window.location.href = "https://merkahorro.com/Aula/";
    return null;
};

export const routes = [
    // === RUTAS PÚBLICAS ===
    { path: "/", element: <Home /> },
    { path: "/admin-direcciones", element: <AdminDirecciones /> },
    { path: "/monitorActividad", element: <MonitorActividad /> },
    { path: "/reestablecer", element: <ReestablecerContraseña /> },
    { path: "/agendar-entrevista", element: <AgendarEntrevista /> },
    { path: "/contribucion", element: <Contribucion /> },
    { path: "/promociones", element: <Promociones /> },
    { path: "/politicas", element: <Politicas /> },
    { path: "/condiciones", element: <Condiciones /> },
    { path: "/trabaja-con-nosotros", element: <Vacantes /> },
    { path: "/aplicar", element: <Trabaja /> },
    { path: "/login", element: <Login /> },
    { path: "/reserva", element: <ReservaForm /> },
    { path: "/notificacionesElectronicas", element: <NotificacionesElectronicas /> },
    { path: "/consulta-horarios", element: <ConsultaHorariosPublica /> },
    { path: "/aprobarrechazar", element: <AprobarRechazar /> },
    { path: "/historial/:correo", element: <HistorialRegistros /> },
    { path: "/solicitud-desarrollo", element: <SolicitudDesarrollo /> },
    { path: "/empleadodotacion", element: <EmpleadoDotacion /> },

    // Rutas públicas de formularios sociodemográficos
    { path: "/formularioperfilmerkahorro", element: <FormularioPerfilMerkahorro /> },
    { path: "/formularioperfilconstruahorro", element: <FormularioPerfilConstruahorro /> },
    { path: "/formularioperfilmegamayoristas", element: <FormularioPerfilMegamayoristas /> },
    
    // Ruta pública de registro con token (sin autenticación)
    { path: "/registro/:tipo/:token", element: <RegistroPublico /> },

    // === RUTAS PROTEGIDAS ===
    {
        element: <RutaProtegida />,
        children: [
            { path: "/acceso", element: <Acceso /> },
            { path: "/salones", element: <Salones /> },
            { path: "/gastos", element: <Gastos /> },
            { path: "/historialgastos", element: <HistorialGastos /> },
            { path: "/historialcartera", element: <HistorialCartera /> },
            { path: "/postulacionesTable", element: <PostulacionesTable /> },
            { path: "/gestionEntrevistas", element: <GestionEntrevistas /> },
            { path: "/buscadorpostulante", element: <BuscadorPostulante /> },
            { path: "/panelpostulante/:id", element: <PanelPostulante /> },
            { path: "/panelghdocumentos", element: <PanelGHDocumentos /> },
            { path: "/panelnotificacionesgh", element: <PanelNotificacionesGH /> },
            { path: "/admincontratacion", element: <AdminContratacion /> },
            { path: "/formulario-solicitud-personal", element: <FormularioSolicitudPersonal /> },
            { path: "/automatizacion", element: <Automatizacion /> },
            { path: "/transporte", element: <Transporte /> },
            { path: "/historialtransporte", element: <HistorialTransporte /> },
            { path: "/dashboards", element: <Dashboards /> },
            { path: "/dashboardgastos", element: <DashboardGastos /> },
            { path: "/dashboardtransporte", element: <DashboardTransporte /> },
            { path: "/dashboardpostulaciones", element: <DashboardPostulaciones /> },
            {
                path: "/dashboardsociodemografico",
                element: <DashboardSociodemografico />,
            },
            { path: "/dashboardFruver", element: <DashboardFruver /> },
            { path: "/admin-desarrollo", element: <AdminDesarrollo /> },

            // --- RUTAS DE MANTENIMIENTO ---
            {
                path: "/mantenimiento",
                element: <AdministradorMantenimiento />,
                children: [
                    { index: true, element: <RegistroActividad /> },
                    { path: "registro_actividad", element: <RegistroActividad /> },
                    { path: "inventario", element: <InventarioMantenimiento /> },
                    { path: "hoja_de_vida", element: <HojaDeVidaMantenimiento /> },
                    { path: "dashboard", element: <DashboardMantenimiento /> },
                    {
                        path: "historial_actividades",
                        element: <HistorialActividadesPage />,
                    },
                ],
            },
            {
                path: "/lider-sst",
                element: <LiderSST />,
                children: [
                    { index: true, element: <AsignarTarea /> }, // Por defecto muestra asignar tarea
                    { path: "asignar_tarea", element: <AsignarTarea /> },
                    { path: "mis_tareas_asignadas", element: <HistorialTareas /> }, // Tareas que YO asigné
                    { path: "tareas_recibidas", element: <TareasRecibidas /> }, // Tareas asignadas A MÍ
                ],
            },

            // --- RUTAS VARIAS PROTEGIDAS ---
            { path: "/historialformulario", element: <HistorialFormulario /> },
            { path: "/sociodemografico", element: <Sociodemografico /> },
            {
                path: "/administradorInventario",
                element: <AdministradorInventario />,
            },
            { path: "/operario", element: <OperarioPadre /> },

            { path: "/programador-horarios", element: <AdminProgramadorHorarios /> },
            { path: "/solicitudaprobacion", element: <SolicitudAprobacion /> },
            { path: "/dgdecision", element: <DGdecision /> },
            { path: "/adminUsuarios", element: <AdminUsuarios /> },

            // === DOTACIÓN ===
            { path: "/adminDotacion", element: <AdminDotacion /> },
            { path: "/empleadodotacion", element: <EmpleadoDotacion /> },
            { path: "/FormularioDotacion", element: <FormularioDotacion /> }, // Conservada del archivo base

            // --- RUTAS NUEVAS DE TRAZABILIDAD CONTABILIDAD ---
            { path: "/trazabilidad/crear-empleado", element: <CreacionSubirEmpleado /> },
            { path: "/trazabilidad/crear-proveedor", element: <CreacionProveedor /> },
            { path: "/trazabilidad/crear-cliente", element: <CreacionCliente /> },
            { path: "/trazabilidad/admin", element: <SuperAdminContabilidad /> },
            { path: "/trazabilidad/gestion-tokens", element: <GestionTokens /> },
            { path: "/trazabilidad/aprobaciones", element: <PanelAprobaciones /> },
        ],
    },
];