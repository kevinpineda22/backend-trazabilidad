import React, { useState, useRef, useCallback } from "react";
import { supabase, supabaseQuery } from "../../supabaseClient";
import {
  FaUserPlus,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronDown,
  FaFolderOpen,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaBriefcase,
  FaBuilding,
  FaEnvelope,
  FaUserCog,
  FaCog,
} from "react-icons/fa";
import masterRoutes from "../../data/masterRoutes";

const ROLES = [
  "super_admin",
  "admin",
  "empleado",
  "admin_empleado",
  "admin_cliente",
  "admin_proveedor",
];
const COMPANIES = ["Merkahorro", "Construahorro", "Megamayoristas"];
const API_URL = "https://pitpougbnibmfrjykzet.supabase.co/functions/v1";

// ✅ Definir los procesos por área
const procesosPorArea = {
  Comercial: [
    { value: "Comercial", label: "Comercial" },
    { value: "Marketing digital", label: "Marketing digital" },
    { value: "Lider", label: "Lider" },
  ],
  "Gestión humana": [
    {
      value: "Seguridad y Salud en el Trabajo",
      label: "Seguridad y Salud en el Trabajo",
    },
    { value: "Bienestar y Formación", label: "Bienestar y Formación" },
    { value: "Contratación", label: "Contratación" },
    { value: "Proceso de Selección", label: "Proceso de Selección" },
    { value: "Lider", label: "Lider" },
  ],
  Operaciones: [
    { value: "Logística", label: "Logística" },
    { value: "Inventarios", label: "Inventarios" },
    { value: "Sistemas", label: "Sistemas" },
    { value: "Desarrollo", label: "Desarrollo" },
    { value: "Procesos", label: "Procesos" },
    { value: "Fruver", label: "Fruver" },
    { value: "Cárnicos", label: "Cárnicos" },
    { value: "Proyectos", label: "Proyectos" },
    { value: "Operaciones-Comerciales", label: "Operaciones Comerciales" },
    { value: "Mantenimiento", label: "Mantenimiento" },
    { value: "Almacén", label: "Almacén" },
    { value: "Lider", label: "Lider" },
  ],
  Contabilidad: [{ value: "Contabilidad", label: "Contabilidad" }],
  Cartera: [
    { value: "Tesoreria", label: "Tesoreria" },
    { value: "Cartera", label: "Cartera" },
  ],
};

export const UserForm = ({ onUserSaved, editingUser, onCancelEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [allRoutes] = useState(masterRoutes);

  const [formData, setFormData] = useState(
    editingUser
      ? {
          nombre: editingUser.nombre || "",
          area: editingUser.area || "",
          email: editingUser.correo || "",
          password: "",
          role: editingUser.role || "empleado",
          company: editingUser.company || "",
          proceso: editingUser.proceso || "", // ✅ Cargar proceso desde editingUser
          isNew: false,
          uid: editingUser.user_id,
          selectedRoutes: editingUser.personal_routes?.map((r) => r.path) || [],
        }
      : {
          nombre: "",
          area: "",
          email: "",
          password: "",
          role: "empleado",
          company: "",
          proceso: "",
          isNew: true,
          uid: null,
          selectedRoutes: [],
        }
  );

  const formRef = useRef(null);

  // ✅ Obtener procesos disponibles según el área seleccionada
  const procesosDisponibles = formData.area
    ? procesosPorArea[formData.area] || []
    : [];

  const getRoutesByGroup = useCallback(() => {
    return allRoutes.reduce((acc, route) => {
      const group = route.group || "Otras";
      if (!acc[group]) acc[group] = [];
      acc[group].push(route);
      return acc;
    }, {});
  }, [allRoutes]);

  const resetForm = useCallback(() => {
    setFormData({
      nombre: "",
      area: "",
      email: "",
      password: "",
      role: "empleado",
      company: "",
      proceso: "",
      isNew: true,
      uid: null,
      selectedRoutes: [], // ✅ Incluir proceso
    });
    setIsEditingPermissions(false);
    setError(null);
    setStatus(null);
    if (onCancelEdit) onCancelEdit();
  }, [onCancelEdit]);

  const handleRouteToggle = (path) => {
    setFormData((prev) => {
      const isSelected = prev.selectedRoutes.includes(path);
      const newRoutes = isSelected
        ? prev.selectedRoutes.filter((p) => p !== path)
        : [...prev.selectedRoutes, path];
      return { ...prev, selectedRoutes: newRoutes };
    });
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    let newRoutes = [...formData.selectedRoutes];

    // Definir rutas sugeridas para los nuevos roles
    const suggestedRoutes = {
      admin_empleado: [
        "/trazabilidad/panel",
        "/trazabilidad/gestion-tokens",
        "/trazabilidad/aprobaciones",
        "/trazabilidad/crear-empleado",
      ],
      admin_cliente: [
        "/trazabilidad/panel",
        "/trazabilidad/gestion-tokens",
        "/trazabilidad/aprobaciones",
        "/trazabilidad/crear-cliente",
        "/trazabilidad/crear-proveedor",
      ],
      admin_proveedor: [
        "/trazabilidad/panel",
        "/trazabilidad/gestion-tokens",
        "/trazabilidad/aprobaciones",
        "/trazabilidad/crear-proveedor",
        "/trazabilidad/crear-cliente",
      ],
    };

    if (suggestedRoutes[newRole]) {
      // Agregar rutas sugeridas si no están ya seleccionadas
      const routesToAdd = suggestedRoutes[newRole].filter(
        (r) => !newRoutes.includes(r)
      );
      newRoutes = [...newRoutes, ...routesToAdd];
    }

    setFormData({
      ...formData,
      role: newRole,
      selectedRoutes: newRoutes,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Sesión requerida.");
      setLoading(false);
      return;
    }

    try {
      if (formData.isNew) {
        if (!formData.password)
          throw new Error("La contraseña es obligatoria.");

        const response = await fetch(`${API_URL}/create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nombre: formData.nombre,
            area: formData.area,
            role: formData.role,
            company: formData.company,
            proceso: formData.proceso || null, // ✅ NUEVO: Incluir proceso
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Fallo en la creación (Edge Function)."
          );
        }
        setStatus(
          "Usuario creado con éxito. Rutas iniciales asignadas por Rol."
        );
      } else {
        const routesToSave =
          formData.selectedRoutes.length > 0
            ? formData.selectedRoutes.map(
                (path) =>
                  allRoutes.find((r) => r.path === path) || {
                    path,
                    label: "Ruta Desconocida",
                  }
              )
            : null;

        const updatePayload = {
          nombre: formData.nombre,
          area: formData.area,
          company: formData.company,
          role: formData.role,
          personal_routes: routesToSave,
          proceso: formData.proceso || null, // ✅ NUEVO: Incluir proceso
        };

        if (formData.password) {
          await supabase.auth.admin.updateUserById(formData.uid, {
            password: formData.password,
          });
        }

        const { error: updateError } = await supabaseQuery(() =>
          supabase
            .from("profiles")
            .update(updatePayload)
            .eq("user_id", formData.uid)
        );

        if (updateError) throw updateError;

        setStatus("Usuario y rutas actualizados con éxito.");
      }

      resetForm();
      if (onUserSaved) onUserSaved();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Actualizar formData cuando cambie editingUser
  React.useEffect(() => {
    if (editingUser) {
      console.log("📋 Usuario a editar completo:", editingUser);

      setFormData({
        nombre: editingUser.nombre || "",
        area: editingUser.area || "", // ✅ IMPORTANTE: Cargar área primero
        email: editingUser.correo || "",
        password: "",
        role: editingUser.role || "empleado",
        company: editingUser.company || "",
        proceso: editingUser.proceso || "", // ✅ Cargar proceso después del área
        isNew: false,
        uid: editingUser.user_id,
        selectedRoutes: editingUser.personal_routes?.map((r) => r.path) || [],
      });

      setIsEditingPermissions(true);
      setError(null);
      setStatus(null);

      // ✅ NUEVO: Log de depuración mejorado
      console.log("📋 Datos cargados en formulario:", {
        area: editingUser.area,
        proceso: editingUser.proceso,
        procesosDisponibles: procesosPorArea[editingUser.area] || [],
      });

      // Scroll al formulario
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  }, [editingUser]);

  return (
    <div ref={formRef} className="admin-ug-card">
      <h3 className="admin-ug-card-title">
        {formData.isNew
          ? "Crear Nuevo Usuario"
          : `Editando: ${formData.nombre}`}
      </h3>

      {/* Feedback */}
      {status && (
        <p className="admin-ug-success">
          <FaCheckCircle /> {status}
        </p>
      )}
      {error && (
        <p className="admin-ug-error">
          <FaTimesCircle /> {error}
        </p>
      )}

      <form onSubmit={handleSave} className="admin-ug-form">
        <div className="admin-ug-form-grid">
          <div className="admin-ug-input-group">
            <FaUser className="admin-ug-input-icon" />
            <input
              name="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Nombre Completo"
              required
            />
          </div>

          {/* ✅ CAMBIO: Usar select en lugar de input libre */}
          <div className="admin-ug-input-group">
            <FaBriefcase className="admin-ug-input-icon" />
            <select
              name="area"
              value={formData.area}
              onChange={(e) => {
                const newArea = e.target.value;
                setFormData({
                  ...formData,
                  area: newArea,
                  proceso: "", // Limpiar proceso cuando cambia el área
                });
              }}
              required
            >
              <option value="">Selecciona un Área...</option>
              <option value="Comercial">Comercial</option>
              <option value="Gestión humana">Gestión humana</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Contabilidad">Contabilidad</option>
              <option value="Cartera">Cartera</option>
            </select>
          </div>

          {/* ✅ Campo Proceso - Se muestra cuando hay área seleccionada */}
          {formData.area && procesosDisponibles.length > 0 && (
            <div className="admin-ug-input-group">
              <FaCog className="admin-ug-input-icon" />
              <select
                name="proceso"
                value={formData.proceso}
                onChange={(e) =>
                  setFormData({ ...formData, proceso: e.target.value })
                }
              >
                <option value="">Selecciona un Proceso...</option>
                {procesosDisponibles.map((proceso) => (
                  <option key={proceso.value} value={proceso.value}>
                    {proceso.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="admin-ug-input-group">
            <FaBuilding className="admin-ug-input-icon" />
            <select
              name="company"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
            >
              <option value="">Seleccionar Empresa</option>
              {COMPANIES.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-ug-input-group">
            <FaEnvelope className="admin-ug-input-icon" />
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Correo Electrónico"
              required
              disabled={!formData.isNew}
              autoComplete="email" // ✅ Agregar autocomplete
            />
          </div>

          <div className="admin-ug-input-group admin-ug-password-group">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder={
                formData.isNew
                  ? "Contraseña (obligatoria)"
                  : "Nueva Contraseña (opcional)"
              }
              autoComplete={
                formData.isNew ? "new-password" : "current-password"
              } // ✅ Agregar autocomplete
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="admin-ug-password-toggle"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="admin-ug-input-group">
            <FaUserCog className="admin-ug-input-icon" />
            <select
              name="role"
              value={formData.role}
              onChange={handleRoleChange}
              required
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-ug-permission-toggle">
          <button
            type="button"
            className="admin-ug-toggle-btn"
            onClick={() => setIsEditingPermissions((p) => !p)}
          >
            {isEditingPermissions ? (
              <>
                <FaChevronDown /> Ocultar Rutas
              </>
            ) : (
              <>
                <FaFolderOpen />{" "}
                {formData.isNew
                  ? "Personalizar Rutas (Opcional)"
                  : "Modificar Rutas Personalizadas"}
              </>
            )}
          </button>
        </div>

        {isEditingPermissions && (
          <div className="admin-ug-permissions-section">
            <h4 className="admin-ug-permissions-title">
              Rutas Personalizadas (Anulan el Rol Base)
            </h4>
            <div className="admin-ug-route-groups-container">
              {Object.entries(getRoutesByGroup()).map(([group, routes]) => (
                <div key={group} className="admin-ug-route-group-card">
                  <div className="admin-ug-group-header">
                    <h5 className="admin-ug-group-title">{group}</h5>
                    <button
                      type="button"
                      className="admin-ug-group-select-all"
                      onClick={() => {
                        const groupPaths = routes.map((r) => r.path);
                        const allSelected = groupPaths.every((p) =>
                          formData.selectedRoutes.includes(p)
                        );
                        setFormData((prev) => ({
                          ...prev,
                          selectedRoutes: allSelected
                            ? prev.selectedRoutes.filter(
                                (p) => !groupPaths.includes(p)
                              )
                            : [
                                ...new Set([
                                  ...prev.selectedRoutes,
                                  ...groupPaths,
                                ]),
                              ],
                        }));
                      }}
                    >
                      {routes.every((r) =>
                        formData.selectedRoutes.includes(r.path)
                      )
                        ? "Deseleccionar Todo"
                        : "Seleccionar Todo"}
                    </button>
                  </div>
                  <div className="admin-ug-route-checkboxes">
                    {routes.map((route) => (
                      <label
                        key={route.path}
                        className="admin-ug-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedRoutes.includes(route.path)}
                          onChange={() => handleRouteToggle(route.path)}
                        />
                        <span className="admin-ug-checkbox-text">
                          {route.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-ug-clear-btn"
              onClick={() => setFormData({ ...formData, selectedRoutes: [] })}
            >
              Limpiar Rutas (Usar Rol Base)
            </button>
          </div>
        )}

        <div className="admin-ug-form-actions">
          <button
            type="submit"
            disabled={loading}
            className="admin-ug-submit-btn"
          >
            {loading ? (
              "Procesando..."
            ) : formData.isNew ? (
              <>
                <FaUserPlus /> Crear Usuario
              </>
            ) : (
              <>
                <FaEdit /> Guardar Cambios
              </>
            )}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="admin-ug-cancel-btn"
          >
            {formData.isNew ? "Limpiar" : "Cancelar Edición"}
          </button>
        </div>
      </form>
    </div>
  );
};
