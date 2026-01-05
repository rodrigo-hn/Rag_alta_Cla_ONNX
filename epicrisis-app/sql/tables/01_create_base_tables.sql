-- ============================================================================
-- CREACIÓN DE TABLAS BASE - Sistema Epicrisis Automática
-- Descripción: Tablas principales del sistema de información hospitalaria
-- Orden de ejecución: 1 (primero)
-- ============================================================================

-- ============================================================================
-- TABLA: PACIENTES
-- Descripción: Información demográfica de pacientes
-- ============================================================================

CREATE TABLE pacientes (
  id_paciente         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rut                 VARCHAR2(12) NOT NULL UNIQUE,
  nombre              VARCHAR2(100) NOT NULL,
  apellido_paterno    VARCHAR2(100) NOT NULL,
  apellido_materno    VARCHAR2(100),
  fecha_nacimiento    DATE NOT NULL,
  sexo                CHAR(1) NOT NULL,
  telefono            VARCHAR2(20),
  email               VARCHAR2(100),
  direccion           VARCHAR2(200),
  comuna              VARCHAR2(100),
  region              VARCHAR2(100),
  prevision           VARCHAR2(50),
  fecha_creacion      DATE DEFAULT SYSDATE,
  fecha_modificacion  DATE DEFAULT SYSDATE,
  activo              CHAR(1) DEFAULT 'S',
  --
  CONSTRAINT chk_paciente_sexo CHECK (sexo IN ('M', 'F', 'O')),
  CONSTRAINT chk_paciente_activo CHECK (activo IN ('S', 'N'))
);

-- Índices
CREATE INDEX idx_pacientes_rut ON pacientes(rut);
CREATE INDEX idx_pacientes_nombre ON pacientes(UPPER(nombre), UPPER(apellido_paterno));

-- Comentarios
COMMENT ON TABLE pacientes IS 'Información demográfica de pacientes del hospital';
COMMENT ON COLUMN pacientes.rut IS 'RUT chileno sin puntos, con guión (12345678-9)';
COMMENT ON COLUMN pacientes.prevision IS 'FONASA, ISAPRE, PARTICULAR, etc.';


-- ============================================================================
-- TABLA: ATENCIONES (EPISODIOS DE HOSPITALIZACIÓN)
-- Descripción: Episodios de atención/hospitalización
-- ============================================================================

CREATE TABLE atenciones (
  id_episodio         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente         NUMBER NOT NULL,
  folio               VARCHAR2(50) UNIQUE,
  fecha_ingreso       DATE NOT NULL,
  fecha_alta          DATE,
  motivo_ingreso      VARCHAR2(4000),
  servicio_ingreso    VARCHAR2(100),
  cama                VARCHAR2(20),
  estado              VARCHAR2(20) DEFAULT 'EN_PROCESO',
  tipo_alta           VARCHAR2(50),
  destino_alta        VARCHAR2(100),
  medico_tratante     VARCHAR2(200),
  fecha_creacion      DATE DEFAULT SYSDATE,
  fecha_modificacion  DATE DEFAULT SYSDATE,
  --
  CONSTRAINT fk_atencion_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_atencion_estado CHECK (estado IN ('EN_PROCESO', 'ALTA', 'FALLECIDO', 'FUGADO', 'CANCELADO'))
);

-- Índices
CREATE INDEX idx_atenciones_paciente ON atenciones(id_paciente, fecha_ingreso DESC);
CREATE INDEX idx_atenciones_estado ON atenciones(estado, fecha_alta);
CREATE INDEX idx_atenciones_folio ON atenciones(folio);

-- Comentarios
COMMENT ON TABLE atenciones IS 'Episodios de hospitalización de pacientes';
COMMENT ON COLUMN atenciones.folio IS 'Número único de atención/hospitalización';
COMMENT ON COLUMN atenciones.tipo_alta IS 'MEDICA, ADMINISTRATIVA, VOLUNTARIA, FALLECIDO';


-- ============================================================================
-- TABLA: DIAGNÓSTICOS
-- Descripción: Diagnósticos de ingreso y egreso CIE-10
-- ============================================================================

CREATE TABLE diagnosticos (
  id_diagnostico      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  tipo                VARCHAR2(20) NOT NULL,
  codigo_cie10        VARCHAR2(10) NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  es_principal        CHAR(1) DEFAULT 'N',
  fecha_registro      DATE DEFAULT SYSDATE,
  profesional         VARCHAR2(200),
  --
  CONSTRAINT fk_dx_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_dx_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_dx_tipo CHECK (tipo IN ('INGRESO', 'EGRESO', 'INTERCURRENTE')),
  CONSTRAINT chk_dx_principal CHECK (es_principal IN ('S', 'N'))
);

-- Índices
CREATE INDEX idx_diagnosticos_episodio ON diagnosticos(id_episodio, tipo);
CREATE INDEX idx_diagnosticos_cie10 ON diagnosticos(codigo_cie10);

-- Comentarios
COMMENT ON TABLE diagnosticos IS 'Diagnósticos CIE-10 de pacientes hospitalizados';
COMMENT ON COLUMN diagnosticos.tipo IS 'INGRESO (motivo), EGRESO (confirmado), INTERCURRENTE (durante hospitalización)';
COMMENT ON COLUMN diagnosticos.es_principal IS 'Diagnóstico principal del episodio';


-- ============================================================================
-- TABLA: PROCEDIMIENTOS
-- Descripción: Procedimientos y cirugías realizadas
-- ============================================================================

CREATE TABLE procedimientos (
  id_procedimiento    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  codigo              VARCHAR2(50) NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  fecha_realizacion   DATE NOT NULL,
  profesional         VARCHAR2(200),
  especialidad        VARCHAR2(100),
  observaciones       VARCHAR2(2000),
  --
  CONSTRAINT fk_proc_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_proc_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente)
);

-- Índices
CREATE INDEX idx_procedimientos_episodio ON procedimientos(id_episodio, fecha_realizacion);
CREATE INDEX idx_procedimientos_codigo ON procedimientos(codigo);

-- Comentarios
COMMENT ON TABLE procedimientos IS 'Procedimientos médicos y quirúrgicos realizados';
COMMENT ON COLUMN procedimientos.codigo IS 'Código de procedimiento según nomenclatura local/internacional';


-- ============================================================================
-- TABLA: MEDICAMENTOS_HOSPITALARIOS
-- Descripción: Tratamientos administrados durante hospitalización
-- ============================================================================

CREATE TABLE medicamentos_hospitalarios (
  id_medicamento      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  codigo_atc          VARCHAR2(20),
  nombre_generico     VARCHAR2(200) NOT NULL,
  nombre_comercial    VARCHAR2(200),
  dosis               VARCHAR2(100) NOT NULL,
  via_administracion  VARCHAR2(50) NOT NULL,
  frecuencia          VARCHAR2(100) NOT NULL,
  fecha_inicio        DATE NOT NULL,
  fecha_termino       DATE,
  activo              CHAR(1) DEFAULT 'S',
  indicacion          VARCHAR2(500),
  --
  CONSTRAINT fk_medhosp_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_medhosp_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_medhosp_activo CHECK (activo IN ('S', 'N'))
);

-- Índices
CREATE INDEX idx_medhosp_episodio ON medicamentos_hospitalarios(id_episodio, activo);
CREATE INDEX idx_medhosp_atc ON medicamentos_hospitalarios(codigo_atc);

-- Comentarios
COMMENT ON TABLE medicamentos_hospitalarios IS 'Medicamentos administrados durante la hospitalización';
COMMENT ON COLUMN medicamentos_hospitalarios.codigo_atc IS 'Código ATC (Anatomical Therapeutic Chemical)';
COMMENT ON COLUMN medicamentos_hospitalarios.via_administracion IS 'EV, VO, SC, IM, etc.';


-- ============================================================================
-- TABLA: MEDICAMENTOS_ALTA
-- Descripción: Medicamentos indicados al alta
-- ============================================================================

CREATE TABLE medicamentos_alta (
  id_medicamento_alta NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  codigo_atc          VARCHAR2(20),
  nombre_generico     VARCHAR2(200) NOT NULL,
  nombre_comercial    VARCHAR2(200),
  dosis               VARCHAR2(100) NOT NULL,
  via_administracion  VARCHAR2(50) NOT NULL,
  frecuencia          VARCHAR2(100) NOT NULL,
  duracion            VARCHAR2(100),
  indicacion          VARCHAR2(500),
  orden               NUMBER,
  --
  CONSTRAINT fk_medalta_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_medalta_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente)
);

-- Índices
CREATE INDEX idx_medalta_episodio ON medicamentos_alta(id_episodio, orden);

-- Comentarios
COMMENT ON TABLE medicamentos_alta IS 'Medicamentos recetados al alta hospitalaria';
COMMENT ON COLUMN medicamentos_alta.duracion IS 'Duración del tratamiento (ej: 7 días, 1 mes, indefinido)';


-- ============================================================================
-- TABLA: EVOLUCIONES
-- Descripción: Notas de evolución clínica
-- ============================================================================

CREATE TABLE evoluciones (
  id_evolucion        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  fecha_registro      DATE NOT NULL,
  nota_evolucion      CLOB NOT NULL,
  nombre_profesional  VARCHAR2(200),
  especialidad        VARCHAR2(100),
  firma_digital       VARCHAR2(500),
  fecha_creacion      DATE DEFAULT SYSDATE,
  fecha_modificacion  DATE DEFAULT SYSDATE,
  --
  CONSTRAINT fk_evol_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_evol_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente)
);

-- Índices
CREATE INDEX idx_evoluciones_episodio ON evoluciones(id_episodio, fecha_registro);
CREATE INDEX idx_evoluciones_paciente ON evoluciones(id_paciente, fecha_registro DESC);

-- Comentarios
COMMENT ON TABLE evoluciones IS 'Notas diarias de evolución clínica de pacientes hospitalizados';


-- ============================================================================
-- TABLA: LABORATORIOS
-- Descripción: Resultados de exámenes de laboratorio
-- ============================================================================

CREATE TABLE laboratorios (
  id_laboratorio      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  id_paciente         NUMBER NOT NULL,
  codigo_examen       VARCHAR2(50) NOT NULL,
  nombre_examen       VARCHAR2(200) NOT NULL,
  resultado           VARCHAR2(500),
  unidad              VARCHAR2(50),
  valor_referencia    VARCHAR2(200),
  es_anormal          CHAR(1) DEFAULT 'N',
  es_relevante        CHAR(1) DEFAULT 'N',
  fecha_muestra       DATE,
  fecha_resultado     DATE NOT NULL,
  fecha_creacion      DATE DEFAULT SYSDATE,
  --
  CONSTRAINT fk_lab_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_lab_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_lab_anormal CHECK (es_anormal IN ('S', 'N')),
  CONSTRAINT chk_lab_relevante CHECK (es_relevante IN ('S', 'N'))
);

-- Índices
CREATE INDEX idx_laboratorios_episodio ON laboratorios(id_episodio, es_relevante, fecha_resultado);
CREATE INDEX idx_laboratorios_examen ON laboratorios(codigo_examen);

-- Comentarios
COMMENT ON TABLE laboratorios IS 'Resultados de exámenes de laboratorio';
COMMENT ON COLUMN laboratorios.es_relevante IS 'Marcado por médico como relevante para epicrisis';


-- ============================================================================
-- TABLA: CONTROLES_ALTA
-- Descripción: Controles médicos programados post-alta
-- ============================================================================

CREATE TABLE controles_alta (
  id_control          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  especialidad        VARCHAR2(100),
  fecha_control       DATE,
  urgencia            VARCHAR2(50),
  --
  CONSTRAINT fk_control_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio)
);

-- Índices
CREATE INDEX idx_controles_episodio ON controles_alta(id_episodio, fecha_control);

-- Comentarios
COMMENT ON TABLE controles_alta IS 'Controles médicos indicados al alta';


-- ============================================================================
-- TABLA: RECOMENDACIONES_ALTA
-- Descripción: Indicaciones generales al alta
-- ============================================================================

CREATE TABLE recomendaciones_alta (
  id_recomendacion    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  descripcion         VARCHAR2(1000) NOT NULL,
  tipo                VARCHAR2(50),
  orden               NUMBER,
  --
  CONSTRAINT fk_recom_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio)
);

-- Índices
CREATE INDEX idx_recomendaciones_episodio ON recomendaciones_alta(id_episodio, orden);

-- Comentarios
COMMENT ON TABLE recomendaciones_alta IS 'Recomendaciones e indicaciones generales al alta (dieta, actividad, cuidados, etc.)';


-- ============================================================================
-- TABLA: LOG_ERRORES
-- Descripción: Log de errores del sistema
-- ============================================================================

CREATE TABLE log_errores (
  id_log              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha_error         DATE DEFAULT SYSDATE,
  procedimiento       VARCHAR2(200),
  mensaje_error       VARCHAR2(4000),
  parametros          VARCHAR2(1000),
  usuario             VARCHAR2(100) DEFAULT USER,
  stack_trace         CLOB
);

-- Índices
CREATE INDEX idx_log_errores_fecha ON log_errores(fecha_error DESC);

-- Comentarios
COMMENT ON TABLE log_errores IS 'Registro de errores del sistema para debugging';


-- ============================================================================
-- SECUENCIAS ADICIONALES (si se necesitan IDs personalizados)
-- ============================================================================

-- Secuencia para folios de atención
CREATE SEQUENCE seq_folio_atencion
  START WITH 100000
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

-- ============================================================================
-- TRIGGERS PARA AUDITORÍA
-- ============================================================================

-- Trigger para actualizar fecha_modificacion en pacientes
CREATE OR REPLACE TRIGGER trg_pacientes_update
BEFORE UPDATE ON pacientes
FOR EACH ROW
BEGIN
  :NEW.fecha_modificacion := SYSDATE;
END;
/

-- Trigger para actualizar fecha_modificacion en atenciones
CREATE OR REPLACE TRIGGER trg_atenciones_update
BEFORE UPDATE ON atenciones
FOR EACH ROW
BEGIN
  :NEW.fecha_modificacion := SYSDATE;
END;
/

-- Trigger para generar folio automático
CREATE OR REPLACE TRIGGER trg_atenciones_folio
BEFORE INSERT ON atenciones
FOR EACH ROW
WHEN (NEW.folio IS NULL)
BEGIN
  :NEW.folio := 'ATN-' || TO_CHAR(SYSDATE, 'YYYY') || '-' || LPAD(seq_folio_atencion.NEXTVAL, 6, '0');
END;
/

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista con información completa de pacientes en hospitalización
CREATE OR REPLACE VIEW v_pacientes_hospitalizados AS
SELECT
  p.id_paciente,
  p.rut,
  p.nombre || ' ' || p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '') as nombre_completo,
  TRUNC(MONTHS_BETWEEN(SYSDATE, p.fecha_nacimiento) / 12) as edad,
  p.sexo,
  a.id_episodio,
  a.folio,
  a.fecha_ingreso,
  a.servicio_ingreso,
  a.cama,
  a.medico_tratante,
  TRUNC(SYSDATE - a.fecha_ingreso) as dias_hospitalizacion
FROM pacientes p
INNER JOIN atenciones a ON p.id_paciente = a.id_paciente
WHERE a.estado = 'EN_PROCESO';

COMMENT ON VIEW v_pacientes_hospitalizados IS 'Pacientes actualmente hospitalizados con información relevante';

-- ============================================================================
-- ESTADÍSTICAS INICIALES
-- ============================================================================

BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS(
    ownname => USER,
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );
END;
/

-- ============================================================================
-- VERIFICACIÓN DE CREACIÓN
-- ============================================================================

-- Mostrar todas las tablas creadas
SELECT table_name, num_rows, tablespace_name
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
)
ORDER BY table_name;

-- Mostrar constraints
SELECT constraint_name, constraint_type, table_name
FROM user_constraints
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA'
)
ORDER BY table_name, constraint_type;

PROMPT
PROMPT ============================================================================
PROMPT Tablas base creadas exitosamente!
PROMPT ============================================================================
PROMPT
PROMPT Siguiente paso: Insertar datos de ejemplo
PROMPT Ejecutar: @sql/tables/02_insert_sample_data.sql
PROMPT
