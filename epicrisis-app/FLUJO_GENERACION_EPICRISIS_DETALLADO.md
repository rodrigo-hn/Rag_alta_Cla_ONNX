# Flujo de Generacion de Epicrisis - Documentacion Tecnica Detallada

## Indice

1. [Vision General del Flujo](#1-vision-general-del-flujo)
2. [Paso 1: Usuario presiona "Generar Epicrisis"](#paso-1-usuario-presiona-generar-epicrisis)
3. [Paso 2: EpicrisisService llama generateEpicrisis()](#paso-2-epicrisisservice-llama-generateepicrisis)
4. [Paso 3: Peticion HTTP POST /api/generate-epicrisis](#paso-3-peticion-http-post-apigenerate-epicrisis)
5. [Paso 4: Backend procesa la peticion](#paso-4-backend-procesa-la-peticion)
   - [4a: Normalizar datos clinicos](#paso-4a-normalizar-datos-clinicos)
   - [4b: Generar epicrisis con LLM](#paso-4b-generar-epicrisis-con-llm)
   - [4c: Validar texto generado](#paso-4c-validar-texto-generado)
   - [4d: Regenerar si hay violaciones](#paso-4d-regenerar-si-hay-violaciones)
   - [4e: Retornar respuesta](#paso-4e-retornar-respuesta)
6. [Paso 5: Frontend actualiza signals](#paso-5-frontend-actualiza-signals)
7. [Paso 6: EpicrisisGeneratorComponent muestra texto](#paso-6-epicrisisgeneratorcomponent-muestra-texto)
8. [Paso 7: ValidationPanelComponent muestra resultado](#paso-7-validationpanelcomponent-muestra-resultado)
9. [Diagrama de Secuencia](#diagrama-de-secuencia-completo)
10. [Metricas de Rendimiento](#metricas-de-rendimiento)

---

## 1. Vision General del Flujo

El flujo de generacion de epicrisis es el proceso central del sistema. Transforma datos clinicos estructurados (JSON) en un informe de alta hospitalaria narrativo, validado contra los datos originales para evitar alucinaciones.

### Resumen del Flujo

```
1. Usuario presiona "Generar Epicrisis"
2. EpicrisisGeneratorComponent llama epicrisisService.generateEpicrisis()
3. EpicrisisService hace POST /api/generate-epicrisis con clinicalData
4. Backend:
   a. Normaliza datos clinicos
   b. Genera epicrisis con llmService.generateEpicrisis()
      - Construye prompt con JSON clinico
      - LLM genera texto
      - Mide metricas de rendimiento
   c. Valida con validatorService.validateEpicrisis()
      - Crea whitelists desde datos
      - Extrae n-gramas del texto
      - Detecta menciones no permitidas
   d. Si hay violaciones: regenera automaticamente
      - llmService.regenerateWithCorrections()
      - Pasa violaciones y whitelists en prompt
      - Revalida texto corregido
   e. Retorna { text, validation, generatedAt, processingTimeMs }
5. EpicrisisService actualiza signals: epicrisisText, validationResult
6. EpicrisisGeneratorComponent muestra texto
7. ValidationPanelComponent muestra resultado de validacion
```

---

## PASO 1: Usuario presiona "Generar Epicrisis"

**Ubicacion del codigo:** `frontend/src/app/features/epicrisis-generator/epicrisis-generator.component.ts`

### Template HTML del Boton

```html
<button
  mat-raised-button
  color="primary"
  (click)="generate()"
  [disabled]="isLoading()">

  @if (isLoading()) {
    <mat-spinner diameter="20"></mat-spinner>
    <span>Generando...</span>
  } @else {
    <mat-icon>auto_awesome</mat-icon>
    <span>Generar Epicrisis</span>
  }
</button>
```

### Metodo del Componente

```typescript
@Component({
  selector: 'app-epicrisis-generator',
  standalone: true,
  // ... imports
})
export class EpicrisisGeneratorComponent {
  private epicrisisService = inject(EpicrisisService);

  // Signals del servicio compartido
  clinicalData = this.epicrisisService.clinicalData;
  epicrisisText = this.epicrisisService.epicrisisText;
  isLoading = this.epicrisisService.isLoading;
  hasData = this.epicrisisService.hasData;
  hasEpicrisis = this.epicrisisService.hasEpicrisis;

  // Metodo ejecutado al hacer clic
  generate(): void {
    this.epicrisisService.generateEpicrisis().subscribe({
      next: () => {
        // Exito: los signals ya fueron actualizados en el servicio
      },
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al generar epicrisis');
      }
    });
  }
}
```

### Que sucede en este paso

| Accion | Descripcion |
|--------|-------------|
| Clic del usuario | Dispara el evento `(click)="generate()"` |
| Verificacion de estado | El boton esta deshabilitado si `isLoading()` es `true` (evita doble clic) |
| Delegacion | El componente delega toda la logica al servicio `EpicrisisService` |
| Suscripcion | Se suscribe al Observable para manejar errores |

---

## PASO 2: EpicrisisService llama generateEpicrisis()

**Ubicacion del codigo:** `frontend/src/app/core/services/epicrisis.service.ts`

### Codigo del Servicio

```typescript
@Injectable({
  providedIn: 'root'
})
export class EpicrisisService {
  private api = inject(ApiService);

  // ========================================
  // SIGNALS DE ESTADO REACTIVO
  // ========================================
  clinicalData = signal<ClinicalJson | null>(null);
  patientInfo = signal<PatientInfo | null>(null);
  episodeId = signal<string>('');
  epicrisisText = signal<string>('');
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // ========================================
  // COMPUTED VALUES (derivados de signals)
  // ========================================
  hasData = computed(() => this.clinicalData() !== null);
  hasEpicrisis = computed(() => this.epicrisisText().length > 0);
  isValid = computed(() => this.validationResult()?.ok ?? false);
  violationsCount = computed(() => this.validationResult()?.violations.length ?? 0);

  // ========================================
  // METODO PRINCIPAL DE GENERACION
  // ========================================
  generateEpicrisis(): Observable<EpicrisisResponse> {
    // 1. Obtener los datos clinicos del estado actual (signal)
    const data = this.clinicalData();

    // 2. Validar que existan datos cargados
    if (!data) {
      throw new Error('No hay datos clinicos cargados');
    }

    // 3. Activar indicador de carga (UI muestra spinner)
    this.isLoading.set(true);

    // 4. Limpiar mensaje de error previo
    this.errorMessage.set('');

    // 5. Hacer peticion HTTP POST al backend
    return this.api.post<EpicrisisResponse>('/generate-epicrisis', {
      clinicalData: data
    }).pipe(
      // 6. Cuando llega la respuesta exitosa, actualizar el estado
      tap((response) => {
        // Guardar texto generado en signal
        this.epicrisisText.set(response.text);

        // Guardar resultado de validacion en signal
        this.validationResult.set(response.validation);
      }),

      // 7. Siempre desactivar loading (exito o error)
      finalize(() => this.isLoading.set(false))
    );
  }
}
```

### Diagrama de Estado del Servicio

```
Estado Inicial:
  clinicalData: { ... datos del paciente ... }
  epicrisisText: ''
  validationResult: null
  isLoading: false
  errorMessage: ''

Durante Generacion:
  isLoading: true  <-- Spinner visible
  errorMessage: ''

Despues de Respuesta Exitosa:
  epicrisisText: 'Paciente de 68 anos ingresa por...'
  validationResult: { ok: true, violations: [] }
  isLoading: false  <-- Spinner oculto

Si hay Error:
  errorMessage: 'Error al generar epicrisis'
  isLoading: false
```

---

## PASO 3: Peticion HTTP POST /api/generate-epicrisis

**Ubicacion del codigo:** `frontend/src/app/core/services/api.service.ts`

### ApiService - Wrapper HTTP

```typescript
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;  // 'http://localhost:3000/api'

  /**
   * Realiza una peticion POST
   * @param endpoint - Ruta relativa (ej: '/generate-epicrisis')
   * @param body - Datos a enviar
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    // Construye URL completa: http://localhost:3000/api/generate-epicrisis
    const url = `${this.baseUrl}${endpoint}`;

    return this.http.post<T>(url, body).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente (red, etc.)
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else {
        errorMessage = error.error?.error || `Error ${error.status}`;
      }
    }

    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
```

### Estructura de la Peticion HTTP

**Request:**
```
POST http://localhost:3000/api/generate-epicrisis
Content-Type: application/json

{
  "clinicalData": {
    "motivo_ingreso": "Post operatorio cirugia de Miles por cancer de recto",
    "diagnostico_ingreso": [
      { "codigo": "C20", "nombre": "Tumor maligno del recto" },
      { "codigo": "K74.6", "nombre": "Cirrosis hepatica, otra y la no especificada" },
      { "codigo": "J90", "nombre": "Derrame pleural no clasificado en otra parte" }
    ],
    "procedimientos": [
      { "codigo": "48.52", "nombre": "Cirugia de Miles (reseccion abdominoperineal)", "fecha": "2025-12-15" },
      { "codigo": "34.04", "nombre": "Pleurostomia 24 FR", "fecha": "2025-12-16" },
      { "codigo": "87.41", "nombre": "TAC de torax", "fecha": "2025-12-17" }
    ],
    "tratamientos_intrahosp": [
      { "codigo": "ATC:J01CR05", "nombre": "Piperacilina/Tazobactam", "dosis": "4.5g", "via": "EV", "frecuencia": "cada 8 horas" },
      { "codigo": "ATC:J01DH02", "nombre": "Meropenem", "dosis": "1g", "via": "EV", "frecuencia": "cada 8 horas" }
    ],
    "evolucion": [
      { "fecha": "2025-12-16", "nota": "TORAX- PLEUROSTOMIA. Se instala pleurostomia 24 FR...", "profesional": "Dr. Gonzalez" },
      { "fecha": "2025-12-17", "nota": "TORAX ESTABLE, pleurostomia 1340 cc serohematico...", "profesional": "Dr. Gonzalez" }
    ],
    "laboratorios_relevantes": [
      { "parametro": "Hemoglobina", "valor": "7.8 g/dL", "fecha": "2025-12-25" },
      { "parametro": "PCR", "valor": "8.79 mg/dL", "fecha": "2025-12-25" }
    ],
    "diagnostico_egreso": [
      { "codigo": "C20", "nombre": "Tumor maligno del recto - Post operatorio cirugia de Miles" },
      { "codigo": "J90", "nombre": "Derrame pleural bilateral resuelto" },
      { "codigo": "K74.6", "nombre": "Enfermedad hepatica cronica con hipertension portal" }
    ],
    "indicaciones_alta": {
      "medicamentos": [
        { "codigo": "ATC:J01DH02", "nombre": "Meropenem", "dosis": "1g", "via": "EV", "frecuencia": "cada 8 horas", "duracion": "Completar esquema segun infectologia" }
      ],
      "controles": [
        "Control con cirugia de torax en caso de sintomas respiratorios",
        "Control con cirugia digestiva para seguimiento de colostomia"
      ],
      "recomendaciones": [
        "Curacion de herida perineal con VAC segun indicacion",
        "Kinesioterapia respiratoria y motora"
      ]
    }
  }
}
```

---

## PASO 4: Backend procesa la peticion

**Ubicacion del codigo:** `backend/src/routes/epicrisisRoutes.ts`

### Controlador del Endpoint

```typescript
import { Router, Request, Response } from 'express';
import { FlowLogger, logger } from '../config/logger';
import { llmService } from '../services/llmService';
import { validatorService } from '../services/validatorService';
import { normalizerService } from '../services/normalizerService';
import { ClinicalJson, EpicrisisResponse } from '../types/clinical.types';

const router = Router();

router.post('/generate-epicrisis', async (req: Request, res: Response) => {
  // Crear logger de flujo para trazabilidad
  const flowLog = new FlowLogger('generate');
  const startTime = Date.now();

  try {
    // ========================================
    // PASO 4a: VALIDAR INPUT
    // ========================================
    const { clinicalData } = req.body;

    if (!clinicalData) {
      flowLog.logError('INPUT_VALIDATION', 'clinicalData es requerido');
      return res.status(400).json({ error: 'clinicalData es requerido' });
    }

    flowLog.logStep('INPUT_VALIDATED', {
      hasClinicalData: true,
      sectionsPresent: Object.keys(clinicalData).length
    });

    // ========================================
    // PASO 4b: NORMALIZAR DATOS
    // ========================================
    const normalizedData = normalizerService.normalize(clinicalData);

    flowLog.logStep('DATA_NORMALIZED', {
      diagnosticosIngreso: normalizedData.diagnostico_ingreso.length,
      diagnosticosEgreso: normalizedData.diagnostico_egreso.length,
      procedimientos: normalizedData.procedimientos.length,
      medicamentosHosp: normalizedData.tratamientos_intrahosp.length,
      medicamentosAlta: normalizedData.indicaciones_alta.medicamentos.length
    });

    // ========================================
    // PASO 4c: GENERAR EPICRISIS CON LLM
    // ========================================
    const generationStartTime = Date.now();
    const epicrisisText = await llmService.generateEpicrisis(normalizedData);
    const generationTime = Date.now() - generationStartTime;

    flowLog.logStep('EPICRISIS_GENERATED', {
      textLength: epicrisisText.length,
      generationTimeMs: generationTime
    });

    // ========================================
    // PASO 4d: VALIDAR TEXTO GENERADO
    // ========================================
    const validationStartTime = Date.now();
    let validation = validatorService.validateEpicrisis(epicrisisText, normalizedData);
    const validationTime = Date.now() - validationStartTime;

    flowLog.logStep('VALIDATION_COMPLETED', {
      ok: validation.ok,
      violationsCount: validation.violations.length,
      validationTimeMs: validationTime
    });

    let finalText = epicrisisText;

    // ========================================
    // PASO 4e: REGENERAR SI HAY VIOLACIONES
    // ========================================
    if (!validation.ok && validation.violations.length > 0) {
      flowLog.logStep('REGENERATING_DUE_TO_VIOLATIONS', {
        violations: validation.violations.map(v => ({
          type: v.type,
          mention: v.mention
        }))
      });

      // Regenerar con prompt de correccion
      const regenStartTime = Date.now();
      finalText = await llmService.regenerateWithCorrections(
        normalizedData,
        validation.violations
      );
      const regenTime = Date.now() - regenStartTime;

      flowLog.logStep('REGENERATION_COMPLETED', {
        newTextLength: finalText.length,
        regenerationTimeMs: regenTime
      });

      // Re-validar el texto corregido
      const revalStartTime = Date.now();
      validation = validatorService.validateEpicrisis(finalText, normalizedData);
      const revalTime = Date.now() - revalStartTime;

      flowLog.logStep('REVALIDATION_COMPLETED', {
        ok: validation.ok,
        remainingViolations: validation.violations.length,
        revalidationTimeMs: revalTime
      });
    }

    // ========================================
    // PASO 4f: CONSTRUIR Y ENVIAR RESPUESTA
    // ========================================
    const processingTimeMs = Date.now() - startTime;

    flowLog.logEnd({
      processingTimeMs,
      finalTextLength: finalText.length,
      validationPassed: validation.ok
    });

    const response: EpicrisisResponse = {
      text: finalText,
      validation: validation,
      generatedAt: new Date().toISOString(),
      processingTimeMs: processingTimeMs
    };

    res.json(response);

  } catch (error) {
    flowLog.logError('GENERATION_ERROR', error);
    logger.error('Error en generacion de epicrisis:', error);
    res.status(500).json({ error: 'Error al generar epicrisis' });
  }
});

export default router;
```

---

## PASO 4a: Normalizar datos clinicos

**Ubicacion del codigo:** `backend/src/services/normalizerService.ts`

### Servicio de Normalizacion

```typescript
import { ClinicalJson, DiagnosisItem, ProcedureItem, MedicationItem, EvolutionItem, LabItem } from '../types/clinical.types';
import { logger } from '../config/logger';

class NormalizerService {

  /**
   * Normaliza el JSON clinico completo
   */
  normalize(rawData: Partial<ClinicalJson>): ClinicalJson {
    const startTime = Date.now();

    const normalized: ClinicalJson = {
      // Limpiar string de caracteres especiales y espacios
      motivo_ingreso: this.normalizeString(rawData.motivo_ingreso || 'No consignado'),

      // Normalizar arrays de diagnosticos
      diagnostico_ingreso: this.normalizeDiagnoses(rawData.diagnostico_ingreso),
      diagnostico_egreso: this.normalizeDiagnoses(rawData.diagnostico_egreso),

      // Normalizar procedimientos (fechas a ISO)
      procedimientos: this.normalizeProcedures(rawData.procedimientos),

      // Normalizar medicamentos (vias estandarizadas)
      tratamientos_intrahosp: this.normalizeMedications(rawData.tratamientos_intrahosp),

      // Normalizar evoluciones
      evolucion: this.normalizeEvolutions(rawData.evolucion),

      // Normalizar laboratorios
      laboratorios_relevantes: this.normalizeLabs(rawData.laboratorios_relevantes),

      // Normalizar indicaciones de alta
      indicaciones_alta: {
        medicamentos: this.normalizeMedications(rawData.indicaciones_alta?.medicamentos),
        controles: this.normalizeStringArray(rawData.indicaciones_alta?.controles),
        recomendaciones: this.normalizeStringArray(rawData.indicaciones_alta?.recomendaciones)
      }
    };

    logger.info('[NORMALIZER] Datos normalizados', {
      timeMs: Date.now() - startTime,
      inputKeys: Object.keys(rawData).length,
      outputKeys: Object.keys(normalized).length
    });

    return normalized;
  }

  /**
   * Normaliza un string: trim, espacios multiples, caracteres de control
   */
  private normalizeString(value: string | undefined | null): string {
    if (!value) return '';

    return value
      .trim()
      .replace(/\s+/g, ' ')           // Espacios multiples -> uno
      .replace(/[\x00-\x1F]/g, '')    // Caracteres de control
      .replace(/\r\n/g, '\n')         // Normalizar saltos de linea
      .trim();
  }

  /**
   * Normaliza array de strings
   */
  private normalizeStringArray(arr: string[] | undefined | null): string[] {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.map(s => this.normalizeString(s)).filter(s => s.length > 0);
  }

  /**
   * Normaliza diagnosticos
   */
  private normalizeDiagnoses(diagnoses: DiagnosisItem[] | undefined | null): DiagnosisItem[] {
    if (!diagnoses || !Array.isArray(diagnoses)) return [];

    return diagnoses.map(dx => ({
      codigo: this.normalizeCIE10Code(dx.codigo),
      nombre: this.normalizeString(dx.nombre)
    })).filter(dx => dx.codigo && dx.nombre);
  }

  /**
   * Normaliza codigo CIE-10 (uppercase, solo alfanumericos y punto)
   */
  private normalizeCIE10Code(code: string | undefined | null): string {
    if (!code) return '';

    return code
      .toUpperCase()
      .replace(/[^A-Z0-9.]/g, '')  // Solo letras, numeros, punto
      .trim();
  }

  /**
   * Normaliza procedimientos
   */
  private normalizeProcedures(procedures: ProcedureItem[] | undefined | null): ProcedureItem[] {
    if (!procedures || !Array.isArray(procedures)) return [];

    return procedures.map(proc => ({
      codigo: this.normalizeString(proc.codigo),
      nombre: this.normalizeString(proc.nombre),
      fecha: this.normalizeDate(proc.fecha)
    })).filter(p => p.nombre);
  }

  /**
   * Normaliza fecha a ISO (YYYY-MM-DD)
   */
  private normalizeDate(date: string | undefined | null): string {
    if (!date) return '';

    // Intentar parsear varios formatos
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      // Si no se puede parsear, devolver como esta
      return this.normalizeString(date);
    }

    // Formato ISO sin hora
    return parsed.toISOString().split('T')[0];
  }

  /**
   * Normaliza medicamentos
   */
  private normalizeMedications(medications: MedicationItem[] | undefined | null): MedicationItem[] {
    if (!medications || !Array.isArray(medications)) return [];

    return medications.map(med => ({
      codigo: this.normalizeATCCode(med.codigo),
      nombre: this.normalizeString(med.nombre),
      dosis: this.normalizeDosis(med.dosis),
      via: this.normalizeVia(med.via),
      frecuencia: this.normalizeString(med.frecuencia),
      duracion: med.duracion ? this.normalizeString(med.duracion) : undefined
    })).filter(m => m.nombre);
  }

  /**
   * Normaliza codigo ATC (uppercase, solo alfanumericos)
   */
  private normalizeATCCode(code: string | undefined | null): string {
    if (!code) return '';

    return code
      .toUpperCase()
      .replace(/[^A-Z0-9:]/g, '')  // Preservar ATC:
      .trim();
  }

  /**
   * Normaliza dosis (unifica unidades)
   */
  private normalizeDosis(dosis: string | undefined | null): string {
    if (!dosis) return '';

    return this.normalizeString(dosis)
      .replace(/\s*mg/gi, 'mg')
      .replace(/\s*g(?!r)/gi, 'g')
      .replace(/\s*mcg/gi, 'mcg')
      .replace(/\s*ml/gi, 'ml')
      .replace(/\s*UI/gi, 'UI');
  }

  /**
   * Normaliza via de administracion (mapea a siglas estandar)
   */
  private normalizeVia(via: string | undefined | null): string {
    if (!via) return '';

    const viaMap: Record<string, string> = {
      // Via oral
      'oral': 'VO',
      'via oral': 'VO',
      'vo': 'VO',
      'por boca': 'VO',

      // Via endovenosa
      'endovenoso': 'EV',
      'endovenosa': 'EV',
      'intravenoso': 'EV',
      'intravenosa': 'EV',
      'ev': 'EV',
      'iv': 'EV',
      'i.v.': 'EV',
      'e.v.': 'EV',

      // Via intramuscular
      'intramuscular': 'IM',
      'im': 'IM',
      'i.m.': 'IM',

      // Via subcutanea
      'subcutaneo': 'SC',
      'subcutanea': 'SC',
      'sc': 'SC',
      's.c.': 'SC',

      // Otras vias
      'sublingual': 'SL',
      'sl': 'SL',
      'topico': 'TOP',
      'topica': 'TOP',
      'inhalatoria': 'INH',
      'inhalada': 'INH',
      'nasal': 'NASAL',
      'rectal': 'RECTAL',
      'oftalmica': 'OFT',
      'otica': 'OTICA'
    };

    const normalized = via.toLowerCase().trim();
    return viaMap[normalized] || via.toUpperCase();
  }

  /**
   * Normaliza evoluciones
   */
  private normalizeEvolutions(evolutions: EvolutionItem[] | undefined | null): EvolutionItem[] {
    if (!evolutions || !Array.isArray(evolutions)) return [];

    return evolutions.map(ev => ({
      fecha: this.normalizeDate(ev.fecha),
      nota: this.normalizeString(ev.nota),
      profesional: ev.profesional ? this.normalizeString(ev.profesional) : undefined
    })).filter(e => e.nota);
  }

  /**
   * Normaliza laboratorios
   */
  private normalizeLabs(labs: LabItem[] | undefined | null): LabItem[] {
    if (!labs || !Array.isArray(labs)) return [];

    return labs.map(lab => ({
      parametro: this.normalizeString(lab.parametro),
      valor: this.normalizeString(lab.valor),
      fecha: this.normalizeDate(lab.fecha)
    })).filter(l => l.parametro && l.valor);
  }
}

export const normalizerService = new NormalizerService();
```

### Ejemplo de Normalizacion

**Entrada (datos crudos de Oracle):**
```json
{
  "tratamientos_intrahosp": [
    {
      "codigo": "atc:j01dh02",
      "nombre": "  Meropenem   ",
      "dosis": "1 g",
      "via": "endovenoso",
      "frecuencia": "cada 8  horas"
    }
  ]
}
```

**Salida (datos normalizados):**
```json
{
  "tratamientos_intrahosp": [
    {
      "codigo": "ATC:J01DH02",
      "nombre": "Meropenem",
      "dosis": "1g",
      "via": "EV",
      "frecuencia": "cada 8 horas"
    }
  ]
}
```

---

## PASO 4b: Generar epicrisis con LLM

**Ubicacion del codigo:** `backend/src/services/llmService.ts`

### Servicio LLM

```typescript
import { ClinicalJson, ValidationViolation } from '../types/clinical.types';
import { logger } from '../config/logger';

class LLMService {
  private modelType: string;
  private modelPath: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.modelType = process.env.MODEL_TYPE || 'local';
    this.modelPath = process.env.LLM_MODEL_PATH || '';
    this.maxTokens = parseInt(process.env.MAX_TOKENS || '2048');
    this.temperature = parseFloat(process.env.TEMPERATURE || '0.3');
  }

  /**
   * Genera epicrisis a partir de datos clinicos
   */
  async generateEpicrisis(data: ClinicalJson): Promise<string> {
    const startTime = Date.now();

    // 1. CONSTRUIR EL PROMPT
    const prompt = this.buildEpicrisisPrompt(data);

    logger.info('[LLM_METRICS] Prompt construido', {
      promptLength: prompt.length,
      modelType: this.modelType,
      sectionsWithData: this.countSectionsWithData(data)
    });

    // 2. GENERAR TEXTO
    let generatedText: string;

    if (this.modelType === 'local') {
      // Modo desarrollo: generacion determinista sin LLM real
      generatedText = this.generateDeterministicEpicrisis(data);
    } else if (this.modelType === 'openai') {
      generatedText = await this.callOpenAI(prompt);
    } else if (this.modelType === 'anthropic') {
      generatedText = await this.callAnthropic(prompt);
    } else {
      generatedText = this.generateDeterministicEpicrisis(data);
    }

    // 3. MEDIR METRICAS
    const generationTime = Date.now() - startTime;
    const tokensEstimate = Math.ceil(generatedText.length / 4);

    logger.info('[LLM_METRICS] Generacion completada', {
      time_ms: generationTime,
      output_length: generatedText.length,
      tokens_estimate: tokensEstimate,
      tokens_per_second: (tokensEstimate / (generationTime / 1000)).toFixed(2)
    });

    return generatedText;
  }

  /**
   * Construye el prompt principal para generacion de epicrisis
   */
  private buildEpicrisisPrompt(data: ClinicalJson): string {
    return `Eres un medico especialista en medicina interna. Genera un informe de alta
hospitalaria (epicrisis) en espanol de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo parrafo corrido):
- Motivo y diagnostico de ingreso (incluye codigo CIE-10 entre parentesis)
- Procedimientos y tratamientos relevantes durante hospitalizacion (incluye codigos)
- Evolucion clinica resumida (por dias si corresponde, sin repetir)
- Diagnostico(s) de egreso (incluye codigo CIE-10 entre parentesis)
- Indicaciones post-alta: medicamentos con dosis/via/frecuencia/duracion (codigo ATC)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la informacion del JSON proporcionado
2. NO inventes ni agregues informacion que no este en el JSON
3. Incluye SIEMPRE los codigos entre parentesis para diagnosticos, procedimientos y medicamentos
4. Si falta informacion en alguna seccion, escribe "No consignado"
5. Escribe en espanol clinico de Chile
6. Formato: UN SOLO PARRAFO continuo, sin bullets ni saltos de linea

JSON CLINICO:
${JSON.stringify(data, null, 2)}`;
  }

  /**
   * Generacion determinista para modo desarrollo (sin LLM real)
   * Construye el texto directamente desde los datos
   */
  private generateDeterministicEpicrisis(data: ClinicalJson): string {
    const parts: string[] = [];

    // 1. MOTIVO DE INGRESO
    if (data.motivo_ingreso) {
      parts.push(`Paciente ingresa por ${data.motivo_ingreso.toLowerCase()}`);
    } else {
      parts.push('Paciente ingresa por motivo no consignado');
    }

    // 2. DIAGNOSTICOS DE INGRESO
    if (data.diagnostico_ingreso && data.diagnostico_ingreso.length > 0) {
      const dxIngreso = data.diagnostico_ingreso
        .map(dx => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      parts.push(`con diagnostico de ingreso de ${dxIngreso}`);
    }

    // 3. PROCEDIMIENTOS
    if (data.procedimientos && data.procedimientos.length > 0) {
      const procs = data.procedimientos
        .map(p => `${p.nombre} (${p.codigo}) el ${this.formatDate(p.fecha)}`)
        .join(', ');
      parts.push(`Durante la hospitalizacion se realizaron: ${procs}`);
    }

    // 4. TRATAMIENTOS INTRAHOSPITALARIOS
    if (data.tratamientos_intrahosp && data.tratamientos_intrahosp.length > 0) {
      const meds = data.tratamientos_intrahosp
        .map(m => `${m.nombre} ${m.dosis} ${m.via} ${m.frecuencia}`)
        .join(', ');
      parts.push(`Recibio tratamiento con ${meds}`);
    }

    // 5. EVOLUCION RESUMIDA
    if (data.evolucion && data.evolucion.length > 0) {
      // Tomar primera y ultima evolucion
      const primera = data.evolucion[0];
      const ultima = data.evolucion[data.evolucion.length - 1];

      if (data.evolucion.length === 1) {
        parts.push(`Evolucion: ${this.truncateText(primera.nota, 200)}`);
      } else {
        parts.push(`Evolucion favorable desde ${this.formatDate(primera.fecha)} hasta ${this.formatDate(ultima.fecha)}`);
      }
    }

    // 6. LABORATORIOS RELEVANTES
    if (data.laboratorios_relevantes && data.laboratorios_relevantes.length > 0) {
      const labs = data.laboratorios_relevantes
        .slice(0, 3)  // Maximo 3 labs
        .map(l => `${l.parametro}: ${l.valor}`)
        .join(', ');
      parts.push(`Laboratorios relevantes: ${labs}`);
    }

    // 7. DIAGNOSTICOS DE EGRESO
    if (data.diagnostico_egreso && data.diagnostico_egreso.length > 0) {
      const dxEgreso = data.diagnostico_egreso
        .map(dx => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      parts.push(`Egresa con diagnosticos de ${dxEgreso}`);
    }

    // 8. INDICACIONES FARMACOLOGICAS AL ALTA
    if (data.indicaciones_alta?.medicamentos && data.indicaciones_alta.medicamentos.length > 0) {
      const medsAlta = data.indicaciones_alta.medicamentos
        .map(m => {
          let med = `${m.nombre} (${m.codigo}) ${m.dosis} ${m.via} ${m.frecuencia}`;
          if (m.duracion) med += ` por ${m.duracion}`;
          return med;
        })
        .join(', ');
      parts.push(`Se indica al alta: ${medsAlta}`);
    }

    // 9. CONTROLES
    if (data.indicaciones_alta?.controles && data.indicaciones_alta.controles.length > 0) {
      const controles = data.indicaciones_alta.controles.join(', ');
      parts.push(`Controles: ${controles}`);
    }

    // 10. RECOMENDACIONES
    if (data.indicaciones_alta?.recomendaciones && data.indicaciones_alta.recomendaciones.length > 0) {
      const recom = data.indicaciones_alta.recomendaciones.slice(0, 3).join(', ');
      parts.push(`Indicaciones generales: ${recom}`);
    }

    // Unir todo en un parrafo
    return parts.join('. ') + '.';
  }

  /**
   * Formatea fecha para texto narrativo
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return 'fecha no consignada';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-CL', options);
  }

  /**
   * Trunca texto largo
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Cuenta secciones con datos
   */
  private countSectionsWithData(data: ClinicalJson): number {
    let count = 0;
    if (data.motivo_ingreso) count++;
    if (data.diagnostico_ingreso?.length) count++;
    if (data.diagnostico_egreso?.length) count++;
    if (data.procedimientos?.length) count++;
    if (data.tratamientos_intrahosp?.length) count++;
    if (data.evolucion?.length) count++;
    if (data.laboratorios_relevantes?.length) count++;
    if (data.indicaciones_alta?.medicamentos?.length) count++;
    return count;
  }
}

export const llmService = new LLMService();
```

### Ejemplo de Texto Generado

```
Paciente ingresa por post operatorio cirugia de Miles por cancer de recto, con
diagnostico de ingreso de Tumor maligno del recto (C20), Cirrosis hepatica, otra
y la no especificada (K74.6), Derrame pleural no clasificado en otra parte (J90).
Durante la hospitalizacion se realizaron: Cirugia de Miles (reseccion abdominoperineal)
(48.52) el 15 de diciembre de 2025, Pleurostomia 24 FR (34.04) el 16 de diciembre de
2025, TAC de torax (87.41) el 17 de diciembre de 2025. Recibio tratamiento con
Piperacilina/Tazobactam 4.5g EV cada 8 horas, Meropenem 1g EV cada 8 horas. Evolucion
favorable desde 16 de diciembre de 2025 hasta 26 de diciembre de 2025. Laboratorios
relevantes: Hemoglobina: 7.8 g/dL, PCR: 8.79 mg/dL. Egresa con diagnosticos de Tumor
maligno del recto - Post operatorio cirugia de Miles (C20), Derrame pleural bilateral
resuelto (J90), Enfermedad hepatica cronica con hipertension portal (K74.6). Se indica
al alta: Meropenem (ATC:J01DH02) 1g EV cada 8 horas por Completar esquema segun
infectologia. Controles: Control con cirugia de torax en caso de sintomas respiratorios,
Control con cirugia digestiva para seguimiento de colostomia. Indicaciones generales:
Curacion de herida perineal con VAC segun indicacion, Kinesioterapia respiratoria y motora.
```

---

## PASO 4c: Validar texto generado

**Ubicacion del codigo:** `backend/src/services/validatorService.ts`

### Servicio de Validacion

```typescript
import { ClinicalJson, ValidationResult, ValidationViolation } from '../types/clinical.types';
import { getSynonyms, areSynonyms } from '../utils/synonyms';
import { logger } from '../config/logger';

class ValidatorService {

  // ========================================
  // TRIGGERS MEDICOS
  // Palabras que indican contenido medico
  // ========================================
  private readonly medicalTriggers = [
    // Dosis y frecuencias
    'mg', 'mcg', 'g', 'ml', 'ev', 'vo', 'im', 'sc', 'cada', 'hrs', 'horas', 'dias',
    // Terminos diagnosticos
    'diagnostico', 'neumonia', 'insuficiencia', 'fractura', 'sepsis', 'infeccion',
    'diabetes', 'hipertension', 'cardiopatia', 'nefropatia', 'hepatopatia',
    // Terminos de procedimientos
    'cirugia', 'procedimiento', 'tac', 'rx', 'ecg', 'endoscopia', 'biopsia',
    // Terminos de tratamiento
    'antibiotico', 'analgesia', 'tratamiento', 'terapia'
  ];

  // ========================================
  // FRASES COMUNES NO MEDICAS
  // Estas NO deben marcarse como violaciones
  // ========================================
  private readonly commonPhrases = [
    'dias de', 'horas de', 'cada dia', 'de evolucion',
    'con diagnostico', 'con tratamiento', 'tratamiento antibiotico',
    'durante la', 'se realizo', 'se indica', 'al alta',
    'ingresa por', 'egresa con', 'paciente de'
  ];

  // ========================================
  // TERMINOS CLINICOS GENERICOS
  // Sintomas/hallazgos comunes que NO son dx especificos
  // ========================================
  private readonly commonClinicalTerms = [
    // Hallazgos fisicos
    'ascitis', 'ictericia', 'edema', 'derrame', 'disnea',
    'taquicardia', 'bradicardia', 'hipotension', 'hipertension', 'fiebre',
    'dolor', 'nauseas', 'vomitos', 'diarrea', 'constipacion',
    // Estados clinicos
    'estable', 'favorable', 'afebril', 'eupneico', 'vigil',
    // Procedimientos menores
    'curacion', 'control', 'seguimiento'
  ];

  /**
   * Valida texto de epicrisis contra datos clinicos
   * Retorna violaciones si menciona cosas no presentes en los datos
   */
  validateEpicrisis(text: string, data: ClinicalJson): ValidationResult {
    const startTime = Date.now();
    const violations: ValidationViolation[] = [];

    // 1. NORMALIZAR TEXTO (lowercase, sin acentos, sin puntuacion)
    const textNorm = this.normalizeText(text);

    logger.info('[VALIDATOR] Iniciando validacion', {
      textLength: text.length,
      normalizedLength: textNorm.length
    });

    // 2. CREAR WHITELISTS DESDE DATOS CLINICOS
    const dxWhitelist = this.buildDiagnosisWhitelist(data);
    const procWhitelist = this.buildProcedureWhitelist(data);
    const medWhitelist = this.buildMedicationWhitelist(data);

    logger.info('[VALIDATOR] Whitelists creadas', {
      diagnosticos: dxWhitelist.size,
      procedimientos: procWhitelist.size,
      medicamentos: medWhitelist.size
    });

    // 3. EXTRAER N-GRAMAS DEL TEXTO (combinaciones de 2-6 palabras)
    const ngrams = this.extractNgrams(textNorm, 2, 6);

    logger.info('[VALIDATOR] N-gramas extraidos', {
      total: ngrams.length,
      sample: ngrams.slice(0, 5)
    });

    // 4. VALIDAR CADA N-GRAMA
    for (const gram of ngrams) {
      // Solo validar si parece contenido medico
      if (!this.hasMedicalTrigger(gram)) continue;

      // Ignorar frases comunes no medicas
      if (this.isCommonPhrase(gram)) continue;

      // Ignorar sintomas/hallazgos genericos
      if (this.isCommonClinicalTerm(gram)) continue;

      // Solo validar n-gramas largos (>= 3 palabras) o con codigos
      if (gram.split(' ').length < 3 && !this.hasCode(gram)) continue;

      // VERIFICAR DIAGNOSTICOS
      if (this.looksLikeDiagnosis(gram)) {
        if (!this.isInWhitelist(gram, dxWhitelist)) {
          violations.push({
            type: 'dx',
            mention: gram,
            reason: 'Diagnostico mencionado no presente en datos del paciente'
          });
        }
      }

      // VERIFICAR PROCEDIMIENTOS
      if (this.looksLikeProcedure(gram)) {
        if (!this.isInWhitelist(gram, procWhitelist)) {
          violations.push({
            type: 'proc',
            mention: gram,
            reason: 'Procedimiento mencionado no presente en datos del paciente'
          });
        }
      }

      // VERIFICAR MEDICAMENTOS
      if (this.looksLikeMedication(gram)) {
        if (!this.isInWhitelist(gram, medWhitelist)) {
          violations.push({
            type: 'med',
            mention: gram,
            reason: 'Medicamento mencionado no presente en datos del paciente'
          });
        }
      }
    }

    // 5. DEDUPLICAR VIOLACIONES
    const uniqueViolations = this.deduplicateViolations(violations);

    const validationTime = Date.now() - startTime;
    logger.info('[VALIDATOR] Validacion completada', {
      timeMs: validationTime,
      totalViolations: violations.length,
      uniqueViolations: uniqueViolations.length,
      passed: uniqueViolations.length === 0
    });

    // 6. RETORNAR RESULTADO
    return {
      ok: uniqueViolations.length === 0,
      violations: uniqueViolations
    };
  }

  // ========================================
  // CONSTRUCCION DE WHITELISTS
  // ========================================

  private buildDiagnosisWhitelist(data: ClinicalJson): Set<string> {
    const whitelist = new Set<string>();

    const allDiagnoses = [
      ...(data.diagnostico_ingreso || []),
      ...(data.diagnostico_egreso || [])
    ];

    for (const dx of allDiagnoses) {
      // Agregar nombre completo normalizado
      whitelist.add(this.normalizeText(dx.nombre));

      // Agregar codigo
      if (dx.codigo) {
        whitelist.add(dx.codigo.toLowerCase());
      }

      // Agregar palabras individuales del nombre (>= 4 caracteres)
      const words = dx.nombre.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length >= 4) {
          whitelist.add(word);
          // Agregar sinonimos
          const synonyms = getSynonyms(word);
          synonyms.forEach(syn => whitelist.add(syn));
        }
      }
    }

    return whitelist;
  }

  private buildProcedureWhitelist(data: ClinicalJson): Set<string> {
    const whitelist = new Set<string>();

    for (const proc of data.procedimientos || []) {
      whitelist.add(this.normalizeText(proc.nombre));
      if (proc.codigo) {
        whitelist.add(proc.codigo.toLowerCase());
      }

      // Palabras clave del procedimiento
      const words = proc.nombre.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length >= 4) {
          whitelist.add(word);
          const synonyms = getSynonyms(word);
          synonyms.forEach(syn => whitelist.add(syn));
        }
      }
    }

    return whitelist;
  }

  private buildMedicationWhitelist(data: ClinicalJson): Set<string> {
    const whitelist = new Set<string>();

    const allMeds = [
      ...(data.tratamientos_intrahosp || []),
      ...(data.indicaciones_alta?.medicamentos || [])
    ];

    for (const med of allMeds) {
      whitelist.add(this.normalizeText(med.nombre));
      if (med.codigo) {
        whitelist.add(med.codigo.toLowerCase().replace('atc:', ''));
      }

      // Nombre generico y comercial
      const words = med.nombre.toLowerCase().split(/[\s\/]+/);
      for (const word of words) {
        if (word.length >= 4) {
          whitelist.add(word);
        }
      }
    }

    return whitelist;
  }

  // ========================================
  // EXTRACCION DE N-GRAMAS
  // ========================================

  private extractNgrams(text: string, minN: number, maxN: number): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const ngrams: string[] = [];

    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const gram = words.slice(i, i + n).join(' ');
        ngrams.push(gram);
      }
    }

    return ngrams;
  }

  // ========================================
  // FUNCIONES DE DETECCION
  // ========================================

  private hasMedicalTrigger(gram: string): boolean {
    return this.medicalTriggers.some(trigger => gram.includes(trigger));
  }

  private isCommonPhrase(gram: string): boolean {
    return this.commonPhrases.some(phrase => gram.includes(phrase));
  }

  private isCommonClinicalTerm(gram: string): boolean {
    return this.commonClinicalTerms.some(term => gram.includes(term));
  }

  private hasCode(gram: string): boolean {
    // Detecta codigos CIE-10 (ej: C20, K74.6) o ATC (ej: J01DH02)
    return /[A-Z]\d{2}/.test(gram.toUpperCase()) ||
           /atc:/i.test(gram);
  }

  private looksLikeDiagnosis(gram: string): boolean {
    const dxSuffixes = ['itis', 'osis', 'emia', 'patia', 'oma', 'ectasia'];
    const dxKeywords = ['sindrome', 'enfermedad', 'trastorno', 'insuficiencia', 'infeccion'];

    return dxSuffixes.some(s => gram.includes(s)) ||
           dxKeywords.some(k => gram.includes(k)) ||
           /[A-Z]\d{2}(\.\d)?/.test(gram.toUpperCase());  // Codigo CIE-10
  }

  private looksLikeProcedure(gram: string): boolean {
    const procKeywords = ['cirugia', 'reseccion', 'biopsia', 'endoscopia', 'artroscopia',
                          'colecistectomia', 'apendicectomia', 'toracotomia', 'laparotomia',
                          'tac', 'ecografia', 'radiografia', 'resonancia'];

    return procKeywords.some(k => gram.includes(k));
  }

  private looksLikeMedication(gram: string): boolean {
    const medSuffixes = ['cilina', 'micina', 'vastatin', 'prazol', 'sartan', 'prilo'];
    const medKeywords = ['mg', 'mcg', 'ml', 'ev', 'vo', 'im', 'cada', 'horas'];

    return medSuffixes.some(s => gram.includes(s)) ||
           (medKeywords.some(k => gram.includes(k)) && gram.split(' ').length >= 2);
  }

  // ========================================
  // VERIFICACION EN WHITELIST
  // ========================================

  private isInWhitelist(mention: string, whitelist: Set<string>): boolean {
    // Busqueda directa
    if (whitelist.has(mention)) return true;

    // Busqueda de palabras individuales
    const words = mention.split(/\s+/);
    const longWords = words.filter(w => w.length >= 4);

    if (longWords.length > 0 && longWords.every(w => whitelist.has(w))) {
      return true;
    }

    // Busqueda con sinonimos
    for (const word of longWords) {
      const synonyms = getSynonyms(word);
      if (synonyms.some(syn => whitelist.has(syn))) {
        return true;
      }
    }

    // Busqueda parcial (la mencion esta contenida en algun item del whitelist)
    for (const item of whitelist) {
      if (item.includes(mention) || mention.includes(item)) {
        return true;
      }
    }

    return false;
  }

  // ========================================
  // UTILIDADES
  // ========================================

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remover acentos
      .replace(/[^\w\s]/g, ' ')          // Puntuacion a espacios
      .replace(/\s+/g, ' ')              // Espacios multiples
      .trim();
  }

  private deduplicateViolations(violations: ValidationViolation[]): ValidationViolation[] {
    const seen = new Set<string>();
    const unique: ValidationViolation[] = [];

    for (const v of violations) {
      const key = `${v.type}:${v.mention}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(v);
      }
    }

    return unique;
  }
}

export const validatorService = new ValidatorService();
```

### Ejemplo de Resultado de Validacion

**Caso: Validacion Exitosa**
```json
{
  "ok": true,
  "violations": []
}
```

**Caso: Con Violaciones**
```json
{
  "ok": false,
  "violations": [
    {
      "type": "dx",
      "mention": "diabetes mellitus tipo 2",
      "reason": "Diagnostico mencionado no presente en datos del paciente"
    },
    {
      "type": "med",
      "mention": "aspirina 100mg vo",
      "reason": "Medicamento mencionado no presente en datos del paciente"
    },
    {
      "type": "proc",
      "mention": "colecistectomia laparoscopica",
      "reason": "Procedimiento mencionado no presente en datos del paciente"
    }
  ]
}
```

---

## PASO 4d: Regenerar si hay violaciones

**Ubicacion del codigo:** `backend/src/services/llmService.ts` (continuacion)

### Metodo de Regeneracion

```typescript
/**
 * Regenera epicrisis corrigiendo las violaciones detectadas
 */
async regenerateWithCorrections(
  data: ClinicalJson,
  violations: ValidationViolation[]
): Promise<string> {
  const startTime = Date.now();

  logger.info('[LLM] Iniciando regeneracion con correcciones', {
    violationsCount: violations.length,
    violationTypes: violations.map(v => v.type)
  });

  // 1. CONSTRUIR LISTA DE VIOLACIONES COMO TEXTO
  const violationsList = violations
    .map(v => `- ${this.getViolationTypeLabel(v.type)}: "${v.mention}" - ${v.reason}`)
    .join('\n');

  // 2. CONSTRUIR WHITELISTS COMO TEXTO LEGIBLE
  const dxList = [...(data.diagnostico_ingreso || []), ...(data.diagnostico_egreso || [])]
    .map(d => `${d.nombre} (${d.codigo})`)
    .join(', ') || 'Ninguno';

  const procList = (data.procedimientos || [])
    .map(p => `${p.nombre} (${p.codigo})`)
    .join(', ') || 'Ninguno';

  const medList = [
    ...(data.tratamientos_intrahosp || []),
    ...(data.indicaciones_alta?.medicamentos || [])
  ].map(m => `${m.nombre} (${m.codigo})`).join(', ') || 'Ninguno';

  // 3. CONSTRUIR PROMPT DE CORRECCION
  const correctionPrompt = `Tu texto anterior contiene menciones NO permitidas (posibles alucinaciones).

=============================================
VIOLACIONES DETECTADAS:
=============================================
${violationsList}

=============================================
INSTRUCCIONES DE CORRECCION:
=============================================
Debes reescribir el informe de alta en 1 solo parrafo CUMPLIENDO estas reglas:

1. DIAGNOSTICOS PERMITIDOS (solo puedes mencionar estos):
   ${dxList}

2. PROCEDIMIENTOS PERMITIDOS (solo puedes mencionar estos):
   ${procList}

3. MEDICAMENTOS PERMITIDOS (solo puedes mencionar estos):
   ${medList}

4. Si necesitas mencionar algo que NO esta en las listas anteriores,
   escribe "No consignado" en lugar de inventar.

5. Incluye SIEMPRE los codigos entre parentesis.

6. Formato: UN SOLO PARRAFO continuo, sin bullets ni saltos de linea.

=============================================
JSON CLINICO ORIGINAL:
=============================================
${JSON.stringify(data, null, 2)}

=============================================
GENERA EL TEXTO CORREGIDO:
=============================================`;

  // 4. GENERAR TEXTO CORREGIDO
  let correctedText: string;

  if (this.modelType === 'local') {
    // En modo local, regenerar deterministicamente (ya no tendra errores)
    correctedText = this.generateDeterministicEpicrisis(data);
  } else if (this.modelType === 'openai') {
    correctedText = await this.callOpenAI(correctionPrompt);
  } else if (this.modelType === 'anthropic') {
    correctedText = await this.callAnthropic(correctionPrompt);
  } else {
    correctedText = this.generateDeterministicEpicrisis(data);
  }

  const regenerationTime = Date.now() - startTime;

  logger.info('[LLM] Regeneracion completada', {
    timeMs: regenerationTime,
    newTextLength: correctedText.length,
    originalViolations: violations.length
  });

  return correctedText;
}

/**
 * Obtiene etiqueta legible para tipo de violacion
 */
private getViolationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'dx': 'DIAGNOSTICO',
    'proc': 'PROCEDIMIENTO',
    'med': 'MEDICAMENTO'
  };
  return labels[type] || type.toUpperCase();
}
```

### Ejemplo de Prompt de Correccion

```
Tu texto anterior contiene menciones NO permitidas (posibles alucinaciones).

=============================================
VIOLACIONES DETECTADAS:
=============================================
- DIAGNOSTICO: "diabetes mellitus tipo 2" - Diagnostico mencionado no presente en datos del paciente
- MEDICAMENTO: "aspirina 100mg vo" - Medicamento mencionado no presente en datos del paciente

=============================================
INSTRUCCIONES DE CORRECCION:
=============================================
Debes reescribir el informe de alta en 1 solo parrafo CUMPLIENDO estas reglas:

1. DIAGNOSTICOS PERMITIDOS (solo puedes mencionar estos):
   Tumor maligno del recto (C20), Cirrosis hepatica (K74.6), Derrame pleural (J90)

2. PROCEDIMIENTOS PERMITIDOS (solo puedes mencionar estos):
   Cirugia de Miles (48.52), Pleurostomia 24 FR (34.04), TAC de torax (87.41)

3. MEDICAMENTOS PERMITIDOS (solo puedes mencionar estos):
   Meropenem (ATC:J01DH02), Piperacilina/Tazobactam (ATC:J01CR05)

4. Si necesitas mencionar algo que NO esta en las listas anteriores,
   escribe "No consignado" en lugar de inventar.

5. Incluye SIEMPRE los codigos entre parentesis.

6. Formato: UN SOLO PARRAFO continuo, sin bullets ni saltos de linea.

=============================================
JSON CLINICO ORIGINAL:
=============================================
{ ... JSON completo ... }

=============================================
GENERA EL TEXTO CORREGIDO:
=============================================
```

---

## PASO 4e: Retornar respuesta

### Estructura de la Respuesta HTTP

```typescript
// Interfaz de respuesta
interface EpicrisisResponse {
  text: string;              // Texto de epicrisis (posiblemente corregido)
  validation: {
    ok: boolean;             // true si paso validacion
    violations: Array<{      // Lista de violaciones (vacia si ok=true)
      type: 'dx' | 'proc' | 'med';
      mention: string;
      reason: string;
    }>;
  };
  generatedAt: string;       // Timestamp ISO
  processingTimeMs: number;  // Tiempo total de procesamiento
}

// Ejemplo de respuesta exitosa
{
  "text": "Paciente ingresa por post operatorio cirugia de Miles por cancer de recto, con diagnostico de ingreso de Tumor maligno del recto (C20), Cirrosis hepatica, otra y la no especificada (K74.6), Derrame pleural no clasificado en otra parte (J90). Durante la hospitalizacion se realizaron: Cirugia de Miles (reseccion abdominoperineal) (48.52) el 15 de diciembre de 2025, Pleurostomia 24 FR (34.04) el 16 de diciembre de 2025. Recibio tratamiento con Piperacilina/Tazobactam 4.5g EV cada 8 horas, Meropenem 1g EV cada 8 horas. Evolucion favorable. Egresa con diagnosticos de Tumor maligno del recto - Post operatorio cirugia de Miles (C20), Derrame pleural bilateral resuelto (J90), Enfermedad hepatica cronica con hipertension portal (K74.6). Se indica al alta: Meropenem (ATC:J01DH02) 1g EV cada 8 horas por Completar esquema segun infectologia. Controles: Control con cirugia de torax en caso de sintomas respiratorios, Control con cirugia digestiva para seguimiento de colostomia.",
  "validation": {
    "ok": true,
    "violations": []
  },
  "generatedAt": "2025-12-26T10:30:45.123Z",
  "processingTimeMs": 287
}
```

---

## PASO 5: Frontend actualiza signals

**Ubicacion del codigo:** `frontend/src/app/core/services/epicrisis.service.ts`

### Actualizacion de Estado

```typescript
return this.api.post<EpicrisisResponse>('/generate-epicrisis', {
  clinicalData: data
}).pipe(
  tap((response) => {
    // ========================================
    // ACTUALIZAR SIGNAL DE TEXTO
    // ========================================
    // Esto dispara re-render en EpicrisisGeneratorComponent
    this.epicrisisText.set(response.text);

    // ========================================
    // ACTUALIZAR SIGNAL DE VALIDACION
    // ========================================
    // Esto dispara re-render en ValidationPanelComponent
    this.validationResult.set(response.validation);

    // Los componentes que leen estos signals se actualizan automaticamente
    // gracias a Angular's change detection con Signals
  }),
  finalize(() => {
    // ========================================
    // DESACTIVAR LOADING
    // ========================================
    // Esto oculta el spinner en todos los componentes
    this.isLoading.set(false);
  })
);
```

### Diagrama de Actualizacion de Estado

```
ANTES DE LA RESPUESTA:
+------------------------------------------+
| EpicrisisService (Signals)               |
+------------------------------------------+
| clinicalData:     { ...datos... }        |
| epicrisisText:    ''           <-- vacio |
| validationResult: null         <-- null  |
| isLoading:        true         <-- carga |
| errorMessage:     ''                     |
+------------------------------------------+

DESPUES DE response.tap():
+------------------------------------------+
| EpicrisisService (Signals)               |
+------------------------------------------+
| clinicalData:     { ...datos... }        |
| epicrisisText:    'Paciente...' <-- NUEVO|
| validationResult: { ok: true }  <-- NUEVO|
| isLoading:        true                   |
| errorMessage:     ''                     |
+------------------------------------------+

DESPUES DE finalize():
+------------------------------------------+
| EpicrisisService (Signals)               |
+------------------------------------------+
| clinicalData:     { ...datos... }        |
| epicrisisText:    'Paciente...'          |
| validationResult: { ok: true }           |
| isLoading:        false        <-- LISTO |
| errorMessage:     ''                     |
+------------------------------------------+

COMPONENTES REACTIVOS:
  EpicrisisGeneratorComponent --> lee epicrisisText() --> muestra texto
  ValidationPanelComponent    --> lee validationResult() --> muestra estado
  Todos                       --> leen isLoading() --> ocultan spinner
```

---

## PASO 6: EpicrisisGeneratorComponent muestra texto

**Ubicacion del codigo:** `frontend/src/app/features/epicrisis-generator/epicrisis-generator.component.ts`

### Template del Componente

```typescript
@Component({
  selector: 'app-epicrisis-generator',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatProgressSpinnerModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatTooltipModule
  ],
  template: `
    <mat-card class="generator-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>auto_awesome</mat-icon>
        <mat-card-title>Epicrisis Generada</mat-card-title>
        <mat-card-subtitle>Informe de alta hospitalaria automatico</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- CASO 1: Hay datos clinicos cargados -->
        @if (hasData()) {

          <!-- CASO 1.1: Aun no hay epicrisis generada -->
          @if (!hasEpicrisis()) {
            <div class="empty-state">
              <mat-icon>article</mat-icon>
              <p>Presione el boton para generar la epicrisis automaticamente</p>
            </div>
          }

          <!-- CASO 1.2: Ya hay epicrisis generada -->
          @else {
            <div class="epicrisis-container">

              <!-- MODO EDICION -->
              @if (isEditing()) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Editar Epicrisis</mat-label>
                  <textarea
                    matInput
                    [value]="epicrisisText()"
                    (input)="onTextChange($event)"
                    rows="12"
                    placeholder="Edite el texto de la epicrisis..."
                  ></textarea>
                  <mat-hint>Puede editar el texto manualmente. La validacion se actualizara.</mat-hint>
                </mat-form-field>
              }

              <!-- MODO VISUALIZACION -->
              @else {
                <div class="epicrisis-text">
                  {{ epicrisisText() }}
                </div>
              }

            </div>
          }

        }

        <!-- CASO 2: No hay datos cargados -->
        @else {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <p>Busque un episodio para comenzar</p>
          </div>
        }
      </mat-card-content>

      <!-- BOTONES DE ACCION -->
      <mat-card-actions>
        @if (hasData()) {
          <!-- Boton Generar -->
          <button
            mat-raised-button
            color="primary"
            (click)="generate()"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
              <span>Generando...</span>
            } @else {
              <mat-icon>auto_awesome</mat-icon>
              <span>Generar Epicrisis</span>
            }
          </button>

          <!-- Botones adicionales (solo si hay epicrisis) -->
          @if (hasEpicrisis()) {
            <button mat-stroked-button (click)="regenerate()" [disabled]="isLoading()">
              <mat-icon>refresh</mat-icon>
              <span>Regenerar</span>
            </button>

            <button mat-stroked-button (click)="toggleEdit()">
              <mat-icon>{{ isEditing() ? 'done' : 'edit' }}</mat-icon>
              <span>{{ isEditing() ? 'Terminar Edicion' : 'Editar' }}</span>
            </button>

            <button mat-stroked-button (click)="validate()" [disabled]="isLoading()">
              <mat-icon>fact_check</mat-icon>
              <span>Validar</span>
            </button>
          }
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .generator-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    mat-card-content {
      flex: 1;
      overflow: hidden;
    }

    .epicrisis-text {
      padding: 20px;
      background-color: #fafafa;
      border-radius: 8px;
      line-height: 1.8;
      font-size: 14px;
      min-height: 250px;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid #e0e0e0;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #757575;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
      flex-wrap: wrap;
    }

    mat-card-actions button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class EpicrisisGeneratorComponent {
  private epicrisisService = inject(EpicrisisService);

  // Signals del servicio (reactive)
  clinicalData = this.epicrisisService.clinicalData;
  epicrisisText = this.epicrisisService.epicrisisText;
  isLoading = this.epicrisisService.isLoading;
  hasData = this.epicrisisService.hasData;
  hasEpicrisis = this.epicrisisService.hasEpicrisis;

  // Signal local para modo edicion
  isEditing = signal<boolean>(false);

  generate(): void {
    this.epicrisisService.generateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al generar epicrisis');
      }
    });
  }

  regenerate(): void {
    this.epicrisisService.regenerateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al regenerar epicrisis');
      }
    });
  }

  validate(): void {
    this.epicrisisService.validateEpicrisis().subscribe({
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al validar epicrisis');
      }
    });
  }

  toggleEdit(): void {
    this.isEditing.update(value => !value);
  }

  onTextChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.epicrisisService.updateEpicrisisText(target.value);
  }
}
```

---

## PASO 7: ValidationPanelComponent muestra resultado

**Ubicacion del codigo:** `frontend/src/app/features/validation-panel/validation-panel.component.ts`

### Template del Componente

```typescript
@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatListModule, MatDividerModule
  ],
  template: `
    <mat-card class="validation-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>fact_check</mat-icon>
        <mat-card-title>Validacion Clinica</mat-card-title>
        <mat-card-subtitle>Verificacion de datos y deteccion de alucinaciones</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Hay resultado de validacion -->
        @if (validationResult(); as validation) {
          <div class="validation-status">

            <!-- CASO EXITO: Validacion pasada -->
            @if (validation.ok) {
              <div class="status-badge success">
                <mat-icon>check_circle</mat-icon>
                <span>Validacion exitosa</span>
              </div>
              <p class="status-message">
                El texto de la epicrisis cumple con todos los criterios de validacion.
                Todos los diagnosticos, procedimientos y medicamentos mencionados
                corresponden a los datos clinicos del paciente.
              </p>
            }

            <!-- CASO ERROR: Hay violaciones -->
            @else {
              <div class="status-badge error">
                <mat-icon>error</mat-icon>
                <span>{{ validation.violations.length }} violacion(es) detectada(s)</span>
              </div>
              <p class="status-message">
                Se detectaron menciones que no corresponden a los datos clinicos registrados.
                Se recomienda regenerar la epicrisis o corregir manualmente.
              </p>
            }
          </div>

          <!-- Lista de violaciones (si las hay) -->
          @if (!validation.ok && validation.violations.length > 0) {
            <mat-divider></mat-divider>

            <div class="violations-section">
              <h4>Violaciones Detectadas</h4>
              <mat-list>
                @for (violation of validation.violations; track violation.mention) {
                  <mat-list-item class="violation-item">
                    <mat-icon matListItemIcon color="warn">warning</mat-icon>
                    <div matListItemTitle class="violation-title">
                      <span class="violation-type">{{ getViolationType(violation.type) }}:</span>
                      <code class="violation-mention">{{ violation.mention }}</code>
                    </div>
                    <div matListItemLine class="violation-reason">
                      {{ violation.reason }}
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            </div>
          }

          <!-- Warnings adicionales (si los hay) -->
          @if (validation.warnings && validation.warnings.length > 0) {
            <mat-divider></mat-divider>

            <div class="warnings-section">
              <h4>Advertencias</h4>
              <mat-list>
                @for (warning of validation.warnings; track warning) {
                  <mat-list-item class="warning-item">
                    <mat-icon matListItemIcon color="accent">info</mat-icon>
                    <div matListItemTitle>{{ warning }}</div>
                  </mat-list-item>
                }
              </mat-list>
            </div>
          }

        }

        <!-- No hay resultado de validacion aun -->
        @else {
          <div class="empty-state">
            <mat-icon>rule</mat-icon>
            <p>La validacion se ejecutara automaticamente al generar la epicrisis</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .validation-card {
      margin-bottom: 24px;
    }

    .validation-status {
      padding: 16px 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
      font-size: 14px;
    }

    .status-badge.success {
      background-color: #4caf50;
      color: white;
    }

    .status-badge.error {
      background-color: #f44336;
      color: white;
    }

    .status-message {
      margin-top: 12px;
      color: #666;
      line-height: 1.5;
    }

    .violations-section h4 {
      color: #f44336;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
    }

    .violation-item {
      border-left: 4px solid #f44336;
      background-color: rgba(244, 67, 54, 0.05);
      margin-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }

    .violation-type {
      font-weight: 500;
      color: #f44336;
    }

    .violation-mention {
      font-family: 'Consolas', 'Monaco', monospace;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 8px;
    }

    .violation-reason {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #757575;
    }
  `]
})
export class ValidationPanelComponent {
  private epicrisisService = inject(EpicrisisService);

  // Signal de validacion del servicio
  validationResult = this.epicrisisService.validationResult;

  /**
   * Convierte tipo de violacion a etiqueta legible
   */
  getViolationType(type: string): string {
    const types: Record<string, string> = {
      'dx': 'Diagnostico',
      'proc': 'Procedimiento',
      'med': 'Medicamento'
    };
    return types[type] || type;
  }
}
```

---

## DIAGRAMA DE SECUENCIA COMPLETO

```
┌─────────┐     ┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│ Usuario │     │ Frontend (Angular)  │     │ Backend (Express) │     │ LLM/Validator   │
└────┬────┘     └──────────┬──────────┘     └─────────┬─────────┘     └────────┬────────┘
     │                     │                          │                        │
     │ [Click "Generar"]   │                          │                        │
     │────────────────────>│                          │                        │
     │                     │                          │                        │
     │                     │ generate()               │                        │
     │                     │ isLoading.set(true)      │                        │
     │                     │                          │                        │
     │                     │ POST /api/generate-epicrisis                      │
     │                     │ { clinicalData }         │                        │
     │                     │─────────────────────────>│                        │
     │                     │                          │                        │
     │                     │                          │ normalize(data)        │
     │                     │                          │───────────────────────>│
     │                     │                          │<──────────────────────-│
     │                     │                          │                        │
     │                     │                          │ generateEpicrisis()    │
     │                     │                          │───────────────────────>│
     │                     │                          │   buildPrompt()        │
     │                     │                          │   callLLM()            │
     │                     │                          │<───texto generado──────│
     │                     │                          │                        │
     │                     │                          │ validateEpicrisis()    │
     │                     │                          │───────────────────────>│
     │                     │                          │   buildWhitelists()    │
     │                     │                          │   extractNgrams()      │
     │                     │                          │   checkViolations()    │
     │                     │                          │<──{ ok, violations }───│
     │                     │                          │                        │
     │                     │                          │ [Si violations > 0]    │
     │                     │                          │                        │
     │                     │                          │ regenerateWithCorrections()
     │                     │                          │───────────────────────>│
     │                     │                          │   buildCorrectionPrompt()
     │                     │                          │   callLLM()            │
     │                     │                          │<───texto corregido─────│
     │                     │                          │                        │
     │                     │                          │ validateEpicrisis()    │
     │                     │                          │───────────────────────>│
     │                     │                          │<──{ ok: true }─────────│
     │                     │                          │                        │
     │                     │<─────────────────────────│                        │
     │                     │ { text, validation,      │                        │
     │                     │   generatedAt,           │                        │
     │                     │   processingTimeMs }     │                        │
     │                     │                          │                        │
     │                     │ epicrisisText.set(text)  │                        │
     │                     │ validationResult.set()   │                        │
     │                     │ isLoading.set(false)     │                        │
     │                     │                          │                        │
     │<────────────────────│                          │                        │
     │ [UI actualizada]    │                          │                        │
     │ Texto visible       │                          │                        │
     │ Validacion OK       │                          │                        │
     │                     │                          │                        │
```

---

## METRICAS DE RENDIMIENTO

### Tiempos Tipicos por Etapa

| Etapa | Tiempo Tipico | Descripcion |
|-------|---------------|-------------|
| Normalizacion de datos | 2-5 ms | Limpieza y estandarizacion |
| Generacion LLM (local) | 100-300 ms | Generacion determinista |
| Generacion LLM (OpenAI) | 1-3 s | Llamada API externa |
| Generacion LLM (Anthropic) | 1-3 s | Llamada API externa |
| Validacion whitelist | 5-15 ms | Extraccion n-gramas y verificacion |
| Regeneracion (si aplica) | 100-300 ms | Segunda pasada con correcciones |
| Revalidacion | 5-15 ms | Verificacion del texto corregido |

### Tiempos Totales

| Escenario | Tiempo Total |
|-----------|--------------|
| **Sin regeneracion (local)** | ~150 ms |
| **Con regeneracion (local)** | ~350 ms |
| **Sin regeneracion (OpenAI)** | ~1.5 s |
| **Con regeneracion (OpenAI)** | ~3.5 s |

### Metricas de Logging (FlowLogger)

```
2025-12-26 10:30:45.123 [generate-a1b2c3d4] [FLOW_START] { sessionId: 'generate-a1b2c3d4' }
2025-12-26 10:30:45.125 [generate-a1b2c3d4] [INPUT_VALIDATED] { elapsed: '2ms', hasClinicalData: true }
2025-12-26 10:30:45.128 [generate-a1b2c3d4] [DATA_NORMALIZED] { elapsed: '5ms', sectionsNormalized: 8 }
2025-12-26 10:30:45.230 [generate-a1b2c3d4] [EPICRISIS_GENERATED] { elapsed: '107ms', textLength: 1523 }
2025-12-26 10:30:45.238 [generate-a1b2c3d4] [VALIDATION_COMPLETED] { elapsed: '115ms', ok: true, violations: 0 }
2025-12-26 10:30:45.240 [generate-a1b2c3d4] [FLOW_END] { totalTime: '117ms', finalTextLength: 1523 }
```

---

## RESUMEN

El flujo de generacion de epicrisis es un proceso de 7 pasos que:

1. **Inicia** con el clic del usuario en "Generar Epicrisis"
2. **Prepara** la peticion en el frontend con los datos clinicos
3. **Envia** los datos al backend via HTTP POST
4. **Procesa** en el backend:
   - Normaliza datos para consistencia
   - Genera texto con LLM usando prompt estructurado
   - Valida contra whitelists para detectar alucinaciones
   - Regenera automaticamente si hay violaciones
5. **Actualiza** el estado reactivo en el frontend via Signals
6. **Muestra** el texto generado en el componente de epicrisis
7. **Muestra** el resultado de validacion en el panel de validacion

Este flujo garantiza que:
- Solo se mencionen datos reales del paciente (validacion por whitelist)
- Las alucinaciones se detecten y corrijan automaticamente
- El usuario vea feedback claro sobre la validacion
- Todo el procesamiento sea local (privacidad de datos)
- La experiencia sea rapida (~150-350ms en modo local)
