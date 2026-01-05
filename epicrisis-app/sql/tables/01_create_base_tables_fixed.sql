-- ============================================================================
-- CREACIÓN DE TABLAS BASE - Sistema Epicrisis Automática (VERSIÓN CORREGIDA)
-- Descripción: Compatible con Oracle 12c+
-- Orden de ejecución: 1 (primero)
-- ============================================================================

SET ECHO ON
SET SERVEROUTPUT ON
WHENEVER SQLERROR CONTINUE

PROMPT ============================================================================
PROMPT CREANDO SECUENCIAS
PROMPT ============================================================================

-- Secuencias para IDs (compatible con todas las versiones)
CREATE SEQUENCE seq_pacientes START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_atenciones START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_diagnosticos START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_procedimientos START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_med_hosp START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_med_alta START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_evoluciones START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_laboratorios START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_controles START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_recomendaciones START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_log_errores START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_folio_atencion START WITH 100000 INCREMENT BY 1 NOCACHE;

PROMPT ✓ Secuencias creadas

PROMPT ============================================================================
PROMPT CREANDO TABLAS
PROMPT ============================================================================

-- ============================================================================
-- TABLA: PACIENTES
-- ============================================================================
PROMPT Creando tabla PACIENTES...

CREATE TABLE pacientes (
  id_paciente         NUMBER DEFAULT seq_pacientes.NEXTVAL PRIMARY KEY,
  rut                 VARCHAR2(12) NOT NULL,
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
  CONSTRAINT uk_pacientes_rut UNIQUE (rut),
  CONSTRAINT chk_paciente_sexo CHECK (sexo IN ('M', 'F', 'O')),
  CONSTRAINT chk_paciente_activo CHECK (activo IN ('S', 'N'))
);

CREATE INDEX idx_pacientes_rut ON pacientes(rut);
CREATE INDEX idx_pacientes_nombre ON pacientes(UPPER(nombre), UPPER(apellido_paterno));

COMMENT ON TABLE pacientes IS 'Información demográfica de pacientes del hospital';

PROMPT ✓ Tabla PACIENTES creada


-- ============================================================================
-- TABLA: ATENCIONES
-- ============================================================================
PROMPT Creando tabla ATENCIONES...

CREATE TABLE atenciones (
  id_episodio         NUMBER DEFAULT seq_atenciones.NEXTVAL PRIMARY KEY,
  id_paciente         NUMBER NOT NULL,
  folio               VARCHAR2(50),
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
  CONSTRAINT uk_atenciones_folio UNIQUE (folio),
  CONSTRAINT chk_atencion_estado CHECK (estado IN ('EN_PROCESO', 'ALTA', 'FALLECIDO', 'FUGADO', 'CANCELADO'))
);

CREATE INDEX idx_atenciones_paciente ON atenciones(id_paciente, fecha_ingreso DESC);
CREATE INDEX idx_atenciones_estado ON atenciones(estado, fecha_alta);
CREATE INDEX idx_atenciones_folio ON atenciones(folio);

COMMENT ON TABLE atenciones IS 'Episodios de hospitalización de pacientes';

PROMPT ✓ Tabla ATENCIONES creada


-- ============================================================================
-- TABLA: DIAGNOSTICOS
-- ============================================================================
PROMPT Creando tabla DIAGNOSTICOS...

CREATE TABLE diagnosticos (
  id_diagnostico      NUMBER DEFAULT seq_diagnosticos.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_diagnosticos_episodio ON diagnosticos(id_episodio, tipo);
CREATE INDEX idx_diagnosticos_cie10 ON diagnosticos(codigo_cie10);

COMMENT ON TABLE diagnosticos IS 'Diagnósticos CIE-10 de pacientes hospitalizados';

PROMPT ✓ Tabla DIAGNOSTICOS creada


-- ============================================================================
-- TABLA: PROCEDIMIENTOS
-- ============================================================================
PROMPT Creando tabla PROCEDIMIENTOS...

CREATE TABLE procedimientos (
  id_procedimiento    NUMBER DEFAULT seq_procedimientos.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_procedimientos_episodio ON procedimientos(id_episodio, fecha_realizacion);
CREATE INDEX idx_procedimientos_codigo ON procedimientos(codigo);

COMMENT ON TABLE procedimientos IS 'Procedimientos médicos y quirúrgicos realizados';

PROMPT ✓ Tabla PROCEDIMIENTOS creada


-- ============================================================================
-- TABLA: MEDICAMENTOS_HOSPITALARIOS
-- ============================================================================
PROMPT Creando tabla MEDICAMENTOS_HOSPITALARIOS...

CREATE TABLE medicamentos_hospitalarios (
  id_medicamento      NUMBER DEFAULT seq_med_hosp.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_medhosp_episodio ON medicamentos_hospitalarios(id_episodio, activo);
CREATE INDEX idx_medhosp_atc ON medicamentos_hospitalarios(codigo_atc);

COMMENT ON TABLE medicamentos_hospitalarios IS 'Medicamentos administrados durante la hospitalización';

PROMPT ✓ Tabla MEDICAMENTOS_HOSPITALARIOS creada


-- ============================================================================
-- TABLA: MEDICAMENTOS_ALTA
-- ============================================================================
PROMPT Creando tabla MEDICAMENTOS_ALTA...

CREATE TABLE medicamentos_alta (
  id_medicamento_alta NUMBER DEFAULT seq_med_alta.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_medalta_episodio ON medicamentos_alta(id_episodio, orden);

COMMENT ON TABLE medicamentos_alta IS 'Medicamentos recetados al alta hospitalaria';

PROMPT ✓ Tabla MEDICAMENTOS_ALTA creada


-- ============================================================================
-- TABLA: EVOLUCIONES
-- ============================================================================
PROMPT Creando tabla EVOLUCIONES...

CREATE TABLE evoluciones (
  id_evolucion        NUMBER DEFAULT seq_evoluciones.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_evoluciones_episodio ON evoluciones(id_episodio, fecha_registro);
CREATE INDEX idx_evoluciones_paciente ON evoluciones(id_paciente, fecha_registro DESC);

COMMENT ON TABLE evoluciones IS 'Notas diarias de evolución clínica de pacientes hospitalizados';

PROMPT ✓ Tabla EVOLUCIONES creada


-- ============================================================================
-- TABLA: LABORATORIOS
-- ============================================================================
PROMPT Creando tabla LABORATORIOS...

CREATE TABLE laboratorios (
  id_laboratorio      NUMBER DEFAULT seq_laboratorios.NEXTVAL PRIMARY KEY,
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

CREATE INDEX idx_laboratorios_episodio ON laboratorios(id_episodio, es_relevante, fecha_resultado);
CREATE INDEX idx_laboratorios_examen ON laboratorios(codigo_examen);

COMMENT ON TABLE laboratorios IS 'Resultados de exámenes de laboratorio';

PROMPT ✓ Tabla LABORATORIOS creada


-- ============================================================================
-- TABLA: CONTROLES_ALTA
-- ============================================================================
PROMPT Creando tabla CONTROLES_ALTA...

CREATE TABLE controles_alta (
  id_control          NUMBER DEFAULT seq_controles.NEXTVAL PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  especialidad        VARCHAR2(100),
  fecha_control       DATE,
  urgencia            VARCHAR2(50),
  --
  CONSTRAINT fk_control_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio)
);

CREATE INDEX idx_controles_episodio ON controles_alta(id_episodio, fecha_control);

COMMENT ON TABLE controles_alta IS 'Controles médicos indicados al alta';

PROMPT ✓ Tabla CONTROLES_ALTA creada


-- ============================================================================
-- TABLA: RECOMENDACIONES_ALTA
-- ============================================================================
PROMPT Creando tabla RECOMENDACIONES_ALTA...

CREATE TABLE recomendaciones_alta (
  id_recomendacion    NUMBER DEFAULT seq_recomendaciones.NEXTVAL PRIMARY KEY,
  id_episodio         NUMBER NOT NULL,
  descripcion         VARCHAR2(1000) NOT NULL,
  tipo                VARCHAR2(50),
  orden               NUMBER,
  --
  CONSTRAINT fk_recom_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio)
);

CREATE INDEX idx_recomendaciones_episodio ON recomendaciones_alta(id_episodio, orden);

COMMENT ON TABLE recomendaciones_alta IS 'Recomendaciones e indicaciones generales al alta';

PROMPT ✓ Tabla RECOMENDACIONES_ALTA creada


-- ============================================================================
-- TABLA: LOG_ERRORES
-- ============================================================================
PROMPT Creando tabla LOG_ERRORES...

CREATE TABLE log_errores (
  id_log              NUMBER DEFAULT seq_log_errores.NEXTVAL PRIMARY KEY,
  fecha_error         DATE DEFAULT SYSDATE,
  procedimiento       VARCHAR2(200),
  mensaje_error       VARCHAR2(4000),
  parametros          VARCHAR2(1000),
  usuario             VARCHAR2(100) DEFAULT USER,
  stack_trace         CLOB
);

CREATE INDEX idx_log_errores_fecha ON log_errores(fecha_error DESC);

COMMENT ON TABLE log_errores IS 'Registro de errores del sistema para debugging';

PROMPT ✓ Tabla LOG_ERRORES creada


PROMPT ============================================================================
PROMPT CREANDO TRIGGERS
PROMPT ============================================================================

-- Trigger para fecha_modificacion en pacientes
CREATE OR REPLACE TRIGGER trg_pacientes_update
BEFORE UPDATE ON pacientes
FOR EACH ROW
BEGIN
  :NEW.fecha_modificacion := SYSDATE;
END;
/

PROMPT ✓ Trigger pacientes creado

-- Trigger para fecha_modificacion en atenciones
CREATE OR REPLACE TRIGGER trg_atenciones_update
BEFORE UPDATE ON atenciones
FOR EACH ROW
BEGIN
  :NEW.fecha_modificacion := SYSDATE;
END;
/

PROMPT ✓ Trigger atenciones creado

-- Trigger para generar folio automático
CREATE OR REPLACE TRIGGER trg_atenciones_folio
BEFORE INSERT ON atenciones
FOR EACH ROW
WHEN (NEW.folio IS NULL)
BEGIN
  :NEW.folio := 'ATN-' || TO_CHAR(SYSDATE, 'YYYY') || '-' || LPAD(seq_folio_atencion.NEXTVAL, 6, '0');
END;
/

PROMPT ✓ Trigger folio creado


PROMPT ============================================================================
PROMPT CREANDO VISTAS
PROMPT ============================================================================

-- Vista de pacientes hospitalizados
CREATE OR REPLACE VIEW v_pacientes_hospitalizados AS
SELECT
  p.id_paciente,
  p.rut,
  p.nombre || ' ' || p.apellido_paterno || ' ' || NVL(p.apellido_materno, '') as nombre_completo,
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

COMMENT ON VIEW v_pacientes_hospitalizados IS 'Pacientes actualmente hospitalizados';

PROMPT ✓ Vista v_pacientes_hospitalizados creada


PROMPT ============================================================================
PROMPT ACTUALIZANDO ESTADÍSTICAS
PROMPT ============================================================================

BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS(
    ownname => USER,
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );
  DBMS_OUTPUT.PUT_LINE('✓ Estadísticas actualizadas');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('⚠ Error al actualizar estadísticas: ' || SQLERRM);
END;
/


PROMPT ============================================================================
PROMPT VERIFICACIÓN
PROMPT ============================================================================

-- Mostrar tablas creadas
SET LINESIZE 120
SET PAGESIZE 50
COLUMN table_name FORMAT A30
COLUMN tablespace_name FORMAT A20

SELECT table_name, num_rows, tablespace_name
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
)
ORDER BY table_name;

-- Contar objetos creados
PROMPT
PROMPT Resumen de objetos creados:
SELECT object_type, COUNT(*) as cantidad
FROM user_objects
WHERE status = 'VALID'
  AND object_name IN (
    'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
    'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
    'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
    'RECOMENDACIONES_ALTA', 'LOG_ERRORES',
    'V_PACIENTES_HOSPITALIZADOS'
  )
GROUP BY object_type
ORDER BY object_type;

PROMPT
PROMPT ============================================================================
PROMPT ✓ TABLAS BASE CREADAS EXITOSAMENTE
PROMPT ============================================================================
PROMPT
PROMPT Siguiente paso: Insertar datos de ejemplo
PROMPT Ejecutar: @02_insert_sample_data.sql
PROMPT
