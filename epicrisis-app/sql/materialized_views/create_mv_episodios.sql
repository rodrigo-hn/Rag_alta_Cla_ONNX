-- ============================================================================
-- Materialized View: mv_episodios_resumen
-- Descripción: Vista materializada para acceso rápido a resúmenes de alta
-- ============================================================================

-- Crear log de cambios para refresh rápido
CREATE MATERIALIZED VIEW LOG ON atenciones
WITH ROWID, PRIMARY KEY
INCLUDING NEW VALUES;

CREATE MATERIALIZED VIEW LOG ON diagnosticos
WITH ROWID, PRIMARY KEY
INCLUDING NEW VALUES;

CREATE MATERIALIZED VIEW LOG ON procedimientos
WITH ROWID, PRIMARY KEY
INCLUDING NEW VALUES;

-- Crear Materialized View
CREATE MATERIALIZED VIEW mv_episodios_resumen
BUILD IMMEDIATE
REFRESH FAST ON COMMIT
ENABLE QUERY REWRITE
AS
SELECT
  a.id_episodio,
  a.id_paciente,
  a.fecha_ingreso,
  a.fecha_alta,
  a.motivo_ingreso,
  a.estado,
  -- Contar elementos para estadísticas
  (SELECT COUNT(*) FROM diagnosticos d WHERE d.id_episodio = a.id_episodio AND d.tipo = 'INGRESO') as num_dx_ingreso,
  (SELECT COUNT(*) FROM diagnosticos d WHERE d.id_episodio = a.id_episodio AND d.tipo = 'EGRESO') as num_dx_egreso,
  (SELECT COUNT(*) FROM procedimientos p WHERE p.id_episodio = a.id_episodio) as num_procedimientos,
  (SELECT COUNT(*) FROM evoluciones e WHERE e.id_episodio = a.id_episodio) as num_evoluciones,
  (SELECT COUNT(*) FROM laboratorios l WHERE l.id_episodio = a.id_episodio AND l.es_relevante = 'S') as num_labs_relevantes,
  (SELECT COUNT(*) FROM medicamentos_alta m WHERE m.id_episodio = a.id_episodio) as num_meds_alta,
  -- Días de estancia
  CASE
    WHEN a.fecha_alta IS NOT NULL THEN
      a.fecha_alta - a.fecha_ingreso
    ELSE
      SYSDATE - a.fecha_ingreso
  END as dias_estancia,
  -- Timestamp de última modificación
  GREATEST(
    a.fecha_modificacion,
    NVL((SELECT MAX(d.fecha_registro) FROM diagnosticos d WHERE d.id_episodio = a.id_episodio), a.fecha_modificacion),
    NVL((SELECT MAX(p.fecha_realizacion) FROM procedimientos p WHERE p.id_episodio = a.id_episodio), a.fecha_modificacion)
  ) as ultima_modificacion
FROM atenciones a
WHERE a.estado IN ('ALTA', 'EN_PROCESO');

-- Índices para la vista materializada
CREATE INDEX idx_mv_episodios_id ON mv_episodios_resumen(id_episodio);
CREATE INDEX idx_mv_episodios_paciente ON mv_episodios_resumen(id_paciente);
CREATE INDEX idx_mv_episodios_alta ON mv_episodios_resumen(fecha_alta DESC);
CREATE INDEX idx_mv_episodios_estado ON mv_episodios_resumen(estado);

-- Comentario
COMMENT ON MATERIALIZED VIEW mv_episodios_resumen IS
'Vista materializada con resumen de episodios para generación rápida de epicrisis';

-- Estadísticas
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'MV_EPISODIOS_RESUMEN',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE
  );
END;
/

-- ============================================================================
-- Materialized View: mv_json_epicrisis_cache
-- Descripción: Caché de JSON de epicrisis pre-generados
-- ============================================================================

CREATE MATERIALIZED VIEW mv_json_epicrisis_cache
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT
  a.id_episodio,
  a.id_paciente,
  a.fecha_alta,
  get_discharge_summary_json(a.id_episodio) as json_clinico,
  SYSDATE as fecha_generacion
FROM atenciones a
WHERE a.estado = 'ALTA'
  AND a.fecha_alta >= SYSDATE - 30; -- Solo últimos 30 días

-- Índice
CREATE INDEX idx_mv_json_episodio ON mv_json_epicrisis_cache(id_episodio);

-- Job para refresh automático cada hora
BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'JOB_REFRESH_MV_JSON_EPICRISIS',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN DBMS_MVIEW.REFRESH(''MV_JSON_EPICRISIS_CACHE'', ''C''); END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=HOURLY; INTERVAL=1',
    enabled         => TRUE,
    comments        => 'Refresh de caché JSON de epicrisis cada hora'
  );
END;
/

-- Verificar vistas creadas
SELECT mview_name, refresh_mode, refresh_method, last_refresh_date
FROM user_mviews
WHERE mview_name LIKE 'MV_%'
ORDER BY mview_name;
