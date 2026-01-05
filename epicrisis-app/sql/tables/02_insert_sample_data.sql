-- ============================================================================
-- DATOS DE EJEMPLO - Sistema Epicrisis Automática
-- Descripción: Datos de prueba para validar el sistema
-- Orden de ejecución: 2 (después de crear tablas)
-- ============================================================================

SET SERVEROUTPUT ON;

BEGIN
  DBMS_OUTPUT.PUT_LINE('============================================================');
  DBMS_OUTPUT.PUT_LINE('INSERTANDO DATOS DE EJEMPLO');
  DBMS_OUTPUT.PUT_LINE('============================================================');
END;
/

-- ============================================================================
-- PACIENTES DE EJEMPLO
-- ============================================================================

INSERT INTO pacientes (rut, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, prevision, direccion, comuna, region)
VALUES ('12345678-9', 'Juan', 'Pérez', 'González', DATE '1965-03-15', 'M', '912345678', 'FONASA', 'Av. Principal 123', 'Santiago', 'Metropolitana');

INSERT INTO pacientes (rut, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, prevision, direccion, comuna, region)
VALUES ('98765432-1', 'María', 'Silva', 'Fernández', DATE '1978-07-22', 'F', '987654321', 'ISAPRE', 'Calle Secundaria 456', 'Providencia', 'Metropolitana');

INSERT INTO pacientes (rut, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, prevision, direccion, comuna, region)
VALUES ('11222333-4', 'Pedro', 'Ramírez', 'Castro', DATE '1990-11-08', 'M', '956781234', 'FONASA', 'Pasaje Los Pinos 789', 'Maipú', 'Metropolitana');

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ 3 pacientes insertados');

-- ============================================================================
-- ATENCIONES / EPISODIOS
-- ============================================================================

-- Episodio 1: Neumonía comunitaria (Juan Pérez)
INSERT INTO atenciones (id_paciente, fecha_ingreso, fecha_alta, motivo_ingreso, servicio_ingreso, cama, estado, tipo_alta, medico_tratante)
SELECT id_paciente, DATE '2024-12-15', DATE '2024-12-22',
       'Cuadro de 5 días de evolución caracterizado por fiebre, tos productiva y disnea',
       'MEDICINA INTERNA', 'MI-301-A', 'ALTA', 'MEDICA',
       'Dr. Carlos Muñoz - Medicina Interna'
FROM pacientes WHERE rut = '12345678-9';

-- Episodio 2: Apendicitis aguda (María Silva)
INSERT INTO atenciones (id_paciente, fecha_ingreso, fecha_alta, motivo_ingreso, servicio_ingreso, cama, estado, tipo_alta, medico_tratante)
SELECT id_paciente, DATE '2024-12-18', DATE '2024-12-21',
       'Dolor abdominal en fosa ilíaca derecha de 24 horas de evolución, asociado a náuseas',
       'CIRUGÍA', 'CX-205-B', 'ALTA', 'MEDICA',
       'Dra. Ana Martínez - Cirugía General'
FROM pacientes WHERE rut = '98765432-1';

-- Episodio 3: En proceso (Pedro Ramírez)
INSERT INTO atenciones (id_paciente, fecha_ingreso, motivo_ingreso, servicio_ingreso, cama, estado, medico_tratante)
SELECT id_paciente, DATE '2024-12-26',
       'Trauma craneoencefálico moderado secundario a caída de altura',
       'UPC', 'UPC-102', 'EN_PROCESO',
       'Dr. Roberto Lagos - Neurocirugía'
FROM pacientes WHERE rut = '11222333-4';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ 3 episodios insertados');

-- ============================================================================
-- DIAGNÓSTICOS
-- ============================================================================

-- Diagnósticos Episodio 1 (Neumonía)
INSERT INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
SELECT a.id_episodio, a.id_paciente, 'INGRESO', 'J18.9', 'Neumonía, no especificada', 'S'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
SELECT a.id_episodio, a.id_paciente, 'EGRESO', 'J18.1', 'Neumonía lobar, no especificada', 'S'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
SELECT a.id_episodio, a.id_paciente, 'EGRESO', 'I10', 'Hipertensión esencial (primaria)', 'N'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Diagnósticos Episodio 2 (Apendicitis)
INSERT INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
SELECT a.id_episodio, a.id_paciente, 'INGRESO', 'K35.8', 'Apendicitis aguda, otros y los no especificados', 'S'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

INSERT INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
SELECT a.id_episodio, a.id_paciente, 'EGRESO', 'K35.3', 'Apendicitis aguda con peritonitis localizada', 'S'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Diagnósticos insertados');

-- ============================================================================
-- PROCEDIMIENTOS
-- ============================================================================

-- Procedimiento Episodio 2 (Apendicectomía)
INSERT INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
SELECT a.id_episodio, a.id_paciente, '4711', 'Apendicectomía laparoscópica',
       DATE '2024-12-18', 'Dra. Ana Martínez', 'Cirugía General'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Procedimientos insertados');

-- ============================================================================
-- MEDICAMENTOS HOSPITALARIOS
-- ============================================================================

-- Medicamentos Episodio 1 (Neumonía)
INSERT INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, activo)
SELECT a.id_episodio, a.id_paciente, 'J01CR02', 'Amoxicilina/Ácido Clavulánico', '1g', 'EV', 'cada 8 horas', DATE '2024-12-15', 'N'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, activo)
SELECT a.id_episodio, a.id_paciente, 'N02BE01', 'Paracetamol', '1g', 'EV', 'cada 8 horas PRN', DATE '2024-12-15', 'N'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Medicamentos Episodio 2 (Post-apendicectomía)
INSERT INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, activo)
SELECT a.id_episodio, a.id_paciente, 'J01CR02', 'Cefazolina', '1g', 'EV', 'cada 8 horas', DATE '2024-12-18', 'N'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Medicamentos hospitalarios insertados');

-- ============================================================================
-- MEDICAMENTOS AL ALTA
-- ============================================================================

-- Medicamentos alta Episodio 1 (Neumonía)
INSERT INTO medicamentos_alta (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, duracion, orden)
SELECT a.id_episodio, a.id_paciente, 'J01CA04', 'Amoxicilina', '500mg', 'VO', 'cada 8 horas', '7 días', 1
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO medicamentos_alta (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, duracion, orden)
SELECT a.id_episodio, a.id_paciente, 'C09AA02', 'Enalapril', '10mg', 'VO', 'cada 24 horas', 'indefinido', 2
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Medicamentos alta Episodio 2 (Apendicitis)
INSERT INTO medicamentos_alta (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, duracion, orden)
SELECT a.id_episodio, a.id_paciente, 'N02BE01', 'Paracetamol', '500mg', 'VO', 'cada 8 horas PRN', '5 días', 1
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Medicamentos al alta insertados');

-- ============================================================================
-- EVOLUCIONES
-- ============================================================================

-- Evoluciones Episodio 1 (Neumonía)
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT a.id_episodio, a.id_paciente, DATE '2024-12-15',
       'Paciente ingresa con cuadro febril, tos productiva y disnea. Al examen físico: taquicárdico, taquipneico, saturación 88% ambiental. Murmullo pulmonar disminuido en base derecha. Rx tórax: infiltrado en lóbulo inferior derecho. Se hospitaliza en MI para manejo.',
       'Dr. Carlos Muñoz', 'Medicina Interna'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT a.id_episodio, a.id_paciente, DATE '2024-12-18',
       'Paciente evoluciona favorablemente. Afebril desde hace 48 horas. Saturación 95% ambiental. Tolera vía oral. Se decide alta a domicilio con antibiótico oral.',
       'Dr. Carlos Muñoz', 'Medicina Interna'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Evoluciones Episodio 2 (Apendicitis)
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT a.id_episodio, a.id_paciente, DATE '2024-12-18',
       'Paciente con dolor abdominal en FID de 24h de evolución. Blumberg (+), Mc Burney (+). Hemograma: leucocitosis 15.000. Ecografía: apéndice de 9mm. Se decide cirugía de urgencia.',
       'Dra. Ana Martínez', 'Cirugía General'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT a.id_episodio, a.id_paciente, DATE '2024-12-19',
       'Paciente post-apendicectomía laparoscópica. Cirugía sin complicaciones. Hallazgo: apendicitis aguda con peritonitis localizada. Hemodinámicamente estable. Tolerando líquidos.',
       'Dra. Ana Martínez', 'Cirugía General'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Evoluciones insertadas');

-- ============================================================================
-- LABORATORIOS
-- ============================================================================

-- Labs Episodio 1 (Neumonía)
INSERT INTO laboratorios (id_episodio, id_paciente, codigo_examen, nombre_examen, resultado, unidad, es_relevante, fecha_resultado)
SELECT a.id_episodio, a.id_paciente, 'HEM001', 'Hemograma: Leucocitos', '14500', '/mm3', 'S', DATE '2024-12-15'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO laboratorios (id_episodio, id_paciente, codigo_examen, nombre_examen, resultado, unidad, es_relevante, fecha_resultado)
SELECT a.id_episodio, a.id_paciente, 'BIO001', 'PCR', '120', 'mg/L', 'S', DATE '2024-12-15'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Labs Episodio 2 (Apendicitis)
INSERT INTO laboratorios (id_episodio, id_paciente, codigo_examen, nombre_examen, resultado, unidad, es_relevante, fecha_resultado)
SELECT a.id_episodio, a.id_paciente, 'HEM001', 'Hemograma: Leucocitos', '15000', '/mm3', 'S', DATE '2024-12-18'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Laboratorios insertados');

-- ============================================================================
-- CONTROLES Y RECOMENDACIONES AL ALTA
-- ============================================================================

-- Controles Episodio 1
INSERT INTO controles_alta (id_episodio, descripcion, especialidad, fecha_control)
SELECT a.id_episodio, 'Control con Medicina Interna', 'Medicina Interna', DATE '2025-01-05'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Recomendaciones Episodio 1
INSERT INTO recomendaciones_alta (id_episodio, descripcion, tipo, orden)
SELECT a.id_episodio, 'Completar tratamiento antibiótico según indicación', 'MEDICAMENTO', 1
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO recomendaciones_alta (id_episodio, descripcion, tipo, orden)
SELECT a.id_episodio, 'Reposo relativo en domicilio por 7 días', 'ACTIVIDAD', 2
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

INSERT INTO recomendaciones_alta (id_episodio, descripcion, tipo, orden)
SELECT a.id_episodio, 'Dieta blanda fraccionada, abundantes líquidos', 'DIETA', 3
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '12345678-9';

-- Controles Episodio 2
INSERT INTO controles_alta (id_episodio, descripcion, especialidad, fecha_control)
SELECT a.id_episodio, 'Control post-operatorio con Cirugía', 'Cirugía General', DATE '2024-12-28'
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

-- Recomendaciones Episodio 2
INSERT INTO recomendaciones_alta (id_episodio, descripcion, tipo, orden)
SELECT a.id_episodio, 'Curaciones ambulatorias cada 48 horas', 'PROCEDIMIENTO', 1
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

INSERT INTO recomendaciones_alta (id_episodio, descripcion, tipo, orden)
SELECT a.id_episodio, 'Reposo relativo, evitar esfuerzos físicos por 15 días', 'ACTIVIDAD', 2
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE p.rut = '98765432-1';

COMMIT;

DBMS_OUTPUT.PUT_LINE('✓ Controles y recomendaciones insertadas');

-- ============================================================================
-- RESUMEN DE DATOS INSERTADOS
-- ============================================================================

DECLARE
  v_count NUMBER;
BEGIN
  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('============================================================');
  DBMS_OUTPUT.PUT_LINE('RESUMEN DE DATOS INSERTADOS');
  DBMS_OUTPUT.PUT_LINE('============================================================');

  SELECT COUNT(*) INTO v_count FROM pacientes;
  DBMS_OUTPUT.PUT_LINE('Pacientes: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM atenciones;
  DBMS_OUTPUT.PUT_LINE('Atenciones: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM diagnosticos;
  DBMS_OUTPUT.PUT_LINE('Diagnósticos: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM procedimientos;
  DBMS_OUTPUT.PUT_LINE('Procedimientos: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM medicamentos_hospitalarios;
  DBMS_OUTPUT.PUT_LINE('Medicamentos hospitalarios: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM medicamentos_alta;
  DBMS_OUTPUT.PUT_LINE('Medicamentos al alta: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM evoluciones;
  DBMS_OUTPUT.PUT_LINE('Evoluciones: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM laboratorios;
  DBMS_OUTPUT.PUT_LINE('Laboratorios: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM controles_alta;
  DBMS_OUTPUT.PUT_LINE('Controles al alta: ' || v_count);

  SELECT COUNT(*) INTO v_count FROM recomendaciones_alta;
  DBMS_OUTPUT.PUT_LINE('Recomendaciones al alta: ' || v_count);

  DBMS_OUTPUT.PUT_LINE('============================================================');
  DBMS_OUTPUT.PUT_LINE('');
END;
/

-- ============================================================================
-- IDs DE EPISODIOS PARA PRUEBAS
-- ============================================================================

DBMS_OUTPUT.PUT_LINE('IDs DE EPISODIOS PARA PRUEBAS:');
DBMS_OUTPUT.PUT_LINE('');

SELECT
  'Episodio ' || a.id_episodio || ': ' || p.nombre || ' ' || p.apellido_paterno ||
  ' (RUT: ' || p.rut || ') - ' || a.motivo_ingreso as info
FROM atenciones a
INNER JOIN pacientes p ON a.id_paciente = p.id_paciente
ORDER BY a.id_episodio;

DBMS_OUTPUT.PUT_LINE('');
DBMS_OUTPUT.PUT_LINE('Prueba el sistema con estos IDs de episodio.');
DBMS_OUTPUT.PUT_LINE('');

-- ============================================================================
-- ACTUALIZAR ESTADÍSTICAS
-- ============================================================================

BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS(
    ownname => USER,
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    cascade => TRUE
  );
  DBMS_OUTPUT.PUT_LINE('✓ Estadísticas actualizadas');
END;
/

COMMIT;

PROMPT
PROMPT ============================================================================
PROMPT Datos de ejemplo insertados exitosamente!
PROMPT ============================================================================
PROMPT
PROMPT Siguiente paso: Crear índices
PROMPT Ejecutar: @sql/indexes/create_indexes.sql
PROMPT
