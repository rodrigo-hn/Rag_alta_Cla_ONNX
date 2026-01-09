# Sistema de Logging Incremental - Epicrisis App

**Fecha:** 2025-12-29
**Versión:** 1.0
**Autor:** Sistema Epicrisis Automática

---

## Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tipos de Logs](#tipos-de-logs)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [FlowLogger - Clase Principal](#flowlogger---clase-principal)
6. [Ejemplo de Uso](#ejemplo-de-uso)
7. [Formato de Logs](#formato-de-logs)
8. [Rotación de Archivos](#rotación-de-archivos)
9. [Búsqueda y Análisis](#búsqueda-y-análisis)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

El sistema de logging incremental permite rastrear cada paso del flujo de generación de epicrisis, desde la búsqueda del episodio hasta la exportación final. Cada sesión tiene un ID único que permite seguir todas las operaciones relacionadas.

### Características principales:

- ✅ **Session IDs únicos** para rastrear flujos completos
- ✅ **Logs incrementales** con timestamps y tiempo transcurrido
- ✅ **Rotación automática** de archivos por fecha
- ✅ **Múltiples niveles** (info, error, debug)
- ✅ **Formato estructurado** JSON para análisis
- ✅ **Resumen automático** al final de cada flujo

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     REQUEST INICIA                           │
│                    (GET/POST endpoint)                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  FlowLogger creado  │
         │  sessionId generado │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  logStep() llamado  │
         │  en cada operación  │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Winston Logger     │
         │  distribuye logs    │
         └─────────┬───────────┘
                   │
         ┌─────────┴─────────────────────┬───────────────┐
         ▼                               ▼               ▼
    ┌─────────┐                   ┌──────────┐    ┌──────────┐
    │ Console │                   │  Files   │    │  Flow    │
    │ (color) │                   │ combined │    │ rotativo │
    └─────────┘                   │  error   │    │ diario   │
                                  │  audit   │    └──────────┘
                                  └──────────┘
```

---

## Tipos de Logs

### 1. **Console Logs** (desarrollo)
- Logs en tiempo real con colores
- Útil para debugging local
- No se persisten

### 2. **Combined Log** (`logs/combined.log`)
- Todos los logs del sistema
- Sin límite de tamaño (debe monitorearse)

### 3. **Error Log** (`logs/error.log`)
- Solo errores (level: error)
- Para monitoreo de problemas

### 4. **Audit Log** (`logs/audit.log`)
- Eventos importantes del sistema
- Generaciones, validaciones, exportaciones

### 5. **Flow Log** (`logs/flow-YYYY-MM-DD.log`)
- **Log principal para análisis de flujo**
- Rotación diaria automática
- Contiene logs estructurados con sessionId
- Máximo 20MB por archivo
- Retención: 30 días

---

## Estructura de Archivos

```
epicrisis-app/
├── backend/
│   ├── logs/                          # Directorio de logs (creado automáticamente)
│   │   ├── combined.log              # Todos los logs
│   │   ├── error.log                 # Solo errores
│   │   ├── audit.log                 # Auditoría
│   │   ├── flow-2025-12-29.log       # Logs del día (rotativo)
│   │   ├── flow-2025-12-28.log
│   │   └── flow-2025-12-27.log
│   │
│   └── src/
│       ├── config/
│       │   └── logger.ts             # Configuración de Winston + FlowLogger
│       └── routes/
│           └── epicrisisRoutes.ts    # Uso de FlowLogger en endpoints
```

---

## FlowLogger - Clase Principal

### Inicialización

```typescript
import { FlowLogger } from '../config/logger';

// En un endpoint
const flowLog = new FlowLogger(episodeId?.toString());
// Genera sessionId: "12345-a1b2c3d4"
```

### Métodos

#### `logStep(step: string, data?: any)`

Registra un paso del flujo con datos opcionales.

```typescript
flowLog.logStep('STEP_2.1_CHECK_EXISTENCE', { episodeId: 12345 });
```

**Output:**
```
2025-12-29 15:30:45.123 [12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE] [info]: STEP_2.1_CHECK_EXISTENCE {"elapsed":"234ms","episodeId":12345}
```

#### `logError(step: string, error: any)`

Registra un error con stack trace.

```typescript
try {
  // operación...
} catch (error) {
  flowLog.logError('STEP_2.2_FETCH_FROM_ORACLE', error);
}
```

#### `logEnd(data?: any)`

Finaliza el flujo y genera resumen.

```typescript
flowLog.logEnd({
  success: true,
  episodeId: 12345,
  patientName: 'JUAN PEREZ'
});
```

**Output:**
```
2025-12-29 15:30:47.890 [12345-a1b2c3d4][FLOW_END] [info]: FLOW_END {"totalTime":"2767ms","totalSteps":12,"success":true,...}
```

---

## Ejemplo de Uso

### Endpoint completo con logging

```typescript
router.get('/episodes/:id', async (req: Request, res: Response) => {
  const episodeId = parseInt(req.params.id, 10);
  const flowLog = new FlowLogger(episodeId.toString());

  try {
    // Paso 1: Validar ID
    flowLog.logStep('STEP_1.1_VALIDATE_ID', { episodeId: req.params.id });

    if (isNaN(episodeId)) {
      flowLog.logError('STEP_1.1_VALIDATE_ID', new Error('ID inválido'));
      res.status(400).json({ error: 'ID de episodio inválido' });
      return;
    }

    // Paso 2: Verificar existencia
    flowLog.logStep('STEP_2.1_CHECK_EXISTENCE', { episodeId });
    const exists = await oracleService.episodeExists(episodeId);

    if (!exists) {
      flowLog.logError('STEP_2.1_CHECK_EXISTENCE', new Error('Episodio no encontrado'));
      res.status(404).json({ error: 'Episodio no encontrado' });
      return;
    }

    // Paso 3: Obtener datos
    flowLog.logStep('STEP_2.2_FETCH_FROM_ORACLE', { episodeId });
    const rawData = await oracleService.getDischargeSummary(episodeId);
    flowLog.logStep('STEP_2.2_ORACLE_SUCCESS', {
      dataSize: JSON.stringify(rawData).length
    });

    // Paso 4: Normalizar
    flowLog.logStep('STEP_2.3_NORMALIZE_DATA', {});
    const clinicalData = normalizerService.normalize(rawData);
    flowLog.logStep('STEP_2.3_NORMALIZE_SUCCESS', {
      fields: Object.keys(clinicalData)
    });

    // Finalizar flujo
    flowLog.logEnd({
      success: true,
      episodeId,
      dataFields: Object.keys(clinicalData).length
    });

    res.json({ episodeId, clinicalData });

  } catch (error) {
    flowLog.logError('GENERAL_ERROR', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
```

---

## Formato de Logs

### Formato de línea

```
[TIMESTAMP] [SESSION_ID][STEP] [LEVEL]: MESSAGE {JSON_DATA}
```

### Ejemplo real

```
2025-12-29 15:30:45.123 [12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE] [info]: STEP_2.1_CHECK_EXISTENCE {"elapsed":"234ms","episodeId":12345}
```

### Campos:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `TIMESTAMP` | Fecha y hora con milisegundos | `2025-12-29 15:30:45.123` |
| `SESSION_ID` | ID único de sesión | `12345-a1b2c3d4` |
| `STEP` | Nombre del paso | `STEP_2.1_CHECK_EXISTENCE` |
| `LEVEL` | Nivel de log | `info`, `error`, `warn` |
| `MESSAGE` | Mensaje descriptivo | `STEP_2.1_CHECK_EXISTENCE` |
| `JSON_DATA` | Datos adicionales en JSON | `{"elapsed":"234ms",...}` |

---

## Rotación de Archivos

### Configuración actual

```typescript
new DailyRotateFile({
  filename: 'logs/flow-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',        // Máximo 20MB por archivo
  maxFiles: '30d',       // Retener 30 días
  level: 'info'
})
```

### Política de rotación

- **Diaria**: Un archivo nuevo cada día
- **Por tamaño**: Si supera 20MB, crea archivo adicional
- **Retención**: Elimina archivos mayores a 30 días
- **Nomenclatura**: `flow-YYYY-MM-DD.log`, `flow-YYYY-MM-DD.1.log`, etc.

### Ejemplo de archivos

```
logs/
├── flow-2025-12-29.log      # Archivo del día (activo)
├── flow-2025-12-28.log      # Ayer
├── flow-2025-12-28.1.log    # Ayer (overflow >20MB)
├── flow-2025-12-27.log
└── flow-2025-11-30.log      # Será eliminado mañana (>30 días)
```

---

## Búsqueda y Análisis

### 1. Buscar por Session ID

```bash
grep "12345-a1b2c3d4" logs/flow-2025-12-29.log
```

### 2. Buscar errores de un episodio

```bash
grep "12345" logs/flow-2025-12-29.log | grep "error"
```

### 3. Contar sesiones del día

```bash
grep "FLOW_START" logs/flow-2025-12-29.log | wc -l
```

### 4. Ver resúmenes de flujos completos

```bash
grep "FLOW_SUMMARY" logs/flow-2025-12-29.log
```

### 5. Filtrar por paso específico

```bash
grep "STEP_3.3_LLM_GENERATE" logs/flow-2025-12-29.log
```

### 6. Extraer tiempos de procesamiento

```bash
grep "FLOW_END" logs/flow-2025-12-29.log | grep -o '"totalTime":"[^"]*"'
```

### 7. Ver flujo completo de una sesión

```bash
SESSION_ID="12345-a1b2c3d4"
grep "$SESSION_ID" logs/flow-*.log | sort
```

### 8. Análisis JSON con jq

```bash
# Extraer solo datos JSON de los logs
grep "FLOW_SUMMARY" logs/flow-2025-12-29.log | \
  sed 's/.*summary"://' | \
  jq '.totalDuration'
```

---

## Pasos del Flujo Registrados

### Flujo de búsqueda de episodio

| Paso | Nombre | Descripción |
|------|--------|-------------|
| 1.1 | `STEP_1.1_VALIDATE_ID` | Validación de ID de episodio |
| 2.1 | `STEP_2.1_CHECK_EXISTENCE` | Verificar si episodio existe |
| 2.2 | `STEP_2.2_FETCH_FROM_ORACLE` | Obtener datos de Oracle |
| 2.2 | `STEP_2.2_ORACLE_SUCCESS` | Datos obtenidos exitosamente |
| 2.3 | `STEP_2.3_NORMALIZE_DATA` | Normalizar datos clínicos |
| 2.3 | `STEP_2.3_NORMALIZE_SUCCESS` | Normalización completada |
| 2.4 | `STEP_2.4_FETCH_PATIENT_INFO` | Obtener info del paciente |
| 2.4 | `STEP_2.4_PATIENT_INFO_SUCCESS` | Info del paciente obtenida |
| - | `FLOW_END` | Finalización del flujo |

### Flujo de generación de epicrisis

| Paso | Nombre | Descripción |
|------|--------|-------------|
| 3.1 | `STEP_3.1_VALIDATE_INPUT` | Validar datos de entrada |
| 3.2 | `STEP_3.2_NORMALIZE_DATA` | Normalizar datos |
| 3.2 | `STEP_3.2_NORMALIZE_SUCCESS` | Normalización exitosa |
| 3.3 | `STEP_3.3_LLM_GENERATE` | Generar con LLM |
| 3.3 | `STEP_3.3_LLM_SUCCESS` | Texto generado |
| 4.1 | `STEP_4.1_VALIDATE` | Validar texto generado |
| 4.1 | `STEP_4.1_VALIDATION_RESULT` | Resultado de validación |
| 4.2 | `STEP_4.2_AUTO_REGENERATE` | Regeneración automática (si hay violaciones) |
| 4.2 | `STEP_4.2_REGENERATE_SUCCESS` | Texto corregido generado |
| 4.2 | `STEP_4.2_REVALIDATION` | Re-validación |
| - | `FLOW_END` | Finalización con resumen |

### Flujo de regeneración manual

| Paso | Nombre | Descripción |
|------|--------|-------------|
| 5.1 | `STEP_5.1_VALIDATE_INPUT` | Validar entrada |
| 5.2 | `STEP_5.2_NORMALIZE_DATA` | Normalizar datos |
| 5.3 | `STEP_5.3_LLM_REGENERATE` | Regenerar con correcciones |
| 5.3 | `STEP_5.3_REGENERATE_SUCCESS` | Regeneración exitosa |
| 5.4 | `STEP_5.4_VALIDATE` | Validar texto regenerado |
| 5.4 | `STEP_5.4_VALIDATION_RESULT` | Resultado de validación |
| - | `FLOW_END` | Finalización |

### Flujo de exportación

| Paso | Nombre | Descripción |
|------|--------|-------------|
| 6.1 | `STEP_6.1_VALIDATE_INPUT` | Validar entrada |
| 6.2 | `STEP_6.2_GENERATE_PDF` | Generar PDF/Word |
| 6.2 | `STEP_6.2_PDF_SUCCESS` | Archivo generado |
| - | `FLOW_END` | Finalización |

---

## Troubleshooting

### Problema: No se crean archivos de log

**Solución:**

```bash
# Verificar que existe el directorio logs/
mkdir -p backend/logs

# Verificar permisos
chmod 755 backend/logs
```

### Problema: Archivos de log muy grandes

**Solución:**

Ajustar configuración de rotación en `backend/src/config/logger.ts`:

```typescript
new DailyRotateFile({
  filename: 'logs/flow-%DATE%.log',
  maxSize: '10m',    // Reducir a 10MB
  maxFiles: '14d'    // Retener solo 14 días
})
```

### Problema: No puedo encontrar logs de una sesión

**Solución:**

```bash
# Buscar en todos los archivos de flow
grep "SESSION_ID" logs/flow-*.log

# Si no existe, verificar archivos de error
grep "SESSION_ID" logs/error.log
```

### Problema: Demasiados logs en consola

**Solución:**

Ajustar nivel de log en `.env`:

```bash
LOG_LEVEL=warn  # Solo warnings y errores
```

O deshabilitar console transport en producción:

```typescript
// En logger.ts, comentar:
// new winston.transports.Console({ ... })
```

---

## Variables de Entorno

| Variable | Descripción | Default | Valores |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Nivel mínimo de logs | `info` | `error`, `warn`, `info`, `debug` |

---

## Mejores Prácticas

### 1. **Usar sessionId consistentemente**

```typescript
// ✅ BIEN: Pasar episodeId al crear FlowLogger
const flowLog = new FlowLogger(episodeId.toString());

// ❌ MAL: No pasar ID
const flowLog = new FlowLogger();
```

### 2. **Nombrar pasos claramente**

```typescript
// ✅ BIEN: Nombres descriptivos y numerados
flowLog.logStep('STEP_2.3_NORMALIZE_DATA', {});

// ❌ MAL: Nombres genéricos
flowLog.logStep('processing', {});
```

### 3. **Incluir datos relevantes**

```typescript
// ✅ BIEN: Incluir datos útiles para debugging
flowLog.logStep('STEP_3.3_LLM_SUCCESS', {
  textLength: epicrisisText.length,
  preview: epicrisisText.substring(0, 100)
});

// ❌ MAL: Sin datos
flowLog.logStep('STEP_3.3_LLM_SUCCESS');
```

### 4. **Siempre llamar logEnd()**

```typescript
// ✅ BIEN: Finalizar flujo con resumen
flowLog.logEnd({
  success: true,
  episodeId,
  textLength: text.length
});

// ❌ MAL: No finalizar flujo
// (no se genera resumen)
```

### 5. **Capturar errores apropiadamente**

```typescript
// ✅ BIEN: Capturar y registrar errores
try {
  const data = await service.getData();
} catch (error) {
  flowLog.logError('STEP_X', error);
  throw error; // Re-lanzar si es necesario
}

// ❌ MAL: Ignorar errores
try {
  const data = await service.getData();
} catch (error) {
  // Silencio...
}
```

---

## Monitoreo en Producción

### Script de monitoreo de errores

```bash
#!/bin/bash
# monitor-errors.sh

LOGFILE="logs/error.log"
THRESHOLD=10

ERROR_COUNT=$(grep -c "error" "$LOGFILE" 2>/dev/null || echo 0)

if [ "$ERROR_COUNT" -gt "$THRESHOLD" ]; then
  echo "ALERTA: $ERROR_COUNT errores detectados en $LOGFILE"
  # Enviar notificación (email, Slack, etc.)
fi
```

### Script de limpieza manual

```bash
#!/bin/bash
# cleanup-logs.sh

# Eliminar logs mayores a 30 días
find logs/ -name "flow-*.log" -mtime +30 -delete

echo "Logs antiguos eliminados"
```

---

## Ejemplo de Log Real

```log
2025-12-29 15:30:45.001 [12345-a1b2c3d4][FLOW_START] [info]: FLOW_START {"elapsed":"0ms","sessionId":"12345-a1b2c3d4"}
2025-12-29 15:30:45.002 [12345-a1b2c3d4][STEP_1.1_VALIDATE_ID] [info]: STEP_1.1_VALIDATE_ID {"elapsed":"1ms","episodeId":"12345"}
2025-12-29 15:30:45.120 [12345-a1b2c3d4][STEP_2.1_CHECK_EXISTENCE] [info]: STEP_2.1_CHECK_EXISTENCE {"elapsed":"119ms","episodeId":12345}
2025-12-29 15:30:45.340 [12345-a1b2c3d4][STEP_2.2_FETCH_FROM_ORACLE] [info]: STEP_2.2_FETCH_FROM_ORACLE {"elapsed":"339ms","episodeId":12345}
2025-12-29 15:30:45.560 [12345-a1b2c3d4][STEP_2.2_ORACLE_SUCCESS] [info]: STEP_2.2_ORACLE_SUCCESS {"elapsed":"559ms","dataSize":4567}
2025-12-29 15:30:45.580 [12345-a1b2c3d4][STEP_2.3_NORMALIZE_DATA] [info]: STEP_2.3_NORMALIZE_DATA {"elapsed":"579ms"}
2025-12-29 15:30:45.620 [12345-a1b2c3d4][STEP_2.3_NORMALIZE_SUCCESS] [info]: STEP_2.3_NORMALIZE_SUCCESS {"elapsed":"619ms","fields":["motivo_ingreso","diagnostico_ingreso","procedimientos","tratamientos_intrahosp","evolucion","laboratorios_relevantes","diagnostico_egreso","indicaciones_alta"],"dxIngreso":2,"dxEgreso":3,"procedimientos":5,"medicamentos":8}
2025-12-29 15:30:45.640 [12345-a1b2c3d4][STEP_2.4_FETCH_PATIENT_INFO] [info]: STEP_2.4_FETCH_PATIENT_INFO {"elapsed":"639ms","episodeId":12345}
2025-12-29 15:30:45.780 [12345-a1b2c3d4][STEP_2.4_PATIENT_INFO_SUCCESS] [info]: STEP_2.4_PATIENT_INFO_SUCCESS {"elapsed":"779ms","nombre":"JUAN PEREZ GONZALEZ","rut":"12345678-9"}
2025-12-29 15:30:45.800 [12345-a1b2c3d4][FLOW_END] [info]: FLOW_END {"elapsed":"799ms","totalTime":"799ms","totalSteps":9,"success":true,"episodeId":12345,"patientName":"JUAN PEREZ GONZALEZ"}
2025-12-29 15:30:45.820 [12345-a1b2c3d4][FLOW_SUMMARY] [info]: FLOW_SUMMARY {"elapsed":"819ms","sessionId":"12345-a1b2c3d4","summary":"{\n  \"sessionId\": \"12345-a1b2c3d4\",\n  \"startTime\": \"2025-12-29T18:30:45.001Z\",\n  \"endTime\": \"2025-12-29T18:30:45.800Z\",\n  \"totalDuration\": 799,\n  \"steps\": [\n    {\"step\":\"FLOW_START\",\"timestamp\":1735494645001,\"data\":{\"sessionId\":\"12345-a1b2c3d4\"}},\n    {\"step\":\"STEP_1.1_VALIDATE_ID\",\"timestamp\":1735494645002,\"data\":{\"episodeId\":\"12345\"}},\n    {\"step\":\"STEP_2.1_CHECK_EXISTENCE\",\"timestamp\":1735494645120,\"data\":{\"episodeId\":12345}},\n    {\"step\":\"STEP_2.2_FETCH_FROM_ORACLE\",\"timestamp\":1735494645340,\"data\":{\"episodeId\":12345}},\n    {\"step\":\"STEP_2.2_ORACLE_SUCCESS\",\"timestamp\":1735494645560,\"data\":{\"dataSize\":4567}},\n    {\"step\":\"STEP_2.3_NORMALIZE_DATA\",\"timestamp\":1735494645580,\"data\":{}},\n    {\"step\":\"STEP_2.3_NORMALIZE_SUCCESS\",\"timestamp\":1735494645620,\"data\":{\"fields\":[\"motivo_ingreso\",\"diagnostico_ingreso\",\"procedimientos\",\"tratamientos_intrahosp\",\"evolucion\",\"laboratorios_relevantes\",\"diagnostico_egreso\",\"indicaciones_alta\"],\"dxIngreso\":2,\"dxEgreso\":3,\"procedimientos\":5,\"medicamentos\":8}},\n    {\"step\":\"STEP_2.4_FETCH_PATIENT_INFO\",\"timestamp\":1735494645640,\"data\":{\"episodeId\":12345}},\n    {\"step\":\"STEP_2.4_PATIENT_INFO_SUCCESS\",\"timestamp\":1735494645780,\"data\":{\"nombre\":\"JUAN PEREZ GONZALEZ\",\"rut\":\"12345678-9\"}}\n  ]\n}"}
```

---

## Conclusión

El sistema de logging incremental proporciona:

✅ **Trazabilidad completa** de cada flujo
✅ **Debugging facilitado** con sessionIds únicos
✅ **Análisis de rendimiento** con tiempos de ejecución
✅ **Auditoría** de todas las operaciones
✅ **Gestión automática** de archivos con rotación

Para cualquier consulta o problema, revisar primero los archivos de log en `backend/logs/` y usar los comandos de búsqueda documentados.

---

**Fin del documento**
