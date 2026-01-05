-- ============================================================================
-- Función PL/SQL: get_discharge_summary_json
-- Descripción: Genera un JSON con el resumen de alta hospitalaria
-- Autor: Sistema Epicrisis Automática
-- Fecha: 2024
-- ============================================================================

CREATE OR REPLACE FUNCTION get_discharge_summary_json(p_episodio_id NUMBER)
RETURN CLOB IS
  v_result CLOB;
  v_error_msg VARCHAR2(4000);
BEGIN
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

    -- Evoluciones clínicas
    'evolucion' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'fecha' VALUE TO_CHAR(e.fecha_registro, 'YYYY-MM-DD'),
          'nota' VALUE SUBSTR(e.nota_evolucion, 1, 2000),
          'profesional' VALUE e.nombre_profesional
        ) ORDER BY e.fecha_registro
      ), JSON_ARRAY())
      FROM evoluciones e
      WHERE e.id_episodio = p_episodio_id
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

  RETURN v_result;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
  WHEN OTHERS THEN
    -- Log del error (fecha_error y usuario usan DEFAULT)
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
