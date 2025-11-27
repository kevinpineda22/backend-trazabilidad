// src/components/MonitorActividad/MonitorActividad.jsx

import React, { useState, useEffect } from "react";
import { supabase, supabaseQuery } from "../../supabaseClient";
import { 
  FaUserCheck, 
  FaRoute, 
  FaClock, 
  FaRedo, 
  FaUsers, 
  FaChartLine, 
  FaFilter,
  FaSearch,
  FaCircle,
  FaEye,
  FaCalendarAlt
} from "react-icons/fa";
import "./MonitorActividad.css";

export const MonitorActividad = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActiveUsers = async () => {
    setLoading(true);
    
    // Usuarios activos (últimos 5 minutos)
    const activeThreshold = new Date(Date.now() - 300000).toISOString();
    
    const { data: activeData, error: activeError } = await supabaseQuery(() =>
      supabase
        .from('user_activity')
        .select('*')
        .gte('last_active_at', activeThreshold)
        .eq('is_active', true)
        .order('last_active_at', { ascending: false })
    );

    // Todos los usuarios (últimas 24 horas para histórico)
    const historicThreshold = new Date(Date.now() - 86400000).toISOString();
    
    const { data: allData, error: allError } = await supabaseQuery(() =>
      supabase
        .from('user_activity')
        .select('*')
        .gte('last_active_at', historicThreshold)
        .order('last_active_at', { ascending: false })
    );

    if (activeError || allError) {
      console.error("Error al cargar actividad:", activeError || allError);
      setActiveUsers([]);
      setAllUsers([]);
    } else {
      setActiveUsers(activeData || []);
      setAllUsers(allData || []);
    }
    
    setLoading(false);
    setLastFetch(Date.now());
  };

  useEffect(() => {
    fetchActiveUsers();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(fetchActiveUsers, 15000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  // Filtros aplicados
  const filteredUsers = (showOnlyActive ? activeUsers : allUsers).filter(user => {
    const matchesSearch = user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.current_route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoute = !filterRoute || user.current_route.includes(filterRoute);
    return matchesSearch && matchesRoute;
  });

  // Obtener rutas únicas para el filtro
  const uniqueRoutes = [...new Set(allUsers.map(user => user.current_route))].sort();

  const formatTime = (isoTime) => {
    const date = new Date(isoTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes < 1) return "Ahora mismo";
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isRecentlyActive = (lastActiveTime) => {
    const diffMinutes = Math.floor((Date.now() - new Date(lastActiveTime)) / 60000);
    return diffMinutes < 5;
  };

  const getRouteDisplayName = (route) => {
    const routeNames = {
      '/acceso': 'Panel Principal',
      '/gastos': 'Gestión de Gastos',
      '/transporte': 'Transporte',
      '/dashboards': 'Dashboards',
      '/adminUsuarios': 'Admin Usuarios',
      '/monitorActividad': 'Monitor Actividad',
      '/mantenimiento': 'Mantenimiento'
    };
    return routeNames[route] || route;
  };

  return (
    <div className="monitor-container">
      <div className="monitor-header">
        <div className="monitor-title-section">
          <h2 className="monitor-title">
            <FaUserCheck className="monitor-title-icon" />
            Monitor de Actividad en Tiempo Real
          </h2>
          <div className="monitor-stats">
            <div className="monitor-stat">
              <FaUsers className="monitor-stat-icon active" />
              <span className="monitor-stat-number">{activeUsers.length}</span>
              <span className="monitor-stat-label">Activos</span>
            </div>
            <div className="monitor-stat">
              <FaChartLine className="monitor-stat-icon total" />
              <span className="monitor-stat-number">{allUsers.length}</span>
              <span className="monitor-stat-label">Total (24h)</span>
            </div>
          </div>
        </div>

        <div className="monitor-controls">
          <div className="monitor-last-update">
            <FaClock className="monitor-clock-icon" />
            <span>Actualizado: {new Date(lastFetch).toLocaleTimeString()}</span>
          </div>
          
          <label className="monitor-auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <button 
            onClick={fetchActiveUsers} 
            disabled={loading} 
            className="monitor-refresh-btn"
          >
            <FaRedo className={loading ? 'spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="monitor-filters">
        <div className="monitor-search">
          <FaSearch className="monitor-search-icon" />
          <input
            type="text"
            placeholder="Buscar por usuario o ruta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="monitor-search-input"
          />
        </div>

        <select
          value={filterRoute}
          onChange={(e) => setFilterRoute(e.target.value)}
          className="monitor-route-filter"
        >
          <option value="">Todas las rutas</option>
          {uniqueRoutes.map(route => (
            <option key={route} value={route}>
              {getRouteDisplayName(route)}
            </option>
          ))}
        </select>

        <div className="monitor-view-toggle">
          <button
            className={showOnlyActive ? 'active' : ''}
            onClick={() => setShowOnlyActive(true)}
          >
            <FaEye /> Solo Activos
          </button>
          <button
            className={!showOnlyActive ? 'active' : ''}
            onClick={() => setShowOnlyActive(false)}
          >
            <FaCalendarAlt /> Histórico
          </button>
        </div>
      </div>

      <div className="monitor-grid">
        {filteredUsers.length === 0 ? (
          <div className="monitor-no-data">
            <FaUsers className="monitor-no-data-icon" />
            <h3>No hay actividad</h3>
            <p>
              {showOnlyActive 
                ? "No se detectaron usuarios activos en este momento."
                : "No hay registros que coincidan con los filtros aplicados."
              }
            </p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div 
              key={user.user_id} 
              className={`monitor-card ${isRecentlyActive(user.last_active_at) ? 'active' : 'inactive'}`}
            >
              <div className="monitor-card-header">
                <div className="monitor-card-status">
                  <FaCircle className={`monitor-status-dot ${isRecentlyActive(user.last_active_at) ? 'active' : 'inactive'}`} />
                  <h4 className="monitor-card-name">{user.user_name}</h4>
                </div>
                <span className="monitor-card-time">
                  {formatTime(user.last_active_at)}
                </span>
              </div>

              <div className="monitor-card-body">
                <div className="monitor-card-route">
                  <FaRoute className="monitor-card-icon" />
                  <div>
                    <span className="monitor-route-name">
                      {getRouteDisplayName(user.current_route)}
                    </span>
                    <span className="monitor-route-path">{user.current_route}</span>
                  </div>
                </div>
              </div>

              <div className="monitor-card-footer">
                <span className={`monitor-activity-badge ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredUsers.length > 0 && (
        <div className="monitor-footer">
          <p className="monitor-footer-text">
            Mostrando {filteredUsers.length} de {showOnlyActive ? activeUsers.length : allUsers.length} usuarios
          </p>
        </div>
      )}
    </div>
  );
};