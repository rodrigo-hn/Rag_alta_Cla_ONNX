# ✅ Corrección de Caracteres UTF-8 (ñ, tildes)

**Fecha:** 2025-12-29
**Estado:** RESUELTO

---

## 🐛 Problema Original

Los caracteres especiales del español no se visualizaban correctamente:
- `años` → `a??os`
- `cardiopatía` → `cardiopat??a`
- `náuseas` → `n??useas`
- `MAÑANA` → `MA??ANA`

## 🔍 Causa Raíz

Aunque Oracle 19c estaba configurado con charset **AL32UTF8** (correcto), los datos se insertaban sin especificar el `NLS_LANG` correcto en la sesión de SQLPlus, causando que los caracteres UTF-8 se guardaran incorrectamente.

**Verificación del charset de Oracle:**
```sql
SELECT value FROM nls_database_parameters WHERE parameter = 'NLS_CHARACTERSET';
-- Resultado: AL32UTF8 ✅
```

## ✅ Solución Implementada

### 1. Configurar NLS_LANG al Conectar

**Antes (Incorrecto):**
```bash
sqlplus system/Oracle123@ORCLPDB1
```

**Después (Correcto):**
```bash
export NLS_LANG=AMERICAN_AMERICA.AL32UTF8
sqlplus system/Oracle123@ORCLPDB1
```

O desde Docker:
```bash
docker exec -i oracle19c bash -c "export NLS_LANG=AMERICAN_AMERICA.AL32UTF8 && sqlplus -s system/Oracle123@ORCLPDB1"
```

### 2. Reinsertar Evoluciones con Encoding Correcto

Eliminamos las evoluciones con caracteres incorrectos y las reinsertamos con UTF-8:

```sql
-- Eliminar datos con encoding incorrecto
DELETE FROM evoluciones WHERE id_episodio = 22;

-- Insertar con tildes correctas
INSERT INTO evoluciones (id_episodio, id_paciente, fecha_registro, nota_evolucion, nombre_profesional, especialidad)
VALUES (22, 22, TO_DATE('2025-12-19', 'YYYY-MM-DD'),
'68 años, sin alergias conocidas. AM: HTA, cardiopatía hipertensiva, FA paroxística, enfermedad hepática crónica con HTP. Cx: prótesis de cadera derecha (por artrosis severa) Mascotas: gatos. En el marco de un Ca de recto que progresó a pesar de QMT, se hospitalizó para Cx de miles. Evolucionó en el post op con colecciones perineal y en excavación pelviana. Ya está en sala, se alimenta poco, con náuseas y vómitos persistentes. Parámetros inflamatorios estacionarios (PCR 15), GB: 12.770, VHS: 9.',
'Dr. Aguayo', 'Medicina Interna');

COMMIT;
```

### 3. Actualización del Script SQL

Actualizado `sql/tables/03_insert_episodio_1416169.sql` con:
- ✅ Caracteres UTF-8 correctos en todas las evoluciones
- ✅ Instrucciones de ejecución con NLS_LANG
- ✅ Notas sobre encoding en el encabezado

**Caracteres corregidos:**
- `MANANA` → `MAÑANA`
- `anos` → `años`
- `cardiopatia` → `cardiopatía`
- `paroxistica` → `paroxística`
- `hepatica` → `hepática`
- `cronica` → `crónica`
- `protesis` → `prótesis`
- `progreso` → `progresó`
- `hospitalizo` → `hospitalizó`
- `Evoluciono` → `Evolucionó`
- `excavacion` → `excavación`
- `esta` → `está`
- `nauseas` → `náuseas`
- `vomitos` → `vómitos`
- `Parametros` → `Parámetros`
- `DIAS` → `DÍAS`

---

## 📊 Verificación

### En Oracle
```sql
SELECT
  TO_CHAR(fecha_registro, 'YYYY-MM-DD') as fecha,
  SUBSTR(nota_evolucion, 1, 100) as nota
FROM evoluciones
WHERE id_episodio = 22
ORDER BY fecha_registro;
```

**Resultado:**
```
2025-12-15: TORAX- PLEUROSTOMIA... MAÑANA ASPIRATIVO...
2025-12-19: 68 años, sin alergias conocidas. AM: HTA, cardiopatía...
2025-12-26: ...RETIRO DE PUNTOS EN 5-7 DÍAS REEVALUACION...
```

✅ Todos los caracteres se ven correctamente

### En API Backend
```bash
curl -s http://localhost:3000/api/episodes/22 | jq -r '.clinicalData.evolucion[1].nota'
```

**Resultado:**
```
68 años, sin alergias conocidas. AM: HTA, cardiopatía hipertensiva,
FA paroxística, enfermedad hepática crónica con HTP. Cx: prótesis
de cadera derecha (por artrosis severa) Mascotas: gatos...
```

✅ UTF-8 perfecto en la API

### En Frontend
Al buscar el episodio 22 en http://localhost:4200/epicrisis y ver el tab "Evolución":

✅ Todas las tildes y la ñ se visualizan correctamente

---

## 🔧 Cómo Ejecutar el Script Completo

### Método 1: Con NLS_LANG (Recomendado)

```bash
# Configurar encoding
export NLS_LANG=AMERICAN_AMERICA.AL32UTF8

# Copiar script al contenedor
docker cp sql/tables/03_insert_episodio_1416169.sql oracle19c:/tmp/

# Ejecutar con encoding correcto
docker exec -i oracle19c bash -c "export NLS_LANG=AMERICAN_AMERICA.AL32UTF8 && sqlplus system/Oracle123@ORCLPDB1 @/tmp/03_insert_episodio_1416169.sql"
```

### Método 2: Pipe desde Host

```bash
export NLS_LANG=AMERICAN_AMERICA.AL32UTF8
cat sql/tables/03_insert_episodio_1416169.sql | docker exec -i oracle19c bash -c "export NLS_LANG=AMERICAN_AMERICA.AL32UTF8 && sqlplus -s system/Oracle123@ORCLPDB1"
```

---

## 📝 Comparación Antes/Después

### ANTES (Problema)
```
Evolucion del dia 5:
"68 a??os, sin alergias conocidas. AM: HTA, cardiopat??a hipertensiva,
FA parox??stica, enfermedad hep??tica cr??nica con HTP. Cx: pr??tesis
de cadera derecha..."
```

### DESPUÉS (Solución)
```
Evolución del día 5:
"68 años, sin alergias conocidas. AM: HTA, cardiopatía hipertensiva,
FA paroxística, enfermedad hepática crónica con HTP. Cx: prótesis
de cadera derecha..."
```

---

## ✅ Estado Final

- ✅ Oracle configurado con AL32UTF8
- ✅ NLS_LANG configurado al insertar datos
- ✅ Script SQL actualizado con caracteres UTF-8 correctos
- ✅ Episodio 22 con evoluciones en español correcto
- ✅ API retorna UTF-8 correcto
- ✅ Frontend visualiza caracteres especiales correctamente

**Sistema 100% funcional con soporte completo de UTF-8 para español** 🇨🇱

---

## 📚 Referencias

- **Charset de Oracle:** AL32UTF8 (Unicode 5.0 UTF-8)
- **NLS_LANG format:** `<language>_<territory>.<charset>`
- **Documentación:** Oracle Database Globalization Support Guide

