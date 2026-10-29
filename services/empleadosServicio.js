// Nomina activa para consumo servicio-a-servicio (Horarios). Lista blanca
// estricta: cedula, nombre, cargo, sede, activo y restriccionOperativa. Nunca
// el texto libre `restricciones` (dato sensible, solo RRHH), ni contacto,
// contrato o salario.
import { obtenerContratos } from "./contratosSiesaService.js";
import { obtenerRestriccionesOperativas } from "./restriccionesService.js";
import { normalizarCedula } from "./empleadosSiesaService.js";

const paraServicio = (contrato, operativas) => ({
  cedula: contrato.cedula,
  nombre: contrato.nombre,
  cargo: contrato.cargo,
  sede: contrato.sede,
  activo: true,
  restriccionOperativa: operativas.get(normalizarCedula(contrato.cedula)) || null,
});

/**
 * Si cualquiera de las dos lecturas falla, falla todo: devolver filas con
 * `restriccionOperativa: null` por un error de lectura se leeria como "sin
 * restriccion".
 * @returns {Promise<{ data: object[], actualizado: string }>}
 */
export const listarEmpleadosActivosServicio = async () => {
  const [{ contratos, actualizado }, operativas] = await Promise.all([
    obtenerContratos(),
    obtenerRestriccionesOperativas(),
  ]);
  const data = Object.values(contratos)
    .filter((c) => c.estado === "activo")
    .map((c) => paraServicio(c, operativas));
  return { data, actualizado };
};
