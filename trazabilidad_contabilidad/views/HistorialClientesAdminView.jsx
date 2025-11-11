// src/pages/trazabilidad_contabilidad/views/HistorialClientesAdminView.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiTrazabilidad as api } from '../../../services/apiTrazabilidad';
import { format, parseISO } from 'date-fns';
import { FaUser } from 'react-icons/fa';

// Importación de componentes reutilizables
import Loader from '../components/Loader';
import MensajeVacio from '../components/MensajeVacio';
import HistorialTabla from '../components/HistorialTabla';
import AdminDocLink from '../components/AdminDocLink';

const HistorialClientesAdminView = ({ onPreview }) => { 
    // 1. Definición de Estado
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    // 2. Efecto para Cargar Datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // El endpoint de admin ya trae todos los campos (select=*)
                const { data } = await api.get("/trazabilidad/admin/historial-clientes");
                setHistorial(data || []);
            } catch (error) {
                console.error("Error al cargar el historial de clientes:", error);
                toast.error("Error al cargar el historial de clientes.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []); // Se ejecuta una vez al montar el componente

    // 3. Manejo de Estados de Carga y Vacío
    if (loading) {
        return <Loader />;
    }
    
    if (historial.length === 0) {
        return <MensajeVacio mensaje="No se han creado clientes." />;
    }

    // 4. Renderizado del Componente
    return (
        <div className="admin-cont-historial-wrapper">
            <HistorialTabla>
                <thead>
                    <tr className="admin-cont-table-header-centered">
                        <th>Creado por</th>
                        <th>Fecha Creación</th>
                        <th>Cupo</th>
                        <th>Plazo</th>
                        <th>Documentos (Ver)</th>
                    </tr>
                </thead>
                <tbody>
                    {historial.map(cli => (
                        <tr key={cli.id}>
                            <td className="admin-cont-cell-centered">
                                <div className="user-cell">
                                    <FaUser />
                                    {cli.profiles?.nombre || 'N/A'}
                                </div>
                            </td>
                            <td className="admin-cont-cell-centered">
                                {format(parseISO(cli.created_at), 'dd/MM/yy hh:mm a')}
                            </td>
                            <td className="admin-cont-cell-centered">
                                {cli.cupo || 'N/A'}
                            </td>
                            <td className="admin-cont-cell-centered">
                                {cli.plazo || 'N/A'}
                            </td>
                            <td className="admin-cont-doc-cell admin-cont-cell-centered">
                                {/* Mapeo de todos los documentos del cliente */}
                                <AdminDocLink url={cli.url_rut} label="RUT" onPreview={onPreview} />
                                <AdminDocLink url={cli.url_camara_comercio} label="C. Comercio" onPreview={onPreview} />
                                <AdminDocLink url={cli.url_formato_sangrilaft} label="F. Sangrilaft" onPreview={onPreview} />
                                <AdminDocLink url={cli.url_cedula} label="Cédula" onPreview={onPreview} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </HistorialTabla>
        </div>
    );
};

export default HistorialClientesAdminView;