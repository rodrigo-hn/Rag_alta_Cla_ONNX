-- ============================================================================
-- Función PL/SQL: get_discharge_summary_json (Versión 2 - Optimizada para CLOBs)
-- Descripción: Genera un JSON con el resumen de alta hospitalaria
-- Construye el JSON en partes para evitar límite de 4000 bytes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_discharge_summary_json(p_episodio_id NUMBER)
RETURN CLOB IS
  v_result CLOB;
  v_temp CLOB;
  v_evoluciones CLOB;
  v_error_msg VARCHAR2(4000);
  v_first BOOLEAN := TRUE;
BEGIN
  -- Inicializar CLOB
  DBMS_LOB.CREATETEMPORARY(v_result, TRUE);
  DBMS_LOB.CREATETEMPORARY(v_evoluciones, TRUE);

  -- Construir JSON base sin evoluciones
  SELECT JSON_OBJECT(
    'motivo_ingreso' VALUE NVL(a.motivo_ingreso, 'No consignado'),

    -- Diagnósticos de ingreso
    'diagnostico_ingreso' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE dx.codigo_cie10,
          'nombre' VALUE dx.descripcion
        ) ORDER BY dx.fecha_registro
      ), JSON_ARRAY())
      FROM diagnosticos dx
      WHERE dx.id_episodio = p_episodio_id
        AND dx.tipo = 'INGRESO'
    ),

    -- Procedimientos
    'procedimientos' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE proc.codigo,
          'nombre' VALUE proc.descripcion,
          'fecha' VALUE TO_CHAR(proc.fecha_realizacion, 'YYYY-MM-DD')
        ) ORDER BY proc.fecha_realizacion
      ), JSON_ARRAY())
      FROM procedimientos proc
      WHERE proc.id_episodio = p_episodio_id
    ),

    -- Tratamientos intrahospitalarios
    'tratamientos_intrahosp' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE m.codigo_atc,
          'nombre' VALUE m.nombre_generico,
          'dosis' VALUE m.dosis,
          'via' VALUE m.via_administracion,
          'frecuencia' VALUE m.frecuencia
        ) ORDER BY m.fecha_inicio
      ), JSON_ARRAY())
      FROM medicamentos_hospitalarios m
      WHERE m.id_episodio = p_episodio_id
        AND m.activo = 'S'
    ),

    -- Laboratorios relevantes
    'laboratorios_relevantes' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'parametro' VALUE l.nombre_examen,
          'valor' VALUE l.resultado || ' ' || NVL(l.unidad, ''),
          'fecha' VALUE TO_CHAR(l.fecha_resultado, 'YYYY-MM-DD')
        ) ORDER BY l.fecha_resultado DESC
      ), JSON_ARRAY())
      FROM laboratorios l
      WHERE l.id_episodio = p_episodio_id
        AND l.es_relevante = 'S'
    ),

    -- Diagnósticos de egreso
    'diagnostico_egreso' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE dx.codigo_cie10,
          'nombre' VALUE dx.descripcion
        ) ORDER BY dx.es_principal DESC, dx.fecha_registro
      ), JSON_ARRAY())
      FROM diagnosticos dx
      WHERE dx.id_episodio = p_episodio_id
        AND dx.tipo = 'EGRESO'
    ),

    -- Indicaciones de alta
    'indicaciones_alta' VALUE JSON_OBJECT(
      'medicamentos' VALUE (
        SELECT NVL(JSON_ARRAYAGG(
          JSON_OBJECT(
            'codigo' VALUE m.codigo_atc,
            'nombre' VALUE m.nombre_generico,
            'dosis' VALUE m.dosis,
            'via' VALUE m.via_administracion,
            'frecuencia' VALUE m.frecuencia,
            'duracion' VALUE m.duracion
          ) ORDER BY m.orden
        ), JSON_ARRAY())
        FROM medicamentos_alta m
        WHERE m.id_episodio = p_episodio_id
      ),
      'controles' VALUE (
        SELECT NVL(JSON_ARRAYAGG(c.descripcion ORDER BY c.fecha_control), JSON_ARRAY())
        FROM controles_alta c
        WHERE c.id_episodio = p_episodio_id
      ),
      'recomendaciones' VALUE (
        SELECT NVL(JSON_ARRAYAGG(r.descripcion ORDER BY r.orden), JSON_ARRAY())
        FROM recomendaciones_alta r
        WHERE r.id_episodio = p_episodio_id
      )
    )
    RETURNING CLOB
  ) INTO v_result
  FROM atenciones a
  WHERE a.id_episodio = p_episodio_id;

  -- Construir array de evoluciones manualmente
  DBMS_LOB.APPEND(v_evoluciones, '[');

  FOR rec IN (
    SELECT
      TO_CHAR(e.fecha_registro, 'YYYY-MM-DD') as fecha,
      SUBSTR(e.nota_evolucion, 1, 2000) as nota,
      e.nombre_profesional as profesional
    FROM evoluciones e
    WHERE e.id_episodio = p_episodio_id
    ORDER BY e.fecha_registro
  ) LOOP
    IF NOT v_first THEN
      DBMS_LOB.APPEND(v_evoluciones, ',');
    END IF;
    v_first := FALSE;

    -- Construir objeto JSON de evolución
    DBMS_LOB.CREATETEMPORARY(v_temp, TRUE);
    SELECT JSON_OBJECT(
      'fecha' VALUE rec.fecha,
      'nota' VALUE rec.nota,
      'profesional' VALUE rec.profesional
      RETURNING CLOB
    ) INTO v_temp FROM DUAL;

    DBMS_LOB.APPEND(v_evoluciones, v_temp);
    DBMS_LOB.FREETEMPORARY(v_temp);
  END LOOP;

  DBMS_LOB.APPEND(v_evoluciones, ']');

  -- Reemplazar el último } con ,"evolucion":[...]
  DECLARE
    v_pos NUMBER;
    v_len NUMBER;
    v_final CLOB;
  BEGIN
    DBMS_LOB.CREATETEMPORARY(v_final, TRUE);

    -- Obtener todo menos el último caracter (})
    v_len := DBMS_LOB.GETLENGTH(v_result);
    DBMS_LOB.COPY(v_final, v_result, v_len - 1, 1, 1);

    -- Agregar el campo evolucion
    DBMS_LOB.WRITEAPPEND(v_final, LENGTH(',"evolucion":'), ',"evolucion":');
    DBMS_LOB.APPEND(v_final, v_evoluciones);
    DBMS_LOB.WRITEAPPEND(v_final, 1, '}');

    -- Liberar v_result y usar v_final
    DBMS_LOB.FREETEMPORARY(v_result);
    v_result := v_final;
  END;

  DBMS_LOB.FREETEMPORARY(v_evoluciones);

  RETURN v_result;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
  WHEN OTHERS THEN
    -- Log del error
    v_error_msg := SQLERRM;
    INSERT INTO log_errores (
      procedimiento,
      mensaje_error,
      parametros
    ) VALUES (
      'get_discharge_summary_json',
      v_error_msg,
      'p_episodio_id=' || p_episodio_id
    );
    COMMIT;
    RAISE;
END get_discharge_summary_json;
/
