-- ============================================================================
-- Índices optimizados para consultas de epicrisis
-- Descripción: Índices compuestos para mejorar rendimiento de consultas
-- ============================================================================

-- ============================================================================
-- ÍNDICES PARA TABLA ATENCIONES
-- ============================================================================

-- Índice principal para búsqueda de episodios
CREATE INDEX idx_atenciones_episodio ON atenciones(id_episodio);

-- Índice para búsqueda por paciente
CREATE INDEX idx_atenciones_paciente ON atenciones(id_paciente, fecha_ingreso DESC);

-- Índice para episodios con alta
CREATE INDEX idx_atenciones_alta ON atenciones(estado, fecha_alta)
WHERE estado = 'ALTA';


-- ============================================================================
-- ÍNDICES PARA TABLA DIAGNÓSTICOS
-- ============================================================================

-- Índice compuesto para diagnósticos por episodio y tipo
CREATE INDEX idx_diagnosticos_episodio_tipo ON diagnosticos(id_episodio, tipo, fecha_registro);

-- Índice para búsqueda por código CIE-10
CREATE INDEX idx_diagnosticos_cie10 ON diagnosticos(codigo_cie10);


-- ============================================================================
-- ÍNDICES PARA TABLA PROCEDIMIENTOS
-- ============================================================================

-- Índice compuesto para procedimientos por episodio
CREATE INDEX idx_procedimientos_episodio ON procedimientos(id_episodio, fecha_realizacion);

-- Índice para búsqueda por código
CREATE INDEX idx_procedimientos_codigo ON procedimientos(codigo);


-- ============================================================================
-- ÍNDICES PARA TABLA MEDICAMENTOS_HOSPITALARIOS
-- ============================================================================

-- Índice para medicamentos activos por episodio
CREATE INDEX idx_meds_hosp_episodio ON medicamentos_hospitalarios(id_episodio, activo, fecha_inicio);

-- Índice para búsqueda por código ATC
CREATE INDEX idx_meds_hosp_atc ON medicamentos_hospitalarios(codigo_atc);


-- ============================================================================
-- ÍNDICES PARA TABLA MEDICAMENTOS_ALTA
-- ============================================================================

-- Índice para medicamentos de alta por episodio
CREATE INDEX idx_meds_alta_episodio ON medicamentos_alta(id_episodio, orden);


-- ============================================================================
-- ÍNDICES PARA TABLA EVOLUCIONES
-- ============================================================================

-- Índice compuesto para evoluciones por episodio y fecha
CREATE INDEX idx_evoluciones_episodio ON evoluciones(id_episodio, fecha_registro);

-- Índice para búsqueda por paciente
CREATE INDEX idx_evoluciones_paciente ON evoluciones(id_paciente, fecha_registro);


-- ============================================================================
-- ÍNDICES PARA TABLA LABORATORIOS
-- ============================================================================

-- Índice para laboratorios relevantes por episodio
CREATE INDEX idx_labs_episodio_relevante ON laboratorios(id_episodio, es_relevante, fecha_resultado);

-- Índice para búsqueda por tipo de examen
CREATE INDEX idx_labs_examen ON laboratorios(codigo_examen);


-- ============================================================================
-- ÍNDICES PARA TABLA CONTROLES_ALTA
-- ============================================================================

CREATE INDEX idx_controles_episodio ON controles_alta(id_episodio, fecha_control);


-- ============================================================================
-- ÍNDICES PARA TABLA RECOMENDACIONES_ALTA
-- ============================================================================

CREATE INDEX idx_recomendaciones_episodio ON recomendaciones_alta(id_episodio, orden);


-- ============================================================================
-- ESTADÍSTICAS
-- ============================================================================

-- Recopilar estadísticas para el optimizador
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'ATENCIONES',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'DIAGNOSTICOS',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'PROCEDIMIENTOS',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'MEDICAMENTOS_HOSPITALARIOS',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'MEDICAMENTOS_ALTA',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'EVOLUCIONES',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'LABORATORIOS',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );
END;
/

-- Verificar índices creados
SELECT index_name, table_name, uniqueness, status
FROM user_indexes
WHERE table_name IN (
  'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA', 'RECOMENDACIONES_ALTA'
)
ORDER BY table_name, index_name;
