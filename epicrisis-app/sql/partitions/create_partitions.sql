-- ============================================================================
-- Particionamiento de tablas grandes
-- Descripción: Particiones por fecha para mejor rendimiento
-- ============================================================================

-- ============================================================================
-- TABLA EVOLUCIONES (Particionada por fecha)
-- ============================================================================

-- Eliminar tabla existente si existe (CUIDADO en producción)
-- DROP TABLE evoluciones CASCADE CONSTRAINTS;

CREATE TABLE evoluciones (
  id_evolucion      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio       NUMBER NOT NULL,
  id_paciente       NUMBER NOT NULL,
  fecha_registro    DATE NOT NULL,
  nota_evolucion    CLOB,
  nombre_profesional VARCHAR2(200),
  especialidad      VARCHAR2(100),
  firma_digital     VARCHAR2(500),
  fecha_creacion    DATE DEFAULT SYSDATE,
  fecha_modificacion DATE DEFAULT SYSDATE,
  --
  CONSTRAINT fk_evol_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_evol_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente)
)
PARTITION BY RANGE (fecha_registro) (
  PARTITION p_2023_q1 VALUES LESS THAN (TO_DATE('2023-04-01', 'YYYY-MM-DD')),
  PARTITION p_2023_q2 VALUES LESS THAN (TO_DATE('2023-07-01', 'YYYY-MM-DD')),
  PARTITION p_2023_q3 VALUES LESS THAN (TO_DATE('2023-10-01', 'YYYY-MM-DD')),
  PARTITION p_2023_q4 VALUES LESS THAN (TO_DATE('2024-01-01', 'YYYY-MM-DD')),
  PARTITION p_2024_q1 VALUES LESS THAN (TO_DATE('2024-04-01', 'YYYY-MM-DD')),
  PARTITION p_2024_q2 VALUES LESS THAN (TO_DATE('2024-07-01', 'YYYY-MM-DD')),
  PARTITION p_2024_q3 VALUES LESS THAN (TO_DATE('2024-10-01', 'YYYY-MM-DD')),
  PARTITION p_2024_q4 VALUES LESS THAN (TO_DATE('2025-01-01', 'YYYY-MM-DD')),
  PARTITION p_2025_q1 VALUES LESS THAN (TO_DATE('2025-04-01', 'YYYY-MM-DD')),
  PARTITION p_2025_q2 VALUES LESS THAN (TO_DATE('2025-07-01', 'YYYY-MM-DD')),
  PARTITION p_future VALUES LESS THAN (MAXVALUE)
);

-- Índices locales (particionados)
CREATE INDEX idx_evol_episodio_local ON evoluciones(id_episodio, fecha_registro) LOCAL;
CREATE INDEX idx_evol_paciente_local ON evoluciones(id_paciente, fecha_registro) LOCAL;


-- ============================================================================
-- TABLA LABORATORIOS (Particionada por fecha)
-- ============================================================================

CREATE TABLE laboratorios (
  id_laboratorio    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio       NUMBER NOT NULL,
  id_paciente       NUMBER NOT NULL,
  codigo_examen     VARCHAR2(50) NOT NULL,
  nombre_examen     VARCHAR2(200) NOT NULL,
  resultado         VARCHAR2(500),
  unidad            VARCHAR2(50),
  valor_referencia  VARCHAR2(200),
  es_anormal        CHAR(1) DEFAULT 'N',
  es_relevante      CHAR(1) DEFAULT 'N',
  fecha_muestra     DATE,
  fecha_resultado   DATE NOT NULL,
  fecha_creacion    DATE DEFAULT SYSDATE,
  --
  CONSTRAINT fk_lab_episodio FOREIGN KEY (id_episodio)
    REFERENCES atenciones(id_episodio),
  CONSTRAINT fk_lab_paciente FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id_paciente),
  CONSTRAINT chk_lab_anormal CHECK (es_anormal IN ('S', 'N')),
  CONSTRAINT chk_lab_relevante CHECK (es_relevante IN ('S', 'N'))
)
PARTITION BY RANGE (fecha_resultado) (
  PARTITION p_2023_h1 VALUES LESS THAN (TO_DATE('2023-07-01', 'YYYY-MM-DD')),
  PARTITION p_2023_h2 VALUES LESS THAN (TO_DATE('2024-01-01', 'YYYY-MM-DD')),
  PARTITION p_2024_h1 VALUES LESS THAN (TO_DATE('2024-07-01', 'YYYY-MM-DD')),
  PARTITION p_2024_h2 VALUES LESS THAN (TO_DATE('2025-01-01', 'YYYY-MM-DD')),
  PARTITION p_2025_h1 VALUES LESS THAN (TO_DATE('2025-07-01', 'YYYY-MM-DD')),
  PARTITION p_future VALUES LESS THAN (MAXVALUE)
);

-- Índices locales
CREATE INDEX idx_lab_episodio_local ON laboratorios(id_episodio, es_relevante, fecha_resultado) LOCAL;
CREATE INDEX idx_lab_examen_local ON laboratorios(codigo_examen, fecha_resultado) LOCAL;


-- ============================================================================
-- PROCEDIMIENTO PARA AGREGAR PARTICIONES AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE PROCEDURE sp_add_future_partitions(
  p_table_name IN VARCHAR2,
  p_months_ahead IN NUMBER DEFAULT 6
) AS
  v_sql VARCHAR2(4000);
  v_partition_name VARCHAR2(30);
  v_high_value DATE;
BEGIN
  -- Obtener la fecha más alta de las particiones existentes
  SELECT MAX(TO_DATE(REGEXP_SUBSTR(high_value, '\d{4}-\d{2}-\d{2}'), 'YYYY-MM-DD'))
  INTO v_high_value
  FROM user_tab_partitions
  WHERE table_name = UPPER(p_table_name)
    AND partition_name != 'P_FUTURE';

  -- Agregar particiones para los próximos meses
  FOR i IN 1..p_months_ahead LOOP
    v_high_value := ADD_MONTHS(v_high_value, 1);
    v_partition_name := 'P_' || TO_CHAR(v_high_value, 'YYYY_MM');

    v_sql := 'ALTER TABLE ' || p_table_name ||
             ' SPLIT PARTITION P_FUTURE AT (TO_DATE(''' ||
             TO_CHAR(v_high_value, 'YYYY-MM-DD') || ''', ''YYYY-MM-DD'')) ' ||
             'INTO (PARTITION ' || v_partition_name || ', PARTITION P_FUTURE)';

    EXECUTE IMMEDIATE v_sql;
    DBMS_OUTPUT.PUT_LINE('Partición creada: ' || v_partition_name);
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    RAISE;
END sp_add_future_partitions;
/


-- ============================================================================
-- JOB PARA MANTENIMIENTO DE PARTICIONES
-- ============================================================================

BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'JOB_MAINTAIN_PARTITIONS',
    job_type        => 'PLSQL_BLOCK',
    job_action      => '
      BEGIN
        sp_add_future_partitions(''EVOLUCIONES'', 3);
        sp_add_future_partitions(''LABORATORIOS'', 3);
      END;
    ',
    start_date      => TRUNC(SYSDATE, 'MM') + 1, -- Primer día del mes
    repeat_interval => 'FREQ=MONTHLY; BYMONTHDAY=1',
    enabled         => TRUE,
    comments        => 'Mantenimiento mensual de particiones'
  );
END;
/


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver particiones creadas
SELECT table_name, partition_name, high_value, num_rows
FROM user_tab_partitions
WHERE table_name IN ('EVOLUCIONES', 'LABORATORIOS')
ORDER BY table_name, partition_position;

-- Estadísticas de particiones
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'EVOLUCIONES',
    granularity => 'ALL'
  );

  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => USER,
    tabname => 'LABORATORIOS',
    granularity => 'ALL'
  );
END;
/
