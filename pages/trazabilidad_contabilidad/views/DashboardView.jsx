// src/pages/trazabilidad_contabilidad/views/DashboardView.jsx
import React, { useState, useEffect } from 'react';
import { FaUsers, FaHardHat, FaUserTie } from 'react-icons/fa';
import { apiTrazabilidad as api } from '../../../services/apiTrazabilidad';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';

const DashboardView = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const { data } = await api.get("/trazabilidad/admin/dashboard-stats");
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
                toast.error("No se pudieron cargar las estadísticas.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="admin-cont-dashboard-grid">
            <StatCard icon={<FaUsers />} label="Empleados Creados" value={stats?.totalEmpleados || 0} />
            <StatCard icon={<FaHardHat />} label="Proveedores Creados" value={stats?.totalProveedores || 0} />
            <StatCard icon={<FaUserTie />} label="Clientes Creados" value={stats?.totalClientes || 0} />
        </div>
    );
};

export default DashboardView;