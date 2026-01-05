-- =====================================================
-- CREAR TABLA TAB_EVOLUCION
-- Basada en la estructura de evol_01.json
-- =====================================================

-- Eliminar tabla si existe (opcional)
BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE TAB_EVOLUCION CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;
/

-- Crear tabla
CREATE TABLE TAB_EVOLUCION (
    ID_EVOLUCION        NUMBER(10) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    TIPO_DOCUMENTACION  NUMBER(5)           NOT NULL,
    DESCRIPCION         CLOB,
    COD_ITEM            NUMBER(5)           DEFAULT 0,
    FECHA               TIMESTAMP(6)        NOT NULL,
    ID_REGISTRO         NUMBER(5)           NOT NULL,
    ID_USUARIO          VARCHAR2(50)        NOT NULL,
    ID_INDICACION       NUMBER(10)          NOT NULL,
    ID_ATENCION         NUMBER(10),
    FECHA_CREACION      TIMESTAMP(6)        DEFAULT SYSTIMESTAMP,
    FECHA_MODIFICACION  TIMESTAMP(6)
);

-- Comentarios de la tabla
COMMENT ON TABLE TAB_EVOLUCION IS 'Tabla de evoluciones medicas del paciente';
COMMENT ON COLUMN TAB_EVOLUCION.ID_EVOLUCION IS 'Identificador unico autogenerado';
COMMENT ON COLUMN TAB_EVOLUCION.TIPO_DOCUMENTACION IS 'Tipo de documentacion (12=Evolucion)';
COMMENT ON COLUMN TAB_EVOLUCION.DESCRIPCION IS 'Texto completo de la evolucion medica';
COMMENT ON COLUMN TAB_EVOLUCION.COD_ITEM IS 'Codigo de item asociado';
COMMENT ON COLUMN TAB_EVOLUCION.FECHA IS 'Fecha y hora del registro de evolucion';
COMMENT ON COLUMN TAB_EVOLUCION.ID_REGISTRO IS 'Numero de registro dentro de la indicacion';
COMMENT ON COLUMN TAB_EVOLUCION.ID_USUARIO IS 'Identificador del usuario que registro';
COMMENT ON COLUMN TAB_EVOLUCION.ID_INDICACION IS 'ID de la indicacion medica asociada';
COMMENT ON COLUMN TAB_EVOLUCION.ID_ATENCION IS 'ID de atencion (FK opcional a TAB_EXAMENES)';

-- Indices para mejorar rendimiento
CREATE INDEX IDX_EVOL_FECHA ON TAB_EVOLUCION(FECHA);
CREATE INDEX IDX_EVOL_USUARIO ON TAB_EVOLUCION(ID_USUARIO);
CREATE INDEX IDX_EVOL_INDICACION ON TAB_EVOLUCION(ID_INDICACION);
CREATE INDEX IDX_EVOL_TIPO_DOC ON TAB_EVOLUCION(TIPO_DOCUMENTACION);
CREATE INDEX IDX_EVOL_ATENCION ON TAB_EVOLUCION(ID_ATENCION);

-- Verificar creacion
SELECT table_name, num_rows, last_analyzed
FROM user_tables
WHERE table_name = 'TAB_EVOLUCION';

PROMPT Tabla TAB_EVOLUCION creada exitosamente;
