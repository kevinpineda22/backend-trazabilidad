-- Consulta de Connekta: merkahorro_merkahorro_empleados_contratos
-- (se registró como "merkahorro_empleados_contratos" y Connekta le antepuso
-- otro "merkahorro_"). La usa services/contratosSiesaService.js.
--
-- Copia de referencia: la consulta vive en Connekta, no acá. Si se edita
-- allá, actualizar este archivo. Connekta la envuelve en una subconsulta, así
-- que no admite ORDER BY al final (sí dentro de TOP / OVER).
SELECT
    c.nit AS nit,
    c.nombre_empleado AS nombre_empleado,
    c.c0550_id_cia AS id_cia,
    c.c0550_rowid AS rowid_contrato,
    c.contratos_total AS contratos_total,
    c.contratos_activos AS contratos_activos,
    co.f285_id AS id_co,
    co.f285_descripcion AS sede,
    c.c0550_rowid_cargo AS rowid_cargo,
    LTRIM(RTRIM(cg.c0763_id)) AS id_cargo,
    LTRIM(RTRIM(cg.c0763_descripcion)) AS cargo,
    c.c0550_id_motivo_retiro AS id_motivo_retiro,
    LTRIM(RTRIM(mr.c0555_descripcion)) AS motivo_retiro,
    c.c0550_ind_estado AS ind_estado_contrato,
    CASE WHEN c.c0550_fecha_retiro IS NULL THEN 'ACTIVO' ELSE 'RETIRADO' END AS estado,
    c.c0550_fecha_ingreso AS fecha_ingreso,
    c.c0550_fecha_retiro AS fecha_retiro,
    c.c0550_fecha_contrato_hasta AS fecha_fin_original,
    p.c0551_id AS ultima_prorroga_nro,
    CASE
        WHEN p.c0551_rowid_contrato IS NOT NULL THEN p.c0551_ind_indefinido
        WHEN c.c0550_fecha_contrato_hasta IS NULL THEN 1
        ELSE 0
    END AS es_indefinido,
    CASE
        WHEN p.c0551_rowid_contrato IS NOT NULL THEN p.c0551_fecha_final
        ELSE c.c0550_fecha_contrato_hasta
    END AS fecha_fin_contrato_vigente,
    -- Contacto del tercero. Verificado contra INFORMATION_SCHEMA el 2026-10-03:
    -- cuelga de t200.f200_rowid_contacto, NO de w0540_empleados.
    LTRIM(RTRIM(ct.f015_email)) AS correo,
    LTRIM(RTRIM(ct.f015_celular)) AS celular,
    LTRIM(RTRIM(ct.f015_telefono)) AS telefono,
    LTRIM(RTRIM(ct.f015_direccion1)) AS direccion,
    LTRIM(RTRIM(ba.f014_descripcion)) AS barrio,
    LTRIM(RTRIM(ci.f013_descripcion)) AS municipio
FROM (
    SELECT
        LTRIM(RTRIM(t.f200_id)) AS nit,
        LTRIM(RTRIM(t.f200_razon_social)) AS nombre_empleado,
        t.f200_rowid_contacto,
        x.c0550_rowid, x.c0550_id_cia, x.c0550_id_co, x.c0550_rowid_cargo,
        x.c0550_id_motivo_retiro, x.c0550_ind_estado, x.c0550_fecha_ingreso,
        x.c0550_fecha_retiro, x.c0550_fecha_contrato_hasta,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(t.f200_id))
            ORDER BY CASE WHEN x.c0550_fecha_retiro IS NULL THEN 0 ELSE 1 END,
                     x.c0550_fecha_ingreso DESC,
                     x.c0550_rowid DESC
        ) AS rn,
        COUNT(*) OVER (PARTITION BY LTRIM(RTRIM(t.f200_id))) AS contratos_total,
        SUM(CASE WHEN x.c0550_fecha_retiro IS NULL THEN 1 ELSE 0 END)
            OVER (PARTITION BY LTRIM(RTRIM(t.f200_id))) AS contratos_activos
    FROM dbo.w0550_contratos x
    INNER JOIN dbo.t200_mm_terceros t
        ON t.f200_rowid = x.c0550_rowid_tercero
       AND t.f200_id_cia = x.c0550_id_cia
) c
LEFT JOIN dbo.t285_co_centro_op co
    ON co.f285_id = c.c0550_id_co
   AND co.f285_id_cia = c.c0550_id_cia
LEFT JOIN dbo.w0763_gh01_cargos cg
    ON cg.c0763_rowid = c.c0550_rowid_cargo
LEFT JOIN dbo.w0555_motivos_retiro mr
    ON mr.c0555_id = c.c0550_id_motivo_retiro
LEFT JOIN dbo.t015_mm_contactos ct
    ON ct.f015_rowid = c.f200_rowid_contacto
LEFT JOIN dbo.t013_mm_ciudades ci
    ON ci.f013_id_pais = ct.f015_id_pais
   AND ci.f013_id_depto = ct.f015_id_depto
   AND ci.f013_id = ct.f015_id_ciudad
LEFT JOIN dbo.t014_mm_barrios ba
    ON ba.f014_id_pais = ct.f015_id_pais
   AND ba.f014_id_depto = ct.f015_id_depto
   AND ba.f014_id_ciudad = ct.f015_id_ciudad
   AND ba.f014_id = ct.f015_id_barrio
OUTER APPLY (
    SELECT TOP 1 pr.c0551_id, pr.c0551_fecha_final, pr.c0551_ind_indefinido, pr.c0551_rowid_contrato
    FROM dbo.w0551_contratos_prorrogas pr
    WHERE pr.c0551_rowid_contrato = c.c0550_rowid
    ORDER BY pr.c0551_id DESC
) p
WHERE c.rn = 1
