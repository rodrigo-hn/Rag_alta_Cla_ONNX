-- ============================================================================
-- VERIFICACIÓN RÁPIDA DE INSTALACIÓN
-- ============================================================================

SET LINESIZE 150
SET PAGESIZE 50
SET FEEDBACK ON

PROMPT ========================================
PROMPT 1. VERIFICANDO TABLAS
PROMPT ========================================


select * from evoluciones;
select * from pacientes;
select * from atenciones;


SELECT
  table_name,
  num_rows,
  CASE
    WHEN table_name IN (
      'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
      'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
      'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
      'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
    ) THEN 'OK'
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

PROMPT
PROMPT ========================================
PROMPT 2. CONTEO DE TABLAS
PROMPT ========================================

SELECT
  'Tablas creadas: ' || COUNT(*) || ' de 11' as resultado
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
);

PROMPT
PROMPT ========================================
PROMPT 3. VERIFICANDO FUNCIÓN
PROMPT ========================================

SELECT
  object_name,
  object_type,
  status,
  TO_CHAR(created, 'YYYY-MM-DD HH24:MI:SS') as created
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

PROMPT
PROMPT ========================================
PROMPT 4. VERIFICANDO TRIGGERS
PROMPT ========================================

SELECT
  trigger_name,
  table_name,
  status
FROM user_triggers
WHERE table_name IN ('PACIENTES', 'ATENCIONES')
ORDER BY table_name, trigger_name;

PROMPT
PROMPT ========================================
PROMPT 5. VERIFICANDO ÍNDICES
PROMPT ========================================

SELECT
  COUNT(*) as total_indices
FROM user_indexes
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
);

PROMPT
PROMPT ========================================
PROMPT 6. VERIFICANDO CONSTRAINTS
PROMPT ========================================

SELECT
  CASE constraint_type
    WHEN 'P' THEN 'PRIMARY KEY'
    WHEN 'R' THEN 'FOREIGN KEY'
    WHEN 'U' THEN 'UNIQUE'
    WHEN 'C' THEN 'CHECK'
  END as tipo_constraint,
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

PROMPT
PROMPT ========================================
PROMPT 7. VERIFICANDO DATOS DE EJEMPLO
PROMPT ========================================

SELECT
  'Pacientes: ' || (SELECT COUNT(*) FROM pacientes) || ' | ' ||
  'Atenciones: ' || (SELECT COUNT(*) FROM atenciones) || ' | ' ||
  'Diagnósticos: ' || (SELECT COUNT(*) FROM diagnosticos) || ' | ' ||
  'Evoluciones: ' || (SELECT COUNT(*) FROM evoluciones) as datos_ejemplo
FROM dual;

PROMPT
PROMPT ========================================
PROMPT 8. EPISODIOS DISPONIBLES PARA PRUEBAS
PROMPT ========================================

SELECT
  a.id_episodio,
  a.folio,
  p.nombre || ' ' || p.apellido_paterno as paciente,
  SUBSTR(a.motivo_ingreso, 1, 40) || '...' as motivo
FROM atenciones a
JOIN pacientes p ON a.id_paciente = p.id_paciente
ORDER BY a.id_episodio;

PROMPT
PROMPT ========================================
PROMPT 9. PROBAR FUNCIÓN (Primer episodio)
PROMPT ========================================

SET LONG 1000
SELECT
  CASE
    WHEN LENGTH(get_discharge_summary_json((SELECT MIN(id_episodio) FROM atenciones))) > 100
    THEN 'FUNCIÓN OK - JSON generado (' || LENGTH(get_discharge_summary_json((SELECT MIN(id_episodio) FROM atenciones))) || ' caracteres)'
    ELSE 'ERROR - Función retornó JSON vacío o NULL'
  END as resultado_funcion
FROM dual
WHERE EXISTS (SELECT 1 FROM atenciones);

PROMPT
PROMPT ========================================
PROMPT RESUMEN FINAL
PROMPT ========================================
PROMPT
PROMPT Si todo está OK, puedes iniciar el backend:
PROMPT   cd backend && npm run dev
PROMPT
PROMPT Y luego el frontend:
PROMPT   cd frontend && npm start
PROMPT
PROMPT ========================================

EXIT
