-- ============================================================================
-- SCRIPT DE VERIFICACIÓN COMPLETA DE LA INSTALACIÓN
-- ============================================================================

SET SERVEROUTPUT ON
SET LINESIZE 150
SET PAGESIZE 100
SET FEEDBACK OFF

PROMPT
PROMPT ============================================================================
PROMPT VERIFICACIÓN DE INSTALACIÓN - Sistema Epicrisis Automática
PROMPT ============================================================================
PROMPT

-- ============================================================================
-- 1. VERIFICAR TABLAS
-- ============================================================================
PROMPT
PROMPT 1. VERIFICANDO TABLAS
PROMPT ============================================================================

COLUMN table_name FORMAT A30
COLUMN num_rows FORMAT 999,999
COLUMN status FORMAT A10

SELECT
  table_name,
  num_rows,
  CASE
    WHEN table_name IN (
      'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
      'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
      'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
      'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
    ) THEN '✓ OK'
    ELSE '  '
  END as status
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
)
ORDER BY table_name;

-- Resumen de tablas
DECLARE
  v_count NUMBER;
  v_expected NUMBER := 11;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_tables
  WHERE table_name IN (
    'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
    'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
    'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
    'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
  );

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Tablas esperadas: ' || v_expected);
  DBMS_OUTPUT.PUT_LINE('Tablas creadas:   ' || v_count);

  IF v_count = v_expected THEN
    DBMS_OUTPUT.PUT_LINE('Estado: ✓ TODAS LAS TABLAS CREADAS');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Estado: ✗ FALTAN ' || (v_expected - v_count) || ' TABLAS');
  END IF;
END;
/

-- ============================================================================
-- 2. VERIFICAR SECUENCIAS
-- ============================================================================
PROMPT
PROMPT 2. VERIFICANDO SECUENCIAS
PROMPT ============================================================================

COLUMN sequence_name FORMAT A30
COLUMN last_number FORMAT 999,999,999

SELECT sequence_name, last_number
FROM user_sequences
WHERE sequence_name LIKE 'SEQ_%'
ORDER BY sequence_name;

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_sequences
  WHERE sequence_name LIKE 'SEQ_%';

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Secuencias creadas: ' || v_count);
END;
/

-- ============================================================================
-- 3. VERIFICAR ÍNDICES
-- ============================================================================
PROMPT
PROMPT 3. VERIFICANDO ÍNDICES
PROMPT ============================================================================

COLUMN index_name FORMAT A35
COLUMN table_name FORMAT A30
COLUMN uniqueness FORMAT A10

SELECT
  index_name,
  table_name,
  uniqueness,
  status
FROM user_indexes
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
)
ORDER BY table_name, index_name;

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_indexes
  WHERE table_name IN (
    'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
    'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
    'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
    'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
  );

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Índices totales: ' || v_count);
END;
/

-- ============================================================================
-- 4. VERIFICAR CONSTRAINTS
-- ============================================================================
PROMPT
PROMPT 4. VERIFICANDO CONSTRAINTS (RESUMEN)
PROMPT ============================================================================

COLUMN constraint_type FORMAT A20

SELECT
  CASE constraint_type
    WHEN 'P' THEN 'PRIMARY KEY'
    WHEN 'R' THEN 'FOREIGN KEY'
    WHEN 'U' THEN 'UNIQUE'
    WHEN 'C' THEN 'CHECK'
  END as constraint_type,
  COUNT(*) as cantidad
FROM user_constraints
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
)
GROUP BY constraint_type
ORDER BY constraint_type;

-- ============================================================================
-- 5. VERIFICAR TRIGGERS
-- ============================================================================
PROMPT
PROMPT 5. VERIFICANDO TRIGGERS
PROMPT ============================================================================

COLUMN trigger_name FORMAT A35
COLUMN trigger_type FORMAT A20

SELECT
  trigger_name,
  trigger_type,
  triggering_event,
  table_name,
  status
FROM user_triggers
WHERE table_name IN ('PACIENTES', 'ATENCIONES')
ORDER BY table_name, trigger_name;

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_triggers
  WHERE table_name IN ('PACIENTES', 'ATENCIONES');

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Triggers creados: ' || v_count);
  DBMS_OUTPUT.PUT_LINE('Triggers esperados: 3 (trg_pacientes_update, trg_atenciones_update, trg_atenciones_folio)');
END;
/

-- ============================================================================
-- 6. VERIFICAR FUNCIÓN PRINCIPAL
-- ============================================================================
PROMPT
PROMPT 6. VERIFICANDO FUNCIÓN get_discharge_summary_json
PROMPT ============================================================================

COLUMN object_name FORMAT A35
COLUMN object_type FORMAT A20

SELECT
  object_name,
  object_type,
  status,
  created,
  last_ddl_time
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_objects
  WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON'
    AND object_type = 'FUNCTION'
    AND status = 'VALID';

  DBMS_OUTPUT.PUT_LINE('');
  IF v_count = 1 THEN
    DBMS_OUTPUT.PUT_LINE('Estado: ✓ FUNCIÓN CREADA Y VÁLIDA');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Estado: ✗ FUNCIÓN NO ENCONTRADA O INVÁLIDA');
  END IF;
END;
/

-- ============================================================================
-- 7. VERIFICAR VISTAS
-- ============================================================================
PROMPT
PROMPT 7. VERIFICANDO VISTAS
PROMPT ============================================================================

SELECT
  view_name,
  text_length,
  CASE
    WHEN view_name = 'V_PACIENTES_HOSPITALIZADOS' THEN '✓ OK'
    ELSE '  '
  END as status
FROM user_views
WHERE view_name = 'V_PACIENTES_HOSPITALIZADOS';

-- ============================================================================
-- 8. VERIFICAR DATOS DE EJEMPLO
-- ============================================================================
PROMPT
PROMPT 8. VERIFICANDO DATOS DE EJEMPLO
PROMPT ============================================================================

DECLARE
  v_pacientes NUMBER;
  v_atenciones NUMBER;
  v_diagnosticos NUMBER;
  v_evoluciones NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_pacientes FROM pacientes;
  SELECT COUNT(*) INTO v_atenciones FROM atenciones;
  SELECT COUNT(*) INTO v_diagnosticos FROM diagnosticos;
  SELECT COUNT(*) INTO v_evoluciones FROM evoluciones;

  DBMS_OUTPUT.PUT_LINE('Pacientes:    ' || v_pacientes || ' (esperados: 3)');
  DBMS_OUTPUT.PUT_LINE('Atenciones:   ' || v_atenciones || ' (esperados: 3)');
  DBMS_OUTPUT.PUT_LINE('Diagnósticos: ' || v_diagnosticos || ' (esperados: 5+)');
  DBMS_OUTPUT.PUT_LINE('Evoluciones:  ' || v_evoluciones || ' (esperados: 4+)');

  DBMS_OUTPUT.PUT_LINE('');
  IF v_pacientes >= 3 AND v_atenciones >= 3 THEN
    DBMS_OUTPUT.PUT_LINE('Estado: ✓ DATOS DE EJEMPLO INSERTADOS');
  ELSIF v_pacientes = 0 THEN
    DBMS_OUTPUT.PUT_LINE('Estado: ⚠ NO HAY DATOS DE EJEMPLO (tablas vacías)');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Estado: ⚠ DATOS INCOMPLETOS');
  END IF;
END;
/

-- ============================================================================
-- 9. PROBAR FUNCIÓN CON DATOS
-- ============================================================================
PROMPT
PROMPT 9. PROBANDO FUNCIÓN get_discharge_summary_json
PROMPT ============================================================================

DECLARE
  v_count NUMBER;
  v_json CLOB;
  v_episodio NUMBER;
BEGIN
  -- Verificar si hay episodios
  SELECT COUNT(*) INTO v_count FROM atenciones;

  IF v_count > 0 THEN
    -- Obtener primer episodio
    SELECT MIN(id_episodio) INTO v_episodio FROM atenciones;

    -- Probar función
    BEGIN
      v_json := get_discharge_summary_json(v_episodio);

      IF v_json IS NOT NULL THEN
        DBMS_OUTPUT.PUT_LINE('✓ Función ejecutada correctamente');
        DBMS_OUTPUT.PUT_LINE('✓ Episodio probado: ' || v_episodio);
        DBMS_OUTPUT.PUT_LINE('✓ JSON generado (primeros 100 chars):');
        DBMS_OUTPUT.PUT_LINE(SUBSTR(v_json, 1, 100) || '...');
      ELSE
        DBMS_OUTPUT.PUT_LINE('✗ Función retornó NULL');
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('✗ ERROR al ejecutar función: ' || SQLERRM);
    END;
  ELSE
    DBMS_OUTPUT.PUT_LINE('⚠ No hay episodios para probar la función');
    DBMS_OUTPUT.PUT_LINE('  Ejecuta: @02_insert_sample_data.sql');
  END IF;
END;
/

-- ============================================================================
-- 10. VERIFICAR VISTAS MATERIALIZADAS (OPCIONAL)
-- ============================================================================
PROMPT
PROMPT 10. VERIFICANDO VISTAS MATERIALIZADAS (OPCIONAL)
PROMPT ============================================================================

COLUMN mview_name FORMAT A35
COLUMN refresh_mode FORMAT A12
COLUMN refresh_method FORMAT A15

SELECT
  mview_name,
  refresh_mode,
  refresh_method,
  last_refresh_date
FROM user_mviews
ORDER BY mview_name;

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_mviews;

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Vistas materializadas: ' || v_count);
  IF v_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('Estado: ⚠ NO INSTALADAS (opcional para producción)');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Estado: ✓ INSTALADAS');
  END IF;
END;
/

-- ============================================================================
-- 11. RESUMEN FINAL
-- ============================================================================
PROMPT
PROMPT ============================================================================
PROMPT RESUMEN FINAL
PROMPT ============================================================================

DECLARE
  v_tablas NUMBER;
  v_funcion NUMBER;
  v_triggers NUMBER;
  v_datos NUMBER;
  v_score NUMBER := 0;
  v_max_score NUMBER := 4;
BEGIN
  -- Contar componentes
  SELECT COUNT(*) INTO v_tablas FROM user_tables
  WHERE table_name IN (
    'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
    'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
    'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
    'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
  );

  SELECT COUNT(*) INTO v_funcion FROM user_objects
  WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON' AND status = 'VALID';

  SELECT COUNT(*) INTO v_triggers FROM user_triggers
  WHERE table_name IN ('PACIENTES', 'ATENCIONES');

  SELECT COUNT(*) INTO v_datos FROM pacientes;

  -- Calcular score
  IF v_tablas = 11 THEN v_score := v_score + 1; END IF;
  IF v_funcion = 1 THEN v_score := v_score + 1; END IF;
  IF v_triggers >= 3 THEN v_score := v_score + 1; END IF;
  IF v_datos >= 3 THEN v_score := v_score + 1; END IF;

  -- Mostrar resumen
  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Componentes Verificados:');
  DBMS_OUTPUT.PUT_LINE('');

  -- Tablas
  IF v_tablas = 11 THEN
    DBMS_OUTPUT.PUT_LINE('[✓] Tablas:           11/11 creadas');
  ELSE
    DBMS_OUTPUT.PUT_LINE('[✗] Tablas:           ' || v_tablas || '/11 creadas');
  END IF;

  -- Función
  IF v_funcion = 1 THEN
    DBMS_OUTPUT.PUT_LINE('[✓] Función:          get_discharge_summary_json OK');
  ELSE
    DBMS_OUTPUT.PUT_LINE('[✗] Función:          NO ENCONTRADA');
  END IF;

  -- Triggers
  IF v_triggers >= 3 THEN
    DBMS_OUTPUT.PUT_LINE('[✓] Triggers:         ' || v_triggers || ' creados');
  ELSE
    DBMS_OUTPUT.PUT_LINE('[✗] Triggers:         ' || v_triggers || '/3 creados');
  END IF;

  -- Datos
  IF v_datos >= 3 THEN
    DBMS_OUTPUT.PUT_LINE('[✓] Datos ejemplo:    ' || v_datos || ' pacientes insertados');
  ELSIF v_datos = 0 THEN
    DBMS_OUTPUT.PUT_LINE('[⚠] Datos ejemplo:    NO INSERTADOS (opcional)');
  ELSE
    DBMS_OUTPUT.PUT_LINE('[⚠] Datos ejemplo:    ' || v_datos || '/3 pacientes');
  END IF;

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('Score: ' || v_score || '/' || v_max_score);
  DBMS_OUTPUT.PUT_LINE('');

  -- Conclusión
  IF v_score = v_max_score THEN
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('✓✓✓ INSTALACIÓN COMPLETA Y EXITOSA ✓✓✓');
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('El sistema está listo para usar:');
    DBMS_OUTPUT.PUT_LINE('  1. cd ../backend && npm run dev');
    DBMS_OUTPUT.PUT_LINE('  2. cd ../frontend && npm start');
    DBMS_OUTPUT.PUT_LINE('  3. Abrir: http://localhost:4200');
  ELSIF v_score >= 3 THEN
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('⚠ INSTALACIÓN CASI COMPLETA');
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('Falta:');
    IF v_datos = 0 THEN
      DBMS_OUTPUT.PUT_LINE('  - Datos de ejemplo (opcional): @02_insert_sample_data.sql');
    END IF;
  ELSE
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('✗ INSTALACIÓN INCOMPLETA');
    DBMS_OUTPUT.PUT_LINE('═══════════════════════════════════════════════════════════');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('Ejecuta nuevamente:');
    DBMS_OUTPUT.PUT_LINE('  cd sql && ./setup_database.sh');
  END IF;

  DBMS_OUTPUT.PUT_LINE('');
END;
/

PROMPT ============================================================================
PROMPT Fin de la verificación
PROMPT ============================================================================
PROMPT
