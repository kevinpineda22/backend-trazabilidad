// src/pages/trazabilidad_contabilidad/views/DashboardView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FaUsers,
  FaHardHat,
  FaUserTie,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaKey,
  FaArrowRight,
} from "react-icons/fa";
import { apiTrazabilidad as api } from "../../../services/apiTrazabilidad";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import "./DashboardView.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DashboardView = ({ onNavigate, userRole }) => {
  const [stats, setStats] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Ejecutar peticiones en paralelo
        const [statsRes, pendientesRes, historialRes] =
          await Promise.allSettled([
            api.get("/trazabilidad/admin/dashboard-stats"),
            api.get("/trazabilidad/aprobaciones/pendientes"),
            api.get("/trazabilidad/aprobaciones/historial"),
          ]);

        // Función de filtrado según rol
        const filterByRole = (items) => {
          if (!Array.isArray(items)) return [];
          if (!userRole || userRole === "admin" || userRole === "super_admin")
            return items;

          if (userRole === "admin_empleado")
            return items.filter((i) => i.tipo === "empleado");

          if (["admin_cliente", "admin_clientes"].includes(userRole))
            return items.filter((i) => i.tipo === "cliente");

          if (["admin_proveedor", "admin_proveedores"].includes(userRole))
            return items.filter((i) => i.tipo === "proveedor");

          return [];
        };

        // Procesar Stats Generales
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data);
        }

        // Procesar Pendientes
        if (pendientesRes.status === "fulfilled") {
          const data = Array.isArray(pendientesRes.value.data)
            ? pendientesRes.value.data
            : [];
          setPendientes(filterByRole(data));
        }

        // Procesar Historial
        if (historialRes.status === "fulfilled") {
          const data = Array.isArray(historialRes.value.data)
            ? historialRes.value.data
            : [];
          setHistorial(filterByRole(data));
        }
      } catch (error) {
        console.error("Error general en dashboard:", error);
        // No mostramos toast de error para no saturar si falla algo menor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userRole]);

  // Permisos de visualización
  const showEmpleados =
    !userRole || ["admin", "super_admin", "admin_empleado"].includes(userRole);
  const showClientes =
    !userRole ||
    ["admin", "super_admin", "admin_cliente", "admin_clientes"].includes(
      userRole
    );
  const showProveedores =
    !userRole ||
    ["admin", "super_admin", "admin_proveedor", "admin_proveedores"].includes(
      userRole
    );

  // Cálculos para Gráficos
  const pendientesPorTipo = useMemo(() => {
    const counts = { empleado: 0, cliente: 0, proveedor: 0 };
    pendientes.forEach((p) => {
      if (counts[p.tipo] !== undefined) counts[p.tipo]++;
    });
    return counts;
  }, [pendientes]);

  const historialStatus = useMemo(() => {
    const counts = { aprobado: 0, rechazado: 0 };
    historial.forEach((h) => {
      const estado = h.estado || "pendiente";
      if (counts[estado] !== undefined) counts[estado]++;
    });
    return counts;
  }, [historial]);

  const actividadReciente = useMemo(() => {
    return [...historial]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [historial]);

  // Configuración de Gráficos
  const doughnutData = {
    labels: ["Empleados", "Clientes", "Proveedores"],
    datasets: [
      {
        data: [
          pendientesPorTipo.empleado,
          pendientesPorTipo.cliente,
          pendientesPorTipo.proveedor,
        ],
        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"],
        borderColor: ["#ffffff", "#ffffff", "#ffffff"],
        borderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: ["Aprobados", "Rechazados"],
    datasets: [
      {
        label: "Solicitudes",
        data: [historialStatus.aprobado, historialStatus.rechazado],
        backgroundColor: ["#10b981", "#ef4444"],
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  if (loading) return <Loader />;

  return (
    <div className="admin-cont-dashboard-container">
      {/* Accesos Rápidos */}
      <div className="dashboard-quick-actions">
        <div
          className="quick-action-card blue"
          onClick={() => onNavigate && onNavigate("tokens")}
        >
          <div className="icon-wrapper">
            <FaKey />
          </div>
          <div className="content">
            <h3>Gestión de Tokens</h3>
            <p>Generar accesos</p>
          </div>
          <FaArrowRight className="arrow" />
        </div>
        <div
          className="quick-action-card green"
          onClick={() => onNavigate && onNavigate("aprobaciones")}
        >
          <div className="icon-wrapper">
            <FaCheckCircle />
          </div>
          <div className="content">
            <h3>Aprobaciones</h3>
            <p>{pendientes.length} pendientes</p>
          </div>
          <FaArrowRight className="arrow" />
        </div>
      </div>

      {/* Tarjetas Superiores */}
      <div className="admin-cont-dashboard-grid">
        {showEmpleados && (
          <StatCard
            icon={<FaUsers />}
            label="Empleados"
            value={stats?.totalEmpleados || 0}
          />
        )}
        {showProveedores && (
          <StatCard
            icon={<FaHardHat />}
            label="Proveedores"
            value={stats?.totalProveedores || 0}
          />
        )}
        {showClientes && (
          <StatCard
            icon={<FaUserTie />}
            label="Clientes"
            value={stats?.totalClientes || 0}
          />
        )}
        <StatCard
          icon={<FaClock />}
          label="Pendientes"
          value={pendientes.length}
        />
      </div>

      {/* Gráficos */}
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card">
          <h3>Solicitudes Pendientes por Tipo</h3>
          <div className="chart-container">
            {pendientes.length > 0 ? (
              <Doughnut
                data={doughnutData}
                options={{ maintainAspectRatio: false }}
              />
            ) : (
              <div
                className="admin-cont-empty-message"
                style={{ padding: "2rem" }}
              >
                <FaCheckCircle size={40} color="#10b981" />
                <p>¡Todo al día! No hay pendientes.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-chart-card">
          <h3>Resumen de Gestión (Historial)</h3>
          <div className="chart-container">
            {historial.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div
                className="admin-cont-empty-message"
                style={{ padding: "2rem" }}
              >
                <FaClipboardList size={40} color="#9ca3af" />
                <p>No hay historial de gestión aún.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="dashboard-recent-activity">
        <h3>Actividad Reciente</h3>
        {actividadReciente.length > 0 ? (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {actividadReciente.map((item) => (
                <tr key={item.id}>
                  <td style={{ textTransform: "capitalize" }}>{item.tipo}</td>
                  <td>
                    {new Date(item.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td>
                    <span className={`status-badge ${item.estado}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td>
                    {item.motivo_rechazo ? (
                      <span title={item.motivo_rechazo}>
                        Rechazado: {item.motivo_rechazo.substring(0, 30)}...
                      </span>
                    ) : item.estado === "aprobado" ? (
                      "Aprobado exitosamente"
                    ) : (
                      "En revisión"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem" }}>
            No hay actividad reciente para mostrar.
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
