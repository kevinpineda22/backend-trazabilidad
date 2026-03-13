import colombiaData from "colombia-data-social/data/colombia.json";

export const DEPARTMENTS = colombiaData.departamentos.map((dep) => ({
  code: dep.codigo,
  name: dep.nombre,
  cities: dep.municipios.map((city) => ({
    code: city.codigo,
    name: city.nombre,
  })),
}));

export const findDepartmentByCode = (code) =>
  DEPARTMENTS.find((dep) => dep.code === code);

export const findDepartmentByName = (name) =>
  DEPARTMENTS.find((dep) => dep.name.toLowerCase() === name.toLowerCase());

export const findCity = ({ departmentCode, cityCode, cityName }) => {
  const department = departmentCode
    ? findDepartmentByCode(departmentCode)
    : nameLookup(cityName);
  if (!department) return null;
  if (cityCode) {
    return department.cities.find((city) => city.code === cityCode) || null;
  }
  if (cityName) {
    const target = cityName.toLowerCase();
    return (
      department.cities.find((city) => city.name.toLowerCase() === target) ||
      null
    );
  }
  return null;
};

function nameLookup(cityName) {
  if (!cityName) return null;
  const target = cityName.toLowerCase();
  return (
    DEPARTMENTS.find((dep) =>
      dep.cities.some((city) => city.name.toLowerCase() === target)
    ) || null
  );
}
