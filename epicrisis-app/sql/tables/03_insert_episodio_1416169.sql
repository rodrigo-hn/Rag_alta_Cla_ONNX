-- ============================================================================
-- INSERCIÓN DE EPISODIO REAL: 1416169
-- Paciente: Mujer de 68 años - Post operatorio cirugía de Miles
-- Descripción: Datos extraídos de epicrisis_ejemplo.json
-- ============================================================================
--
-- IMPORTANTE: Para ejecutar este script con UTF-8 correcto:
--
-- Opción 1 (Recomendada): Usar NLS_LANG al conectar
--   export NLS_LANG=AMERICAN_AMERICA.AL32UTF8
--   sqlplus system/Oracle123@ORCLPDB1 @03_insert_episodio_1416169.sql
--
-- Opción 2: Desde Docker con encoding correcto
--   docker exec -i oracle19c bash -c "export NLS_LANG=AMERICAN_AMERICA.AL32UTF8 && sqlplus -s system/Oracle123@ORCLPDB1 @/path/script.sql"
--
-- Esto asegura que caracteres como ñ, á, é, í, ó, ú se guarden correctamente
-- ============================================================================

SET DEFINE OFF;

-- ============================================================================
-- 1. INSERTAR PACIENTE
-- ============================================================================

INSERT INTO pacientes (
  rut,
  nombre,
  apellido_paterno,
  apellido_materno,
  fecha_nacimiento,
  sexo,
  prevision,
  activo
) VALUES (
  '16789234-5',  -- RUT ficticio (no proporcionado en JSON)
  'Rosa',
  'Morales',
  'Valenzuela',
  TO_DATE('1957-06-15', 'YYYY-MM-DD'),  -- 68 años al 2025-12-15
  'F',
  'FONASA',
  'S'
);

-- Obtener el ID del paciente recién insertado
DECLARE
  v_id_paciente NUMBER;
BEGIN
  SELECT id_paciente INTO v_id_paciente
  FROM pacientes
  WHERE rut = '16789234-5';

  DBMS_OUTPUT.PUT_LINE('Paciente insertado con ID: ' || v_id_paciente);
END;
/

-- ============================================================================
-- 2. INSERTAR EPISODIO (ATENCIÓN)
-- ============================================================================

INSERT INTO atenciones (
  id_paciente,
  folio,
  fecha_ingreso,
  fecha_alta,
  motivo_ingreso,
  servicio_ingreso,
  estado,
  tipo_alta,
  medico_tratante
)
SELECT
  p.id_paciente,
  'ATN-2025-1416169',
  TO_DATE('2025-12-15', 'YYYY-MM-DD'),
  TO_DATE('2025-12-26', 'YYYY-MM-DD'),
  'Post operatorio cirugia de Miles por cancer de recto',
  'Cirugía General',
  'ALTA',
  'MEDICA',
  'Dr. Aguayo'
FROM pacientes p
WHERE p.rut = '16789234-5';

-- Verificar ID del episodio
DECLARE
  v_id_episodio NUMBER;
BEGIN
  SELECT id_episodio INTO v_id_episodio
  FROM atenciones
  WHERE folio = 'ATN-2025-1416169';

  DBMS_OUTPUT.PUT_LINE('Episodio insertado con ID: ' || v_id_episodio);
END;
/

-- ============================================================================
-- 3. INSERTAR DIAGNÓSTICOS DE INGRESO
-- ============================================================================

INSERT ALL
  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'INGRESO', 'C20', 'Tumor maligno del recto', 'S')

  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'INGRESO', 'K74.6', 'Cirrosis hepatica, otra y la no especificada', 'N')

  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'INGRESO', 'J90', 'Derrame pleural no clasificado en otra parte', 'N')
SELECT
  a.id_episodio as v_episodio,
  a.id_paciente as v_paciente
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 4. INSERTAR DIAGNÓSTICOS DE EGRESO
-- ============================================================================

INSERT ALL
  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'EGRESO', 'C20', 'Tumor maligno del recto - Post operatorio cirugia de Miles', 'S')

  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'EGRESO', 'J90', 'Derrame pleural bilateral resuelto', 'N')

  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'EGRESO', 'K74.6', 'Enfermedad hepatica cronica con hipertension portal', 'N')

  INTO diagnosticos (id_episodio, id_paciente, tipo, codigo_cie10, descripcion, es_principal)
  VALUES (v_episodio, v_paciente, 'EGRESO', 'K65.0', 'Coleccion pelviana post quirurgica en tratamiento', 'N')
SELECT
  a.id_episodio as v_episodio,
  a.id_paciente as v_paciente
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 5. INSERTAR PROCEDIMIENTOS
-- ============================================================================

INSERT ALL
  INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
  VALUES (v_episodio, v_paciente, '48.52', 'Cirugia de Miles (reseccion abdominoperineal)', TO_DATE('2025-12-15', 'YYYY-MM-DD'), 'Dr. Aguayo', 'Cirugia General')

  INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
  VALUES (v_episodio, v_paciente, '34.04', 'Pleurostomia 24 FR', TO_DATE('2025-12-15', 'YYYY-MM-DD'), 'Dr. Especialista Torax', 'Cirugia de Torax')

  INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
  VALUES (v_episodio, v_paciente, '87.41', 'TAC de torax', TO_DATE('2025-12-16', 'YYYY-MM-DD'), 'Radiologia', 'Radiologia')

  INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
  VALUES (v_episodio, v_paciente, '87.43', 'TAC de abdomen y pelvis', TO_DATE('2025-12-19', 'YYYY-MM-DD'), 'Radiologia', 'Radiologia')

  INTO procedimientos (id_episodio, id_paciente, codigo, descripcion, fecha_realizacion, profesional, especialidad)
  VALUES (v_episodio, v_paciente, '86.22', 'VAC perineal (curacion con presion negativa)', TO_DATE('2025-12-16', 'YYYY-MM-DD'), 'Enfermeria', 'Cuidados de heridas')
SELECT
  a.id_episodio as v_episodio,
  a.id_paciente as v_paciente
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 6. INSERTAR MEDICAMENTOS HOSPITALARIOS
-- ============================================================================

INSERT ALL
  INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, fecha_termino, activo)
  VALUES (v_episodio, v_paciente, 'J01CR05', 'Piperacilina/Tazobactam', '4.5g', 'EV', 'cada 6 horas', TO_DATE('2025-12-15', 'YYYY-MM-DD'), TO_DATE('2025-12-19', 'YYYY-MM-DD'), 'N')

  INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, fecha_termino, activo)
  VALUES (v_episodio, v_paciente, 'J01DH02', 'Meropenem', '1g', 'EV', 'cada 8 horas', TO_DATE('2025-12-19', 'YYYY-MM-DD'), TO_DATE('2025-12-26', 'YYYY-MM-DD'), 'S')

  INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, fecha_termino, activo)
  VALUES (v_episodio, v_paciente, 'J01XA01', 'Ceftriaxona', '2g', 'EV', 'cada 24 horas', TO_DATE('2025-12-15', 'YYYY-MM-DD'), TO_DATE('2025-12-17', 'YYYY-MM-DD'), 'N')

  INTO medicamentos_hospitalarios (id_episodio, id_paciente, codigo_atc, nombre_generico, dosis, via_administracion, frecuencia, fecha_inicio, fecha_termino, activo)
  VALUES (v_episodio, v_paciente, 'J01XD01', 'Metronidazol', '500mg', 'EV', 'cada 8 horas', TO_DATE('2025-12-15', 'YYYY-MM-DD'), TO_DATE('2025-12-17', 'YYYY-MM-DD'), 'N')
SELECT
  a.id_episodio as v_episodio,
  a.id_paciente as v_paciente
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 7. INSERTAR MEDICAMENTOS AL ALTA
-- ============================================================================

INSERT INTO medicamentos_alta (
  id_episodio,
  id_paciente,
  codigo_atc,
  nombre_generico,
  dosis,
  via_administracion,
  frecuencia,
  duracion,
  indicacion,
  orden
)
SELECT
  a.id_episodio,
  a.id_paciente,
  'J01DH02',
  'Meropenem',
  '1g',
  'EV',
  'cada 8 horas',
  'Completar esquema segun infectologia',
  'Tratamiento antibiotico post quirurgico',
  1
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 8. INSERTAR EVOLUCIONES (TODAS LAS 11 EVOLUCIONES DEL JSON ORIGINAL)
-- ============================================================================

-- Día 1
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-15', 'YYYY-MM-DD'),
  'TORAX- PLEUROSTOMIA PACIENTE POST OP DE CIRUGIA DE MILES. DERRAME PLEURAL BILATERAL, A DERECHA MODERADO A SEVERO ACTUALMENTE EN TAC DE TORAX DE CONTROL. SE INSTALA PLEUROSTOMIA 24 FR, LA QUE SE FIJA EN 14 CM, DANDO SALIDA A 1000 CC DE CONTENIDO SERORO OSCURO. SE CLAMPEA POR TOS. SE TOMAN MUESTRAS PARA ESTUDIO DE LIQUIDO: CITOQUIMICO, PH, CULTIVO. SE SUGIERE: - EVACUAR 500 CC CADA 1HR HASTA DEJAR DESCLAMPEADO. - MANANA ASPIRATIVO A PARTIR DE LAS 8 AM. - CONTROL DE RX MANANA - KNT R Y M + TRIFLO',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 2
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-16', 'YYYY-MM-DD'),
  'TORAX ESTABLE, PLEUROSTOMIA 1340 CC SEROHEMATICO. RADIOGRAFIA CON EXPANSION PULMONAR COMPLETA. EX: MP + DISMINUIDO A BASE DERECHA ESTUDIO INICIAL DE LIQUIDO PLEURAL, COMPATIBLE CON EXUDADO. SE SUGIERE: MANTENER ASPIRATIVO KNT R Y M + TRIFLO SEGUIMIENTO DE PLEUROSTOMIA',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 3
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-17', 'YYYY-MM-DD'),
  'TORAX PACIENTE ESTABLE, SIN DIFICULTAD RESPIRATORIA, SAT 96-98 CON FIO2 AMBIENTAL. PLEUROSTOMIA 800 CC SEROSO ULTIMAS 12 HRS. ULTIMO TAC CON SIGNOS DE DHC E HIPERTENSION PORTAL, ASOCIADO A ASCITIS EN ESTE CONTEXTO, ESTO PUEDE ESTAR FAVORECIENDO ALTO DEBITO DE DRENAJE PLEURAL. EX: MP CONSERVADO A DERECHA, LEVEMENTE DISMINUIDO A IZQUIERDA. SE SUGIERE: POR AHORA DRENAJE NO ASPIRATIVO CAMBIO DE ACQUEASEAL DE SER NECESARIO CONTROL DE RX MANANA SE SUGIERE EVALUAR COMPONENTE DE DHC Y MANEJO A FIN DE DISMINUIR DEBITO DE DRENAJE TORACICO',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 4
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-18', 'YYYY-MM-DD'),
  'TORAX ESTABLE RESPIRATORIO 400 CC EN 12 HRS. PROBABLEMENTE EN CONTEXTO DE ASCITIS Y SIGNOS DE DHC + HIPERTENSION PORTAL EX: MP + CONSERVADO SRA PLAN: MANTENER SEP NO ASPIRATIVO KN T R Y M POR 2 VECES DIA CONTROL DE RX HOY (ORDEN REALIZADA) SE SUGIERE EVALUACION POR MEDICINA INTERNA/GASTRO | EN SIMILARES CONDICIONES. CON NAUSEAS',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 5
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-19', 'YYYY-MM-DD'),
  'TORAX ESTABLE, RADIOGRAFIA DE AYER CON EXPANSION COMPLETA, SIN DIFICULTAD RESPIRATORIA. ACQUASEAL AL TOPE. SE INDICA CAMBIO INMEDIATO. EX: MP + CONSERVADO A DERECHA PLEUROSTOMIA 1000 CC EN 24 HRS SE SUGIERE: DEBE SER EVALUADA DEL PUNTO DE VISTA DE ASCITIS MANTENER KNT 2 VECES AL DIA + TRIFLO OBSERVAR DEBITOS EN FORMA ESTRICTA MANTENER NO ASPIRATIVO SEGUIMIENTO POR TORAX | Medicina interna Enterado. HTA, cirugia de cancer de colon hace 1 mes aprox. TAC con hallazgos compatibles con DHC. Desde ayer con nauseas y vomitos alimentarios. Ex fisico: impresiona icterica, abdomen distendido, timpanico. plan - ajusto terapia - exs: p. hepaticas - Evaluacion por Gastro - Reevaluacion SOS. | 68 anios, sin alergias conocidas. AM: HTA, cardiopatia hipertensiva, FA paroxistica, enfermedad hepatica cronica con HTP. Cx: protesis de cadera derecha (por artrosis severa) Mascotas: gatos En el marco de un Ca de recto que progreso a pesar de QMT, se hospitalizo para Cx de miles. Evoluciono en el post op con colecciones perineal y en excavacion pelviana. Ya esta en sala, se alimenta poco, con nauseas y vomitos persistentes. Parametros inflamatorios estacionarios (PCR 15), GB: 12.770, VHS: 9 se sugiere: 1.- Suspender piperacilina-tazobactam 2.- Meropenem 1 gr cada 8 IV 3.- TAC de abdomen y pelvis c/c 4.- Considerar traslado a sala de mayor complejidad atte AGUAYO',
  'Dr. Aguayo',
  'Medicina Interna'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 6
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-20', 'YYYY-MM-DD'),
  'TORAX ESTABLE, TAC DE TORAX DE CONTROL CON MINIMO DERRAME RESIDUAL DERECHO Y LEVE IZQUIERDO. EXPANSION ADECUADA. ACTUALMENTE 120 CC EN 12 HRS PLAN: MANTENER NO ASPIRATIVO KNT + TRIFLO SE REEVALUARA RETIRO SEGUN DEBITO',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 7
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-21', 'YYYY-MM-DD'),
  'TORAX ESTABLE DEL PUNTO DE VISTA VENTILATORIO DISMINUCION DEL DEBITO DIARIO. 300 CC EN 24 HRS. ACTUALMENTE EN MANEJO DE LIQUIDO ASCITICO, CON BUENA RESPUESTA SE SUGIERE: MANTENER NO ASPIRATIVO RETIRO CON DEBITO CERCANO A 150 CC KN T R Y M',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 8
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-22', 'YYYY-MM-DD'),
  'TORAX ESTABLE, 550 CC EN 24 HRS. SIN COMPROMISO VENTILATORIO. EN ESPERA DE DISMINUCION DE DEBITO PARA RETIRO DE SEP. POR AHORA SIN CAMBIOS',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 9
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-23', 'YYYY-MM-DD'),
  'TORAX ESTABLE, HOY 390 CC DE DEBITO. EX: MP + CONSERVADO PLAN: MANTENER KNT MANTENER NO ASPIRATIVO EVENTUAL RETIRO MANANA SEGUN DEBITO',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 10
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-24', 'YYYY-MM-DD'),
  'TORAX ESTABLE 310 CC EN 24 HRS (PERO 50 CC MAS EN LA BAJA POST MEDICION) DE TODAS FORMAS CON DEBITO A LA BAJA, LENTO SE CONVERSA CON PACIENTE, SE DECIDE MANTENER PLAN: KNT R Y M MANTENER NO ASPIRATIVO MANTENER MANEJO DE ASCITIS (EL CUAL HA SIDO EFECTIVO)',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- Día 12 (alta) - Nota: no hay día 11 en el JSON original
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
SELECT
  a.id_episodio,
  a.id_paciente,
  TO_DATE('2025-12-26', 'YYYY-MM-DD'),
  'TORAX ESTABLE, DEBITO DE 50 CC EN 24 HRS, POR LO QUE SE DECIDE RETIRO. PROCEDIMIENTO SIN INCIDENTES. PLAN: MANTENER CON KNT CAMBIO DE APOSITO SOS RETIRO DE PUNTOS EN 5-7 DIAS REEVALUACION POR CIRUGIA DE TORAX SOS',
  'Equipo Cirugia de Torax',
  'Cirugia de Torax'
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 9. INSERTAR LABORATORIOS (EXÁMENES AL INGRESO)
-- ============================================================================

INSERT ALL
  -- Hemoglobina
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Hemoglobina en sangre total', '718-7', TO_TIMESTAMP('2025-12-25 07:11:09', 'YYYY-MM-DD HH24:MI:SS'), 7.8, '7.8', 'g/dL', 12.3, 15.3, 'BAJO')

  -- Hematocrito
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Hematocrito', '4544-3', TO_TIMESTAMP('2025-12-25 07:11:09', 'YYYY-MM-DD HH24:MI:SS'), 23.7, '23.7', '%', 35, 47, 'BAJO')

  -- Leucocitos
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Recuento de leucocitos (absoluto)', '6690-2', TO_TIMESTAMP('2025-12-25 07:11:09', 'YYYY-MM-DD HH24:MI:SS'), 12.62, '12.62', 'x10^9/L', 4.4, 11.3, 'ALTO')

  -- PCR
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Proteina C reactiva', '1988-5', TO_TIMESTAMP('2025-12-25 07:11:11', 'YYYY-MM-DD HH24:MI:SS'), 8.79, '8.79', 'mg/dL', 0, 0.49, 'ALTO')

  -- Albúmina
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Albumina en sangre', '1751-7', TO_TIMESTAMP('2025-12-25 07:11:10', 'YYYY-MM-DD HH24:MI:SS'), 2.82, '2.82', 'g/dL', 3.5, 5.2, 'BAJO')

  -- Potasio
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Potasio plasmatico', '2823-3', TO_TIMESTAMP('2025-12-25 07:11:10', 'YYYY-MM-DD HH24:MI:SS'), 3.3, '3.3', 'mmol/L', 3.5, 5.1, 'BAJO')

  -- Calcio
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Calcio en sangre', '17861-6', TO_TIMESTAMP('2025-12-25 07:11:10', 'YYYY-MM-DD HH24:MI:SS'), 7.6, '7.6', 'mg/dL', 8.8, 10.2, 'BAJO')

  -- Creatinina
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Creatinina en sangre', '2160-0', TO_TIMESTAMP('2025-12-25 07:11:10', 'YYYY-MM-DD HH24:MI:SS'), 0.63, '0.63', 'mg/dL', 0.5, 0.9, 'NORMAL')

  -- Sodio
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Sodio plasmatico', '2951-2', TO_TIMESTAMP('2025-12-25 07:11:10', 'YYYY-MM-DD HH24:MI:SS'), 143.1, '143.1', 'mmol/L', 136, 145, 'NORMAL')

  -- Plaquetas
  INTO laboratorios (id_episodio, id_paciente, nombre_examen, codigo_loinc, fecha_examen, resultado_valor, resultado_texto, unidad, rango_min, rango_max, estado)
  VALUES (v_episodio, v_paciente, 'Recuento de plaquetas (absoluto)', '777-3', TO_TIMESTAMP('2025-12-25 07:11:09', 'YYYY-MM-DD HH24:MI:SS'), 170, '170', 'x10^3/uL', 150, 450, 'NORMAL')
SELECT
  a.id_episodio as v_episodio,
  a.id_paciente as v_paciente
FROM atenciones a
WHERE a.folio = 'ATN-2025-1416169';

-- ============================================================================
-- 10. INSERTAR ANTECEDENTES DEL PACIENTE
-- ============================================================================

INSERT ALL
  -- Antecedentes Médicos
  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'MEDICO', 'HTA', TO_DATE('2025-12-15', 'YYYY-MM-DD'))

  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'MEDICO', 'Cardiopatia hipertensiva', TO_DATE('2025-12-15', 'YYYY-MM-DD'))

  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'MEDICO', 'FA paroxistica', TO_DATE('2025-12-15', 'YYYY-MM-DD'))

  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'MEDICO', 'Enfermedad hepatica cronica con hipertension portal', TO_DATE('2025-12-15', 'YYYY-MM-DD'))

  -- Antecedentes Quirúrgicos
  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'QUIRURGICO', 'Protesis de cadera derecha por artrosis severa', TO_DATE('2025-12-15', 'YYYY-MM-DD'))

  -- Alergias
  INTO antecedentes (id_paciente, tipo, descripcion, fecha_registro)
  VALUES (v_paciente, 'ALERGIA', 'Sin alergias conocidas', TO_DATE('2025-12-15', 'YYYY-MM-DD'))
SELECT
  p.id_paciente as v_paciente
FROM pacientes p
WHERE p.rut = '16789234-5';

-- ============================================================================
-- COMMIT Y VERIFICACIÓN
-- ============================================================================

COMMIT;

-- Verificar inserción
SELECT
  'Episodio insertado correctamente:' as mensaje,
  a.id_episodio,
  a.folio,
  p.nombre || ' ' || p.apellido_paterno as paciente,
  a.fecha_ingreso,
  a.fecha_alta,
  a.motivo_ingreso
FROM atenciones a
JOIN pacientes p ON a.id_paciente = p.id_paciente
WHERE a.folio = 'ATN-2025-1416169';

-- Resumen de datos insertados
SELECT
  'RESUMEN DE DATOS INSERTADOS' as titulo,
  (SELECT COUNT(*) FROM diagnosticos WHERE id_episodio = (SELECT id_episodio FROM atenciones WHERE folio = 'ATN-2025-1416169')) as total_diagnosticos,
  (SELECT COUNT(*) FROM procedimientos WHERE id_episodio = (SELECT id_episodio FROM atenciones WHERE folio = 'ATN-2025-1416169')) as total_procedimientos,
  (SELECT COUNT(*) FROM medicamentos_hospitalarios WHERE id_episodio = (SELECT id_episodio FROM atenciones WHERE folio = 'ATN-2025-1416169')) as total_medicamentos,
  (SELECT COUNT(*) FROM evoluciones WHERE id_episodio = (SELECT id_episodio FROM atenciones WHERE folio = 'ATN-2025-1416169')) as total_evoluciones,
  (SELECT COUNT(*) FROM laboratorios WHERE id_episodio = (SELECT id_episodio FROM atenciones WHERE folio = 'ATN-2025-1416169')) as total_laboratorios
FROM DUAL;

DBMS_OUTPUT.PUT_LINE('');
DBMS_OUTPUT.PUT_LINE('============================================');
DBMS_OUTPUT.PUT_LINE('EPISODIO 1416169 INSERTADO EXITOSAMENTE');
DBMS_OUTPUT.PUT_LINE('============================================');
DBMS_OUTPUT.PUT_LINE('Paciente: Rosa Morales Valenzuela');
DBMS_OUTPUT.PUT_LINE('Folio: ATN-2025-1416169');
DBMS_OUTPUT.PUT_LINE('Diagnóstico Principal: Cancer de recto - Post op cirugia de Miles');
DBMS_OUTPUT.PUT_LINE('Hospitalización: 2025-12-15 al 2025-12-26 (11 días)');
DBMS_OUTPUT.PUT_LINE('');
DBMS_OUTPUT.PUT_LINE('DATOS COMPLETOS DEL JSON ORIGINAL:');
DBMS_OUTPUT.PUT_LINE('- 7 diagnósticos (3 ingreso + 4 egreso)');
DBMS_OUTPUT.PUT_LINE('- 5 procedimientos quirúrgicos');
DBMS_OUTPUT.PUT_LINE('- 4 medicamentos hospitalarios');
DBMS_OUTPUT.PUT_LINE('- 11 evoluciones clínicas (días 1-10 y 12)');
DBMS_OUTPUT.PUT_LINE('- 10 exámenes de laboratorio');
DBMS_OUTPUT.PUT_LINE('- 6 antecedentes médicos/quirúrgicos');
DBMS_OUTPUT.PUT_LINE('============================================');

SET DEFINE ON;
