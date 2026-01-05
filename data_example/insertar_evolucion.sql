-- =====================================================
-- INSERTAR DATOS EN TAB_EVOLUCION
-- Datos de ejemplo basados en evol_01.json
-- =====================================================

SET DEFINE OFF
SET SERVEROUTPUT ON

DECLARE
    v_descripcion CLOB;
BEGIN
    -- Limpiar tabla
    DELETE FROM TAB_EVOLUCION;

    -- Registro 1
    v_descripcion := 'TORAX- PLEUROSTOMIA' || CHR(10) || CHR(10) ||
        'PACIENTE POST OP DE CIRUGIA DE MILES. DERRAME PLEURAL BILATERAL, A DERECHA MODERADO A SEVERO ACTUALMENTE EN TAC DE TORAX DE CONTROL.' || CHR(10) ||
        'SE INSTALA PLEUROSTOMIA 24 FR, LA QUE SE FIJA EN 14 CM, DANDO SALIDA A 1000 CC DE CONTENIDO SERORO OSCURO. SE CLAMPEA POR TOS. SE TOMAN MUESTRAS PARA ESTUDIO DE LIQUIDO: CITOQUIMICO, PH, CULTIVO.' || CHR(10) || CHR(10) ||
        'SE SUGIERE:' || CHR(10) ||
        '- EVACUAR 500 CC CADA 1HR HASTA DEJAR DESCLAMPEADO.' || CHR(10) ||
        '- MANANA ASPIRATIVO A PARTIR DE LAS 8 AM.' || CHR(10) ||
        '- CONTROL DE RX MANANA' || CHR(10) ||
        '- KNT R Y M + TRIFLO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-15 22:46:19', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 19);

    -- Registro 2
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, PLEUROSTOMIA 1340 CC SEROHEMATICO.' || CHR(10) ||
        'RADIOGRAFIA CON EXPANSION PULMONAR COMPLETA.' || CHR(10) || CHR(10) ||
        'EX: MP + DISMINUIDO A BASE DERECHA' || CHR(10) || CHR(10) ||
        'ESTUDIO INICIAL DE LIQUIDO PLEURAL, COMPATIBLE CON EXUDADO.' || CHR(10) || CHR(10) ||
        'SE SUGIERE:' || CHR(10) ||
        'MANTENER ASPIRATIVO' || CHR(10) ||
        'KNT R Y M + TRIFLO' || CHR(10) ||
        'SEGUIMIENTO DE PLEUROSTOMIA';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-16 07:49:19', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 20);

    -- Registro 3
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'PACIENTE ESTABLE, SIN DIFICULTAD RESPIRATORIA, SAT 96-98 CON FIO2 AMBIENTAL.' || CHR(10) ||
        'PLEUROSTOMIA 800 CC SEROSO ULTIMAS 12 HRS.' || CHR(10) ||
        'ULTIMO TAC CON SIGNOS DE DHC E HIPERTENSION PORTAL, ASOCIADO A ASCITIS' || CHR(10) ||
        'EN ESTE CONTEXTO, ESTO PUEDE ESTAR FAVORECIENDO ALTO DEBITO DE DRENAJE PLEURAL.' || CHR(10) || CHR(10) ||
        'EX: MP CONSERVADO A DERECHA, LEVEMENTE DISMINUIDO A IZQUIERDA.' || CHR(10) || CHR(10) ||
        'SE SUGIERE:' || CHR(10) ||
        'POR AHORA DRENAJE NO ASPIRATIVO' || CHR(10) ||
        'CAMBIO DE ACQUEASEAL DE SER NECESARIO' || CHR(10) ||
        'CONTROL DE RX MANANA' || CHR(10) ||
        'SE SUGIERE EVALUAR COMPONENTE DE DHC Y MANEJO A FIN DE DISMINUIR DEBITO DE DRENAJE TORACICO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-17 22:00:49', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 21);

    -- Registro 4
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE RESPIRATORIO' || CHR(10) ||
        '400 CC EN 12 HRS.' || CHR(10) ||
        'PROBABLEMENTE EN CONTEXTO DE ASCITIS Y SIGNOS DE DHC + HIPERTENSION PORTAL' || CHR(10) || CHR(10) ||
        'EX: MP + CONSERVADO SRA' || CHR(10) || CHR(10) ||
        'PLAN:' || CHR(10) ||
        'MANTENER SEP NO ASPIRATIVO' || CHR(10) ||
        'KN T R Y M POR 2 VECES DIA' || CHR(10) ||
        'CONTROL DE RX HOY (ORDEN REALIZADA)' || CHR(10) ||
        'SE SUGIERE EVALUACION POR MEDICINA INTERNA/GASTRO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-18 07:50:39', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 22);

    -- Registro 5
    v_descripcion := 'EN SIMILARES CONDICIONES.' || CHR(10) || 'CON NAUSEAS';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-18 12:20:17', 'YYYY-MM-DD HH24:MI:SS'), 2, 'JMVIVANCO', 22);

    -- Registro 6
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, RADIOGRAFIA DE AYER CON EXPANSION COMPLETA, SIN DIFICULTAD RESPIRATORIA.' || CHR(10) ||
        'ACQUASEAL AL TOPE. SE INDICA CAMBIO INMEDIATO.' || CHR(10) || CHR(10) ||
        'EX: MP + CONSERVADO A DERECHA' || CHR(10) || CHR(10) ||
        'PLEUROSTOMIA 1000 CC EN 24 HRS' || CHR(10) || CHR(10) ||
        'SE SUGIERE:' || CHR(10) ||
        'DEBE SER EVALUADA DEL PUNTO DE VISTA DE ASCITIS' || CHR(10) ||
        'MANTENER KNT 2 VECES AL DIA + TRIFLO' || CHR(10) ||
        'OBSERVAR DEBITOS EN FORMA ESTRICTA' || CHR(10) ||
        'MANTENER NO ASPIRATIVO' || CHR(10) ||
        'SEGUIMIENTO POR TORAX';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-19 07:01:13', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 23);

    -- Registro 7
    v_descripcion := 'Medicina interna' || CHR(10) ||
        'Enterado. HTA, cirugia de cancer de colon hace 1 mes aprox. TAC con hallazgos compatibles con DHC.' || CHR(10) ||
        'Desde ayer con nauseas y vomitos alimentarios.' || CHR(10) || CHR(10) ||
        'Ex fisico: impresiona icterica, abdomen distendido, timpanico.' || CHR(10) || CHR(10) ||
        'plan' || CHR(10) ||
        '- ajusto terapia' || CHR(10) ||
        '- exs: p. hepaticas' || CHR(10) ||
        '- Evaluacion por Gastro' || CHR(10) ||
        '- Reevaluacion SOS.';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-19 14:00:56', 'YYYY-MM-DD HH24:MI:SS'), 2, 'JBASTIAS', 23);

    -- Registro 8
    v_descripcion := '68 anios, sin alergias conocidas.' || CHR(10) ||
        'AM: HTA, cardiopatia hipertensiva, FA paroxistica, enfermedad hepatica cronica con HTP.' || CHR(10) ||
        'Cx: protesis de cadera derecha (por artrosis severa)' || CHR(10) ||
        'Mascotas: gatos' || CHR(10) || CHR(10) ||
        'En el marco de un Ca de recto que progreso a pesar de QMT, se hospitalizo para Cx de miles.' || CHR(10) ||
        'Evoluciono en el post op con colecciones perineal y en excavacion pelviana.' || CHR(10) || CHR(10) ||
        'Ya esta en sala, se alimenta poco, con nauseas y vomitos persistentes.' || CHR(10) ||
        'Parametros inflamatorios estacionarios (PCR 15), GB: 12.770, VHS: 9' || CHR(10) || CHR(10) ||
        'se sugiere:' || CHR(10) ||
        '1.- Suspender piperacilina-tazobactam' || CHR(10) ||
        '2.- Meropenem 1 gr cada 8 IV' || CHR(10) ||
        '3.- TAC de abdomen y pelvis c/c' || CHR(10) ||
        '4.- Considerar traslado a sala de mayor complejidad' || CHR(10) || CHR(10) ||
        'atte AGUAYO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-19 18:25:27', 'YYYY-MM-DD HH24:MI:SS'), 3, 'AAGUAYOR', 23);

    -- Registro 9
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, TAC DE TORAX DE CONTROL CON MINIMO DERRAME RESIDUAL DERECHO Y LEVE IZQUIERDO.' || CHR(10) ||
        'EXPANSION ADECUADA.' || CHR(10) ||
        'ACTUALMENTE 120 CC EN 12 HRS' || CHR(10) || CHR(10) ||
        'PLAN:' || CHR(10) ||
        'MANTENER NO ASPIRATIVO' || CHR(10) ||
        'KNT + TRIFLO' || CHR(10) ||
        'SE REEVALUARA RETIRO SEGUN DEBITO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-20 19:23:17', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 24);

    -- Registro 10
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE DEL PUNTO DE VISTA VENTILATORIO' || CHR(10) ||
        'DISMINUCION DEL DEBITO DIARIO. 300 CC EN 24 HRS.' || CHR(10) ||
        'ACTUALMENTE EN MANEJO DE LIQUIDO ASCITICO, CON BUENA RESPUESTA' || CHR(10) || CHR(10) ||
        'SE SUGIERE:' || CHR(10) ||
        'MANTENER NO ASPIRATIVO' || CHR(10) ||
        'RETIRO CON DEBITO CERCANO A 150 CC' || CHR(10) ||
        'KN T R Y M';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-21 16:54:48', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 25);

    -- Registro 11
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, 550 CC EN 24 HRS.' || CHR(10) ||
        'SIN COMPROMISO VENTILATORIO.' || CHR(10) ||
        'EN ESPERA DE DISMINUCION DE DEBITO PARA RETIRO DE SEP.' || CHR(10) ||
        'POR AHORA SIN CAMBIOS';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-22 07:20:56', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 26);

    -- Registro 12
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, HOY 390 CC DE DEBITO.' || CHR(10) ||
        'EX: MP + CONSERVADO' || CHR(10) || CHR(10) ||
        'PLAN:' || CHR(10) ||
        'MANTENER KNT' || CHR(10) ||
        'MANTENER NO ASPIRATIVO' || CHR(10) ||
        'EVENTUAL RETIRO MANANA SEGUN DEBITO';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-23 07:32:30', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 27);

    -- Registro 13
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE' || CHR(10) || CHR(10) ||
        '310 CC EN 24 HRS (PERO 50 CC MAS EN LA BAJA POST MEDICION)' || CHR(10) ||
        'DE TODAS FORMAS CON DEBITO A LA BAJA, LENTO' || CHR(10) ||
        'SE CONVERSA CON PACIENTE, SE DECIDE MANTENER' || CHR(10) || CHR(10) ||
        'PLAN:' || CHR(10) ||
        'KNT R Y M' || CHR(10) ||
        'MANTENER NO ASPIRATIVO' || CHR(10) ||
        'MANTENER MANEJO DE ASCITIS (EL CUAL HA SIDO EFECTIVO)';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-24 07:27:10', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 28);

    -- Registro 14
    v_descripcion := 'TORAX' || CHR(10) || CHR(10) ||
        'ESTABLE, DEBITO DE 50 CC EN 24 HRS, POR LO QUE SE DECIDE RETIRO.' || CHR(10) ||
        'PROCEDIMIENTO SIN INCIDENTES.' || CHR(10) || CHR(10) ||
        'PLAN:' || CHR(10) ||
        'MANTENER CON KNT' || CHR(10) ||
        'CAMBIO DE APOSITO SOS' || CHR(10) ||
        'RETIRO DE PUNTOS EN 5-7 DIAS' || CHR(10) ||
        'REEVALUACION POR CIRUGIA DE TORAX SOS';
    INSERT INTO TAB_EVOLUCION (TIPO_DOCUMENTACION, DESCRIPCION, COD_ITEM, FECHA, ID_REGISTRO, ID_USUARIO, ID_INDICACION)
    VALUES (12, v_descripcion, 0, TO_TIMESTAMP('2025-12-26 07:48:48', 'YYYY-MM-DD HH24:MI:SS'), 1, 'ARIQUELMEU', 30);

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Insertados 14 registros en TAB_EVOLUCION');
END;
/

-- Verificar insercion
SELECT COUNT(*) AS total_registros FROM TAB_EVOLUCION;
SELECT ID_USUARIO, COUNT(*) AS registros FROM TAB_EVOLUCION GROUP BY ID_USUARIO ORDER BY registros DESC;

PROMPT Datos insertados exitosamente en TAB_EVOLUCION;

select * from TAB_EVOLUCION;