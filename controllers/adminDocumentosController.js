import { supabaseAxios } from "../services/supabaseClient.js";

export const listarDocumentos = async (req, res) => {
  try {
    const { data, error } = await supabaseAxios.get(
      "/admin_documentos?select=*&order=created_at.desc"
    );
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al listar documentos:", error);
    res
      .status(500)
      .json({ message: "Error al listar documentos", error: error.message });
  }
};

export const listarDocumentosPublicos = async (req, res) => {
  try {
    const { tipo } = req.params; // 'cliente' o 'proveedor'
    // Traer documentos que sean del tipo especifico O 'ambos'
    const { data, error } = await supabaseAxios.get(
      `/admin_documentos?or=(tipo_destino.eq.${tipo},tipo_destino.eq.ambos)&select=*&order=created_at.desc`
    );

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al listar documentos públicos:", error);
    res
      .status(500)
      .json({ message: "Error al listar documentos", error: error.message });
  }
};

export const crearDocumento = async (req, res) => {
  try {
    const { nombre_archivo, url_archivo, tipo_destino } = req.body;
    const uploaded_by = req.user?.id;

    if (!nombre_archivo || !url_archivo || !tipo_destino) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    const { data, error } = await supabaseAxios.post(
      "/admin_documentos",
      {
        nombre_archivo,
        url_archivo,
        tipo_destino,
        uploaded_by,
      },
      { headers: { Prefer: "return=representation" } }
    );

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error al crear documento:", error);
    res
      .status(500)
      .json({ message: "Error al crear documento", error: error.message });
  }
};

export const eliminarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAxios.delete(
      `/admin_documentos?id=eq.${id}`
    );
    if (error) throw error;
    res.json({ message: "Documento eliminado" });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar documento", error: error.message });
  }
};
