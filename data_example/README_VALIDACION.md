# Validación de Consulta JSON - Oracle 19c

## Archivos Generados

1. **test_version1_json.sql** - Script de validación completo para Oracle 19c
2. **run_test_oracle.sh** - Script bash para ejecutar la validación en Docker
3. **README_VALIDACION.md** - Este archivo

## Requisitos Previos

- Contenedor Docker de Oracle 19c corriendo (nombre: `oracle19c`)
- Las tablas `TAB_EXAMENES` y `TAB_RESULTADOS` deben existir con datos
- Conexión configurada según `oracle_19c.md`

## Pasos de Validación

### Opción 1: Ejecución Automática (Recomendada)

```bash
cd /Users/rodrigoherrera/code/RAG/rag_alta_Cla/data_example
./run_test_oracle.sh
```

### Opción 2: Ejecución Manual

1. **Copiar el script al contenedor:**
```bash
docker cp test_version1_json.sql oracle19c:/tmp/
```

2. **Conectarse al contenedor:**
```bash
docker exec -it oracle19c bash
```

3. **Ejecutar SQLPlus:**
```bash
export ORACLE_SID=ORCLPDB1
sqlplus SYSTEM/Oracle123@ORCLPDB1
```

4. **Ejecutar el script:**
```sql
@/tmp/test_version1_json.sql
```

### Opción 3: Desde SQL Developer / DBeaver

1. Abre `test_version1_json.sql` en tu cliente SQL
2. Conéctate a la base de datos Oracle 19c
3. Ejecuta el script completo

## Qué Valida el Script

El script `test_version1_json.sql` realiza 5 pasos de validación:

### PASO 1: Verificar Tablas
- Confirma que existen `TAB_EXAMENES` y `TAB_RESULTADOS`

### PASO 2: Verificar Datos
- Cuenta registros en ambas tablas
- Asegura que hay datos para procesar

### PASO 3: Verificar Funciones JSON
- Prueba `JSON_OBJECT` (disponible desde Oracle 12c)
- Prueba `JSON_ARRAYAGG` (disponible desde Oracle 12c)
- Confirma compatibilidad con Oracle 19c

### PASO 4: Ejecutar Consulta Completa
- Ejecuta la VERSIÓN 1 completa con `JSON_OBJECT` y `JSON_ARRAYAGG`
- Genera el JSON con estructura:
```json
{
  "laboratorios_resumen": [
    {
      "prueba": "nombre_prueba",
      "unidad": "mg/dL",
      "ingreso": {
        "valor": 100,
        "fecha": "2024-01-15T10:30:00",
        "estado": "normal"
      },
      "ultimo": {
        "valor": 105,
        "fecha": "2024-01-20T11:00:00",
        "estado": "alto"
      }
    }
  ]
}
```

### PASO 5: Validar Estructura JSON
- Usa `JSON_TABLE` para parsear el JSON generado
- Confirma que la estructura es válida
- Cuenta las pruebas procesadas

## Personalización

### Filtrar por ID_ATENCION Específico

En el archivo `test_version1_json.sql`, busca estas líneas:

```sql
-- Descomentar y ajustar según tus datos:
-- AND e.ID_ATENCION = 1416169
```

Descomenta y cambia el ID según necesites:

```sql
AND e.ID_ATENCION = 1416169  -- Tu ID específico
```

### Ajustar Credenciales

Si tus credenciales son diferentes, edita `run_test_oracle.sh`:

```bash
ORACLE_USER="SYSTEM"        # Cambiar si es necesario
ORACLE_PWD="Oracle123"      # Cambiar si es necesario
ORACLE_SID="ORCLPDB1"       # Cambiar si es necesario
```

## Resultados Esperados

Si todo funciona correctamente, deberías ver:

```
==========================================
PASO 1: Verificando tablas necesarias...
==========================================
OK - Ambas tablas existen

==========================================
PASO 2: Verificando datos disponibles...
==========================================
TAB_EXAMENES: X registros
TAB_RESULTADOS: Y registros

==========================================
PASO 3: Verificando funciones JSON...
==========================================
{"test":"ok","version":"Oracle 19c"}
[1,2,3]

==========================================
PASO 4: Ejecutando VERSIÓN 1 (JSON_OBJECT + JSON_ARRAYAGG)...
==========================================
{"laboratorios_resumen":[...]}

==========================================
PASO 5: Validando estructura JSON...
==========================================
Total de pruebas en JSON: N

==========================================
VALIDACIÓN COMPLETADA
==========================================
```

## Solución de Problemas

### Error: "Tabla no encontrada"
- Verifica que estás conectado al esquema correcto
- Confirma que las tablas existen: `SELECT * FROM user_tables;`

### Error: "Invalid identifier"
- Verifica los nombres de columnas en tus tablas
- Puede que necesites ajustar los nombres en la consulta

### Error: "No data found"
- Verifica que hay datos en las tablas
- Confirma que los datos cumplen con los filtros WHERE

### JSON vacío o NULL
- Verifica el filtro de ID_ATENCION
- Confirma que `REGEXP_LIKE` no está filtrando todos los datos
- Revisa que `IND_RANGO_RESULTADO` tiene valores válidos (N, H, L)

## Características de la VERSIÓN 1

✅ **Ventajas:**
- Usa funciones nativas de Oracle (JSON_OBJECT, JSON_ARRAYAGG)
- Código limpio y mantenible
- JSON válido garantizado
- Soporta `ABSENT ON NULL` para omitir campos nulos
- Compatible con Oracle 12c+

✅ **Características:**
- Genera JSON anidado con estructura compleja
- Maneja valores NULL correctamente
- Formato de fecha ISO 8601
- Estados normalizados (normal, alto, bajo)
- Omite el campo "ultimo" si no hay cambios

## Próximos Pasos

Una vez validada la consulta:

1. **Integrar en tu aplicación**
2. **Crear un procedimiento almacenado** si la usarás frecuentemente
3. **Añadir índices** en las columnas de JOIN para mejor performance
4. **Considerar VERSIÓN 4** (PL/SQL con CLOB) si el volumen de datos es muy grande

## Soporte

Si encuentras errores:
1. Revisa los mensajes de error específicos
2. Verifica la estructura de tus tablas
3. Confirma que Oracle 19c está completamente iniciado
4. Revisa los logs del contenedor: `docker logs oracle19c`
