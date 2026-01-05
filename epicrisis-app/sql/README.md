## 📊 Configuración de Base de Datos Oracle

Scripts SQL para configurar el sistema de Epicrisis Automática en Oracle 19c.

---

## 🚀 Instalación Rápida (Recomendada)

### Opción 1: Script Automático

```bash
cd sql
./setup_database.sh
```

El script te guiará paso a paso:
- Lee credenciales desde `backend/.env`
- Verifica conexión a Oracle
- Instala componentes según tu elección

### Verificar la Instalación

Después de ejecutar el script de instalación, verifica que todos los componentes se crearon correctamente:

```bash
# Opción A: Script completo de verificación
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1" < sql/verify_installation.sql

# Opción B: Verificación rápida
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SET PAGESIZE 50
SET LINESIZE 150

SELECT 'TABLAS: ' || COUNT(*) || ' de 11' as resultado
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
);

SELECT 'FUNCION: ' || object_name || ' - ' || status as resultado
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

SELECT 'TRIGGERS: ' || COUNT(*) || ' de 3' as resultado
FROM user_triggers
WHERE table_name IN ('PACIENTES', 'ATENCIONES');

SELECT 'PACIENTES: ' || COUNT(*) as resultado FROM pacientes;
SELECT 'ATENCIONES: ' || COUNT(*) as resultado FROM atenciones;

SELECT 'TEST FUNCION: ' || LENGTH(get_discharge_summary_json(1)) || ' caracteres' as resultado
FROM dual;

EXIT
EOF"
```

**Resultado esperado:**
```
TABLAS: 11 de 11
FUNCION: GET_DISCHARGE_SUMMARY_JSON - VALID
TRIGGERS: 3 de 3
PACIENTES: 3
ATENCIONES: 3
TEST FUNCION: 1758 caracteres
```

### Opción 2: Manual con tus credenciales

Según tu `.env`:
```env
DB_USER=system
DB_PASSWORD=Oracle123
DB_CONNECT_STRING=localhost:1521/ORCLPDB1
```

**Instalación completa:**

```bash
# 1. Tablas base
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql

# 2. Datos de ejemplo
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @tables/02_insert_sample_data.sql

# 3. Índices (obligatorio)
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @indexes/create_indexes.sql

# 4. Función principal (obligatorio)
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @functions/get_discharge_summary_json.sql

# 5. Vistas materializadas (opcional)
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @materialized_views/create_mv_episodios.sql
```

---

## 📁 Estructura de Directorios

```
sql/
├── setup_database.sh              # Script maestro (recomendado)
├── verify_installation.sql        # Script de verificación completo
├── quick_verify.sql               # Verificación rápida
├── tables/                        # Tablas base
│   ├── 01_create_base_tables.sql # Crear todas las tablas
│   └── 02_insert_sample_data.sql # Datos de ejemplo para pruebas
├── indexes/                       # Índices optimizados
│   └── create_indexes.sql        # Índices para rendimiento
├── functions/                     # Funciones PL/SQL
│   └── get_discharge_summary_json.sql  # Función principal
├── materialized_views/            # Vistas materializadas (opcional)
│   └── create_mv_episodios.sql
└── partitions/                    # Particionamiento (opcional)
    └── create_partitions.sql
```

---

## 📋 Componentes

### 1. Tablas Base (Obligatorio)

**Script:** `tables/01_create_base_tables.sql`

Crea 11 tablas principales:

| Tabla | Descripción | Registros Ejemplo |
|-------|-------------|-------------------|
| `pacientes` | Datos demográficos | RUT, nombre, fecha nacimiento |
| `atenciones` | Episodios de hospitalización | Ingreso, alta, motivo |
| `diagnosticos` | Diagnósticos CIE-10 | Ingreso, egreso |
| `procedimientos` | Procedimientos/cirugías | Apendicectomía, etc. |
| `medicamentos_hospitalarios` | Tratamientos intrahospitalarios | Antibióticos EV |
| `medicamentos_alta` | Recetas al alta | Medicamentos VO |
| `evoluciones` | Notas diarias | Evolución clínica |
| `laboratorios` | Exámenes de laboratorio | Hemograma, PCR |
| `controles_alta` | Controles programados | Fecha y especialidad |
| `recomendaciones_alta` | Indicaciones generales | Dieta, reposo |
| `log_errores` | Log de errores del sistema | Debugging |

**Tiempo:** 2-3 minutos

### 2. Datos de Ejemplo (Opcional - Recomendado para Pruebas)

**Script:** `tables/02_insert_sample_data.sql`

Inserta 3 pacientes con casos clínicos completos:

1. **Juan Pérez** (RUT: 12345678-9)
   - Neumonía comunitaria
   - Hospitalización 7 días
   - Alta médica

2. **María Silva** (RUT: 98765432-1)
   - Apendicitis aguda
   - Apendicectomía laparoscópica
   - Alta médica

3. **Pedro Ramírez** (RUT: 11222333-4)
   - TCE moderado
   - En UPC (episodio activo)

**Útil para:** Probar el sistema sin datos reales

**Tiempo:** 1 minuto

### 3. Índices (Obligatorio)

**Script:** `indexes/create_indexes.sql`

Crea 15+ índices optimizados para:
- Búsqueda por episodio (velocidad)
- Búsqueda por paciente
- Filtros por estado/fecha
- Códigos CIE-10 y ATC

**Impacto:** Mejora velocidad de consultas en ~80%

**Tiempo:** 3-5 minutos

### 4. Función Principal (Obligatorio)

**Script:** `functions/get_discharge_summary_json.sql`

**Función:** `get_discharge_summary_json(p_episodio_id)`

Genera JSON con toda la información clínica:
```json
{
  "motivo_ingreso": "...",
  "diagnostico_ingreso": [...],
  "procedimientos": [...],
  "tratamientos_intrahosp": [...],
  "evolucion": [...],
  "laboratorios_relevantes": [...],
  "diagnostico_egreso": [...],
  "indicaciones_alta": {...}
}
```

**Sin esta función, el backend NO funciona**

**Tiempo:** 30 segundos

### 5. Vistas Materializadas (Opcional - Para Producción)

**Script:** `materialized_views/create_mv_episodios.sql`

Crea:
- `mv_episodios_resumen`: Resumen de episodios
- `mv_json_epicrisis_cache`: Caché de JSONs pre-generados

**Beneficios:**
- ✅ Consultas 10x más rápidas
- ✅ Refresh automático cada hora
- ✅ Query rewrite automático

**Útil si:** Tienes muchas consultas repetidas

**Tiempo:** 5-7 minutos

### 6. Particionamiento (Opcional - Solo BD Grandes)

**Script:** `partitions/create_partitions.sql`

⚠️ **ADVERTENCIA:** Recrea tablas `evoluciones` y `laboratorios`

Particiona por fecha (trimestral):
- Mejor rendimiento con millones de registros
- Mantenimiento automático de particiones
- Job mensual para crear nuevas particiones

**Útil si:** Tienes +1M de evoluciones o laboratorios

**NO usar si:** Ya tienes datos en esas tablas sin backup

**Tiempo:** 10-15 minutos

---

## 🎯 Escenarios de Instalación

### Desarrollo/Pruebas

```bash
cd sql
./setup_database.sh
# Opción 1: Instalación COMPLETA

# Verificar instalación
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SET PAGESIZE 50
SET LINESIZE 150
SELECT 'TABLAS: ' || COUNT(*) || ' de 11' FROM user_tables
WHERE table_name IN ('PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA', 'EVOLUCIONES', 'LABORATORIOS',
'CONTROLES_ALTA', 'RECOMENDACIONES_ALTA', 'LOG_ERRORES');
SELECT 'FUNCION: ' || status FROM user_objects WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';
EXIT
EOF"
```

Instala:
- ✅ Tablas
- ✅ Datos de ejemplo
- ✅ Índices
- ✅ Función
- ⏭️ Sin vistas materializadas
- ⏭️ Sin particionamiento

### Producción (BD Nueva)

```bash
# Opción 1: Script interactivo
cd sql
./setup_database.sh
# Opción 1: Instalación COMPLETA + después opción 6 (vistas)

# O manual:
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @indexes/create_indexes.sql
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @functions/get_discharge_summary_json.sql
sqlplus system/Oracle123@localhost:1521/ORCLPDB1 @materialized_views/create_mv_episodios.sql
```

### Producción (BD Grande - Millones de Registros)

```bash
cd sql
./setup_database.sh
# Opción 7: PARTICIONAMIENTO (con backup previo!)
```

---

## ✅ Verificación de Instalación

### Script de Verificación Completo

Ejecuta el script de verificación completo que valida todos los componentes:

```bash
# Desde el directorio epicrisis-app
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1" < sql/verify_installation.sql
```

Este script verifica:
1. **Tablas** (11 esperadas)
2. **Secuencias** para IDs auto-incrementales
3. **Índices** con su estado
4. **Constraints** (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
5. **Triggers** (3 esperados)
6. **Función** `get_discharge_summary_json` (debe estar VALID)
7. **Vistas**
8. **Datos de ejemplo** (3 pacientes)
9. **Test de función** (ejecuta con episodio real)
10. **Vistas materializadas** (opcional)
11. **Score final** y recomendaciones

### Verificación Rápida

Para una verificación más rápida de los componentes esenciales:

```bash
docker exec oracle19c bash -c "sqlplus -s system/Oracle123@ORCLPDB1 <<'EOF'
SET PAGESIZE 50
SET LINESIZE 150

SELECT 'TABLAS: ' || COUNT(*) || ' de 11' as resultado
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS', 'PROCEDIMIENTOS',
  'MEDICAMENTOS_HOSPITALARIOS', 'MEDICAMENTOS_ALTA',
  'EVOLUCIONES', 'LABORATORIOS', 'CONTROLES_ALTA',
  'RECOMENDACIONES_ALTA', 'LOG_ERRORES'
);

SELECT 'FUNCION: ' || object_name || ' - ' || status as resultado
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

SELECT 'TRIGGERS: ' || COUNT(*) || ' de 3' as resultado
FROM user_triggers
WHERE table_name IN ('PACIENTES', 'ATENCIONES');

SELECT 'PACIENTES: ' || COUNT(*) as resultado FROM pacientes;
SELECT 'ATENCIONES: ' || COUNT(*) as resultado FROM atenciones;

SELECT 'TEST FUNCION: ' || LENGTH(get_discharge_summary_json(1)) || ' caracteres' as resultado
FROM dual WHERE EXISTS (SELECT 1 FROM atenciones WHERE id_episodio = 1);

EXIT
EOF"
```

**Resultado esperado:**
```
TABLAS: 11 de 11
FUNCION: GET_DISCHARGE_SUMMARY_JSON - VALID
TRIGGERS: 3 de 3
PACIENTES: 3
ATENCIONES: 3
TEST FUNCION: 1758 caracteres
```

### Verificaciones Individuales desde SQL*Plus

Si necesitas verificar componentes específicos:

#### Verificar tablas creadas

```sql
SELECT table_name, num_rows
FROM user_tables
WHERE table_name IN (
  'PACIENTES', 'ATENCIONES', 'DIAGNOSTICOS'
)
ORDER BY table_name;
```

#### Verificar función

```sql
-- Ver si existe y su estado
SELECT object_name, status, TO_CHAR(created, 'YYYY-MM-DD HH24:MI:SS') as created
FROM user_objects
WHERE object_name = 'GET_DISCHARGE_SUMMARY_JSON';

-- Probar con un episodio
SET LONG 5000
SELECT get_discharge_summary_json(1) FROM DUAL;
```

#### Verificar índices

```sql
SELECT index_name, table_name, status, uniqueness
FROM user_indexes
WHERE table_name = 'ATENCIONES'
ORDER BY index_name;
```

#### Obtener IDs de episodios de prueba

```sql
SELECT
  id_episodio,
  folio,
  SUBSTR(motivo_ingreso, 1, 50) || '...' as motivo
FROM atenciones
WHERE ROWNUM <= 5
ORDER BY id_episodio;
```

### Problemas Comunes Durante la Instalación

#### ORA-01408: Index already exists
- **Causa**: UNIQUE constraints crean índices automáticamente
- **Impacto**: Ninguno - el índice ya existe, que es lo importante
- **Acción**: Ignorar - documentado en `sql/ERRORES_COMUNES.md`

#### ORA-32594: Invalid COMMENT syntax
- **Causa**: Sintaxis de comentario en vistas no válida
- **Impacto**: Ninguno - solo documentación
- **Acción**: Ignorar

#### Function created with compilation errors
- **Causa**: Error en código PL/SQL
- **Verificar**: `SHOW ERRORS FUNCTION get_discharge_summary_json;`
- **Estado esperado**: VALID (sin errores)

---

## 🔧 Troubleshooting

### Error: "table or view does not exist"

**Causa:** Las tablas aún no existen

**Solución:**
```bash
sqlplus ORCLPDB1/Oracle123@localhost:1521/ORCLPDB1 @tables/01_create_base_tables.sql
```

### Error: "insufficient privileges"

**Causa:** El usuario no tiene permisos

**Solución:** Conectar como SYSDBA y dar permisos:
```sql
GRANT CREATE TABLE TO ORCLPDB1;
GRANT CREATE INDEX TO ORCLPDB1;
GRANT CREATE MATERIALIZED VIEW TO ORCLPDB1;
GRANT EXECUTE ON DBMS_STATS TO ORCLPDB1;
```

### Error: "function already exists"

**Causa:** La función ya está creada

**Solución:** Usar `CREATE OR REPLACE`:
```sql
CREATE OR REPLACE FUNCTION get_discharge_summary_json...
```

### La función retorna NULL

**Causas posibles:**
1. El episodio no existe
2. No hay datos asociados

**Verificar:**
```sql
-- ¿Existe el episodio?
SELECT COUNT(*) FROM atenciones WHERE id_episodio = 1;

-- ¿Tiene diagnósticos?
SELECT COUNT(*) FROM diagnosticos WHERE id_episodio = 1;
```

---

## 📊 Modelo de Datos

### Diagrama Simplificado

```
PACIENTES
   ↓ (1:N)
ATENCIONES (Episodios)
   ↓ (1:N)
   ├── DIAGNOSTICOS
   ├── PROCEDIMIENTOS
   ├── MEDICAMENTOS_HOSPITALARIOS
   ├── MEDICAMENTOS_ALTA
   ├── EVOLUCIONES
   ├── LABORATORIOS
   ├── CONTROLES_ALTA
   └── RECOMENDACIONES_ALTA
```

### Relaciones Principales

- Un **paciente** tiene muchas **atenciones**
- Una **atención** (episodio) tiene:
  - Múltiples diagnósticos (ingreso/egreso)
  - Múltiples procedimientos
  - Múltiples medicamentos
  - Múltiples evoluciones
  - Múltiples laboratorios
  - Indicaciones de alta

---

## 🎓 Comandos Útiles

### Ver todo lo creado por el usuario

```sql
SELECT object_type, COUNT(*)
FROM user_objects
WHERE status = 'VALID'
GROUP BY object_type
ORDER BY 1;
```

### Ver espacio usado

```sql
SELECT
  segment_name,
  ROUND(bytes/1024/1024, 2) as size_mb
FROM user_segments
WHERE segment_type = 'TABLE'
ORDER BY bytes DESC;
```

### Borrar todo (CUIDADO!)

```sql
-- Solo en desarrollo/pruebas
BEGIN
  FOR t IN (SELECT table_name FROM user_tables) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
  END LOOP;
END;
/
```

---

## 📚 Recursos

- [Oracle Database 19c Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/19/)
- [PL/SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/)
- [JSON in Oracle Database](https://docs.oracle.com/en/database/oracle/oracle-database/19/adjsn/)

---

## ⚡ Next Steps

Después de configurar la BD:

1. ✅ Verificar que la función funciona
2. ✅ Configurar `backend/.env`
3. ✅ Probar conexión del backend:
   ```bash
   cd ../backend
   npm run dev
   ```
4. ✅ Iniciar frontend:
   ```bash
   cd ../frontend
   npm start
   ```

---

**¿Necesitas ayuda?** Abre un issue en el repositorio.
