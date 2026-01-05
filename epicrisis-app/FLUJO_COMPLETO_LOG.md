# LOG COMPLETO: FLUJO DE GENERACIÓN DE EPICRISIS

**Documento:** Trazabilidad completa del flujo desde búsqueda de episodio hasta generación de epicrisis
**Fecha:** 2025-12-29
**Sistema:** Epicrisis Automática - Proyecto RAG Alta Clínica

---

## ÍNDICE

1. [Flujo Completo de Ejecución](#flujo-completo-de-ejecución)
2. [Paso 1: Búsqueda de Episodio](#paso-1-búsqueda-de-episodio)
3. [Paso 2: Obtención de Datos Clínicos](#paso-2-obtención-de-datos-clínicos)
4. [Paso 3: Generación de Epicrisis](#paso-3-generación-de-epicrisis)
5. [Paso 4: Validación Automática](#paso-4-validación-automática)
6. [Paso 5: Regeneración con Correcciones](#paso-5-regeneración-con-correcciones)
7. [Paso 6: Exportación](#paso-6-exportación)
8. [Logs de Ejemplo Exitoso](#logs-de-ejemplo-exitoso)

---

## FLUJO COMPLETO DE EJECUCIÓN

```
┌──────────────────────────────────────────────────────────────────┐
│                    INICIO: Usuario ingresa ID                     │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ PASO 1: BÚSQUEDA DE EPISODIO                                      │
│ - Frontend: EpisodeSearchComponent.searchEpisode()               │
│ - Service: EpicrisisService.getEpisodeData(episodeId)            │
│ - API: GET /api/episodes/:id                                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ PASO 2: OBTENCIÓN Y NORMALIZACIÓN DE DATOS                       │
│ - Backend: OracleService.episodeExists()                         │
│ - Backend: OracleService.getDischargeSummary()                   │
│ - Backend: NormalizerService.normalize()                         │
│ - Backend: OracleService.getPatientInfo()                        │
│ - Response: { episodeId, clinicalData, patientInfo }             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ VISUALIZACIÓN: Usuario ve datos del paciente y JSON clínico      │
│ - EpisodeSearchComponent: Muestra info del paciente              │
│ - JsonViewerComponent: Renderiza JSON formateado                 │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ PASO 3: GENERACIÓN DE EPICRISIS                                  │
│ - Frontend: EpicrisisGeneratorComponent.generate()               │
│ - Service: EpicrisisService.generateEpicrisis()                  │
│ - API: POST /api/generate-epicrisis                              │
│ - Backend: LlmService.generateEpicrisis(clinicalData)            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ PASO 4: VALIDACIÓN AUTOMÁTICA                                    │
│ - Backend: ValidatorService.validateEpicrisis()                  │
│ - Whitelist: diagnoses, procedures, medications                  │
│ - Output: { ok: boolean, violations: [] }                        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
                  ¿Violaciones?
                       │
        ┌──────────────┴──────────────┐
        │ SÍ                          │ NO
        ▼                             ▼
┌───────────────────┐      ┌──────────────────────┐
│ PASO 5:           │      │ EPICRISIS GENERADA   │
│ REGENERACIÓN      │      │ Texto final listo    │
│ CON CORRECCIONES  │      └──────────┬───────────┘
└────────┬──────────┘                 │
         │                            │
         │ - LlmService.regenerate    │
         │   WithCorrections()        │
         │ - Re-validación            │
         │                            │
         └──────────┬─────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ VISUALIZACIÓN: Usuario ve epicrisis y panel de validación        │
│ - EpicrisisGeneratorComponent: Muestra texto editable            │
│ - ValidationPanelComponent: Muestra violaciones (si hay)         │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ PASO 6: EXPORTACIÓN (OPCIONAL)                                   │
│ - Frontend: ExportOptionsComponent.exportToPDF/Word()            │
│ - API: POST /api/export/pdf o /api/export/word                   │
│ - Backend: ExportService.generatePDF/Word()                      │
│ - Download: Archivo descargado al navegador                      │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
                   FIN DEL FLUJO
```

---

## PASO 1: BÚSQUEDA DE EPISODIO

### 1.1 Frontend: Usuario ingresa ID

**Archivo:** `frontend/src/app/features/episode-search/episode-search.component.ts`

```typescript
// Línea 194-206
searchEpisode(): void {
  console.log('[STEP 1.1] Usuario presiona botón "Buscar episodio"');

  const id = this.episodeId().trim();
  console.log(`[STEP 1.1] Episode ID ingresado: "${id}"`);

  if (!id) {
    console.error('[STEP 1.1] Error: ID vacío');
    this.errorMessage.set('Por favor ingrese un ID de episodio');
    return;
  }

  console.log('[STEP 1.1] Llamando a EpicrisisService.getEpisodeData()...');
  this.epicrisisService.getEpisodeData(id);
}
```

**Log esperado:**
```
[STEP 1.1] Usuario presiona botón "Buscar episodio"
[STEP 1.1] Episode ID ingresado: "12345"
[STEP 1.1] Llamando a EpicrisisService.getEpisodeData()...
```

---

### 1.2 Service: Llamada al API

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
// Línea 40-53
getEpisodeData(episodeId: string): void {
  console.log(`[STEP 1.2] EpicrisisService.getEpisodeData("${episodeId}")`);

  this.isLoading.set(true);
  this.errorMessage.set(null);
  console.log('[STEP 1.2] Estado: isLoading=true, errorMessage=null');

  const endpoint = `/episodes/${episodeId}`;
  console.log(`[STEP 1.2] Endpoint: GET ${endpoint}`);

  this.apiService.get<GetEpisodeResponse>(endpoint).subscribe({
    next: (response) => {
      console.log('[STEP 1.2] Respuesta recibida exitosamente');
      console.log('[STEP 1.2] Response:', JSON.stringify(response, null, 2));

      this.clinicalData.set(response.clinicalData);
      this.patientInfo.set(response.patientInfo);
      this.episodeId.set(response.episodeId);

      console.log(`[STEP 1.2] Estado actualizado:`);
      console.log(`  - episodeId: ${response.episodeId}`);
      console.log(`  - patientInfo:`, response.patientInfo);
      console.log(`  - clinicalData keys:`, Object.keys(response.clinicalData));
      console.log(`[STEP 1.2] Tiempo de procesamiento: ${response.processingTimeMs}ms`);

      this.isLoading.set(false);
      console.log('[STEP 1.2] Estado: isLoading=false');
    },
    error: (error) => {
      console.error('[STEP 1.2] Error al obtener datos del episodio:', error);
      this.errorMessage.set(error.message || 'Error al cargar los datos');
      this.isLoading.set(false);
    }
  });
}
```

**Log esperado:**
```
[STEP 1.2] EpicrisisService.getEpisodeData("12345")
[STEP 1.2] Estado: isLoading=true, errorMessage=null
[STEP 1.2] Endpoint: GET /episodes/12345
[STEP 1.2] HTTP Request iniciado...
```

---

## PASO 2: OBTENCIÓN DE DATOS CLÍNICOS

### 2.1 Backend: Validación de episodio

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
// Línea 33-73
router.get('/episodes/:id', async (req, res) => {
  const startTime = Date.now();
  const episodeId = req.params.id;

  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 2.1] Backend: GET /api/episodes/:id');
  console.log(`[STEP 2.1] Episode ID recibido: "${episodeId}"`);
  console.log(`[STEP 2.1] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  // Validación básica
  if (!episodeId || !/^\d+$/.test(episodeId)) {
    console.error('[STEP 2.1] Error: ID inválido (debe ser numérico)');
    return res.status(400).json({
      error: 'ID de episodio inválido',
      message: 'El ID debe ser numérico'
    });
  }

  console.log('[STEP 2.1] Validación exitosa: ID es numérico');

  try {
    // Verificar existencia
    console.log('[STEP 2.1] Verificando existencia del episodio...');
    const exists = await oracleService.episodeExists(episodeId);

    if (!exists) {
      console.warn(`[STEP 2.1] Episodio ${episodeId} no encontrado en BD`);
      return res.status(404).json({
        error: 'Episodio no encontrado',
        message: `No se encontró el episodio ${episodeId}`
      });
    }

    console.log(`[STEP 2.1] ✓ Episodio ${episodeId} existe en la BD`);

    // Continúa en STEP 2.2...
  } catch (error) {
    console.error('[STEP 2.1] Error en validación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 2.1] Backend: GET /api/episodes/:id
[STEP 2.1] Episode ID recibido: "12345"
[STEP 2.1] Timestamp: 2025-12-29T15:30:45.123Z
═══════════════════════════════════════════════════════
[STEP 2.1] Validación exitosa: ID es numérico
[STEP 2.1] Verificando existencia del episodio...
[STEP 2.1] ✓ Episodio 12345 existe en la BD
```

---

### 2.2 Backend: Obtención de datos desde Oracle

**Archivo:** `backend/src/services/oracleService.ts`

```typescript
// Método: getDischargeSummary()
console.log('[STEP 2.2] OracleService.getDischargeSummary()');
console.log(`[STEP 2.2] Ejecutando función PL/SQL: get_discharge_summary_json(${episodeId})`);

const query = `
  SELECT get_discharge_summary_json(:episodeId) as summary
  FROM dual
`;

console.log('[STEP 2.2] Query SQL:', query);

const result = await connection.execute(query, [episodeId]);
console.log('[STEP 2.2] Resultado obtenido de Oracle');
console.log(`[STEP 2.2] Tamaño del JSON: ${result.rows[0].summary.length} caracteres`);

const rawData = JSON.parse(result.rows[0].summary);
console.log('[STEP 2.2] JSON parseado exitosamente');
console.log('[STEP 2.2] Estructura del JSON:', Object.keys(rawData));

return rawData;
```

**Log esperado:**
```
[STEP 2.2] OracleService.getDischargeSummary()
[STEP 2.2] Ejecutando función PL/SQL: get_discharge_summary_json(12345)
[STEP 2.2] Query SQL: SELECT get_discharge_summary_json(:episodeId) as summary FROM dual
[STEP 2.2] Resultado obtenido de Oracle
[STEP 2.2] Tamaño del JSON: 3456 caracteres
[STEP 2.2] JSON parseado exitosamente
[STEP 2.2] Estructura del JSON: [
  "motivo_ingreso",
  "diagnostico_ingreso",
  "procedimientos",
  "tratamientos_intrahosp",
  "evolucion",
  "laboratorios_relevantes",
  "diagnostico_egreso",
  "indicaciones_alta"
]
```

---

### 2.3 Backend: Normalización de datos

**Archivo:** `backend/src/services/normalizerService.ts`

```typescript
console.log('[STEP 2.3] NormalizerService.normalize()');
console.log('[STEP 2.3] Iniciando normalización de datos clínicos...');

// Normalizar diagnósticos
console.log('[STEP 2.3] Normalizando diagnósticos de ingreso...');
const normalizedIngressDx = this.normalizeDiagnoses(rawData.diagnostico_ingreso);
console.log(`[STEP 2.3] Diagnósticos de ingreso: ${normalizedIngressDx.length} items`);

console.log('[STEP 2.3] Normalizando diagnósticos de egreso...');
const normalizedEgressDx = this.normalizeDiagnoses(rawData.diagnostico_egreso);
console.log(`[STEP 2.3] Diagnósticos de egreso: ${normalizedEgressDx.length} items`);

// Normalizar procedimientos
console.log('[STEP 2.3] Normalizando procedimientos...');
const normalizedProc = this.normalizeProcedures(rawData.procedimientos);
console.log(`[STEP 2.3] Procedimientos: ${normalizedProc.length} items`);

// Normalizar medicaciones
console.log('[STEP 2.3] Normalizando medicaciones intrahospitalarias...');
const normalizedMeds = this.normalizeMedications(rawData.tratamientos_intrahosp);
console.log(`[STEP 2.3] Medicaciones intrahosp: ${normalizedMeds.length} items`);

console.log('[STEP 2.3] Normalizando medicaciones de alta...');
const normalizedDischargeMeds = this.normalizeMedications(rawData.indicaciones_alta.medicamentos);
console.log(`[STEP 2.3] Medicaciones de alta: ${normalizedDischargeMeds.length} items`);

// Normalizar evoluciones
console.log('[STEP 2.3] Normalizando evoluciones clínicas...');
const normalizedEvol = this.normalizeEvolutions(rawData.evolucion);
console.log(`[STEP 2.3] Evoluciones: ${normalizedEvol.length} items`);

// Normalizar laboratorios
console.log('[STEP 2.3] Normalizando laboratorios...');
const normalizedLabs = this.normalizeLabs(rawData.laboratorios_relevantes);
console.log(`[STEP 2.3] Laboratorios: ${normalizedLabs.length} items`);

console.log('[STEP 2.3] ✓ Normalización completada exitosamente');

return normalizedData;
```

**Log esperado:**
```
[STEP 2.3] NormalizerService.normalize()
[STEP 2.3] Iniciando normalización de datos clínicos...
[STEP 2.3] Normalizando diagnósticos de ingreso...
[STEP 2.3] Diagnósticos de ingreso: 2 items
[STEP 2.3] Normalizando diagnósticos de egreso...
[STEP 2.3] Diagnósticos de egreso: 3 items
[STEP 2.3] Normalizando procedimientos...
[STEP 2.3] Procedimientos: 5 items
[STEP 2.3] Normalizando medicaciones intrahospitalarias...
[STEP 2.3] Medicaciones intrahosp: 8 items
[STEP 2.3] Normalizando medicaciones de alta...
[STEP 2.3] Medicaciones de alta: 4 items
[STEP 2.3] Normalizando evoluciones clínicas...
[STEP 2.3] Evoluciones: 12 items
[STEP 2.3] Normalizando laboratorios...
[STEP 2.3] Laboratorios: 15 items
[STEP 2.3] ✓ Normalización completada exitosamente
```

---

### 2.4 Backend: Obtención de información del paciente

**Archivo:** `backend/src/services/oracleService.ts`

```typescript
console.log('[STEP 2.4] OracleService.getPatientInfo()');
console.log(`[STEP 2.4] Obteniendo datos del paciente para episodio ${episodeId}`);

const query = `
  SELECT
    p.nombre_completo,
    p.rut,
    p.fecha_nacimiento
  FROM episodios e
  JOIN pacientes p ON e.paciente_id = p.id
  WHERE e.id = :episodeId
`;

const result = await connection.execute(query, [episodeId]);
console.log('[STEP 2.4] Datos del paciente obtenidos');

const patientInfo = {
  nombre: result.rows[0].nombre_completo,
  rut: result.rows[0].rut,
  fechaNacimiento: result.rows[0].fecha_nacimiento
};

console.log('[STEP 2.4] PatientInfo:', JSON.stringify(patientInfo, null, 2));

return patientInfo;
```

**Log esperado:**
```
[STEP 2.4] OracleService.getPatientInfo()
[STEP 2.4] Obteniendo datos del paciente para episodio 12345
[STEP 2.4] Datos del paciente obtenidos
[STEP 2.4] PatientInfo: {
  "nombre": "JUAN PEREZ GONZALEZ",
  "rut": "12345678-9",
  "fechaNacimiento": "1980-05-15"
}
```

---

### 2.5 Backend: Respuesta al frontend

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
const processingTime = Date.now() - startTime;

console.log('[STEP 2.5] Construyendo respuesta final...');
const response = {
  episodeId,
  clinicalData: normalizedData,
  patientInfo,
  processingTimeMs: processingTime
};

console.log('[STEP 2.5] Respuesta construida:');
console.log(`  - episodeId: ${response.episodeId}`);
console.log(`  - clinicalData: ${Object.keys(response.clinicalData).length} campos`);
console.log(`  - patientInfo: ${response.patientInfo.nombre}`);
console.log(`  - processingTimeMs: ${response.processingTimeMs}ms`);

console.log('[STEP 2.5] Enviando respuesta HTTP 200 OK');
res.json(response);

console.log('═══════════════════════════════════════════════════════');
console.log('[STEP 2.5] ✓ GET /api/episodes/:id completado exitosamente');
console.log('═══════════════════════════════════════════════════════');
```

**Log esperado:**
```
[STEP 2.5] Construyendo respuesta final...
[STEP 2.5] Respuesta construida:
  - episodeId: 12345
  - clinicalData: 8 campos
  - patientInfo: JUAN PEREZ GONZALEZ
  - processingTimeMs: 234ms
[STEP 2.5] Enviando respuesta HTTP 200 OK
═══════════════════════════════════════════════════════
[STEP 2.5] ✓ GET /api/episodes/:id completado exitosamente
═══════════════════════════════════════════════════════
```

---

### 2.6 Frontend: Procesamiento de respuesta

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
next: (response) => {
  console.log('[STEP 2.6] Frontend: Respuesta recibida exitosamente');
  console.log('[STEP 2.6] Response:', JSON.stringify(response, null, 2));

  this.clinicalData.set(response.clinicalData);
  this.patientInfo.set(response.patientInfo);
  this.episodeId.set(response.episodeId);

  console.log(`[STEP 2.6] Signals actualizadas:`);
  console.log(`  - clinicalData: ${Object.keys(this.clinicalData()).length} campos`);
  console.log(`  - patientInfo:`, this.patientInfo());
  console.log(`  - episodeId: ${this.episodeId()}`);
  console.log(`[STEP 2.6] hasData computed: ${this.hasData()}`);
  console.log(`[STEP 2.6] Tiempo de procesamiento: ${response.processingTimeMs}ms`);

  this.isLoading.set(false);
  console.log('[STEP 2.6] ✓ Datos del episodio cargados exitosamente');
}
```

**Log esperado:**
```
[STEP 2.6] Frontend: Respuesta recibida exitosamente
[STEP 2.6] Response: { ... }
[STEP 2.6] Signals actualizadas:
  - clinicalData: 8 campos
  - patientInfo: { nombre: "JUAN PEREZ GONZALEZ", ... }
  - episodeId: 12345
[STEP 2.6] hasData computed: true
[STEP 2.6] Tiempo de procesamiento: 234ms
[STEP 2.6] ✓ Datos del episodio cargados exitosamente
```

---

## PASO 3: GENERACIÓN DE EPICRISIS

### 3.1 Frontend: Usuario solicita generación

**Archivo:** `frontend/src/app/features/epicrisis-generator/epicrisis-generator.component.ts`

```typescript
generate(): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 3.1] Usuario presiona botón "Generar epicrisis"');
  console.log(`[STEP 3.1] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const clinicalData = this.epicrisisService.clinicalData();
  console.log('[STEP 3.1] Clinical data disponible:', !!clinicalData);

  if (!clinicalData) {
    console.error('[STEP 3.1] Error: No hay datos clínicos');
    return;
  }

  console.log('[STEP 3.1] Llamando a EpicrisisService.generateEpicrisis()...');
  this.epicrisisService.generateEpicrisis();
}
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 3.1] Usuario presiona botón "Generar epicrisis"
[STEP 3.1] Timestamp: 2025-12-29T15:31:15.456Z
═══════════════════════════════════════════════════════
[STEP 3.1] Clinical data disponible: true
[STEP 3.1] Llamando a EpicrisisService.generateEpicrisis()...
```

---

### 3.2 Service: Llamada al API de generación

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
// Línea 58-74
generateEpicrisis(): void {
  console.log('[STEP 3.2] EpicrisisService.generateEpicrisis()');

  const data = this.clinicalData();
  if (!data) {
    console.error('[STEP 3.2] Error: No clinical data disponible');
    this.errorMessage.set('No hay datos clínicos para generar la epicrisis');
    return;
  }

  console.log('[STEP 3.2] Clinical data presente, iniciando generación...');
  this.isLoading.set(true);
  this.errorMessage.set(null);
  console.log('[STEP 3.2] Estado: isLoading=true');

  const endpoint = '/generate-epicrisis';
  console.log(`[STEP 3.2] Endpoint: POST ${endpoint}`);
  console.log('[STEP 3.2] Payload:', JSON.stringify({ clinicalData: data }, null, 2));

  this.apiService.post<GenerateEpicrisisResponse>(endpoint, { clinicalData: data })
    .subscribe({
      next: (response) => {
        console.log('[STEP 3.2] Respuesta recibida exitosamente');
        console.log(`[STEP 3.2] Texto generado (${response.text.length} caracteres)`);
        console.log(`[STEP 3.2] Validación: ok=${response.validation.ok}`);
        console.log(`[STEP 3.2] Violaciones: ${response.validation.violations.length}`);
        console.log(`[STEP 3.2] Tiempo de procesamiento: ${response.processingTimeMs}ms`);

        this.epicrisisText.set(response.text);
        this.validationResult.set(response.validation);
        this.isLoading.set(false);

        console.log('[STEP 3.2] Signals actualizadas');
        console.log(`[STEP 3.2] hasEpicrisis: ${this.hasEpicrisis()}`);
        console.log(`[STEP 3.2] isValid: ${this.isValid()}`);
        console.log('[STEP 3.2] ✓ Generación completada');
      },
      error: (error) => {
        console.error('[STEP 3.2] Error en generación:', error);
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
      }
    });
}
```

**Log esperado:**
```
[STEP 3.2] EpicrisisService.generateEpicrisis()
[STEP 3.2] Clinical data presente, iniciando generación...
[STEP 3.2] Estado: isLoading=true
[STEP 3.2] Endpoint: POST /generate-epicrisis
[STEP 3.2] Payload: { "clinicalData": { ... } }
[STEP 3.2] HTTP Request iniciado...
```

---

### 3.3 Backend: Recepción de request de generación

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
// Línea 79-135
router.post('/generate-epicrisis', async (req, res) => {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 3.3] Backend: POST /api/generate-epicrisis');
  console.log(`[STEP 3.3] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const { clinicalData } = req.body;

  console.log('[STEP 3.3] Request body recibido');
  console.log(`[STEP 3.3] clinicalData presente: ${!!clinicalData}`);
  console.log(`[STEP 3.3] clinicalData keys:`, Object.keys(clinicalData));

  if (!clinicalData) {
    console.error('[STEP 3.3] Error: clinicalData faltante en body');
    return res.status(400).json({
      error: 'Datos incompletos',
      message: 'Se requiere clinicalData en el body'
    });
  }

  try {
    console.log('[STEP 3.3] Normalizando datos de entrada...');
    const normalizedData = normalizerService.normalize(clinicalData);
    console.log('[STEP 3.3] ✓ Datos normalizados');

    // Continúa en STEP 3.4...
  } catch (error) {
    console.error('[STEP 3.3] Error en generación:', error);
    res.status(500).json({ error: 'Error al generar epicrisis' });
  }
});
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 3.3] Backend: POST /api/generate-epicrisis
[STEP 3.3] Timestamp: 2025-12-29T15:31:16.123Z
═══════════════════════════════════════════════════════
[STEP 3.3] Request body recibido
[STEP 3.3] clinicalData presente: true
[STEP 3.3] clinicalData keys: [
  "motivo_ingreso",
  "diagnostico_ingreso",
  "procedimientos",
  "tratamientos_intrahosp",
  "evolucion",
  "laboratorios_relevantes",
  "diagnostico_egreso",
  "indicaciones_alta"
]
[STEP 3.3] Normalizando datos de entrada...
[STEP 3.3] ✓ Datos normalizados
```

---

### 3.4 Backend: Generación con LLM

**Archivo:** `backend/src/services/llmService.ts`

```typescript
// Línea 76-95
async generateEpicrisis(clinicalData: ClinicalJson): Promise<string> {
  console.log('[STEP 3.4] LlmService.generateEpicrisis()');
  console.log('[STEP 3.4] Preparando prompt para LLM...');

  const clinicalJsonStr = JSON.stringify(clinicalData, null, 2);
  console.log(`[STEP 3.4] JSON clínico: ${clinicalJsonStr.length} caracteres`);

  const prompt = EPICRISIS_PROMPT.replace('{{JSON_CLINICO}}', clinicalJsonStr);
  console.log(`[STEP 3.4] Prompt final: ${prompt.length} caracteres`);

  console.log('[STEP 3.4] Modo: DEVELOPMENT - Generación determinística');
  console.log('[STEP 3.4] Llamando a generateDeterministicEpicrisis()...');

  const text = await this.generateDeterministicEpicrisis(clinicalData);

  console.log(`[STEP 3.4] ✓ Texto generado: ${text.length} caracteres`);
  console.log('[STEP 3.4] Vista previa (primeros 200 chars):');
  console.log(text.substring(0, 200) + '...');

  return text;
}
```

**Archivo:** `backend/src/services/llmService.ts` (modo determinístico)

```typescript
// Línea 148-195
private async generateDeterministicEpicrisis(data: ClinicalJson): Promise<string> {
  console.log('[STEP 3.4] Generación determinística para desarrollo');

  // Extraer componentes
  const motivo = data.motivo_ingreso || 'ingreso por enfermedad';
  console.log(`[STEP 3.4] Motivo de ingreso: "${motivo}"`);

  const dxIngreso = data.diagnostico_ingreso?.[0]?.nombre || 'diagnóstico no especificado';
  console.log(`[STEP 3.4] Diagnóstico de ingreso: "${dxIngreso}"`);

  const dxEgreso = data.diagnostico_egreso?.map(d => d.nombre).join(', ') || 'diagnóstico no especificado';
  console.log(`[STEP 3.4] Diagnósticos de egreso: "${dxEgreso}"`);

  const procedimientos = data.procedimientos?.map(p => p.nombre).join(', ') || 'sin procedimientos';
  console.log(`[STEP 3.4] Procedimientos: "${procedimientos}"`);

  const tratamientos = data.tratamientos_intrahosp?.map(m => m.nombre).join(', ') || 'sin tratamientos';
  console.log(`[STEP 3.4] Tratamientos: "${tratamientos}"`);

  const indicacionesAlta = data.indicaciones_alta?.medicamentos?.map(m => m.nombre).join(', ') || 'sin medicamentos';
  console.log(`[STEP 3.4] Medicamentos de alta: "${indicacionesAlta}"`);

  const epicrisisText = `Paciente ingresa por ${motivo}, con diagnóstico de ingreso de ${dxIngreso}. Durante su hospitalización se realizó ${procedimientos}. Recibió tratamiento con ${tratamientos}. Evoluciona favorablemente y se decide alta con diagnóstico de egreso de ${dxEgreso}. Se indica al alta ${indicacionesAlta}.`;

  console.log('[STEP 3.4] ✓ Epicrisis determinística construida');
  console.log(`[STEP 3.4] Longitud final: ${epicrisisText.length} caracteres`);

  return epicrisisText;
}
```

**Log esperado:**
```
[STEP 3.4] LlmService.generateEpicrisis()
[STEP 3.4] Preparando prompt para LLM...
[STEP 3.4] JSON clínico: 4567 caracteres
[STEP 3.4] Prompt final: 5234 caracteres
[STEP 3.4] Modo: DEVELOPMENT - Generación determinística
[STEP 3.4] Llamando a generateDeterministicEpicrisis()...
[STEP 3.4] Generación determinística para desarrollo
[STEP 3.4] Motivo de ingreso: "infección respiratoria aguda"
[STEP 3.4] Diagnóstico de ingreso: "Neumonía bacteriana"
[STEP 3.4] Diagnósticos de egreso: "Neumonía bacteriana, Hipertensión arterial"
[STEP 3.4] Procedimientos: "Radiografía de tórax, Hemocultivos"
[STEP 3.4] Tratamientos: "Ceftriaxona 2g IV c/24h, Paracetamol 1g VO c/8h"
[STEP 3.4] Medicamentos de alta: "Amoxicilina 500mg VO c/8h x 7 días"
[STEP 3.4] ✓ Epicrisis determinística construida
[STEP 3.4] Longitud final: 287 caracteres
[STEP 3.4] ✓ Texto generado: 287 caracteres
[STEP 3.4] Vista previa (primeros 200 chars):
Paciente ingresa por infección respiratoria aguda, con diagnóstico de ingreso de Neumonía bacteriana. Durante su hospitalización se realizó Radiografía de tórax, Hemocultivos. Recibió...
```

---

## PASO 4: VALIDACIÓN AUTOMÁTICA

### 4.1 Backend: Validación del texto generado

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
console.log('[STEP 4.1] Validando texto generado...');
const validation = await validatorService.validateEpicrisis(epicrisisText, normalizedData);

console.log('[STEP 4.1] Resultado de validación:');
console.log(`  - ok: ${validation.ok}`);
console.log(`  - violations: ${validation.violations.length}`);

if (validation.violations.length > 0) {
  console.log('[STEP 4.1] Violaciones detectadas:');
  validation.violations.forEach((v, idx) => {
    console.log(`    ${idx + 1}. [${v.type}] "${v.mention}" - ${v.reason}`);
  });
}
```

**Archivo:** `backend/src/services/validatorService.ts`

```typescript
// Línea 98-198
async validateEpicrisis(text: string, clinicalData: ClinicalJson): Promise<ValidationResult> {
  console.log('[STEP 4.1] ValidatorService.validateEpicrisis()');
  console.log(`[STEP 4.1] Texto a validar: ${text.length} caracteres`);

  // Normalizar texto
  console.log('[STEP 4.1] Normalizando texto...');
  const normalizedText = this.normalizeText(text);
  console.log(`[STEP 4.1] Texto normalizado: ${normalizedText.length} caracteres`);

  // Extraer n-gramas
  console.log('[STEP 4.1] Extrayendo n-gramas (2-6 palabras)...');
  const ngrams = this.extractNgrams(normalizedText, 2, 6);
  console.log(`[STEP 4.1] N-gramas extraídos: ${ngrams.length}`);

  // Crear whitelists
  console.log('[STEP 4.1] Creando whitelists desde clinical data...');

  const dxWhitelist = new Set<string>();
  clinicalData.diagnostico_ingreso?.forEach(d => {
    dxWhitelist.add(this.normalizeText(d.nombre));
    if (d.codigo) dxWhitelist.add(d.codigo.toLowerCase());
  });
  clinicalData.diagnostico_egreso?.forEach(d => {
    dxWhitelist.add(this.normalizeText(d.nombre));
    if (d.codigo) dxWhitelist.add(d.codigo.toLowerCase());
  });
  console.log(`[STEP 4.1] Diagnósticos en whitelist: ${dxWhitelist.size}`);

  const procWhitelist = new Set<string>();
  clinicalData.procedimientos?.forEach(p => {
    procWhitelist.add(this.normalizeText(p.nombre));
    if (p.codigo) procWhitelist.add(p.codigo.toLowerCase());
  });
  console.log(`[STEP 4.1] Procedimientos en whitelist: ${procWhitelist.size}`);

  const medWhitelist = new Set<string>();
  clinicalData.tratamientos_intrahosp?.forEach(m => {
    medWhitelist.add(this.normalizeText(m.nombre));
    if (m.codigo) medWhitelist.add(m.codigo.toLowerCase());
  });
  clinicalData.indicaciones_alta?.medicamentos?.forEach(m => {
    medWhitelist.add(this.normalizeText(m.nombre));
    if (m.codigo) medWhitelist.add(m.codigo.toLowerCase());
  });
  console.log(`[STEP 4.1] Medicamentos en whitelist: ${medWhitelist.size}`);

  // Validar n-gramas
  console.log('[STEP 4.1] Validando n-gramas contra whitelists...');
  const violations: ValidationViolation[] = [];

  ngrams.forEach(ngram => {
    // Detectar triggers médicos
    const hasMedicalTrigger = this.hasMedicalContext(ngram);

    if (hasMedicalTrigger) {
      // Verificar en whitelists
      const inDx = dxWhitelist.has(ngram) || this.matchesSynonym(ngram, Array.from(dxWhitelist));
      const inProc = procWhitelist.has(ngram) || this.matchesSynonym(ngram, Array.from(procWhitelist));
      const inMed = medWhitelist.has(ngram) || this.matchesSynonym(ngram, Array.from(medWhitelist));

      if (!inDx && !inProc && !inMed) {
        violations.push({
          type: this.inferType(ngram),
          mention: ngram,
          reason: 'No se encuentra en los datos clínicos del paciente'
        });
        console.log(`[STEP 4.1]   ✗ Violación: "${ngram}"`);
      }
    }
  });

  console.log(`[STEP 4.1] ✓ Validación completada: ${violations.length} violaciones`);

  return {
    ok: violations.length === 0,
    violations
  };
}
```

**Log esperado (sin violaciones):**
```
[STEP 4.1] Validando texto generado...
[STEP 4.1] ValidatorService.validateEpicrisis()
[STEP 4.1] Texto a validar: 287 caracteres
[STEP 4.1] Normalizando texto...
[STEP 4.1] Texto normalizado: 287 caracteres
[STEP 4.1] Extrayendo n-gramas (2-6 palabras)...
[STEP 4.1] N-gramas extraídos: 245
[STEP 4.1] Creando whitelists desde clinical data...
[STEP 4.1] Diagnósticos en whitelist: 4
[STEP 4.1] Procedimientos en whitelist: 5
[STEP 4.1] Medicamentos en whitelist: 12
[STEP 4.1] Validando n-gramas contra whitelists...
[STEP 4.1] ✓ Validación completada: 0 violaciones
[STEP 4.1] Resultado de validación:
  - ok: true
  - violations: 0
```

**Log esperado (con violaciones):**
```
[STEP 4.1] ✓ Validación completada: 2 violaciones
[STEP 4.1] Resultado de validación:
  - ok: false
  - violations: 2
[STEP 4.1] Violaciones detectadas:
    1. [med] "aspirina 100mg" - No se encuentra en los datos clínicos del paciente
    2. [dx] "insuficiencia cardiaca" - No se encuentra en los datos clínicos del paciente
```

---

### 4.2 Backend: Lógica de auto-corrección

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
// Línea 100-125
console.log('[STEP 4.2] Verificando si se requiere regeneración...');

if (!validation.ok && validation.violations.length > 0) {
  console.log('[STEP 4.2] ⚠ Violaciones detectadas, iniciando regeneración automática...');
  console.log(`[STEP 4.2] Violaciones a corregir: ${validation.violations.length}`);

  const correctedText = await llmService.regenerateWithCorrections(
    normalizedData,
    validation.violations
  );

  console.log('[STEP 4.2] ✓ Texto regenerado con correcciones');
  console.log(`[STEP 4.2] Longitud texto corregido: ${correctedText.length} caracteres`);

  // Re-validar
  console.log('[STEP 4.2] Re-validando texto corregido...');
  const revalidation = await validatorService.validateEpicrisis(correctedText, normalizedData);

  console.log(`[STEP 4.2] Re-validación: ok=${revalidation.ok}, violations=${revalidation.violations.length}`);

  // Usar texto corregido
  epicrisisText = correctedText;
  validation = revalidation;

  console.log('[STEP 4.2] ✓ Texto corregido adoptado');
} else {
  console.log('[STEP 4.2] ✓ No se requiere regeneración, texto válido');
}
```

**Log esperado (con auto-corrección):**
```
[STEP 4.2] Verificando si se requiere regeneración...
[STEP 4.2] ⚠ Violaciones detectadas, iniciando regeneración automática...
[STEP 4.2] Violaciones a corregir: 2
[STEP 4.2] ✓ Texto regenerado con correcciones
[STEP 4.2] Longitud texto corregido: 295 caracteres
[STEP 4.2] Re-validando texto corregido...
[STEP 4.2] Re-validación: ok=true, violations=0
[STEP 4.2] ✓ Texto corregido adoptado
```

**Log esperado (sin violaciones):**
```
[STEP 4.2] Verificando si se requiere regeneración...
[STEP 4.2] ✓ No se requiere regeneración, texto válido
```

---

### 4.3 Backend: Respuesta final de generación

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
const processingTime = Date.now() - startTime;

console.log('[STEP 4.3] Construyendo respuesta de generación...');

const response = {
  text: epicrisisText,
  validation: validation,
  generatedAt: new Date().toISOString(),
  processingTimeMs: processingTime
};

console.log('[STEP 4.3] Respuesta construida:');
console.log(`  - text: ${response.text.length} caracteres`);
console.log(`  - validation.ok: ${response.validation.ok}`);
console.log(`  - validation.violations: ${response.validation.violations.length}`);
console.log(`  - generatedAt: ${response.generatedAt}`);
console.log(`  - processingTimeMs: ${response.processingTimeMs}ms`);

console.log('[STEP 4.3] Enviando respuesta HTTP 200 OK');
res.json(response);

console.log('═══════════════════════════════════════════════════════');
console.log('[STEP 4.3] ✓ POST /api/generate-epicrisis completado');
console.log('═══════════════════════════════════════════════════════');
```

**Log esperado:**
```
[STEP 4.3] Construyendo respuesta de generación...
[STEP 4.3] Respuesta construida:
  - text: 295 caracteres
  - validation.ok: true
  - validation.violations: 0
  - generatedAt: 2025-12-29T15:31:18.789Z
  - processingTimeMs: 2345ms
[STEP 4.3] Enviando respuesta HTTP 200 OK
═══════════════════════════════════════════════════════
[STEP 4.3] ✓ POST /api/generate-epicrisis completado
═══════════════════════════════════════════════════════
```

---

### 4.4 Frontend: Procesamiento de respuesta de generación

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
next: (response) => {
  console.log('[STEP 4.4] Frontend: Respuesta de generación recibida');
  console.log('[STEP 4.4] Response:', JSON.stringify(response, null, 2));

  console.log(`[STEP 4.4] Texto generado: ${response.text.length} caracteres`);
  console.log(`[STEP 4.4] Validación: ok=${response.validation.ok}`);
  console.log(`[STEP 4.4] Violaciones: ${response.validation.violations.length}`);

  this.epicrisisText.set(response.text);
  this.validationResult.set(response.validation);
  this.isLoading.set(false);

  console.log('[STEP 4.4] Signals actualizadas:');
  console.log(`  - epicrisisText: ${this.epicrisisText()?.length} caracteres`);
  console.log(`  - validationResult.ok: ${this.validationResult()?.ok}`);
  console.log(`  - hasEpicrisis: ${this.hasEpicrisis()}`);
  console.log(`  - isValid: ${this.isValid()}`);
  console.log(`  - violationsCount: ${this.violationsCount()}`);
  console.log(`  - isLoading: ${this.isLoading()}`);

  console.log('[STEP 4.4] ✓ Epicrisis generada y validada exitosamente');
  console.log(`[STEP 4.4] Tiempo total de procesamiento: ${response.processingTimeMs}ms`);
}
```

**Log esperado:**
```
[STEP 4.4] Frontend: Respuesta de generación recibida
[STEP 4.4] Response: { ... }
[STEP 4.4] Texto generado: 295 caracteres
[STEP 4.4] Validación: ok=true
[STEP 4.4] Violaciones: 0
[STEP 4.4] Signals actualizadas:
  - epicrisisText: 295 caracteres
  - validationResult.ok: true
  - hasEpicrisis: true
  - isValid: true
  - violationsCount: 0
  - isLoading: false
[STEP 4.4] ✓ Epicrisis generada y validada exitosamente
[STEP 4.4] Tiempo total de procesamiento: 2345ms
```

---

## PASO 5: REGENERACIÓN CON CORRECCIONES

### 5.1 Frontend: Usuario solicita regeneración manual

**Archivo:** `frontend/src/app/features/epicrisis-generator/epicrisis-generator.component.ts`

```typescript
regenerate(): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 5.1] Usuario presiona botón "Regenerar"');
  console.log(`[STEP 5.1] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const violations = this.epicrisisService.validationResult()?.violations;
  console.log(`[STEP 5.1] Violaciones a corregir: ${violations?.length || 0}`);

  if (violations) {
    violations.forEach((v, idx) => {
      console.log(`[STEP 5.1]   ${idx + 1}. [${v.type}] "${v.mention}"`);
    });
  }

  console.log('[STEP 5.1] Llamando a EpicrisisService.regenerateEpicrisis()...');
  this.epicrisisService.regenerateEpicrisis();
}
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 5.1] Usuario presiona botón "Regenerar"
[STEP 5.1] Timestamp: 2025-12-29T15:32:10.123Z
═══════════════════════════════════════════════════════
[STEP 5.1] Violaciones a corregir: 2
[STEP 5.1]   1. [med] "aspirina 100mg"
[STEP 5.1]   2. [dx] "insuficiencia cardiaca"
[STEP 5.1] Llamando a EpicrisisService.regenerateEpicrisis()...
```

---

### 5.2 Service: Regeneración con correcciones

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
// Línea 79-100
regenerateEpicrisis(): void {
  console.log('[STEP 5.2] EpicrisisService.regenerateEpicrisis()');

  const data = this.clinicalData();
  const validation = this.validationResult();

  if (!data) {
    console.error('[STEP 5.2] Error: No clinical data disponible');
    return;
  }

  console.log(`[STEP 5.2] Clinical data: presente`);
  console.log(`[STEP 5.2] Violaciones: ${validation?.violations.length || 0}`);

  this.isLoading.set(true);
  console.log('[STEP 5.2] Estado: isLoading=true');

  const endpoint = '/regenerate-epicrisis';
  const payload = {
    clinicalData: data,
    violations: validation?.violations || []
  };

  console.log(`[STEP 5.2] Endpoint: POST ${endpoint}`);
  console.log('[STEP 5.2] Payload:', JSON.stringify(payload, null, 2));

  this.apiService.post<GenerateEpicrisisResponse>(endpoint, payload)
    .subscribe({
      next: (response) => {
        console.log('[STEP 5.2] Respuesta recibida exitosamente');
        console.log(`[STEP 5.2] Texto regenerado: ${response.text.length} caracteres`);
        console.log(`[STEP 5.2] Validación: ok=${response.validation.ok}`);
        console.log(`[STEP 5.2] Violaciones restantes: ${response.validation.violations.length}`);

        this.epicrisisText.set(response.text);
        this.validationResult.set(response.validation);
        this.isLoading.set(false);

        console.log('[STEP 5.2] ✓ Regeneración completada');
      },
      error: (error) => {
        console.error('[STEP 5.2] Error en regeneración:', error);
        this.isLoading.set(false);
      }
    });
}
```

**Log esperado:**
```
[STEP 5.2] EpicrisisService.regenerateEpicrisis()
[STEP 5.2] Clinical data: presente
[STEP 5.2] Violaciones: 2
[STEP 5.2] Estado: isLoading=true
[STEP 5.2] Endpoint: POST /regenerate-epicrisis
[STEP 5.2] Payload: {
  "clinicalData": { ... },
  "violations": [
    { "type": "med", "mention": "aspirina 100mg", ... },
    { "type": "dx", "mention": "insuficiencia cardiaca", ... }
  ]
}
[STEP 5.2] HTTP Request iniciado...
```

---

### 5.3 Backend: Regeneración con restricciones

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
// Línea 141-176
router.post('/regenerate-epicrisis', async (req, res) => {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 5.3] Backend: POST /api/regenerate-epicrisis');
  console.log(`[STEP 5.3] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const { clinicalData, violations } = req.body;

  console.log('[STEP 5.3] Request body recibido');
  console.log(`[STEP 5.3] clinicalData: presente`);
  console.log(`[STEP 5.3] violations: ${violations?.length || 0}`);

  if (violations && violations.length > 0) {
    console.log('[STEP 5.3] Violaciones a corregir:');
    violations.forEach((v: any, idx: number) => {
      console.log(`  ${idx + 1}. [${v.type}] "${v.mention}" - ${v.reason}`);
    });
  }

  try {
    console.log('[STEP 5.3] Normalizando datos...');
    const normalizedData = normalizerService.normalize(clinicalData);

    console.log('[STEP 5.3] Llamando a LlmService.regenerateWithCorrections()...');
    const correctedText = await llmService.regenerateWithCorrections(
      normalizedData,
      violations || []
    );

    console.log(`[STEP 5.3] ✓ Texto corregido generado: ${correctedText.length} caracteres`);

    console.log('[STEP 5.3] Validando texto corregido...');
    const validation = await validatorService.validateEpicrisis(correctedText, normalizedData);

    console.log(`[STEP 5.3] Validación: ok=${validation.ok}, violations=${validation.violations.length}`);

    const processingTime = Date.now() - startTime;

    const response = {
      text: correctedText,
      validation,
      generatedAt: new Date().toISOString(),
      processingTimeMs: processingTime
    };

    console.log('[STEP 5.3] ✓ Regeneración completada exitosamente');
    res.json(response);

    console.log('═══════════════════════════════════════════════════════');
  } catch (error) {
    console.error('[STEP 5.3] Error en regeneración:', error);
    res.status(500).json({ error: 'Error al regenerar epicrisis' });
  }
});
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 5.3] Backend: POST /api/regenerate-epicrisis
[STEP 5.3] Timestamp: 2025-12-29T15:32:10.456Z
═══════════════════════════════════════════════════════
[STEP 5.3] Request body recibido
[STEP 5.3] clinicalData: presente
[STEP 5.3] violations: 2
[STEP 5.3] Violaciones a corregir:
  1. [med] "aspirina 100mg" - No se encuentra en los datos clínicos del paciente
  2. [dx] "insuficiencia cardiaca" - No se encuentra en los datos clínicos del paciente
[STEP 5.3] Normalizando datos...
[STEP 5.3] Llamando a LlmService.regenerateWithCorrections()...
[STEP 5.3] ✓ Texto corregido generado: 301 caracteres
[STEP 5.3] Validando texto corregido...
[STEP 5.3] Validación: ok=true, violations=0
[STEP 5.3] ✓ Regeneración completada exitosamente
═══════════════════════════════════════════════════════
```

---

### 5.4 Backend: LLM con restricciones

**Archivo:** `backend/src/services/llmService.ts`

```typescript
// Línea 100-142
async regenerateWithCorrections(
  clinicalData: ClinicalJson,
  violations: ValidationViolation[]
): Promise<string> {
  console.log('[STEP 5.4] LlmService.regenerateWithCorrections()');
  console.log(`[STEP 5.4] Violaciones a corregir: ${violations.length}`);

  // Crear whitelists
  console.log('[STEP 5.4] Construyendo whitelists permitidas...');

  const allowedDx = [
    ...clinicalData.diagnostico_ingreso?.map(d => d.nombre) || [],
    ...clinicalData.diagnostico_egreso?.map(d => d.nombre) || []
  ];
  console.log(`[STEP 5.4] Diagnósticos permitidos: ${allowedDx.length}`);

  const allowedProc = clinicalData.procedimientos?.map(p => p.nombre) || [];
  console.log(`[STEP 5.4] Procedimientos permitidos: ${allowedProc.length}`);

  const allowedMeds = [
    ...clinicalData.tratamientos_intrahosp?.map(m => m.nombre) || [],
    ...clinicalData.indicaciones_alta?.medicamentos?.map(m => m.nombre) || []
  ];
  console.log(`[STEP 5.4] Medicamentos permitidos: ${allowedMeds.length}`);

  // Construir prompt de corrección
  console.log('[STEP 5.4] Construyendo prompt de corrección...');

  let violationsText = violations.map(v =>
    `- "${v.mention}" (${v.type}): ${v.reason}`
  ).join('\n');

  const prompt = CORRECTION_PROMPT
    .replace('{{VIOLATIONS}}', violationsText)
    .replace('{{ALLOWED_DX}}', allowedDx.join(', '))
    .replace('{{ALLOWED_PROC}}', allowedProc.join(', '))
    .replace('{{ALLOWED_MEDS}}', allowedMeds.join(', '))
    .replace('{{JSON_CLINICO}}', JSON.stringify(clinicalData, null, 2));

  console.log(`[STEP 5.4] Prompt de corrección: ${prompt.length} caracteres`);

  console.log('[STEP 5.4] Modo: DEVELOPMENT - Generación determinística con restricciones');
  const correctedText = await this.generateDeterministicEpicrisis(clinicalData);

  console.log(`[STEP 5.4] ✓ Texto corregido: ${correctedText.length} caracteres`);

  return correctedText;
}
```

**Log esperado:**
```
[STEP 5.4] LlmService.regenerateWithCorrections()
[STEP 5.4] Violaciones a corregir: 2
[STEP 5.4] Construyendo whitelists permitidas...
[STEP 5.4] Diagnósticos permitidos: 4
[STEP 5.4] Procedimientos permitidos: 5
[STEP 5.4] Medicamentos permitidos: 12
[STEP 5.4] Construyendo prompt de corrección...
[STEP 5.4] Prompt de corrección: 6789 caracteres
[STEP 5.4] Modo: DEVELOPMENT - Generación determinística con restricciones
[STEP 5.4] ✓ Texto corregido: 301 caracteres
```

---

## PASO 6: EXPORTACIÓN

### 6.1 Frontend: Usuario solicita exportación

**Archivo:** `frontend/src/app/features/export-options/export-options.component.ts`

```typescript
exportToPDF(): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 6.1] Usuario presiona botón "Exportar a PDF"');
  console.log(`[STEP 6.1] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const text = this.epicrisisService.epicrisisText();
  const patientInfo = this.epicrisisService.patientInfo();
  const episodeId = this.epicrisisService.episodeId();

  console.log(`[STEP 6.1] Texto epicrisis: ${text?.length || 0} caracteres`);
  console.log(`[STEP 6.1] Paciente: ${patientInfo?.nombre}`);
  console.log(`[STEP 6.1] Episode ID: ${episodeId}`);

  if (!text) {
    console.error('[STEP 6.1] Error: No hay epicrisis para exportar');
    return;
  }

  console.log('[STEP 6.1] Llamando a EpicrisisService.exportToPDF()...');

  this.epicrisisService.exportToPDF().subscribe({
    next: (blob) => {
      console.log('[STEP 6.1] PDF recibido del backend');
      console.log(`[STEP 6.1] Blob size: ${blob.size} bytes`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `epicrisis_${episodeId}_${Date.now()}.pdf`;

      console.log(`[STEP 6.1] Descargando archivo: ${link.download}`);
      link.click();

      window.URL.revokeObjectURL(url);
      console.log('[STEP 6.1] ✓ PDF descargado exitosamente');
    },
    error: (error) => {
      console.error('[STEP 6.1] Error al exportar PDF:', error);
    }
  });
}
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 6.1] Usuario presiona botón "Exportar a PDF"
[STEP 6.1] Timestamp: 2025-12-29T15:33:20.789Z
═══════════════════════════════════════════════════════
[STEP 6.1] Texto epicrisis: 301 caracteres
[STEP 6.1] Paciente: JUAN PEREZ GONZALEZ
[STEP 6.1] Episode ID: 12345
[STEP 6.1] Llamando a EpicrisisService.exportToPDF()...
```

---

### 6.2 Service: Llamada al API de exportación

**Archivo:** `frontend/src/app/core/services/epicrisis.service.ts`

```typescript
// Línea 135-145
exportToPDF(): Observable<Blob> {
  console.log('[STEP 6.2] EpicrisisService.exportToPDF()');

  const text = this.epicrisisText();
  const patientName = this.patientInfo()?.nombre;
  const episodeId = this.episodeId();

  console.log(`[STEP 6.2] Preparando request de exportación`);
  console.log(`  - text: ${text?.length} caracteres`);
  console.log(`  - patientName: ${patientName}`);
  console.log(`  - episodeId: ${episodeId}`);

  const endpoint = '/export/pdf';
  const payload = { text, patientName, episodeId };

  console.log(`[STEP 6.2] Endpoint: POST ${endpoint}`);
  console.log('[STEP 6.2] Llamando a ApiService.postBlob()...');

  return this.apiService.postBlob(endpoint, payload);
}
```

**Log esperado:**
```
[STEP 6.2] EpicrisisService.exportToPDF()
[STEP 6.2] Preparando request de exportación
  - text: 301 caracteres
  - patientName: JUAN PEREZ GONZALEZ
  - episodeId: 12345
[STEP 6.2] Endpoint: POST /export/pdf
[STEP 6.2] Llamando a ApiService.postBlob()...
```

---

### 6.3 Backend: Generación de PDF

**Archivo:** `backend/src/routes/epicrisisRoutes.ts`

```typescript
// Línea 210-236
router.post('/export/pdf', async (req, res) => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 6.3] Backend: POST /api/export/pdf');
  console.log(`[STEP 6.3] Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  const { text, patientName, episodeId } = req.body;

  console.log('[STEP 6.3] Request body recibido');
  console.log(`  - text: ${text?.length || 0} caracteres`);
  console.log(`  - patientName: ${patientName}`);
  console.log(`  - episodeId: ${episodeId}`);

  if (!text) {
    console.error('[STEP 6.3] Error: texto faltante');
    return res.status(400).json({ error: 'Texto requerido' });
  }

  try {
    console.log('[STEP 6.3] Llamando a ExportService.generatePDF()...');

    const pdfBuffer = await exportService.generatePDF({
      text,
      patientName: patientName || 'Paciente',
      episodeId: episodeId || 'N/A'
    });

    console.log(`[STEP 6.3] ✓ PDF generado: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="epicrisis_${episodeId}.pdf"`);

    console.log('[STEP 6.3] Enviando PDF al cliente...');
    res.send(pdfBuffer);

    console.log('[STEP 6.3] ✓ PDF enviado exitosamente');
    console.log('═══════════════════════════════════════════════════════');
  } catch (error) {
    console.error('[STEP 6.3] Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});
```

**Log esperado:**
```
═══════════════════════════════════════════════════════
[STEP 6.3] Backend: POST /api/export/pdf
[STEP 6.3] Timestamp: 2025-12-29T15:33:21.123Z
═══════════════════════════════════════════════════════
[STEP 6.3] Request body recibido
  - text: 301 caracteres
  - patientName: JUAN PEREZ GONZALEZ
  - episodeId: 12345
[STEP 6.3] Llamando a ExportService.generatePDF()...
[STEP 6.3] ✓ PDF generado: 45678 bytes
[STEP 6.3] Enviando PDF al cliente...
[STEP 6.3] ✓ PDF enviado exitosamente
═══════════════════════════════════════════════════════
```

---

### 6.4 Backend: Servicio de exportación PDF

**Archivo:** `backend/src/services/exportService.ts`

```typescript
async generatePDF(data: ExportData): Promise<Buffer> {
  console.log('[STEP 6.4] ExportService.generatePDF()');
  console.log(`[STEP 6.4] Paciente: ${data.patientName}`);
  console.log(`[STEP 6.4] Episodio: ${data.episodeId}`);
  console.log(`[STEP 6.4] Texto: ${data.text.length} caracteres`);

  console.log('[STEP 6.4] Creando documento PDF con PDFKit...');

  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const chunks: Buffer[] = [];

  doc.on('data', chunk => chunks.push(chunk));

  console.log('[STEP 6.4] Escribiendo encabezado...');
  doc.fontSize(16).text('EPICRISIS', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Paciente: ${data.patientName}`);
  doc.text(`Episodio: ${data.episodeId}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`);
  doc.moveDown();

  console.log('[STEP 6.4] Escribiendo texto de epicrisis...');
  doc.fontSize(10).text(data.text, {
    align: 'justify',
    lineGap: 2
  });

  console.log('[STEP 6.4] Finalizando documento...');
  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(`[STEP 6.4] ✓ PDF generado: ${pdfBuffer.length} bytes`);
      resolve(pdfBuffer);
    });
  });
}
```

**Log esperado:**
```
[STEP 6.4] ExportService.generatePDF()
[STEP 6.4] Paciente: JUAN PEREZ GONZALEZ
[STEP 6.4] Episodio: 12345
[STEP 6.4] Texto: 301 caracteres
[STEP 6.4] Creando documento PDF con PDFKit...
[STEP 6.4] Escribiendo encabezado...
[STEP 6.4] Escribiendo texto de epicrisis...
[STEP 6.4] Finalizando documento...
[STEP 6.4] ✓ PDF generado: 45678 bytes
```

---

### 6.5 Frontend: Descarga de archivo

**Archivo:** `frontend/src/app/features/export-options/export-options.component.ts`

```typescript
next: (blob) => {
  console.log('[STEP 6.5] Frontend: Blob de PDF recibido');
  console.log(`[STEP 6.5] Blob size: ${blob.size} bytes`);
  console.log(`[STEP 6.5] Blob type: ${blob.type}`);

  const url = window.URL.createObjectURL(blob);
  console.log('[STEP 6.5] Object URL creado:', url);

  const link = document.createElement('a');
  link.href = url;

  const episodeId = this.epicrisisService.episodeId();
  const timestamp = Date.now();
  link.download = `epicrisis_${episodeId}_${timestamp}.pdf`;

  console.log(`[STEP 6.5] Nombre del archivo: ${link.download}`);
  console.log('[STEP 6.5] Disparando click en link de descarga...');

  link.click();

  console.log('[STEP 6.5] Liberando Object URL...');
  window.URL.revokeObjectURL(url);

  console.log('[STEP 6.5] ✓ Descarga iniciada exitosamente');
  console.log('═══════════════════════════════════════════════════════');
  console.log('[STEP 6.5] ✓ FLUJO COMPLETO FINALIZADO CON ÉXITO');
  console.log('═══════════════════════════════════════════════════════');
}
```

**Log esperado:**
```
[STEP 6.5] Frontend: Blob de PDF recibido
[STEP 6.5] Blob size: 45678 bytes
[STEP 6.5] Blob type: application/pdf
[STEP 6.5] Object URL creado: blob:http://localhost:4200/abc-123-def
[STEP 6.5] Nombre del archivo: epicrisis_12345_1735487601456.pdf
[STEP 6.5] Disparando click en link de descarga...
[STEP 6.5] Liberando Object URL...
[STEP 6.5] ✓ Descarga iniciada exitosamente
═══════════════════════════════════════════════════════
[STEP 6.5] ✓ FLUJO COMPLETO FINALIZADO CON ÉXITO
═══════════════════════════════════════════════════════
```

---

## LOGS DE EJEMPLO EXITOSO

### Log Completo de Consola (Frontend)

```
═══════════════════════════════════════════════════════
FLUJO COMPLETO: GENERACIÓN DE EPICRISIS
Episodio ID: 12345
Inicio: 2025-12-29T15:30:45.123Z
═══════════════════════════════════════════════════════

[STEP 1.1] Usuario presiona botón "Buscar episodio"
[STEP 1.1] Episode ID ingresado: "12345"
[STEP 1.1] Llamando a EpicrisisService.getEpisodeData()...

[STEP 1.2] EpicrisisService.getEpisodeData("12345")
[STEP 1.2] Estado: isLoading=true, errorMessage=null
[STEP 1.2] Endpoint: GET /episodes/12345
[STEP 1.2] HTTP Request iniciado...

[STEP 2.6] Frontend: Respuesta recibida exitosamente
[STEP 2.6] Signals actualizadas:
  - clinicalData: 8 campos
  - patientInfo: { nombre: "JUAN PEREZ GONZALEZ", rut: "12345678-9", fechaNacimiento: "1980-05-15" }
  - episodeId: 12345
[STEP 2.6] hasData computed: true
[STEP 2.6] Tiempo de procesamiento: 234ms
[STEP 2.6] ✓ Datos del episodio cargados exitosamente

═══════════════════════════════════════════════════════
[STEP 3.1] Usuario presiona botón "Generar epicrisis"
[STEP 3.1] Timestamp: 2025-12-29T15:31:15.456Z
═══════════════════════════════════════════════════════

[STEP 3.2] EpicrisisService.generateEpicrisis()
[STEP 3.2] Clinical data presente, iniciando generación...
[STEP 3.2] Estado: isLoading=true
[STEP 3.2] Endpoint: POST /generate-epicrisis
[STEP 3.2] HTTP Request iniciado...

[STEP 4.4] Frontend: Respuesta de generación recibida
[STEP 4.4] Texto generado: 295 caracteres
[STEP 4.4] Validación: ok=true
[STEP 4.4] Violaciones: 0
[STEP 4.4] Signals actualizadas:
  - epicrisisText: 295 caracteres
  - validationResult.ok: true
  - hasEpicrisis: true
  - isValid: true
  - violationsCount: 0
  - isLoading: false
[STEP 4.4] ✓ Epicrisis generada y validada exitosamente
[STEP 4.4] Tiempo total de procesamiento: 2345ms

═══════════════════════════════════════════════════════
[STEP 6.1] Usuario presiona botón "Exportar a PDF"
[STEP 6.1] Timestamp: 2025-12-29T15:33:20.789Z
═══════════════════════════════════════════════════════

[STEP 6.2] EpicrisisService.exportToPDF()
[STEP 6.2] Endpoint: POST /export/pdf

[STEP 6.5] Frontend: Blob de PDF recibido
[STEP 6.5] Blob size: 45678 bytes
[STEP 6.5] ✓ Descarga iniciada exitosamente

═══════════════════════════════════════════════════════
✓ FLUJO COMPLETO FINALIZADO CON ÉXITO
Tiempo total: ~2 minutos 35 segundos
═══════════════════════════════════════════════════════
```

---

### Log Completo del Backend

```
═══════════════════════════════════════════════════════
[STEP 2.1] Backend: GET /api/episodes/:id
[STEP 2.1] Episode ID recibido: "12345"
[STEP 2.1] Timestamp: 2025-12-29T15:30:45.123Z
═══════════════════════════════════════════════════════
[STEP 2.1] Validación exitosa: ID es numérico
[STEP 2.1] Verificando existencia del episodio...
[STEP 2.1] ✓ Episodio 12345 existe en la BD

[STEP 2.2] OracleService.getDischargeSummary()
[STEP 2.2] Ejecutando función PL/SQL: get_discharge_summary_json(12345)
[STEP 2.2] Resultado obtenido de Oracle
[STEP 2.2] Tamaño del JSON: 3456 caracteres
[STEP 2.2] JSON parseado exitosamente

[STEP 2.3] NormalizerService.normalize()
[STEP 2.3] Diagnósticos de ingreso: 2 items
[STEP 2.3] Diagnósticos de egreso: 3 items
[STEP 2.3] Procedimientos: 5 items
[STEP 2.3] Medicaciones intrahosp: 8 items
[STEP 2.3] Medicaciones de alta: 4 items
[STEP 2.3] Evoluciones: 12 items
[STEP 2.3] Laboratorios: 15 items
[STEP 2.3] ✓ Normalización completada exitosamente

[STEP 2.4] OracleService.getPatientInfo()
[STEP 2.4] Datos del paciente obtenidos
[STEP 2.4] PatientInfo: { "nombre": "JUAN PEREZ GONZALEZ", ... }

[STEP 2.5] processingTimeMs: 234ms
[STEP 2.5] Enviando respuesta HTTP 200 OK
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
[STEP 3.3] Backend: POST /api/generate-epicrisis
[STEP 3.3] Timestamp: 2025-12-29T15:31:16.123Z
═══════════════════════════════════════════════════════

[STEP 3.4] LlmService.generateEpicrisis()
[STEP 3.4] Modo: DEVELOPMENT - Generación determinística
[STEP 3.4] ✓ Texto generado: 287 caracteres

[STEP 4.1] ValidatorService.validateEpicrisis()
[STEP 4.1] N-gramas extraídos: 245
[STEP 4.1] Diagnósticos en whitelist: 4
[STEP 4.1] Procedimientos en whitelist: 5
[STEP 4.1] Medicamentos en whitelist: 12
[STEP 4.1] ✓ Validación completada: 0 violaciones

[STEP 4.2] ✓ No se requiere regeneración, texto válido

[STEP 4.3] processingTimeMs: 2345ms
[STEP 4.3] Enviando respuesta HTTP 200 OK
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
[STEP 6.3] Backend: POST /api/export/pdf
[STEP 6.3] Timestamp: 2025-12-29T15:33:21.123Z
═══════════════════════════════════════════════════════

[STEP 6.4] ExportService.generatePDF()
[STEP 6.4] ✓ PDF generado: 45678 bytes

[STEP 6.3] ✓ PDF enviado exitosamente
═══════════════════════════════════════════════════════
```

---

## RESUMEN DE TIEMPOS

| Paso | Operación | Tiempo Promedio |
|------|-----------|-----------------|
| 1-2 | Búsqueda y carga de episodio | 200-300ms |
| 3-4 | Generación + validación | 2000-3000ms |
| 5 | Regeneración (si aplica) | 1500-2500ms |
| 6 | Exportación PDF | 300-500ms |

**Tiempo total del flujo completo:** ~3-5 segundos (sin regeneración)

---

## ARCHIVOS CLAVE PARA DEBUGGING

| Componente | Archivo | Líneas Clave |
|------------|---------|--------------|
| Frontend Search | `frontend/src/app/features/episode-search/episode-search.component.ts` | 194-206 |
| Frontend Generator | `frontend/src/app/features/epicrisis-generator/epicrisis-generator.component.ts` | - |
| Frontend Service | `frontend/src/app/core/services/epicrisis.service.ts` | 40-160 |
| Backend Routes | `backend/src/routes/epicrisisRoutes.ts` | 33-266 |
| Oracle Service | `backend/src/services/oracleService.ts` | - |
| Normalizer | `backend/src/services/normalizerService.ts` | - |
| LLM Service | `backend/src/services/llmService.ts` | 76-195 |
| Validator | `backend/src/services/validatorService.ts` | 98-234 |
| Export Service | `backend/src/services/exportService.ts` | - |

---

**FIN DEL LOG**
