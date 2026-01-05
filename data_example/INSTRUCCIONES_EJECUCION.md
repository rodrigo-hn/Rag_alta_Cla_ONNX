# Instrucciones de Ejecución - Validación Oracle 19c

## Problema Encontrado
El error `SP2-0310: unable to open file` indica que SQLPlus no encuentra el archivo en la ruta especificada.

## Soluciones Disponibles

### MÉTODO 1: Ejecutar Manualmente (MÁS CONFIABLE)

```bash
# Paso 1: Conectarse al contenedor
docker exec -it oracle19c bash

# Paso 2: Dentro del contenedor, configurar Oracle
export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH
export ORACLE_SID=ORCLCDB

# Paso 3: Conectarse a SQLPlus
sqlplus SYSTEM/Oracle123@localhost:1521/ORCLPDB1

# Paso 4: Una vez en SQLPlus, pegar el contenido del archivo test_version1_json.sql
# (Copiar y pegar el contenido completo del archivo)
```

### MÉTODO 2: Usar el Script Actualizado

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/data_example
./run_test_oracle.sh
```

### MÉTODO 3: Usar el Script Simple

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/data_example
./run_test_simple.sh
```

### MÉTODO 4: Ejecutar en el Contenedor

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/data_example
./run_in_container.sh
```

### MÉTODO 5: Copiar y Ejecutar Directamente

```bash
# Copiar el archivo al contenedor
docker cp test_version1_json.sql oracle19c:/opt/oracle/test.sql

# Ejecutar directamente
docker exec -i oracle19c bash -c "
  export ORACLE_HOME=/opt/oracle/product/19c/dbhome_1
  export PATH=\$ORACLE_HOME/bin:\$PATH
  cd /opt/oracle
  \$ORACLE_HOME/bin/sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 @test.sql
"
```

### MÉTODO 6: Usando SQL Developer o DBeaver (RECOMENDADO PARA PRIMERA VEZ)

1. Abre SQL Developer o DBeaver
2. Conecta a Oracle:
   - Host: localhost
   - Port: 1521
   - SID/Service: ORCLPDB1
   - Usuario: SYSTEM
   - Password: Oracle123

3. Abre el archivo `test_version1_json.sql`
4. Ejecuta el script completo (F5 o botón Execute)

## Verificación Rápida Primero

Antes de ejecutar el test completo, verifica la conexión:

```bash
docker exec -i oracle19c sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << EOF
SELECT 'Conexión exitosa' FROM DUAL;
SELECT banner FROM v\$version WHERE ROWNUM = 1;
EXIT;
EOF
```

Deberías ver:
```
Conexión exitosa
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
```

## Verificación de Tablas

Verifica que las tablas existen:

```bash
docker exec -i oracle19c sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << EOF
SELECT table_name FROM user_tables WHERE table_name IN ('TAB_EXAMENES', 'TAB_RESULTADOS');
EXIT;
EOF
```

## Test Rápido de Funciones JSON

```bash
docker exec -i oracle19c sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << EOF
SET PAGESIZE 0
SET FEEDBACK OFF
SELECT JSON_OBJECT('test' VALUE 'ok') FROM DUAL;
EXIT;
EOF
```

Deberías ver: `{"test":"ok"}`

## Ejecutar Solo la Consulta Principal

Si solo quieres ejecutar la consulta VERSIÓN 1 sin validaciones:

```bash
docker exec -i oracle19c sqlplus -S SYSTEM/Oracle123@localhost:1521/ORCLPDB1 << 'EOF'
SET LINESIZE 32767
SET LONG 1000000
SET PAGESIZE 0
SET FEEDBACK OFF

SELECT JSON_OBJECT(
    'laboratorios_resumen' VALUE
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'prueba' VALUE prueba,
            'unidad' VALUE unidad,
            'ingreso' VALUE JSON_OBJECT(
                'valor' VALUE valor_ingreso,
                'fecha' VALUE TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS'),
                'estado' VALUE estado_ingreso
            ),
            'ultimo' VALUE CASE
                WHEN tiene_ultimo = 'SI' THEN JSON_OBJECT(
                    'valor' VALUE valor_ultimo,
                    'fecha' VALUE TO_CHAR(fecha_ultimo, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    'estado' VALUE estado_ultimo
                )
                ELSE NULL
            END
            ABSENT ON NULL
        )
    )
) AS json_resultado
FROM (
    WITH datos_pruebas AS (
        SELECT
            e.ID_ATENCION,
            r.NOMBRE_PRUEBA_LIS AS prueba,
            r.UNIDAD_MEDIDA AS unidad,
            TO_NUMBER(REPLACE(r.VALOR_RESULTADO, ',', '.')) AS valor_numerico,
            r.FECHA_INTEGRACION,
            LOWER(
                CASE
                    WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'normal'
                    WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'alto'
                    WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'bajo'
                    ELSE 'sin_clasificar'
                END
            ) AS estado,
            ROW_NUMBER() OVER (
                PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
                ORDER BY r.FECHA_INTEGRACION ASC
            ) AS rn_primero,
            ROW_NUMBER() OVER (
                PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
                ORDER BY r.FECHA_INTEGRACION DESC
            ) AS rn_ultimo
        FROM TAB_EXAMENES e
        INNER JOIN TAB_RESULTADOS r
            ON e.ID_ATENCION = r.ID_ATENCION
            AND e.CODIGO_EXAMEN = r.COD_PRESTACION
        WHERE r.VALOR_RESULTADO IS NOT NULL
            AND r.VALOR_RESULTADO != '-'
            AND r.IND_RANGO_RESULTADO IS NOT NULL
            AND REGEXP_LIKE(r.VALOR_RESULTADO, '^[0-9]+([.,][0-9]+)?$')
    ),
    primeros AS (
        SELECT
            ID_ATENCION, prueba, unidad,
            valor_numerico AS valor_ingreso,
            FECHA_INTEGRACION AS fecha_ingreso,
            estado AS estado_ingreso
        FROM datos_pruebas
        WHERE rn_primero = 1
    ),
    ultimos AS (
        SELECT
            ID_ATENCION, prueba,
            valor_numerico AS valor_ultimo,
            FECHA_INTEGRACION AS fecha_ultimo,
            estado AS estado_ultimo
        FROM datos_pruebas
        WHERE rn_ultimo = 1
    )
    SELECT
        p.prueba, p.unidad,
        p.valor_ingreso, p.fecha_ingreso, p.estado_ingreso,
        CASE WHEN u.valor_ultimo != p.valor_ingreso THEN 'SI' ELSE 'NO' END AS tiene_ultimo,
        u.valor_ultimo, u.fecha_ultimo, u.estado_ultimo
    FROM primeros p
    LEFT JOIN ultimos u
        ON p.ID_ATENCION = u.ID_ATENCION
        AND p.prueba = u.prueba
);

EXIT;
EOF
```

## Troubleshooting

### Si nada funciona:

1. **Verifica que Oracle está completamente iniciado:**
```bash
docker logs oracle19c | tail -20
```
Busca: "DATABASE IS READY TO USE!"

2. **Verifica la conexión:**
```bash
docker exec oracle19c ps aux | grep ora_
```
Deberías ver procesos Oracle corriendo.

3. **Intenta reiniciar el contenedor:**
```bash
docker restart oracle19c
# Espera 2-3 minutos
docker logs oracle19c -f
```

4. **Verifica el puerto:**
```bash
docker port oracle19c
```
Debería mostrar: `1521/tcp -> 0.0.0.0:1521`

## Siguiente Paso Recomendado

**Usa SQL Developer o DBeaver** para la primera ejecución, ya que te dará mejor feedback visual y podrás ver los errores con más detalle.

Conexión:
- Connection Type: Basic
- Host: localhost
- Port: 1521
- SID: ORCLPDB1 (o Service Name: ORCLPDB1)
- Username: SYSTEM
- Password: Oracle123
