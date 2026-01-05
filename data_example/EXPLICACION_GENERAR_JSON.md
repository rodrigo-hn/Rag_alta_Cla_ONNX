# Explicacion Detallada: generar_json.sql

Este documento explica linea por linea como funciona el script SQL que genera un JSON con los resultados de laboratorio.

## Indice

1. [Configuracion de SQLPlus](#1-configuracion-de-sqlplus)
2. [Estructura General de la Query](#2-estructura-general-de-la-query)
3. [CTE 1: datos_pruebas](#3-cte-1-datos_pruebas)
4. [CTE 2: datos_validos](#4-cte-2-datos_validos)
5. [CTE 3: primeros](#5-cte-3-primeros)
6. [CTE 4: ultimos](#6-cte-4-ultimos)
7. [Query Final](#7-query-final)
8. [Generacion del JSON](#8-generacion-del-json)
9. [Diagrama de Flujo](#9-diagrama-de-flujo)

---

## 1. Configuracion de SQLPlus

```sql
SET LINESIZE 32767;
SET LONG 1000000;
SET LONGCHUNKSIZE 1000000;
SET PAGESIZE 0;
SET FEEDBACK OFF;
SET VERIFY OFF;
SET TRIMSPOOL ON;
SET TRIM ON;
SET HEADING OFF;
```

| Comando | Descripcion |
|---------|-------------|
| `LINESIZE 32767` | Ancho maximo de linea (evita cortes en el JSON) |
| `LONG 1000000` | Tamanio maximo para columnas LONG/CLOB |
| `LONGCHUNKSIZE 1000000` | Tamanio de chunk para CLOB |
| `PAGESIZE 0` | Sin paginacion (output continuo) |
| `FEEDBACK OFF` | No muestra "N rows selected" |
| `VERIFY OFF` | No muestra variables sustituidas |
| `TRIMSPOOL ON` | Elimina espacios al final en SPOOL |
| `TRIM ON` | Elimina espacios al final de cada linea |
| `HEADING OFF` | No muestra encabezados de columnas |

---

## 2. Estructura General de la Query

La query usa **CTEs (Common Table Expressions)** encadenadas:

```
datos_pruebas  -->  datos_validos  -->  primeros  \
                                                    -->  Query Final  -->  JSON
                                    -->  ultimos   /
```

---

## 3. CTE 1: datos_pruebas

Esta es la CTE base que extrae y transforma los datos crudos.

### 3.1 Seleccion de Columnas

```sql
WITH datos_pruebas AS (
    SELECT
        e.ID_ATENCION,
        r.NOMBRE_PRUEBA_LIS AS prueba,
        r.UNIDAD_MEDIDA AS unidad,
```

- `ID_ATENCION`: Identificador unico de la atencion medica
- `prueba`: Nombre de la prueba de laboratorio (ej: "Hemoglobina")
- `unidad`: Unidad de medida (ej: "g/dL", "%", "mmol/L")

### 3.2 Conversion Segura de Valores

```sql
        TO_NUMBER(
            REPLACE(TRIM(r.VALOR_RESULTADO), ',', '.')
            DEFAULT NULL ON CONVERSION ERROR
        ) AS valor_numerico,
```

**Problema resuelto:** La columna `VALOR_RESULTADO` es VARCHAR y contiene:
- Valores numericos: `"7.8"`, `"106"`, `"3,30"`
- Valores NO numericos: `">60"`, `"Normales al frotis."`, `"Anisocitosis ++"`

**Solucion paso a paso:**
1. `TRIM(r.VALOR_RESULTADO)` - Elimina espacios al inicio/final
2. `REPLACE(..., ',', '.')` - Convierte coma decimal a punto
3. `TO_NUMBER(...) DEFAULT NULL ON CONVERSION ERROR` - Convierte a numero, si falla retorna NULL

**Ejemplo:**
| Valor Original | Despues de TRIM | Despues de REPLACE | Resultado |
|----------------|-----------------|-------------------|-----------|
| `"  7.8  "` | `"7.8"` | `"7.8"` | `7.8` |
| `"3,30"` | `"3,30"` | `"3.30"` | `3.30` |
| `">60"` | `">60"` | `">60"` | `NULL` |
| `"Normal"` | `"Normal"` | `"Normal"` | `NULL` |

### 3.3 Clasificacion del Estado

```sql
        LOWER(
            CASE
                WHEN r.IND_RANGO_RESULTADO = 'N' THEN 'normal'
                WHEN r.IND_RANGO_RESULTADO = 'H' THEN 'alto'
                WHEN r.IND_RANGO_RESULTADO = 'L' THEN 'bajo'
                ELSE 'sin_clasificar'
            END
        ) AS estado,
```

Convierte el indicador de rango a texto legible:
| IND_RANGO_RESULTADO | Estado Resultante |
|---------------------|-------------------|
| `'N'` | `'normal'` |
| `'H'` | `'alto'` |
| `'L'` | `'bajo'` |
| otro | `'sin_clasificar'` |

### 3.4 Funciones de Ventana (Window Functions)

```sql
        ROW_NUMBER() OVER (
            PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
            ORDER BY r.FECHA_INTEGRACION ASC
        ) AS rn_primero,
        ROW_NUMBER() OVER (
            PARTITION BY e.ID_ATENCION, r.NOMBRE_PRUEBA_LIS
            ORDER BY r.FECHA_INTEGRACION DESC
        ) AS rn_ultimo
```

**Proposito:** Identificar el primer y ultimo resultado de cada prueba.

**Como funciona `ROW_NUMBER()`:**

Imagina estos datos para Hemoglobina en la atencion 1234:

| FECHA_INTEGRACION | VALOR | rn_primero (ASC) | rn_ultimo (DESC) |
|-------------------|-------|------------------|------------------|
| 2025-12-20 08:00 | 7.8 | **1** | 3 |
| 2025-12-22 10:00 | 8.2 | 2 | 2 |
| 2025-12-25 07:00 | 9.1 | 3 | **1** |

- `rn_primero = 1` marca el **primer** resultado (mas antiguo)
- `rn_ultimo = 1` marca el **ultimo** resultado (mas reciente)

### 3.5 JOINs y Filtros

```sql
    FROM TAB_EXAMENES e
    INNER JOIN TAB_RESULTADOS r
        ON e.ID_ATENCION = r.ID_ATENCION
        AND e.CODIGO_EXAMEN = r.COD_PRESTACION
    WHERE r.VALOR_RESULTADO IS NOT NULL
        AND TRIM(r.VALOR_RESULTADO) != '-'
        AND r.IND_RANGO_RESULTADO IS NOT NULL
```

**INNER JOIN:** Relaciona examenes con sus resultados usando:
- `ID_ATENCION`: La atencion medica
- `CODIGO_EXAMEN = COD_PRESTACION`: El tipo de examen

**Filtros WHERE:**
| Condicion | Excluye |
|-----------|---------|
| `VALOR_RESULTADO IS NOT NULL` | Valores nulos |
| `TRIM(VALOR_RESULTADO) != '-'` | Guiones solos |
| `IND_RANGO_RESULTADO IS NOT NULL` | Sin clasificacion |

---

## 4. CTE 2: datos_validos

```sql
datos_validos AS (
    SELECT *
    FROM datos_pruebas
    WHERE valor_numerico IS NOT NULL
)
```

**Funcion:** Filtra solo los registros que tienen un valor numerico valido.

Esto excluye:
- `">60"` (texto con simbolo)
- `"Normales al frotis."` (descripcion)
- `"Anisocitosis ++"` (texto descriptivo)

---

## 5. CTE 3: primeros

```sql
primeros AS (
    SELECT
        ID_ATENCION, prueba, unidad,
        valor_numerico AS valor_ingreso,
        FECHA_INTEGRACION AS fecha_ingreso,
        estado AS estado_ingreso
    FROM datos_validos
    WHERE rn_primero = 1
)
```

**Funcion:** Obtiene el **primer resultado** de cada prueba (al momento del ingreso).

El filtro `WHERE rn_primero = 1` selecciona solo la fila con el numero de fila = 1 de la particion ordenada ascendentemente por fecha.

---

## 6. CTE 4: ultimos

```sql
ultimos AS (
    SELECT
        ID_ATENCION, prueba,
        valor_numerico AS valor_ultimo,
        FECHA_INTEGRACION AS fecha_ultimo,
        estado AS estado_ultimo
    FROM datos_validos
    WHERE rn_ultimo = 1
)
```

**Funcion:** Obtiene el **ultimo resultado** de cada prueba (el mas reciente).

El filtro `WHERE rn_ultimo = 1` selecciona solo la fila con el numero de fila = 1 de la particion ordenada descendentemente por fecha.

---

## 7. Query Final

```sql
SELECT
    p.prueba,
    p.unidad,
    p.valor_ingreso,
    p.fecha_ingreso,
    p.estado_ingreso,
    CASE
        WHEN u.valor_ultimo IS NOT NULL
            AND ABS(u.valor_ultimo - p.valor_ingreso) > 0.001
        THEN 'SI'
        ELSE 'NO'
    END AS tiene_ultimo,
    u.valor_ultimo,
    u.fecha_ultimo,
    u.estado_ultimo
FROM primeros p
LEFT JOIN ultimos u
    ON p.ID_ATENCION = u.ID_ATENCION
    AND p.prueba = u.prueba
```

### 7.1 LEFT JOIN

Une `primeros` con `ultimos` por:
- `ID_ATENCION`: Misma atencion
- `prueba`: Misma prueba de laboratorio

**LEFT JOIN** asegura que todas las pruebas aparezcan, incluso si no tienen un "ultimo" valor diferente.

### 7.2 Logica de tiene_ultimo

```sql
CASE
    WHEN u.valor_ultimo IS NOT NULL
        AND ABS(u.valor_ultimo - p.valor_ingreso) > 0.001
    THEN 'SI'
    ELSE 'NO'
END AS tiene_ultimo
```

**Condiciones para `tiene_ultimo = 'SI'`:**
1. Debe existir un valor ultimo (`IS NOT NULL`)
2. La diferencia absoluta debe ser > 0.001 (evita errores de precision de punto flotante)

**Ejemplo:**
| valor_ingreso | valor_ultimo | ABS(diferencia) | tiene_ultimo |
|---------------|--------------|-----------------|--------------|
| 7.8 | 9.1 | 1.3 | SI |
| 7.8 | 7.8 | 0.0 | NO |
| 7.8 | 7.8001 | 0.0001 | NO |
| 7.8 | NULL | - | NO |

---

## 8. Generacion del JSON

```sql
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
        ) ORDER BY prueba
    )
) AS json_resultado
```

### 8.1 Funciones JSON de Oracle

| Funcion | Descripcion |
|---------|-------------|
| `JSON_OBJECT()` | Crea un objeto JSON `{...}` |
| `JSON_ARRAYAGG()` | Agrega multiples filas en un array JSON `[...]` |
| `ABSENT ON NULL` | Omite claves con valor NULL del JSON |

### 8.2 Estructura del JSON Resultante

```json
{
    "laboratorios_resumen": [
        {
            "prueba": "Hemoglobina",
            "unidad": "g/dL",
            "ingreso": {
                "valor": 7.8,
                "fecha": "2025-12-25T07:11:09",
                "estado": "bajo"
            }
        },
        {
            "prueba": "Hemoglobina",
            "unidad": "g/dL",
            "ingreso": {
                "valor": 7.8,
                "fecha": "2025-12-25T07:11:09",
                "estado": "bajo"
            },
            "ultimo": {
                "valor": 9.1,
                "fecha": "2025-12-27T10:30:00",
                "estado": "normal"
            }
        }
    ]
}
```

### 8.3 Formato de Fecha ISO 8601

```sql
TO_CHAR(fecha_ingreso, 'YYYY-MM-DD"T"HH24:MI:SS')
```

Convierte `25-DIC-2025 07:11:09` a `2025-12-25T07:11:09`

---

## 9. Diagrama de Flujo

```
+------------------+     +-------------------+
|   TAB_EXAMENES   |     |   TAB_RESULTADOS  |
+------------------+     +-------------------+
         |                        |
         +----------+-------------+
                    |
                    v
         +---------------------+
         |    datos_pruebas    |
         | - JOIN de tablas    |
         | - Conversion segura |
         | - ROW_NUMBER()      |
         +---------------------+
                    |
                    v
         +---------------------+
         |    datos_validos    |
         | - Solo numericos    |
         +---------------------+
                    |
          +---------+---------+
          |                   |
          v                   v
   +------------+      +------------+
   |  primeros  |      |  ultimos   |
   | rn_primero |      | rn_ultimo  |
   |    = 1     |      |    = 1     |
   +------------+      +------------+
          |                   |
          +---------+---------+
                    |
                    v
         +---------------------+
         |    Query Final      |
         | - LEFT JOIN         |
         | - tiene_ultimo      |
         +---------------------+
                    |
                    v
         +---------------------+
         |   JSON_OBJECT +     |
         |   JSON_ARRAYAGG     |
         +---------------------+
                    |
                    v
         +---------------------+
         |   JSON Resultado    |
         +---------------------+
```

---

## 10. Resumen de Tablas Utilizadas

### TAB_EXAMENES
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| ID_ATENCION | NUMBER(10) | ID de la atencion medica |
| CODIGO_EXAMEN | VARCHAR2(20) | Codigo del examen |
| FECHA_EXAMEN | DATE | Fecha del examen |
| NOMBRE_EXAMEN | VARCHAR2(100) | Nombre del examen |

### TAB_RESULTADOS
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| ID_ATENCION | NUMBER(10) | ID de la atencion (FK) |
| COD_PRESTACION | VARCHAR2(20) | Codigo de prestacion (FK) |
| NOMBRE_PRUEBA_LIS | VARCHAR2(200) | Nombre de la prueba |
| VALOR_RESULTADO | VARCHAR2(500) | Valor del resultado |
| UNIDAD_MEDIDA | VARCHAR2(50) | Unidad de medida |
| IND_RANGO_RESULTADO | VARCHAR2(1) | N=Normal, H=Alto, L=Bajo |
| FECHA_INTEGRACION | TIMESTAMP(6) | Fecha/hora del resultado |

---

## 11. Consideraciones de Rendimiento

1. **Indices recomendados:**
   ```sql
   CREATE INDEX idx_resultados_atencion ON TAB_RESULTADOS(ID_ATENCION, COD_PRESTACION);
   CREATE INDEX idx_resultados_fecha ON TAB_RESULTADOS(FECHA_INTEGRACION);
   ```

2. **El uso de CTEs** mejora la legibilidad pero Oracle las materializa en memoria.

3. **`DEFAULT NULL ON CONVERSION ERROR`** es mas eficiente que `REGEXP_LIKE` para validacion numerica.

---

## 12. Ejecucion

### Desde SQLPlus:
```bash
sqlplus -s system/Oracle123@ORCLPDB1 @generar_json.sql
```

### Desde Docker:
```bash
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 @/tmp/generar_json.sql"
```

### Con formato (pretty print):
```bash
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 @/tmp/generar_json.sql" \
  | python3 -m json.tool > laboratorios_resultado.json
```

---

**Archivo:** `generar_json.sql`
**Version:** 2.0
**Fecha:** 2025-12-28
**Compatibilidad:** Oracle 12.2+
