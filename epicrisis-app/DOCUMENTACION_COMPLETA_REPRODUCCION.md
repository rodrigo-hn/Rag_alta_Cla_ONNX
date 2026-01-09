# DOCUMENTACION COMPLETA: Sistema de Epicrisis Automatica
## Especificacion Tecnica para Reproduccion Total

---

# INDICE

1. [Vision General del Sistema](#1-vision-general-del-sistema)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnologico Detallado](#3-stack-tecnologico-detallado)
4. [Estructura de Directorios](#4-estructura-de-directorios)
5. [Backend - Especificacion Completa](#5-backend---especificacion-completa)
6. [Frontend - Especificacion Completa](#6-frontend---especificacion-completa)
7. [Base de Datos Oracle](#7-base-de-datos-oracle)
8. [Modelos de IA/LLM](#8-modelos-de-iallm)
9. [Flujo de Datos Completo](#9-flujo-de-datos-completo)
10. [Configuracion y Despliegue](#10-configuracion-y-despliegue)
11. [Prompt de Generacion de Codigo](#11-prompt-de-generacion-de-codigo)

---

# 1. VISION GENERAL DEL SISTEMA

## 1.1 Proposito

El **Sistema de Epicrisis Automatica** es una aplicacion full-stack de automatizacion de documentacion clinica hospitalaria. Genera automaticamente informes de alta hospitalaria (epicrisis) para instituciones de salud chilenas, utilizando procesamiento 100% local para garantizar la privacidad de los datos del paciente.

## 1.2 Funcionalidades Principales

| Funcionalidad | Descripcion |
|--------------|-------------|
| **Busqueda de Episodios** | Buscar episodios de hospitalizacion por ID en base de datos Oracle |
| **Visualizacion de Datos Clinicos** | Mostrar datos clinicos estructurados (diagnosticos, procedimientos, medicamentos, evoluciones, laboratorios) |
| **Generacion Automatica de Epicrisis** | Generar texto de informe de alta usando LLM local |
| **Validacion Clinica** | Detectar alucinaciones y menciones no autorizadas mediante sistema de whitelist |
| **Regeneracion con Correccion** | Regenerar automaticamente el texto si se detectan violaciones |
| **Edicion Manual** | Permitir edicion manual del texto generado |
| **Exportacion** | Exportar a PDF y Word (.docx) |

## 1.3 Caracteristicas Clave

- **Procesamiento 100% Local**: Los datos clinicos nunca salen del servidor
- **Validacion por Whitelist**: Solo permite mencionar diagnosticos, procedimientos y medicamentos presentes en los datos del paciente
- **Soporte de Sinonimos Medicos**: Reconoce terminologia medica chilena
- **Auto-correccion**: Regenera automaticamente si detecta alucinaciones
- **Logging Completo**: Sistema de trazabilidad con FlowLogger

---

# 2. ARQUITECTURA DEL SISTEMA

## 2.1 Diagrama de Arquitectura

```
+------------------+     HTTP/REST      +------------------+     Oracle     +------------------+
|                  | -----------------> |                  | ------------> |                  |
|   FRONTEND       |                    |   BACKEND        |               |   ORACLE DB      |
|   Angular 21     | <----------------- |   Node.js/TS     | <------------ |   19c            |
|   Port: 4200     |     JSON           |   Port: 3000     |     JSON      |                  |
|                  |                    |                  |               |                  |
+------------------+                    +--------+---------+               +------------------+
                                                 |
                                                 | Local Inference
                                                 v
                                        +------------------+
                                        |   LLM LOCAL      |
                                        |   TinyLlama/     |
                                        |   Mistral/Llama  |
                                        +------------------+
```

## 2.2 Flujo de Datos Principal

```
Usuario -> Buscar Episodio
         -> Frontend envia GET /api/episodes/:id
         -> Backend consulta Oracle (PL/SQL Function)
         -> Oracle retorna JSON clinico
         -> Backend normaliza datos
         -> Frontend muestra datos en tabs

Usuario -> Generar Epicrisis
         -> Frontend envia POST /api/generate-epicrisis
         -> Backend genera prompt con datos clinicos
         -> LLM genera texto de epicrisis
         -> Validador verifica contra whitelist
         -> Si hay violaciones: regenerar con correcciones
         -> Frontend muestra resultado + validacion

Usuario -> Exportar
         -> Frontend envia POST /api/export/pdf o /word
         -> Backend genera documento con pdfkit/docx
         -> Frontend descarga archivo
```

---

# 3. STACK TECNOLOGICO DETALLADO

## 3.1 Frontend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Angular | 21.0.0 | Framework principal |
| TypeScript | 5.9 | Lenguaje |
| Angular Material | 21.0.0 | Componentes UI |
| Angular CDK | 21.0.0 | Utilidades de componentes |
| RxJS | 7.8.0 | Programacion reactiva |
| Zone.js | 0.15.0 | Deteccion de cambios (opcional con zoneless) |
| Transformers.js | 3.x | Inferencia ONNX en navegador (CDN) |
| IndexedDB | Nativo | Almacenamiento de vectores/chunks |

**Caracteristicas de Angular 21:**
- Standalone Components (sin NgModules)
- Zoneless Change Detection (`provideZonelessChangeDetection()`)
- Signals para estado reactivo
- Control flow moderno (`@if`, `@for`, `@else`)
- Functional HTTP Interceptors

**Inferencia Local en Navegador:**
- Transformers.js cargado dinamicamente desde CDN
- Soporte para WebGPU (GPU acelerada) y WASM (CPU fallback)
- Modelos ONNX cuantizados (q4, q4f16)
- Tipos de modelo: causal-lm, image-text-to-text, text-generation-web, pipeline

## 3.2 Backend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime |
| TypeScript | 5.3 | Lenguaje |
| Express | 4.18 | Framework REST API |
| OracleDB | 6.2 | Driver de base de datos |
| Winston | 3.11 | Logging avanzado |
| PDFKit | 0.14 | Generacion de PDF |
| docx | 8.5 | Generacion de Word |
| Helmet | 7.1 | Headers de seguridad |
| CORS | 2.8 | Cross-origin |
| Morgan | 1.10 | HTTP logging |

## 3.3 Base de Datos

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Oracle Database | 19c | Base de datos principal |
| PL/SQL | N/A | Funciones y procedimientos |

## 3.4 Modelos LLM (Opcionales)

| Modelo | Tamano | Uso Recomendado |
|--------|--------|-----------------|
| TinyLlama 1.1B Chat Q4 | 637MB | Desarrollo/Pruebas |
| Llama 3.2 3B Instruct Q4 | 1.9GB | Balance produccion |
| Mistral 7B Instruct Q4 | 4.1GB | Produccion maxima calidad |
| Multilingual E5-small | ~100MB | Embeddings para RAG |

---

# 4. ESTRUCTURA DE DIRECTORIOS

```
epicrisis-app/
|
+-- backend/
|   +-- src/
|   |   +-- index.ts                      # Punto de entrada del servidor
|   |   +-- config/
|   |   |   +-- database.ts               # Configuracion Oracle y pool
|   |   |   +-- logger.ts                 # Winston + FlowLogger
|   |   +-- routes/
|   |   |   +-- epicrisisRoutes.ts        # 7 endpoints REST
|   |   +-- services/
|   |   |   +-- llmService.ts             # Generacion con LLM
|   |   |   +-- validatorService.ts       # Validacion por whitelist
|   |   |   +-- normalizerService.ts      # Normalizacion de datos
|   |   |   +-- oracleService.ts          # Consultas a Oracle
|   |   |   +-- exportService.ts          # PDF y Word
|   |   |   +-- ragService.ts             # RAG opcional
|   |   +-- types/
|   |   |   +-- clinical.types.ts         # Interfaces TypeScript
|   |   +-- utils/
|   |       +-- synonyms.ts               # Diccionario sinonimos medicos
|   |       +-- validators.ts             # Utilidades de validacion
|   +-- package.json
|   +-- tsconfig.json
|   +-- Dockerfile
|   +-- .env.example
|
+-- frontend/
|   +-- src/
|   |   +-- main.ts                       # Bootstrap Angular
|   |   +-- index.html                    # HTML base
|   |   +-- app/
|   |   |   +-- app.component.ts          # Componente raiz
|   |   |   +-- app.config.ts             # Configuracion standalone
|   |   |   +-- app.routes.ts             # Rutas
|   |   |   +-- core/
|   |   |   |   +-- services/
|   |   |   |   |   +-- api.service.ts        # HTTP wrapper
|   |   |   |   |   +-- epicrisis.service.ts  # Logica de negocio
|   |   |   |   |   +-- local-rag.service.ts  # RAG local con ONNX/Transformers.js
|   |   |   |   |   +-- indexeddb.service.ts  # Almacenamiento de vectores
|   |   |   |   +-- models/
|   |   |   |   |   +-- clinical.types.ts     # Interfaces clinicas
|   |   |   |   |   +-- rag.types.ts          # Tipos RAG, modelos ONNX, configs
|   |   |   |   +-- interceptors/
|   |   |   |       +-- http-error.interceptor.ts
|   |   |   +-- features/
|   |   |   |   +-- episode-search/           # Busqueda de episodios
|   |   |   |   +-- json-viewer/              # Visualizador de datos
|   |   |   |   +-- epicrisis-generator/      # Generador de epicrisis
|   |   |   |   +-- validation-panel/         # Panel de validacion
|   |   |   |   +-- export-options/           # Opciones de exportacion
|   |   |   |   +-- model-loader/             # Selector/cargador de modelos ONNX
|   |   |   +-- shared/
|   |   |       +-- pipes/
|   |   |       +-- components/
|   |   +-- environments/
|   |   |   +-- environment.ts            # apiUrl, localModelsPath
|   |   |   +-- environment.prod.ts
|   |   +-- styles/
|   |       +-- styles.scss
|   +-- angular.json
|   +-- package.json
|   +-- tsconfig.json
|   +-- proxy.conf.json                   # Proxy para modelos locales
|   +-- Dockerfile
|   +-- nginx.conf
|
+-- sql/
|   +-- tables/
|   |   +-- 01_create_base_tables.sql     # Esquema completo
|   |   +-- 02_insert_sample_data.sql     # Datos de ejemplo
|   +-- functions/
|   |   +-- get_discharge_summary_json.sql # Funcion PL/SQL principal
|   +-- indexes/
|   +-- materialized_views/
|
+-- models/                               # Excluido de git (.gitignore)
|   +-- llm/                              # Modelos LLM (GGUF) para backend
|   +-- embeddings/                       # Modelos de embeddings
|   +-- Ministral-3b-instruct/            # Modelo ONNX para frontend
|   |   +-- config.json
|   |   +-- tokenizer.json
|   |   +-- onnx/model_q4f16.onnx
|   +-- Qwen3-4B-ONNX/                    # Modelo ONNX con thinking mode
|   |   +-- config.json
|   |   +-- tokenizer.json
|   |   +-- generation_config.json
|   |   +-- onnx/model_q4f16.onnx
|   +-- Phi-3.5-mini-instruct-onnx-web/   # Modelo ONNX (no recomendado)
|
+-- docker-compose.yml
+-- download_models.py
+-- .gitignore                            # Excluye models/, *.onnx, *.onnx_data
```

---

# 5. BACKEND - ESPECIFICACION COMPLETA

## 5.1 Punto de Entrada (index.ts)

```typescript
/**
 * ESTRUCTURA DEL SERVIDOR EXPRESS
 *
 * Inicializacion:
 * 1. Cargar variables de entorno con dotenv
 * 2. Crear aplicacion Express
 * 3. Configurar middlewares de seguridad (helmet, cors)
 * 4. Configurar parsing JSON (limite 10mb)
 * 5. Configurar logging HTTP (morgan)
 * 6. Montar rutas en /api
 * 7. Configurar manejador de errores global
 * 8. Configurar ruta 404
 *
 * Arranque:
 * 1. Inicializar pool de conexiones Oracle
 * 2. Inicializar servicio LLM
 * 3. Iniciar servidor HTTP
 * 4. Configurar shutdown graceful (SIGTERM, SIGINT)
 */
```

### Configuracion de Middlewares

```typescript
// Seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: morganStream }));

// Rutas
app.use('/api', epicrisisRoutes);
```

## 5.2 Rutas API (epicrisisRoutes.ts)

### Endpoints Definidos

| Metodo | Ruta | Descripcion | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/api/episodes/:id` | Obtener datos clinicos | - | `{ episodeId, clinicalData, patientInfo, processingTimeMs }` |
| POST | `/api/generate-epicrisis` | Generar epicrisis | `{ clinicalData }` | `{ text, validation, generatedAt, processingTimeMs }` |
| POST | `/api/regenerate-epicrisis` | Regenerar con correcciones | `{ clinicalData, violations }` | `{ text, validation, generatedAt, processingTimeMs }` |
| POST | `/api/validate-epicrisis` | Validar texto | `{ text, clinicalData }` | `{ ok, violations, warnings }` |
| POST | `/api/export/pdf` | Exportar a PDF | `{ text, patientName?, episodeId? }` | PDF Buffer |
| POST | `/api/export/word` | Exportar a Word | `{ text, patientName?, episodeId? }` | DOCX Buffer |
| GET | `/api/health` | Health check | - | `{ status, timestamp, llmReady }` |

### Implementacion de GET /episodes/:id

```typescript
router.get('/episodes/:id', async (req, res) => {
  const flowLog = new FlowLogger(episodeId);

  // 1. Validar ID
  // 2. Verificar existencia en Oracle
  // 3. Obtener datos clinicos (PL/SQL function)
  // 4. Normalizar datos
  // 5. Obtener info del paciente
  // 6. Retornar respuesta con tiempo de procesamiento
});
```

### Implementacion de POST /generate-epicrisis

```typescript
router.post('/generate-epicrisis', async (req, res) => {
  const flowLog = new FlowLogger('generate');

  // 1. Validar input (clinicalData requerido)
  // 2. Normalizar datos
  // 3. Generar epicrisis con LLM
  // 4. Validar texto generado contra whitelist
  // 5. Si hay violaciones: regenerar automaticamente
  // 6. Retornar texto + resultado de validacion
});
```

## 5.3 Servicio LLM (llmService.ts)

### Prompts del Sistema

**PROMPT PRINCIPAL (EPICRISIS_PROMPT):**
```
Eres un medico especialista en medicina interna. Genera un informe de alta
hospitalaria (epicrisis) en espanol de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo parrafo corrido):
- Motivo y diagnostico de ingreso (incluye codigo CIE-10 entre parentesis)
- Procedimientos y tratamientos relevantes durante hospitalizacion (incluye codigos)
- Evolucion clinica resumida (por dias si corresponde, sin repetir)
- Diagnostico(s) de egreso (incluye codigo CIE-10 entre parentesis)
- Indicaciones post-alta: medicamentos con dosis/via/frecuencia/duracion (codigo ATC)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la informacion del JSON proporcionado
2. NO inventes ni agregues informacion
3. Incluye SIEMPRE los codigos entre parentesis para dx, procedimientos y medicamentos
4. Si falta informacion, escribe "No consignado"
5. Escribe en espanol clinico de Chile
6. Formato: UN SOLO PARRAFO continuo, sin bullets ni saltos de linea

JSON CLINICO:
{{JSON_CLINICO}}
```

**PROMPT DE CORRECCION (CORRECTION_PROMPT):**
```
Tu texto anterior contiene menciones NO permitidas (alucinaciones) o fuera de la lista blanca.

VIOLACIONES DETECTADAS:
{{VIOLACIONES}}

Debes reescribir el informe de alta en 1 solo parrafo CUMPLIENDO:
- Solo puedes mencionar diagnosticos de esta lista: {{DX_LISTA}}
- Solo puedes mencionar procedimientos de esta lista: {{PROC_LISTA}}
- Solo puedes mencionar medicamentos de esta lista: {{MED_LISTA}}

Si necesitas algo fuera de las listas, escribe "No consignado".
Incluye SIEMPRE los codigos entre parentesis.

JSON CLINICO:
{{JSON_CLINICO}}
```

### Generacion Determinista (Modo Desarrollo)

```typescript
private generateDeterministicEpicrisis(data: ClinicalJson): string {
  const parts: string[] = [];

  // 1. Motivo de ingreso
  if (data.motivo_ingreso) {
    parts.push(`Paciente ingresa por ${data.motivo_ingreso.toLowerCase()}`);
  }

  // 2. Diagnosticos de ingreso con codigos
  if (data.diagnostico_ingreso.length > 0) {
    const dxIngreso = data.diagnostico_ingreso
      .map(dx => `${dx.nombre} (${dx.codigo})`)
      .join(', ');
    parts.push(`con diagnostico de ingreso de ${dxIngreso}`);
  }

  // 3. Procedimientos con fechas y codigos
  if (data.procedimientos.length > 0) {
    const procs = data.procedimientos
      .map(p => `${p.nombre} (${p.codigo}) el ${formatDate(p.fecha)}`)
      .join(', ');
    parts.push(`Durante la hospitalizacion se realizaron: ${procs}`);
  }

  // 4. Tratamientos intrahospitalarios
  // 5. Evolucion clinica resumida
  // 6. Laboratorios relevantes
  // 7. Diagnosticos de egreso
  // 8. Indicaciones farmacologicas al alta
  // 9. Controles y recomendaciones

  return parts.join('. ') + '.';
}
```

## 5.4 Servicio de Validacion (validatorService.ts)

### Sistema de Whitelist

```typescript
class ValidatorService {
  // Triggers medicos para detectar menciones clinicas
  private readonly medicalTriggers = [
    'mg', 'ev', 'vo', 'im', 'sc', 'cada', 'hrs', 'horas', 'dias',
    'diagnostico', 'neumonia', 'insuficiencia', 'fractura', 'sepsis',
    'cirugia', 'procedimiento', 'tac', 'rx', 'ecg', 'endoscopia',
    'antibiotico', 'analgesia', 'infeccion', 'diabetes', 'hipertension'
  ];

  // Frases descriptivas que NO son violaciones
  private readonly commonPhrases = [
    'dias de', 'horas de', 'cada dia', 'de evolucion',
    'con diagnostico', 'con tratamiento', 'tratamiento antibiotico'
  ];

  // Terminos clinicos comunes (sintomas/hallazgos) que NO son violaciones
  private readonly commonClinicalTerms = [
    'ascitis', 'ictericia', 'edema', 'derrame', 'disnea',
    'taquicardia', 'hipertension', 'hipotension', 'fiebre',
    'dolor', 'nauseas', 'vomitos', 'diarrea'
  ];
}
```

### Algoritmo de Validacion

```typescript
validateEpicrisis(text: string, data: ClinicalJson): ValidationResult {
  // 1. Normalizar texto (lowercase, sin acentos, sin caracteres especiales)
  const textNorm = this.normalize(text);

  // 2. Extraer n-gramas (2-6 palabras)
  const grams = this.extractNgrams(textNorm, 2, 6);

  // 3. Crear whitelists desde datos clinicos
  const dxWL = this.makeWhitelist([
    ...data.diagnostico_ingreso,
    ...data.diagnostico_egreso
  ]);
  const procWL = this.makeWhitelist(data.procedimientos);
  const medWL = this.makeWhitelist([
    ...data.tratamientos_intrahosp,
    ...data.indicaciones_alta.medicamentos
  ]);

  // 4. Para cada n-grama:
  //    - Solo validar codigos medicos explicitos (CIE-10, ATC)
  //    - Solo validar frases largas (>= 4 palabras) con triggers medicos
  //    - Ignorar frases comunes y terminos clinicos genericos
  //    - Solo marcar como violacion si tiene sufijo medico (-itis, -osis, etc)

  // 5. Deduplicar violaciones
  // 6. Retornar { ok: violations.length === 0, violations }
}
```

### Sistema de Sinonimos

```typescript
const CLINICAL_SYNONYMS: Record<string, string[]> = {
  // Procedimientos imagenologicos
  "tac": ["tomografia computada", "tc", "scanner"],
  "rx": ["radiografia", "rayos x"],

  // Vias de administracion
  "ev": ["endovenoso", "intravenoso", "iv"],
  "vo": ["via oral", "oral"],
  "im": ["intramuscular"],
  "sc": ["subcutaneo"],

  // Abreviaturas medicas chilenas
  "irc": ["insuficiencia renal cronica"],
  "ira": ["insuficiencia renal aguda"],
  "icc": ["insuficiencia cardiaca congestiva"],
  "epoc": ["enfermedad pulmonar obstructiva cronica"],
  "hta": ["hipertension arterial"],
  "dm": ["diabetes mellitus"],
  "dm2": ["diabetes mellitus tipo 2"]
};
```

## 5.5 Servicio de Normalizacion (normalizerService.ts)

### Funciones de Normalizacion

```typescript
class NormalizerService {
  normalize(rawData: Partial<ClinicalJson>): ClinicalJson {
    return {
      motivo_ingreso: this.normalizeString(rawData.motivo_ingreso),
      diagnostico_ingreso: this.normalizeDiagnoses(rawData.diagnostico_ingreso),
      procedimientos: this.normalizeProcedures(rawData.procedimientos),
      tratamientos_intrahosp: this.normalizeMedications(rawData.tratamientos_intrahosp),
      evolucion: this.normalizeEvolutions(rawData.evolucion),
      laboratorios_relevantes: this.normalizeLabs(rawData.laboratorios_relevantes),
      diagnostico_egreso: this.normalizeDiagnoses(rawData.diagnostico_egreso),
      indicaciones_alta: {
        medicamentos: this.normalizeMedications(rawData.indicaciones_alta?.medicamentos),
        controles: this.normalizeStringArray(rawData.indicaciones_alta?.controles),
        recomendaciones: this.normalizeStringArray(rawData.indicaciones_alta?.recomendaciones)
      }
    };
  }

  // Normaliza string (trim, espacios multiples, caracteres de control)
  private normalizeString(value: string): string;

  // Normaliza codigo CIE-10 (uppercase, solo alfanumericos y punto)
  private normalizeCIE10Code(code: string): string;

  // Normaliza codigo ATC (uppercase, solo alfanumericos)
  private normalizeATCCode(code: string): string;

  // Normaliza dosis (unifica unidades: mg, g, mcg, ml, UI)
  private normalizeDosis(dosis: string): string;

  // Normaliza via de administracion (mapea a siglas estandar)
  private normalizeVia(via: string): string {
    const viaMap = {
      'oral': 'VO', 'via oral': 'VO', 'vo': 'VO',
      'endovenoso': 'EV', 'intravenoso': 'EV', 'ev': 'EV', 'iv': 'EV',
      'intramuscular': 'IM', 'im': 'IM',
      'subcutaneo': 'SC', 'sc': 'SC',
      'sublingual': 'SL', 'topico': 'TOP', 'inhalatoria': 'INH'
    };
    return viaMap[via.toLowerCase()] || via.toUpperCase();
  }

  // Normaliza fecha a ISO (YYYY-MM-DD)
  private normalizeDate(date: string): string;
}
```

## 5.6 Servicio Oracle (oracleService.ts)

```typescript
class OracleService {
  // Obtiene resumen de alta via funcion PL/SQL
  async getDischargeSummary(episodeId: number): Promise<ClinicalJson> {
    const jsonString = await executeClobFunction('get_discharge_summary_json', {
      p_episodio_id: episodeId
    });
    return JSON.parse(jsonString) as ClinicalJson;
  }

  // Verifica existencia de episodio
  async episodeExists(episodeId: number): Promise<boolean> {
    const sql = `SELECT COUNT(*) as count FROM atenciones WHERE id_episodio = :episodeId`;
    const rows = await executeQuery(sql, { episodeId });
    return rows[0]?.COUNT > 0;
  }

  // Obtiene informacion del paciente
  async getPatientInfo(episodeId: number): Promise<PatientInfo | null> {
    const sql = `
      SELECT
        p.nombre || ' ' || p.apellido_paterno || ' ' || p.apellido_materno as nombre,
        p.rut,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento
      FROM atenciones a
      JOIN pacientes p ON a.id_paciente = p.id_paciente
      WHERE a.id_episodio = :episodeId
    `;
    const rows = await executeQuery(sql, { episodeId });
    return rows[0] ? { nombre: rows[0].NOMBRE, rut: rows[0].RUT, ... } : null;
  }
}
```

## 5.7 Servicio de Exportacion (exportService.ts)

### Generacion de PDF

```typescript
async generatePDF(epicrisisText: string, options: ExportOptions): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  });

  // Encabezado
  doc.fontSize(18).font('Helvetica-Bold')
     .text('INFORME DE ALTA HOSPITALARIA', { align: 'center' });

  // Informacion del paciente
  doc.fontSize(10).font('Helvetica');
  if (options.patientName) doc.text(`Paciente: ${options.patientName}`);
  if (options.episodeId) doc.text(`N Episodio: ${options.episodeId}`);
  if (options.generatedAt) doc.text(`Fecha de emision: ${options.generatedAt}`);

  // Linea separadora
  doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();

  // Texto de epicrisis
  doc.fontSize(11).font('Helvetica')
     .text(epicrisisText, { align: 'justify', lineGap: 4 });

  // Pie de pagina
  doc.fontSize(8).fillColor('#666666')
     .text('Documento generado automaticamente. Para uso medico exclusivo.', { align: 'center' });

  return Buffer.concat(chunks);
}
```

### Generacion de Word

```typescript
async generateWord(epicrisisText: string, options: ExportOptions): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Titulo
  children.push(new Paragraph({
    text: 'INFORME DE ALTA HOSPITALARIA',
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER
  }));

  // Informacion del paciente
  if (options.patientName) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Paciente: ', bold: true }),
        new TextRun({ text: options.patientName })
      ]
    }));
  }

  // Separador
  children.push(new Paragraph({ text: '─'.repeat(80) }));

  // Epicrisis
  children.push(new Paragraph({
    text: epicrisisText,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360 }
  }));

  // Pie de pagina
  children.push(new Paragraph({
    children: [new TextRun({
      text: 'Documento generado automaticamente. Para uso medico exclusivo.',
      size: 18, color: '666666'
    })],
    alignment: AlignmentType.CENTER
  }));

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
```

## 5.8 Configuracion de Logger (logger.ts)

### Winston Configuration

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({ format: combine(colorize(), logFormat) }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/audit.log', level: 'info' }),
    new DailyRotateFile({
      filename: 'logs/flow-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});
```

### FlowLogger para Trazabilidad

```typescript
class FlowLogger {
  private sessionId: string;
  private startTime: number;
  private logs: Array<{ step: string; timestamp: number; data: any }> = [];

  constructor(episodeId?: string) {
    this.sessionId = `${episodeId || 'unknown'}-${randomUUID().substring(0, 8)}`;
    this.startTime = Date.now();
    this.logStep('FLOW_START', { sessionId: this.sessionId });
  }

  logStep(step: string, data?: any) {
    // Log con sessionId, step, elapsed time, y data adicional
  }

  logError(step: string, error: any) {
    // Log de error con stack trace
  }

  logEnd(data?: any) {
    // Log final con tiempo total y resumen
  }
}
```

## 5.9 Tipos TypeScript (clinical.types.ts)

```typescript
// Interfaces de datos clinicos
export interface DiagnosisItem {
  codigo: string;  // Codigo CIE-10
  nombre: string;  // Descripcion del diagnostico
}

export interface ProcedureItem {
  codigo: string;   // Codigo de procedimiento
  nombre: string;   // Descripcion
  fecha: string;    // Fecha ISO (YYYY-MM-DD)
}

export interface MedicationItem {
  codigo: string;      // Codigo ATC
  nombre: string;      // Nombre generico
  dosis: string;       // Ej: "500mg"
  via: string;         // VO, EV, IM, SC, etc.
  frecuencia: string;  // Ej: "cada 8 horas"
  duracion?: string;   // Ej: "7 dias"
}

export interface EvolutionItem {
  fecha: string;        // Fecha ISO
  nota: string;         // Texto de la nota
  profesional?: string; // Nombre del profesional
}

export interface LabItem {
  parametro: string;  // Nombre del examen
  valor: string;      // Resultado con unidad
  fecha: string;      // Fecha ISO
}

export interface DischargeInstructions {
  medicamentos: MedicationItem[];
  controles: string[];
  recomendaciones: string[];
}

export interface ClinicalJson {
  motivo_ingreso: string;
  diagnostico_ingreso: DiagnosisItem[];
  procedimientos: ProcedureItem[];
  tratamientos_intrahosp: MedicationItem[];
  evolucion: EvolutionItem[];
  laboratorios_relevantes: LabItem[];
  diagnostico_egreso: DiagnosisItem[];
  indicaciones_alta: DischargeInstructions;
}

// Interfaces de validacion
export interface ValidationViolation {
  type: 'dx' | 'proc' | 'med';
  mention: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ValidationViolation[];
}

// Interfaces de request/response
export interface GenerationRequest {
  clinicalData: ClinicalJson;
}

export interface RegenerationRequest {
  clinicalData: ClinicalJson;
  violations: ValidationViolation[];
}

export interface EpicrisisResponse {
  text: string;
  validation: ValidationResult;
  generatedAt: string;
  processingTimeMs: number;
}

export interface ExportRequest {
  text: string;
  patientName?: string;
  episodeId?: string;
}
```

---

# 6. FRONTEND - ESPECIFICACION COMPLETA

## 6.1 Configuracion de la Aplicacion (app.config.ts)

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21: Zoneless change detection
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideAnimations()
  ]
};
```

## 6.2 Componente Principal (app.component.ts)

### Estructura del Layout

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule, MatIconModule, MatButtonModule,
    EpisodeSearchComponent,
    JsonViewerComponent,
    EpicrisisGeneratorComponent,
    ValidationPanelComponent,
    ExportOptionsComponent
  ],
  template: `
    <!-- Toolbar fijo superior -->
    <mat-toolbar color="primary" class="app-toolbar">
      <mat-icon class="app-logo">local_hospital</mat-icon>
      <span class="app-title">Sistema de Epicrisis Automatica</span>
      <span class="spacer"></span>
      <button mat-icon-button aria-label="Ayuda">
        <mat-icon>help_outline</mat-icon>
      </button>
    </mat-toolbar>

    <div class="app-container">
      <main class="main-content">
        <!-- 1. Busqueda de episodio -->
        <app-episode-search></app-episode-search>

        <!-- 2. Grid de dos columnas -->
        <div class="two-column-grid">
          <!-- Columna izquierda: Datos clinicos -->
          <app-json-viewer></app-json-viewer>
          <!-- Columna derecha: Epicrisis generada -->
          <app-epicrisis-generator></app-epicrisis-generator>
        </div>

        <!-- 3. Panel de validacion -->
        <app-validation-panel></app-validation-panel>

        <!-- 4. Opciones de exportacion -->
        <app-export-options></app-export-options>
      </main>

      <!-- Footer -->
      <footer class="app-footer">
        <p>Sistema de Epicrisis Automatica - Procesamiento 100% Local</p>
        <p class="footer-note">Los datos clinicos nunca salen del servidor local</p>
      </footer>
    </div>
  `
})
```

### Estilos CSS del Layout

```scss
:host {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
}

.two-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.app-footer {
  background-color: #263238;
  color: white;
  text-align: center;
  padding: 24px;
  margin-top: auto;
}

@media (max-width: 1024px) {
  .two-column-grid {
    grid-template-columns: 1fr;
  }
}
```

## 6.3 Componente EpisodeSearch

### Funcionalidad
- Campo de texto para ingresar ID de episodio
- Boton de busqueda con spinner de carga
- Muestra mensaje de error si falla
- Muestra informacion del paciente si se encuentra

### Template

```html
<mat-card class="search-card">
  <mat-card-header>
    <mat-icon mat-card-avatar>search</mat-icon>
    <mat-card-title>Buscar Episodio de Hospitalizacion</mat-card-title>
    <mat-card-subtitle>Ingrese el ID del episodio para cargar los datos clinicos</mat-card-subtitle>
  </mat-card-header>

  <mat-card-content>
    <div class="search-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>ID de Episodio</mat-label>
        <input matInput [(ngModel)]="episodeIdInput"
               placeholder="Ej: 12345"
               (keyup.enter)="searchEpisode()"
               [disabled]="isLoading()" />
        <mat-icon matSuffix>badge</mat-icon>
      </mat-form-field>

      <button mat-raised-button color="primary"
              (click)="searchEpisode()"
              [disabled]="!episodeIdInput() || isLoading()"
              class="search-button">
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Buscando...</span>
        } @else {
          <mat-icon>search</mat-icon>
          <span>Buscar Episodio</span>
        }
      </button>
    </div>

    @if (errorMessage()) {
      <div class="error-message">
        <mat-icon>error</mat-icon>
        <span>{{ errorMessage() }}</span>
      </div>
    }

    @if (patientInfo()) {
      <div class="patient-info">
        <h3>Datos del Paciente</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Nombre:</span>
            <span class="value">{{ patientInfo()?.nombre }}</span>
          </div>
          <div class="info-item">
            <span class="label">RUT:</span>
            <span class="value">{{ patientInfo()?.rut }}</span>
          </div>
          <!-- ... mas campos ... -->
        </div>
      </div>
    }
  </mat-card-content>
</mat-card>
```

### Logica del Componente

```typescript
@Component({ ... })
export class EpisodeSearchComponent {
  epicrisisService = inject(EpicrisisService);

  episodeIdInput = signal<string>('');
  isLoading = this.epicrisisService.isLoading;
  errorMessage = this.epicrisisService.errorMessage;
  patientInfo = this.epicrisisService.patientInfo;

  searchEpisode(): void {
    const id = this.episodeIdInput().trim();
    if (!id) return;

    this.epicrisisService.getEpisodeData(id).subscribe({
      next: () => { /* Datos cargados */ },
      error: (error) => {
        this.epicrisisService.setError(error.message || 'Error al buscar el episodio');
      }
    });
  }
}
```

## 6.4 Componente JsonViewer

### Funcionalidad
- Sistema de tabs para organizar datos clinicos
- Tabs: Resumen, Procedimientos, Medicamentos, Evolucion, Laboratorios, JSON Raw
- Chips para diagnosticos
- Acordeon para procedimientos
- Timeline para evoluciones
- Tabla para laboratorios

### Template de Tabs

```html
<mat-tab-group>
  <!-- Tab Resumen -->
  <mat-tab label="Resumen">
    <div class="section">
      <h4>Motivo de Ingreso</h4>
      <p>{{ clinicalData()?.motivo_ingreso || 'No consignado' }}</p>
    </div>

    <div class="section">
      <h4>Diagnosticos de Ingreso</h4>
      @if (clinicalData()?.diagnostico_ingreso?.length) {
        <div class="chips-container">
          @for (dx of clinicalData()?.diagnostico_ingreso; track dx.codigo) {
            <mat-chip>{{ dx.nombre }} ({{ dx.codigo }})</mat-chip>
          }
        </div>
      }
    </div>

    <div class="section">
      <h4>Diagnosticos de Egreso</h4>
      @for (dx of clinicalData()?.diagnostico_egreso; track dx.codigo) {
        <mat-chip color="primary" highlighted>{{ dx.nombre }} ({{ dx.codigo }})</mat-chip>
      }
    </div>
  </mat-tab>

  <!-- Tab Procedimientos -->
  <mat-tab label="Procedimientos">
    <mat-accordion>
      @for (proc of clinicalData()?.procedimientos; track proc.codigo) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>{{ proc.nombre }}</mat-panel-title>
            <mat-panel-description>{{ proc.fecha }}</mat-panel-description>
          </mat-expansion-panel-header>
          <p><strong>Codigo:</strong> {{ proc.codigo }}</p>
        </mat-expansion-panel>
      }
    </mat-accordion>
  </mat-tab>

  <!-- Tab Medicamentos -->
  <mat-tab label="Medicamentos">
    <h4>Tratamientos Intrahospitalarios</h4>
    <div class="med-list">
      @for (med of clinicalData()?.tratamientos_intrahosp; track med.codigo) {
        <div class="med-item">
          <span class="med-name">{{ med.nombre }}</span>
          <span class="med-details">{{ med.dosis }} {{ med.via }} {{ med.frecuencia }}</span>
        </div>
      }
    </div>

    <h4>Medicamentos al Alta</h4>
    <div class="med-list">
      @for (med of clinicalData()?.indicaciones_alta?.medicamentos; track med.codigo) {
        <div class="med-item highlighted">
          <span class="med-name">{{ med.nombre }} ({{ med.codigo }})</span>
          <span class="med-details">
            {{ med.dosis }} {{ med.via }} {{ med.frecuencia }}
            @if (med.duracion) { por {{ med.duracion }} }
          </span>
        </div>
      }
    </div>
  </mat-tab>

  <!-- Tab Evolucion con Timeline -->
  <mat-tab label="Evolucion">
    <div class="timeline">
      @for (ev of clinicalData()?.evolucion; track $index) {
        <div class="timeline-item">
          <div class="timeline-date">{{ ev.fecha }}</div>
          <div class="timeline-content">
            <p>{{ ev.nota }}</p>
            @if (ev.profesional) {
              <span class="professional">- {{ ev.profesional }}</span>
            }
          </div>
        </div>
      }
    </div>
  </mat-tab>

  <!-- Tab Laboratorios con Tabla -->
  <mat-tab label="Laboratorios">
    <table class="labs-table">
      <thead>
        <tr><th>Parametro</th><th>Valor</th><th>Fecha</th></tr>
      </thead>
      <tbody>
        @for (lab of clinicalData()?.laboratorios_relevantes; track $index) {
          <tr>
            <td>{{ lab.parametro }}</td>
            <td>{{ lab.valor }}</td>
            <td>{{ lab.fecha }}</td>
          </tr>
        }
      </tbody>
    </table>
  </mat-tab>

  <!-- Tab JSON Raw -->
  <mat-tab label="JSON">
    <pre class="json-raw">{{ jsonPretty() }}</pre>
  </mat-tab>
</mat-tab-group>
```

## 6.5 Componente EpicrisisGenerator

### Funcionalidad
- Muestra estado vacio si no hay datos
- Boton para generar epicrisis
- Muestra texto generado
- Boton para regenerar
- Boton para editar manualmente
- Boton para validar

### Template

```html
<mat-card class="generator-card">
  <mat-card-header>
    <mat-icon mat-card-avatar>auto_awesome</mat-icon>
    <mat-card-title>Epicrisis Generada</mat-card-title>
  </mat-card-header>

  <mat-card-content>
    @if (hasData()) {
      @if (!hasEpicrisis()) {
        <div class="empty-state">
          <mat-icon>article</mat-icon>
          <p>Presione el boton para generar la epicrisis automaticamente</p>
        </div>
      } @else {
        @if (isEditing()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Editar Epicrisis</mat-label>
            <textarea matInput [value]="epicrisisText()"
                      (input)="onTextChange($event)"
                      rows="12"></textarea>
            <mat-hint>Puede editar el texto manualmente.</mat-hint>
          </mat-form-field>
        } @else {
          <div class="epicrisis-text">{{ epicrisisText() }}</div>
        }
      }
    } @else {
      <div class="empty-state">
        <mat-icon>info</mat-icon>
        <p>Busque un episodio para comenzar</p>
      </div>
    }
  </mat-card-content>

  <mat-card-actions>
    @if (hasData()) {
      <button mat-raised-button color="primary" (click)="generate()" [disabled]="isLoading()">
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Generando...</span>
        } @else {
          <mat-icon>auto_awesome</mat-icon>
          <span>Generar Epicrisis</span>
        }
      </button>

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
```

## 6.6 Componente ValidationPanel

### Funcionalidad
- Muestra estado de validacion (exito/error)
- Lista violaciones detectadas con tipo y mencion
- Muestra warnings de completitud

### Template

```html
<mat-card class="validation-card">
  <mat-card-header>
    <mat-icon mat-card-avatar>fact_check</mat-icon>
    <mat-card-title>Validacion Clinica</mat-card-title>
    <mat-card-subtitle>Verificacion de datos y deteccion de alucinaciones</mat-card-subtitle>
  </mat-card-header>

  <mat-card-content>
    @if (validationResult(); as validation) {
      <div class="validation-status">
        @if (validation.ok) {
          <div class="status-badge success">
            <mat-icon>check_circle</mat-icon>
            <span>Validacion exitosa</span>
          </div>
          <p class="status-message">
            El texto cumple con todos los criterios de validacion.
          </p>
        } @else {
          <div class="status-badge error">
            <mat-icon>error</mat-icon>
            <span>{{ validation.violations.length }} violacion(es) detectada(s)</span>
          </div>
          <p class="status-message">
            Se detectaron menciones que no corresponden a los datos clinicos.
          </p>
        }
      </div>

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
    } @else {
      <div class="empty-state">
        <mat-icon>rule</mat-icon>
        <p>La validacion se ejecutara automaticamente al generar la epicrisis</p>
      </div>
    }
  </mat-card-content>
</mat-card>
```

## 6.7 Componente ExportOptions

### Funcionalidad
- Boton para exportar a PDF
- Boton para exportar a Word
- Boton para copiar al portapapeles
- Snackbar con feedback de exito/error

### Template

```html
<mat-card class="export-card">
  <mat-card-header>
    <mat-icon mat-card-avatar>download</mat-icon>
    <mat-card-title>Exportar Documento</mat-card-title>
  </mat-card-header>

  <mat-card-content>
    @if (hasEpicrisis()) {
      <div class="export-buttons">
        <button mat-raised-button color="primary" (click)="exportToPDF()" [disabled]="isExporting()">
          @if (isExporting() && exportType() === 'pdf') {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>picture_as_pdf</mat-icon>
          }
          <span>Exportar a PDF</span>
        </button>

        <button mat-raised-button color="accent" (click)="exportToWord()" [disabled]="isExporting()">
          @if (isExporting() && exportType() === 'word') {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>description</mat-icon>
          }
          <span>Exportar a Word</span>
        </button>

        <button mat-stroked-button (click)="copyToClipboard()">
          <mat-icon>content_copy</mat-icon>
          <span>Copiar al Portapapeles</span>
        </button>
      </div>

      <div class="export-info">
        <mat-icon>info</mat-icon>
        <span>Los documentos incluyen informacion del paciente y fecha de generacion.</span>
      </div>
    } @else {
      <div class="empty-state">
        <mat-icon>cloud_download</mat-icon>
        <p>Genere una epicrisis para poder exportarla</p>
      </div>
    }
  </mat-card-content>
</mat-card>
```

## 6.8 Servicio Epicrisis (epicrisis.service.ts)

### Estado Reactivo con Signals

```typescript
@Injectable({ providedIn: 'root' })
export class EpicrisisService {
  private api = inject(ApiService);

  // Signals de estado
  clinicalData = signal<ClinicalJson | null>(null);
  patientInfo = signal<PatientInfo | null>(null);
  episodeId = signal<string>('');
  epicrisisText = signal<string>('');
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Computed values
  hasData = computed(() => this.clinicalData() !== null);
  hasEpicrisis = computed(() => this.epicrisisText().length > 0);
  isValid = computed(() => this.validationResult()?.ok ?? false);
  violationsCount = computed(() => this.validationResult()?.violations.length ?? 0);
}
```

### Metodos del Servicio

```typescript
// Obtener datos de episodio
getEpisodeData(episodeId: string): Observable<EpisodeResponse> {
  this.isLoading.set(true);
  this.errorMessage.set('');
  this.clearEpicrisis();

  return this.api.get<EpisodeResponse>(`/episodes/${episodeId}`).pipe(
    tap((response) => {
      this.clinicalData.set(response.clinicalData);
      this.patientInfo.set(response.patientInfo ?? null);
      this.episodeId.set(response.episodeId);
    }),
    finalize(() => this.isLoading.set(false))
  );
}

// Generar epicrisis
generateEpicrisis(): Observable<EpicrisisResponse> {
  const data = this.clinicalData();
  if (!data) throw new Error('No hay datos clinicos cargados');

  this.isLoading.set(true);
  return this.api.post<EpicrisisResponse>('/generate-epicrisis', { clinicalData: data }).pipe(
    tap((response) => {
      this.epicrisisText.set(response.text);
      this.validationResult.set(response.validation);
    }),
    finalize(() => this.isLoading.set(false))
  );
}

// Regenerar con correcciones
regenerateEpicrisis(): Observable<EpicrisisResponse> {
  const data = this.clinicalData();
  const validation = this.validationResult();

  return this.api.post<EpicrisisResponse>('/regenerate-epicrisis', {
    clinicalData: data,
    violations: validation?.violations || []
  }).pipe(
    tap((response) => {
      this.epicrisisText.set(response.text);
      this.validationResult.set(response.validation);
    }),
    finalize(() => this.isLoading.set(false))
  );
}

// Validar texto
validateEpicrisis(): Observable<ValidationResult> {
  return this.api.post<ValidationResult>('/validate-epicrisis', {
    text: this.epicrisisText(),
    clinicalData: this.clinicalData()
  }).pipe(
    tap((result) => this.validationResult.set(result))
  );
}

// Exportar a PDF
exportToPDF(): Observable<Blob> {
  return this.api.postBlob('/export/pdf', {
    text: this.epicrisisText(),
    patientName: this.patientInfo()?.nombre,
    episodeId: this.episodeId()
  });
}

// Exportar a Word
exportToWord(): Observable<Blob> {
  return this.api.postBlob('/export/word', { ... });
}

// Actualizar texto manualmente
updateEpicrisisText(text: string): void {
  this.epicrisisText.set(text);
  this.validationResult.set(null); // Limpiar validacion al editar
}
```

## 6.9 Servicio API (api.service.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  postBlob(endpoint: string, body: unknown): Observable<Blob> {
    return this.http.post(`${this.baseUrl}${endpoint}`, body, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.status === 0) errorMessage = 'No se pudo conectar con el servidor';
    else if (error.status === 404) errorMessage = 'Recurso no encontrado';
    else if (error.status === 500) errorMessage = 'Error interno del servidor';
    else errorMessage = error.error?.error || `Error ${error.status}`;
    return throwError(() => new Error(errorMessage));
  }
}
```

## 6.10 HTTP Error Interceptor

```typescript
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Error desconocido';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error de red: ${error.error.message}`;
      } else {
        switch (error.status) {
          case 0: errorMessage = 'No se pudo conectar con el servidor.'; break;
          case 400: errorMessage = error.error?.error || 'Solicitud invalida'; break;
          case 401: errorMessage = 'No autorizado'; break;
          case 403: errorMessage = 'Acceso denegado'; break;
          case 404: errorMessage = error.error?.error || 'Recurso no encontrado'; break;
          case 500: errorMessage = 'Error interno del servidor'; break;
          default: errorMessage = `Error ${error.status}: ${error.message}`;
        }
      }

      console.error('HTTP Error:', error);
      return throwError(() => new Error(errorMessage));
    })
  );
};
```

## 6.11 Estilos Globales (styles.scss)

```scss
// Variables
$primary-color: #1976d2;
$accent-color: #ff4081;
$warn-color: #f44336;
$success-color: #4caf50;
$background-color: #fafafa;

// Reset basico
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: 'Roboto', sans-serif;
  background-color: $background-color;
  color: rgba(0, 0, 0, 0.87);
}

// Utilidades
.full-width { width: 100%; }
.text-center { text-align: center; }
.mt-1 { margin-top: 8px; }
.mt-2 { margin-top: 16px; }
.mb-2 { margin-bottom: 16px; }
.p-2 { padding: 16px; }

// Grid responsivo
.grid-2-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
}

// Estados
.success-state {
  background-color: rgba($success-color, 0.1);
  border: 1px solid $success-color;
}

.error-state {
  background-color: rgba($warn-color, 0.1);
  border: 1px solid $warn-color;
}

// Empty states
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #757575;

  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    color: #bdbdbd;
  }
}

// Scrollbar personalizada
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }

// Epicrisis text
.epicrisis-text {
  padding: 24px;
  background-color: #fafafa;
  border-radius: 8px;
  line-height: 1.8;
  font-size: 14px;
  min-height: 200px;
  white-space: pre-wrap;
  border: 1px solid #e0e0e0;
}

// Validation badges
.validation-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;

  &.success { background-color: $success-color; color: white; }
  &.error { background-color: $warn-color; color: white; }
}
```

---

# 7. BASE DE DATOS ORACLE

## 7.1 Esquema de Tablas

### Tabla PACIENTES
```sql
CREATE TABLE pacientes (
  id_paciente         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rut                 VARCHAR2(12) NOT NULL UNIQUE,
  nombre              VARCHAR2(100) NOT NULL,
  apellido_paterno    VARCHAR2(100) NOT NULL,
  apellido_materno    VARCHAR2(100),
  fecha_nacimiento    DATE NOT NULL,
  sexo                CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F', 'O')),
  telefono            VARCHAR2(20),
  email               VARCHAR2(100),
  direccion           VARCHAR2(200),
  comuna              VARCHAR2(100),
  prevision           VARCHAR2(50),
  fecha_creacion      DATE DEFAULT SYSDATE,
  activo              CHAR(1) DEFAULT 'S' CHECK (activo IN ('S', 'N'))
);
```

### Tabla ATENCIONES (Episodios)
```sql
CREATE TABLE atenciones (
  id_episodio         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  folio               VARCHAR2(50) UNIQUE,
  fecha_ingreso       DATE NOT NULL,
  fecha_alta          DATE,
  motivo_ingreso      VARCHAR2(4000),
  servicio_ingreso    VARCHAR2(100),
  cama                VARCHAR2(20),
  estado              VARCHAR2(20) DEFAULT 'EN_PROCESO'
                      CHECK (estado IN ('EN_PROCESO', 'ALTA', 'FALLECIDO', 'FUGADO', 'CANCELADO')),
  tipo_alta           VARCHAR2(50),
  medico_tratante     VARCHAR2(200)
);
```

### Tabla DIAGNOSTICOS
```sql
CREATE TABLE diagnosticos (
  id_diagnostico      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  tipo                VARCHAR2(20) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'INTERCURRENTE')),
  codigo_cie10        VARCHAR2(10) NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  es_principal        CHAR(1) DEFAULT 'N' CHECK (es_principal IN ('S', 'N')),
  fecha_registro      DATE DEFAULT SYSDATE
);
```

### Tabla PROCEDIMIENTOS
```sql
CREATE TABLE procedimientos (
  id_procedimiento    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  codigo              VARCHAR2(50) NOT NULL,
  descripcion         VARCHAR2(500) NOT NULL,
  fecha_realizacion   DATE NOT NULL,
  profesional         VARCHAR2(200),
  observaciones       VARCHAR2(2000)
);
```

### Tabla MEDICAMENTOS_HOSPITALARIOS
```sql
CREATE TABLE medicamentos_hospitalarios (
  id_medicamento      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  codigo_atc          VARCHAR2(20),
  nombre_generico     VARCHAR2(200) NOT NULL,
  dosis               VARCHAR2(100) NOT NULL,
  via_administracion  VARCHAR2(50) NOT NULL,
  frecuencia          VARCHAR2(100) NOT NULL,
  fecha_inicio        DATE NOT NULL,
  fecha_termino       DATE,
  activo              CHAR(1) DEFAULT 'S' CHECK (activo IN ('S', 'N'))
);
```

### Tabla MEDICAMENTOS_ALTA
```sql
CREATE TABLE medicamentos_alta (
  id_medicamento_alta NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  codigo_atc          VARCHAR2(20),
  nombre_generico     VARCHAR2(200) NOT NULL,
  dosis               VARCHAR2(100) NOT NULL,
  via_administracion  VARCHAR2(50) NOT NULL,
  frecuencia          VARCHAR2(100) NOT NULL,
  duracion            VARCHAR2(100),
  orden               NUMBER
);
```

### Tabla EVOLUCIONES
```sql
CREATE TABLE evoluciones (
  id_evolucion        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  fecha_registro      DATE NOT NULL,
  nota_evolucion      CLOB NOT NULL,
  nombre_profesional  VARCHAR2(200),
  especialidad        VARCHAR2(100)
);
```

### Tabla LABORATORIOS
```sql
CREATE TABLE laboratorios (
  id_laboratorio      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  id_paciente         NUMBER NOT NULL REFERENCES pacientes(id_paciente),
  codigo_examen       VARCHAR2(50) NOT NULL,
  nombre_examen       VARCHAR2(200) NOT NULL,
  resultado           VARCHAR2(500),
  unidad              VARCHAR2(50),
  es_anormal          CHAR(1) DEFAULT 'N' CHECK (es_anormal IN ('S', 'N')),
  es_relevante        CHAR(1) DEFAULT 'N' CHECK (es_relevante IN ('S', 'N')),
  fecha_resultado     DATE NOT NULL
);
```

### Tabla CONTROLES_ALTA
```sql
CREATE TABLE controles_alta (
  id_control          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  descripcion         VARCHAR2(500) NOT NULL,
  especialidad        VARCHAR2(100),
  fecha_control       DATE
);
```

### Tabla RECOMENDACIONES_ALTA
```sql
CREATE TABLE recomendaciones_alta (
  id_recomendacion    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_episodio         NUMBER NOT NULL REFERENCES atenciones(id_episodio),
  descripcion         VARCHAR2(1000) NOT NULL,
  tipo                VARCHAR2(50),
  orden               NUMBER
);
```

## 7.2 Funcion PL/SQL Principal

```sql
CREATE OR REPLACE FUNCTION get_discharge_summary_json(p_episodio_id NUMBER)
RETURN CLOB IS
  v_result CLOB;
BEGIN
  SELECT JSON_OBJECT(
    'motivo_ingreso' VALUE NVL(a.motivo_ingreso, 'No consignado'),

    'diagnostico_ingreso' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE dx.codigo_cie10,
          'nombre' VALUE dx.descripcion
        ) ORDER BY dx.fecha_registro
      ), JSON_ARRAY())
      FROM diagnosticos dx
      WHERE dx.id_episodio = p_episodio_id AND dx.tipo = 'INGRESO'
    ),

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
      WHERE m.id_episodio = p_episodio_id AND m.activo = 'S'
    ),

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

    'laboratorios_relevantes' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'parametro' VALUE l.nombre_examen,
          'valor' VALUE l.resultado || ' ' || NVL(l.unidad, ''),
          'fecha' VALUE TO_CHAR(l.fecha_resultado, 'YYYY-MM-DD')
        ) ORDER BY l.fecha_resultado DESC
      ), JSON_ARRAY())
      FROM laboratorios l
      WHERE l.id_episodio = p_episodio_id AND l.es_relevante = 'S'
    ),

    'diagnostico_egreso' VALUE (
      SELECT NVL(JSON_ARRAYAGG(
        JSON_OBJECT(
          'codigo' VALUE dx.codigo_cie10,
          'nombre' VALUE dx.descripcion
        ) ORDER BY dx.es_principal DESC
      ), JSON_ARRAY())
      FROM diagnosticos dx
      WHERE dx.id_episodio = p_episodio_id AND dx.tipo = 'EGRESO'
    ),

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
  WHEN NO_DATA_FOUND THEN RETURN NULL;
END get_discharge_summary_json;
/
```

---

# 8. MODELOS DE IA/LLM

## 8.1 Arquitectura de Modelos

El sistema soporta dos modos de ejecucion de modelos LLM:

### Modo Backend (GGUF)
Modelos ejecutados en el servidor via llama.cpp:

| Modelo | Archivo | Tamano | Uso |
|--------|---------|--------|-----|
| TinyLlama 1.1B Chat Q4 | `tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf` | 637MB | Desarrollo |
| Llama 3.2 3B Instruct Q4 | `Llama-3.2-3B-Instruct-Q4_K_M.gguf` | 1.9GB | Produccion balanceada |
| Mistral 7B Instruct Q4 | `mistral-7b-instruct-v0.2.Q4_K_M.gguf` | 4.1GB | Produccion alta calidad |

### Modo Frontend (ONNX - Transformers.js)
Modelos ejecutados directamente en el navegador con WebGPU/WASM:

| Modelo | ID | Tamano | Tipo | Recomendado |
|--------|-----|--------|------|-------------|
| Ministral 3B Instruct | `onnx-community/Ministral-3b-instruct` | ~1.9GB | `image-text-to-text` | ✅ Si |
| Phi-3.5 Mini Instruct | `onnx-community/Phi-3.5-mini-instruct-onnx-web` | ~2.3GB | `text-generation-web` | ❌ No (calidad) |
| Qwen3 4B | `Qwen3-4B-ONNX` (local) | ~2.8GB | `causal-lm` | ❌ No (calidad) |
| SmolLM2 1.7B | `HuggingFaceTB/SmolLM2-1.7B-Instruct` | ~1GB | `causal-lm` | Solo pruebas |

## 8.2 Configuracion de Modelos ONNX (Frontend)

### Tipos de Modelos Soportados

```typescript
// rag.types.ts
type ModelType = 'pipeline' | 'causal-lm' | 'image-text-to-text' | 'text-generation-web';

interface LLMModelConfig {
  id: string;           // ID del modelo (HuggingFace o local/)
  name: string;         // Nombre para mostrar en UI
  size: string;         // Tamano aproximado
  type: ModelType;      // Tipo de carga
  dtype: string;        // Cuantizacion (q4, q4f16, fp16)
  remoteOnly?: boolean; // Solo desde HuggingFace
  wasmOnly?: boolean;   // Solo WASM (sin WebGPU)
  recommended?: boolean;// Recomendado para produccion
  localPath?: string;   // Ruta local si id empieza con 'local/'
}
```

### Configuraciones de Generacion

```typescript
// rag.types.ts
const GENERATION_CONFIGS = {
  resumen_alta: {
    max_new_tokens: 500,
    min_length: 100,
    temperature: 0.3,
    top_p: 0.95,
    repetition_penalty: 1.2,
    do_sample: true
  },
  qwen3_thinking: {  // Para modelos con thinking mode
    max_new_tokens: 2048,  // 1000+ thinking + 500+ respuesta
    min_length: 100,
    temperature: 0.6,
    top_p: 0.95,
    repetition_penalty: 1.1,
    do_sample: true
  }
};
```

### Thinking Mode (Qwen3)

Qwen3 soporta un modo de "pensamiento" donde el modelo razona antes de responder:

```typescript
// local-rag.service.ts
const isQwen3 = this.currentModelConfig?.id?.toLowerCase().includes('qwen3');

if (isQwen3) {
  effectiveConfig = GENERATION_CONFIGS['qwen3_thinking'];
  templateOptions.enable_thinking = true;
}

// Post-procesamiento: extraer respuesta despues de </think>
if (cleaned.includes('<think>') && cleaned.includes('</think>')) {
  const thinkEndIndex = cleaned.indexOf('</think>');
  cleaned = cleaned.substring(thinkEndIndex + '</think>'.length).trim();
}
```

## 8.3 Servicio LocalRAG (Frontend)

### Inicializacion

```typescript
// local-rag.service.ts
async initialize(): Promise<void> {
  // Cargar Transformers.js desde CDN
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';
  this.transformers = await this.loadTransformersFromCDN(cdnUrl);

  // Configurar entorno
  this.env = this.transformers.env;
  this.env.allowLocalModels = false;
  this.env.allowRemoteModels = true;

  // Configurar threads WASM
  if (window.crossOriginIsolated) {
    this.env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
  } else {
    this.env.backends.onnx.wasm.numThreads = 1;
  }
}
```

### Carga de Modelos por Tipo

```typescript
async loadModel(modelId: string): Promise<void> {
  const config = this.getModelConfig(modelId);

  switch (config.type) {
    case 'causal-lm':
      this.tokenizer = await AutoTokenizer.from_pretrained(modelPath);
      this.llm = await AutoModelForCausalLM.from_pretrained(modelPath, {
        dtype: config.dtype,
        device: deviceType
      });
      break;

    case 'image-text-to-text':
      this.processor = await AutoProcessor.from_pretrained(modelPath);
      this.llm = await AutoModelForImageTextToText.from_pretrained(modelPath, {
        dtype: config.dtype,
        device: deviceType
      });
      break;

    case 'text-generation-web':
      this.llm = await pipeline('text-generation', modelPath, {
        dtype: config.dtype,
        device: deviceType
      });
      break;
  }
}
```

## 8.4 Validacion de Output (Frontend)

### Sistema de Validacion

```typescript
// local-rag.service.ts
validateOutput(output: string, chunks: Chunk[]): LocalValidationResult {
  const warnings: ValidationWarning[] = [];

  // 1. Validar codigos ATC presentes
  for (const codigoATC of codigosATCEsperados) {
    if (!output.includes(codigoATC)) {
      warnings.push({ type: 'unmatched_indication', message: `Código ATC faltante: ${codigoATC}` });
    }
  }

  // 2. Validar codigos CIE-10 presentes
  for (const codigoCIE of codigosCIE10) {
    if (!output.includes(codigoCIE)) {
      warnings.push({ type: 'unmatched_indication', message: `Código CIE-10 faltante: ${codigoCIE}` });
    }
  }

  // 3. Detectar patrones de alucinacion
  const hallucinations = [
    { pattern: /uci/i, name: 'UCI', checkContext: true },
    { pattern: /sepsis/i, name: 'Sepsis', checkContext: true },
    { pattern: /intubaci[oó]n/i, name: 'Intubación', checkContext: true },
    // ... mas patrones
  ];

  // 4. Detectar deterioro clinico inventado
  const deterioroPatterns = [
    { pattern: /descompensaci[oó]n/i, name: 'descompensación' },
    { pattern: /deterioro\s*cl[ií]nico/i, name: 'deterioro clínico' },
    // ... mas patrones
  ];

  // 5. Validar numeros contra contexto de alta
  // NOTA: Solo valida contra chunk de alta, puede generar falsos positivos
  //       para codigos de procedimientos en otros chunks

  return { ok: highSeverityCount === 0, warnings };
}
```

### Tipos de Warnings

| Tipo | Severidad | Descripcion |
|------|-----------|-------------|
| `unmatched_indication` | medium | Codigo ATC/CIE-10 faltante en output |
| `invented_number` | medium/high | Numero no presente en contexto |
| `invented_section` | high | Patron de alucinacion detectado |
| `invented_duration` | medium | Duracion posiblemente inventada |

## 8.5 Modelos Locales (Backend)

### Configuracion de Variables de Entorno

```bash
# .env
MODEL_TYPE=local
LLM_MODEL_PATH=../models/llm/tinyllama-1.1b-chat-q4/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small

# Parametros de inferencia
MAX_TOKENS=2048
TEMPERATURE=0.3
TOP_P=0.9
TOP_K=40
N_THREADS=4
```

### Descarga de Modelos GGUF

```python
# download_models.py
from huggingface_hub import hf_hub_download

# TinyLlama
hf_hub_download(
    repo_id="TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
    filename="tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    local_dir="./models/llm/tinyllama-1.1b-chat-q4"
)

# Multilingual E5-small (Embeddings)
hf_hub_download(
    repo_id="intfloat/multilingual-e5-small",
    local_dir="./models/embeddings/multilingual-e5-small"
)
```

## 8.6 Modelos ONNX Locales (Frontend via Backend)

Para servir modelos ONNX desde el backend local:

### Estructura de Directorios

```
epicrisis-app/
  models/
    Ministral-3b-instruct/
      config.json
      tokenizer.json
      tokenizer_config.json
      onnx/
        model_q4f16.onnx
        model_q4f16.onnx_data
    Qwen3-4B-ONNX/
      config.json
      tokenizer.json
      tokenizer_config.json
      generation_config.json
      onnx/
        model_q4f16.onnx
        model_q4f16.onnx_data
        model_q4f16.onnx_data_1
```

### Configuracion del Backend para Servir Modelos

```typescript
// backend/src/index.ts
app.use('/models', express.static(path.join(__dirname, '../../models')));

// Endpoint de configuracion ONNX
app.get('/api/onnx-config', (req, res) => {
  res.json({
    modelSource: 'local',
    modelsBaseUrl: '/models',
    availableModels: ['Ministral-3b-instruct', 'Qwen3-4B-ONNX']
  });
});
```

### Nota sobre .gitignore

Los modelos ONNX son muy grandes (1-3GB) y no se suben al repositorio:

```gitignore
# .gitignore
models/
*.onnx
*.onnx_data
```

## 8.7 Recomendaciones de Uso

| Caso de Uso | Modelo Recomendado | Razon |
|-------------|-------------------|-------|
| Produccion (calidad) | Ministral 3B | Mejor calidad en espanol clinico |
| Desarrollo/Pruebas | SmolLM2 1.7B | Rapido, bajo consumo de memoria |
| Sin WebGPU | Cualquiera con `wasmOnly: true` | Compatible con todos los navegadores |
| Razonamiento complejo | Qwen3 4B (thinking) | Permite al modelo "pensar" antes de responder |

### Limitaciones Conocidas

1. **Phi-3.5**: Calidad pobre en espanol clinico, mezcla idiomas
2. **Qwen3-4B**: Errores ortograficos, fechas incorrectas, codigos corruptos incluso con thinking mode
3. **Validacion de numeros**: Puede generar falsos positivos para codigos de procedimientos que estan en chunks diferentes al de alta

---

# 9. FLUJO DE DATOS COMPLETO

## 9.1 Flujo de Busqueda de Episodio

```
1. Usuario ingresa ID de episodio en input
2. Usuario presiona "Buscar" o Enter
3. EpisodeSearchComponent llama epicrisisService.getEpisodeData(id)
4. EpicrisisService hace GET /api/episodes/{id}
5. Backend:
   a. Valida ID numerico
   b. Verifica existencia con oracleService.episodeExists()
   c. Obtiene datos con oracleService.getDischargeSummary()
   d. Normaliza datos con normalizerService.normalize()
   e. Obtiene info paciente con oracleService.getPatientInfo()
   f. Retorna { episodeId, clinicalData, patientInfo, processingTimeMs }
6. EpicrisisService actualiza signals: clinicalData, patientInfo, episodeId
7. JsonViewerComponent reactivamente muestra datos en tabs
```

## 9.2 Flujo de Generacion de Epicrisis

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

## 9.3 Flujo de Exportacion

```
1. Usuario presiona "Exportar a PDF/Word"
2. ExportOptionsComponent llama epicrisisService.exportToPDF/Word()
3. EpicrisisService hace POST /api/export/pdf o /word
4. Backend:
   a. Recibe texto, patientName, episodeId
   b. Genera documento con exportService.generatePDF/Word()
   c. Retorna Buffer
5. Frontend:
   a. Recibe Blob
   b. Crea URL de descarga
   c. Dispara descarga automatica
   d. Muestra snackbar de exito
```

---

# 10. CONFIGURACION Y DESPLIEGUE

## 10.1 Variables de Entorno Backend

```bash
# Oracle
DB_USER=your_oracle_user
DB_PASSWORD=your_oracle_password
DB_CONNECT_STRING=localhost:1521/ORCLPDB1
DB_POOL_MIN=2
DB_POOL_MAX=10

# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:4200,http://localhost:3000

# LLM
MODEL_TYPE=local
LLM_MODEL_PATH=../models/llm/tinyllama-1.1b-chat-q4/...
EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small
MAX_TOKENS=2048
TEMPERATURE=0.3
N_THREADS=4

# Validacion
ENABLE_VALIDATION=true

# Logging
LOG_LEVEL=info

# Exportacion
EXPORT_TMP_DIR=./tmp/exports
HOSPITAL_NAME=Hospital Regional
```

## 10.2 Variables de Entorno Frontend

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};

// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api'
};
```

## 10.3 Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: epicrisis-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_CONNECT_STRING=${DB_CONNECT_STRING}
      - LLM_MODEL_PATH=/app/models/llm/tinyllama-1.1b-chat-q4
    volumes:
      - ./models:/app/models:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    container_name: epicrisis-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

networks:
  default:
    name: epicrisis-network
```

## 10.4 Comandos de Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm start        # Produccion

# Frontend
cd frontend
npm install
npm start        # Desarrollo (port 4200)
npm run build    # Build produccion

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

# 11. PROMPT DE GENERACION DE CODIGO

## Prompt Completo para Reproducir el Sistema

```
Crea un sistema completo de generacion automatica de epicrisis hospitalarias con las siguientes especificaciones:

## ARQUITECTURA

Sistema full-stack con:
- Backend: Node.js + TypeScript + Express (port 3000)
- Frontend: Angular 21 standalone + Material Design (port 4200)
- Base de datos: Oracle 19c con PL/SQL
- LLM Local: TinyLlama/Mistral via GGUF (opcional)

## BACKEND

### Estructura
```
backend/src/
  index.ts              # Servidor Express con helmet, cors, morgan
  config/
    database.ts         # Pool de conexiones Oracle con oracledb
    logger.ts           # Winston con rotacion diaria + FlowLogger
  routes/
    epicrisisRoutes.ts  # 7 endpoints REST
  services/
    llmService.ts       # Generacion con prompts y regeneracion
    validatorService.ts # Whitelist + deteccion de alucinaciones
    normalizerService.ts # Normalizacion de datos clinicos
    oracleService.ts    # Consultas a Oracle
    exportService.ts    # PDF (pdfkit) y Word (docx)
    ragService.ts       # RAG opcional con embeddings
  types/
    clinical.types.ts   # Interfaces TypeScript
  utils/
    synonyms.ts         # Diccionario sinonimos medicos chilenos
```

### Endpoints
- GET /api/episodes/:id - Obtener datos clinicos
- POST /api/generate-epicrisis - Generar epicrisis
- POST /api/regenerate-epicrisis - Regenerar con correcciones
- POST /api/validate-epicrisis - Validar texto
- POST /api/export/pdf - Exportar PDF
- POST /api/export/word - Exportar Word
- GET /api/health - Health check

### Caracteristicas Backend
1. Sistema de validacion por whitelist que detecta alucinaciones
2. Auto-regeneracion si hay violaciones
3. Soporte de sinonimos medicos chilenos
4. FlowLogger para trazabilidad completa
5. Normalizacion de vias (VO, EV, IM, SC) y codigos (CIE-10, ATC)

## FRONTEND

### Estructura
```
frontend/src/app/
  app.component.ts      # Layout principal con toolbar + grid
  app.config.ts         # Standalone + zoneless
  core/
    services/
      api.service.ts        # HTTP wrapper
      epicrisis.service.ts  # Estado con Signals
    models/
      clinical.types.ts     # Interfaces
    interceptors/
      http-error.interceptor.ts
  features/
    episode-search/     # Busqueda con input + boton
    json-viewer/        # Tabs: Resumen, Procedimientos, Medicamentos, Evolucion, Labs, JSON
    epicrisis-generator/ # Texto + botones generar/regenerar/editar/validar
    validation-panel/   # Estado validacion + lista violaciones
    export-options/     # Botones PDF/Word/Copiar
```

### Caracteristicas Frontend
1. Angular 21 con standalone components
2. Zoneless change detection
3. Signals para estado reactivo
4. Control flow moderno (@if, @for)
5. Angular Material 21 (toolbar, cards, tabs, chips, accordion, tables)
6. Layout responsivo con grid de 2 columnas

## BASE DE DATOS ORACLE

### Tablas
- pacientes (id_paciente, rut, nombre, apellidos, fecha_nacimiento, sexo)
- atenciones (id_episodio, id_paciente, fecha_ingreso, fecha_alta, motivo_ingreso, estado)
- diagnosticos (id_episodio, tipo INGRESO/EGRESO, codigo_cie10, descripcion)
- procedimientos (id_episodio, codigo, descripcion, fecha_realizacion)
- medicamentos_hospitalarios (id_episodio, codigo_atc, nombre, dosis, via, frecuencia)
- medicamentos_alta (id_episodio, codigo_atc, nombre, dosis, via, frecuencia, duracion)
- evoluciones (id_episodio, fecha, nota_evolucion CLOB, nombre_profesional)
- laboratorios (id_episodio, nombre_examen, resultado, es_relevante)
- controles_alta (id_episodio, descripcion)
- recomendaciones_alta (id_episodio, descripcion)

### Funcion PL/SQL
get_discharge_summary_json(p_episodio_id) RETURN CLOB
- Retorna JSON con toda la informacion clinica del episodio
- Usa JSON_OBJECT, JSON_ARRAYAGG, NVL

## ESTRUCTURA JSON CLINICO

```typescript
interface ClinicalJson {
  motivo_ingreso: string;
  diagnostico_ingreso: { codigo: string; nombre: string; }[];
  procedimientos: { codigo: string; nombre: string; fecha: string; }[];
  tratamientos_intrahosp: { codigo: string; nombre: string; dosis: string; via: string; frecuencia: string; }[];
  evolucion: { fecha: string; nota: string; profesional?: string; }[];
  laboratorios_relevantes: { parametro: string; valor: string; fecha: string; }[];
  diagnostico_egreso: { codigo: string; nombre: string; }[];
  indicaciones_alta: {
    medicamentos: { codigo: string; nombre: string; dosis: string; via: string; frecuencia: string; duracion?: string; }[];
    controles: string[];
    recomendaciones: string[];
  };
}
```

## PROMPT DE GENERACION LLM

"Eres un medico especialista en medicina interna. Genera un informe de alta hospitalaria (epicrisis) en espanol de Chile. Usa EXCLUSIVAMENTE la informacion del JSON proporcionado. NO inventes ni agregues informacion. Incluye SIEMPRE los codigos entre parentesis. Si falta informacion, escribe 'No consignado'. Formato: UN SOLO PARRAFO continuo."

## VALIDACION

Sistema de whitelist que:
1. Crea listas de codigos/nombres permitidos desde datos clinicos
2. Extrae n-gramas (2-6 palabras) del texto generado
3. Detecta menciones medicas con triggers (mg, ev, vo, diagnostico, cirugia, etc)
4. Ignora frases comunes y sintomas genericos
5. Solo marca violaciones si tienen sufijos medicos (-itis, -osis, -emia)
6. Aplica diccionario de sinonimos chilenos

## ESTILOS VISUALES

- Color primario: #1976d2 (azul Material)
- Toolbar sticky con sombra
- Cards con header (icono + titulo + subtitulo)
- Grid responsivo 2 columnas (1 en mobile)
- Footer oscuro #263238
- Estados success verde #4caf50, error rojo #f44336
- Chips para diagnosticos, accordion para procedimientos, timeline para evoluciones

## DEPENDENCIAS

Backend: express, cors, helmet, morgan, oracledb, winston, pdfkit, docx, dotenv, typescript
Frontend: @angular/core@21, @angular/material@21, rxjs@7.8

Genera el codigo completo para reproducir este sistema.
```

---

# FIN DEL DOCUMENTO

Este documento contiene toda la informacion necesaria para reproducir completamente el Sistema de Epicrisis Automatica, incluyendo:

- Arquitectura y flujo de datos
- Codigo de backend completo (servicios, rutas, tipos)
- Codigo de frontend completo (componentes, servicios, estilos)
- Esquema de base de datos Oracle
- Configuracion de modelos LLM
- Variables de entorno y despliegue
- Prompt unificado para generacion de codigo

Para generar el sistema desde cero, utilizar el prompt de la seccion 11 con un modelo de lenguaje avanzado.
