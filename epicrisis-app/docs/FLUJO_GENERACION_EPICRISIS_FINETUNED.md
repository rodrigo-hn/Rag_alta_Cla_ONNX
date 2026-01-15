# Flujo de Generación de Epicrisis con Modelo Fine-tuned

## Resumen Ejecutivo

Este documento describe el flujo completo de generación de resúmenes de epicrisis utilizando un modelo LLM fine-tuned, desde la entrada de datos clínicos estructurados hasta la salida de texto narrativo validado.

**Modelo:** Qwen2.5-0.5B-Instruct (base) / Qwen2.5-1.5B Fine-tuned (especializado)
**Formato de entrada:** JSON estructurado optimizado
**Formato de salida:** Párrafo narrativo clínico en español

---

## 1. Arquitectura General del Flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO COMPLETO                                  │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐│
│  │  ORACLE  │───>│NORMALIZAR│───>│ PREPARAR │───>│INFERENCIA│───>│VALIDAR ││
│  │   (HIS)  │    │   JSON   │    │  PROMPT  │    │   LLM    │    │ OUTPUT ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘│
│       │               │               │               │               │     │
│       ▼               ▼               ▼               ▼               ▼     │
│   Datos RAW      ClinicalJson    Chat Template   Texto Gen.     Epicrisis  │
│   (queries)      (estructurado)  (Qwen format)   (~50-60s)      Validada   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Etapa 1: Obtención de Datos Clínicos

### 2.1 Fuente de Datos

Los datos provienen del sistema HIS (Hospital Information System) en Oracle:

```sql
-- Ejemplo de queries ejecutadas
SELECT * FROM DIAGNOSTICOS WHERE EPISODIO_ID = :id;
SELECT * FROM PROCEDIMIENTOS WHERE EPISODIO_ID = :id;
SELECT * FROM MEDICAMENTOS WHERE EPISODIO_ID = :id;
SELECT * FROM EVOLUCIONES WHERE EPISODIO_ID = :id;
```

### 2.2 Endpoint de Obtención

```
GET /api/episodes/:id
```

**Response:**
```json
{
  "episodeId": "12345",
  "clinicalData": { ... },
  "patientInfo": {
    "nombre": "Juan Pérez",
    "rut": "12.345.678-9",
    "fechaNacimiento": "1952-03-15"
  }
}
```

---

## 3. Etapa 2: Normalización del JSON Clínico

### 3.1 Estructura de Entrada Completa (ClinicalJson)

```typescript
interface ClinicalJson {
  motivo_ingreso: string;
  diagnostico_ingreso: DiagnosisItem[];      // Código CIE-10 + nombre
  procedimientos: ProcedureItem[];            // Código + nombre + fecha
  tratamientos_intrahosp: MedicationItem[];   // Código ATC + dosis + vía
  evolucion: EvolutionItem[];                 // Fecha + nota
  laboratorios_relevantes: LabItem[];         // Parámetro + valor
  diagnostico_egreso: DiagnosisItem[];        // Código CIE-10 + nombre
  indicaciones_alta: DischargeInstructions;   // Medicamentos + controles
}
```

### 3.2 Ejemplo de JSON Completo

```json
{
  "motivo_ingreso": "Dolor torácico agudo",
  "diagnostico_ingreso": [
    {"codigo": "I20.0", "nombre": "Angina inestable"}
  ],
  "diagnostico_egreso": [
    {"codigo": "I21.0", "nombre": "Infarto agudo de miocardio de pared anterior"}
  ],
  "procedimientos": [
    {"codigo": "K492", "nombre": "Coronariografía", "fecha": "2024-01-15"},
    {"codigo": "K493", "nombre": "Angioplastía coronaria", "fecha": "2024-01-15"}
  ],
  "tratamientos_intrahosp": [
    {"codigo": "B01AC06", "nombre": "Aspirina", "dosis": "300mg", "via": "oral", "frecuencia": "carga"},
    {"codigo": "B01AC04", "nombre": "Clopidogrel", "dosis": "600mg", "via": "oral", "frecuencia": "carga"},
    {"codigo": "B01AB05", "nombre": "Enoxaparina", "dosis": "60mg", "via": "SC", "frecuencia": "c/12h"}
  ],
  "evolucion": [
    {"fecha": "2024-01-14", "nota": "Paciente ingresa con dolor torácico típico de 3 horas de evolución. ECG con supradesnivel ST en V1-V4."},
    {"fecha": "2024-01-15", "nota": "Se realiza coronariografía que evidencia oclusión de DA. Se realiza angioplastía primaria exitosa con implante de stent."},
    {"fecha": "2024-01-16", "nota": "Evolución favorable. Sin dolor. Hemodinámicamente estable."}
  ],
  "laboratorios_relevantes": [
    {"parametro": "Troponina I", "valor": "15.2 ng/mL", "fecha": "2024-01-14"},
    {"parametro": "Creatinina", "valor": "0.9 mg/dL", "fecha": "2024-01-14"}
  ],
  "indicaciones_alta": {
    "medicamentos": [
      {"codigo": "B01AC06", "nombre": "Aspirina", "dosis": "100mg", "via": "oral", "frecuencia": "c/24h", "duracion": "indefinido"},
      {"codigo": "B01AC04", "nombre": "Clopidogrel", "dosis": "75mg", "via": "oral", "frecuencia": "c/24h", "duracion": "12 meses"},
      {"codigo": "C10AA05", "nombre": "Atorvastatina", "dosis": "80mg", "via": "oral", "frecuencia": "c/24h", "duracion": "indefinido"},
      {"codigo": "C07AB07", "nombre": "Bisoprolol", "dosis": "5mg", "via": "oral", "frecuencia": "c/24h", "duracion": "indefinido"}
    ],
    "controles": ["Control cardiología en 2 semanas", "Ecocardiograma en 1 mes"],
    "recomendaciones": ["Reposo relativo por 2 semanas", "Dieta hiposódica", "Evitar esfuerzos físicos"]
  }
}
```

---

## 4. Etapa 3: Formato Optimizado para Fine-tuning

### 4.1 Conversión a Formato Mínimo

Para el modelo fine-tuned, el JSON se simplifica a un formato optimizado:

```json
{
  "dx": ["Angina inestable (I20.0)"],
  "proc": ["Coronariografía (K492)", "Angioplastía coronaria (K493)"],
  "tto": ["Aspirina 300mg carga (B01AC06)", "Enoxaparina 60mg SC c/12h (B01AB05)"],
  "evo": "ECG con SDST V1-V4. Coronariografía: oclusión DA. Angioplastía exitosa con stent.",
  "dx_alta": ["IAM pared anterior (I21.0)"],
  "med": ["Aspirina 100mg VO c/24h indef (B01AC06)", "Clopidogrel 75mg VO c/24h 12m (B01AC04)"]
}
```

### 4.2 Campos del Formato Optimizado

| Campo | Descripción | Formato |
|-------|-------------|---------|
| `dx` | Diagnósticos de ingreso | Array de strings con código |
| `proc` | Procedimientos realizados | Array de strings con código |
| `tto` | Tratamiento intrahospitalario | Array de strings con dosis y código |
| `evo` | Evolución resumida | String narrativo corto |
| `dx_alta` | Diagnósticos de egreso | Array de strings con código |
| `med` | Medicamentos al alta | Array con dosis, vía, frecuencia, duración y código |

### 4.3 Función de Conversión

```typescript
function convertToClinicalInput(data: ClinicalJson): OptimizedInput {
  return {
    dx: data.diagnostico_ingreso.map(d => `${d.nombre} (${d.codigo})`),
    proc: data.procedimientos.map(p => `${p.nombre} (${p.codigo})`),
    tto: data.tratamientos_intrahosp.map(t =>
      `${t.nombre} ${t.dosis} ${t.via} ${t.frecuencia} (${t.codigo})`
    ),
    evo: summarizeEvolution(data.evolucion),
    dx_alta: data.diagnostico_egreso.map(d => `${d.nombre} (${d.codigo})`),
    med: data.indicaciones_alta.medicamentos.map(m =>
      `${m.nombre} ${m.dosis} ${m.via} ${m.frecuencia} ${m.duracion || ''} (${m.codigo})`
    )
  };
}
```

---

## 5. Etapa 4: Preparación del Prompt

### 5.1 Chat Template de Qwen

El modelo Qwen2.5 usa el formato ChatML:

```
<|im_start|>system
Eres un médico especialista en medicina interna. Genera un informe de alta
hospitalaria (epicrisis) en español de Chile...
<|im_end|>
<|im_start|>user
Epicrisis:
{"dx":["Angina inestable (I20.0)"],"proc":["Coronariografía (K492)"],...}
<|im_end|>
<|im_start|>assistant
```

### 5.2 System Prompt Completo

```
Eres un médico especialista en medicina interna. Genera un informe de alta
hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo párrafo corrido):
- Motivo y diagnóstico de ingreso (incluye código CIE-10 entre paréntesis)
- Procedimientos y tratamientos relevantes durante hospitalización (incluye códigos)
- Evolución clínica resumida (por días si corresponde, sin repetir)
- Diagnóstico(s) de egreso (incluye código CIE-10 entre paréntesis)
- Indicaciones post-alta: medicamentos con dosis/vía/frecuencia/duración (incluye ATC)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la información del JSON proporcionado
2. NO inventes ni agregues información
3. Incluye SIEMPRE los códigos entre paréntesis para dx, procedimientos y medicamentos
4. Si falta información, escribe "No consignado"
5. Escribe en español clínico de Chile
6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea
```

### 5.3 Construcción del Prompt en Código

```typescript
private applyChatTemplate(messages: Array<{role: string, content: string}>): string {
  let prompt = '';
  for (const msg of messages) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
  }
  prompt += '<|im_start|>assistant\n';
  return prompt;
}
```

---

## 6. Etapa 5: Inferencia del Modelo

### 6.1 Parámetros de Generación

```typescript
const generationConfig = {
  max_new_tokens: 512,      // Máximo de tokens a generar
  temperature: 0.3,         // Baja creatividad para texto médico preciso
  top_p: 0.9,              // Nucleus sampling
  top_k: 40,               // Top-K sampling
  do_sample: true,         // Habilitar sampling
  return_full_text: false, // Solo texto nuevo generado
  pad_token_id: 151645,    // EOS token de Qwen
  eos_token_id: 151645     // Fin de secuencia
};
```

### 6.2 Proceso de Inferencia

```typescript
async generateEpicrisis(clinicalData: ClinicalJson): Promise<string> {
  // 1. Preparar prompt
  const clinicalJsonStr = JSON.stringify(clinicalData, null, 2);
  const messages = [
    { role: 'system', content: EPICRISIS_SYSTEM_PROMPT },
    { role: 'user', content: `Genera la epicrisis:\n\n${clinicalJsonStr}` }
  ];
  const prompt = this.applyChatTemplate(messages);

  // 2. Ejecutar inferencia
  const output = await this.generator(prompt, generationConfig);

  // 3. Extraer y limpiar texto
  let generatedText = output[0].generated_text || '';
  generatedText = this.cleanGeneratedText(generatedText);

  return generatedText;
}
```

### 6.3 Métricas de Tiempo

| Etapa | Tiempo Aproximado |
|-------|-------------------|
| Preparación prompt | <10ms |
| Tokenización | ~100ms |
| Inferencia (CPU) | 45-60s |
| Post-procesamiento | <10ms |
| **Total** | **~50-60s** |

---

## 7. Etapa 6: Validación del Output

### 7.1 Sistema de Whitelist

El texto generado se valida contra listas blancas derivadas del JSON de entrada:

```typescript
interface ValidationResult {
  ok: boolean;
  violations: ValidationViolation[];
}

interface ValidationViolation {
  type: 'dx' | 'proc' | 'med';  // Tipo de violación
  mention: string;              // Término encontrado
  reason: string;               // Razón de la violación
}
```

### 7.2 Proceso de Validación

```typescript
function validateEpicrisis(text: string, data: ClinicalJson): ValidationResult {
  const violations: ValidationViolation[] = [];

  // Construir whitelists
  const allowedDx = [
    ...data.diagnostico_ingreso.map(d => d.nombre.toLowerCase()),
    ...data.diagnostico_egreso.map(d => d.nombre.toLowerCase())
  ];
  const allowedProc = data.procedimientos.map(p => p.nombre.toLowerCase());
  const allowedMed = [
    ...data.tratamientos_intrahosp.map(m => m.nombre.toLowerCase()),
    ...data.indicaciones_alta.medicamentos.map(m => m.nombre.toLowerCase())
  ];

  // Buscar menciones no autorizadas
  // ... lógica de detección ...

  return {
    ok: violations.length === 0,
    violations
  };
}
```

### 7.3 Tipos de Violaciones Detectadas

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `dx` | Diagnóstico no en lista | "diabetes" cuando no está en dx_ingreso/egreso |
| `proc` | Procedimiento inventado | "resonancia" cuando no se realizó |
| `med` | Medicamento no indicado | "omeprazol" cuando no está en tratamientos |

---

## 8. Etapa 7: Regeneración con Correcciones

### 8.1 Flujo de Corrección

Si la validación detecta violaciones, se regenera el texto:

```
┌─────────────┐     ┌────────────┐     ┌─────────────┐
│ Texto Gen.  │────>│  Validar   │────>│ Violaciones │
└─────────────┘     └────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌────────────┐     ┌─────────────┐
│ Texto Corr. │<────│ Regenerar  │<────│   Prompt    │
└─────────────┘     │ con Correc │     │  Corregido  │
                    └────────────┘     └─────────────┘
```

### 8.2 Prompt de Corrección

```typescript
const CORRECTION_PROMPT = `Tu texto anterior contiene menciones NO permitidas.

VIOLACIONES DETECTADAS:
- Diagnóstico: "diabetes" (no está en lista permitida)
- Medicamento: "omeprazol" (no indicado en tratamiento)

LISTAS PERMITIDAS:
- Diagnósticos: Angina inestable (I20.0), IAM (I21.0)
- Procedimientos: Coronariografía (K492)
- Medicamentos: Aspirina (B01AC06), Clopidogrel (B01AC04)

Reescribe la epicrisis usando SOLO los términos permitidos.`;
```

---

## 9. Etapa 8: Output Final

### 9.1 Ejemplo de Epicrisis Generada

**Input (formato optimizado):**
```json
{
  "dx": ["Angina inestable (I20.0)"],
  "proc": ["Coronariografía (K492)", "Angioplastía (K493)"],
  "tto": ["Aspirina 300mg carga (B01AC06)", "Enoxaparina 60mg SC c/12h (B01AB05)"],
  "evo": "SDST V1-V4. Oclusión DA. Angioplastía exitosa con stent.",
  "dx_alta": ["IAM pared anterior (I21.0)"],
  "med": ["Aspirina 100mg VO c/24h (B01AC06)", "Clopidogrel 75mg VO c/24h 12m (B01AC04)"]
}
```

**Output (texto generado):**
```
Ingresa por angina inestable (I20.0) con ECG que muestra supradesnivel ST en
derivaciones V1-V4. Se realiza coronariografía (K492) que evidencia oclusión
de arteria descendente anterior, procediéndose a angioplastía coronaria (K493)
exitosa con implante de stent. Durante hospitalización recibió aspirina 300mg
como dosis de carga (B01AC06) y enoxaparina 60mg subcutáneo cada 12 horas
(B01AB05). Evoluciona favorablemente sin complicaciones. Alta con diagnóstico
de infarto agudo de miocardio de pared anterior (I21.0), indicándose aspirina
100mg vía oral cada 24 horas de forma indefinida (B01AC06) y clopidogrel 75mg
vía oral cada 24 horas por 12 meses (B01AC04).
```

### 9.2 Response del API

```json
{
  "text": "Ingresa por angina inestable (I20.0)...",
  "validation": {
    "ok": true,
    "violations": []
  },
  "generatedAt": "2026-01-15T12:30:45.123Z",
  "processingTimeMs": 52340
}
```

---

## 10. Comparación: Modelo Base vs Fine-tuned

### 10.1 Diferencias en el Output

| Aspecto | Modelo Base (Qwen2.5-0.5B) | Modelo Fine-tuned |
|---------|---------------------------|-------------------|
| Formato | Puede variar | Consistente (1 párrafo) |
| Códigos | A veces omite | Siempre incluye |
| Alucinaciones | Posibles | Minimizadas |
| Estilo | General | Clínico chileno |
| Longitud | Variable | Controlada |

### 10.2 Ejemplo de Diferencia

**Modelo Base:**
```
El paciente ingresó con dolor en el pecho. Se le hizo una coronariografía
y se encontró una obstrucción. Se colocó un stent. Se va de alta con
medicamentos para el corazón.
```

**Modelo Fine-tuned:**
```
Ingresa por angina inestable (I20.0). Se realiza coronariografía (K492)
evidenciando oclusión de DA, procediéndose a angioplastía (K493) con stent.
Alta con IAM (I21.0), indicándose aspirina 100mg VO c/24h (B01AC06) y
clopidogrel 75mg VO c/24h por 12 meses (B01AC04).
```

---

## 11. Configuración del Sistema

### 11.1 Variables de Entorno

```bash
# Modelo ONNX
LLM_ONNX_MODEL_PATH=../models/onnx-community/Qwen2.5-0.5B-Instruct

# Parámetros de generación
MAX_TOKENS=512
TEMPERATURE=0.3
TOP_P=0.9
TOP_K=40

# Fallback
USE_DETERMINISTIC_FALLBACK=false
```

### 11.2 Para Usar Modelo Fine-tuned

```bash
# Cambiar a modelo fine-tuned cuando esté disponible
LLM_ONNX_MODEL_PATH=../models/epicrisis-q4f16-finetuned
```

---

## 12. Dataset de Entrenamiento

### 12.1 Formato del Dataset

Cada ejemplo del dataset sigue este formato:

```json
{
  "instruction": "Epicrisis:",
  "input": {
    "dx": ["Diagnóstico (código)"],
    "proc": ["Procedimiento (código)"],
    "tto": ["Tratamiento dosis vía frecuencia (código)"],
    "evo": "Resumen de evolución",
    "dx_alta": ["Diagnóstico alta (código)"],
    "med": ["Medicamento dosis vía frecuencia duración (código)"]
  },
  "output": "Texto de epicrisis esperado..."
}
```

### 12.2 Estadísticas del Dataset

| Métrica | Valor |
|---------|-------|
| Total de ejemplos | 350 |
| Train set | 315 (90%) |
| Validation set | 35 (10%) |
| Promedio tokens input | ~150 |
| Promedio tokens output | ~100 |

---

## 13. Diagrama de Secuencia Completo

```
┌────────┐     ┌─────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│Frontend│     │ Backend │     │llmService │     │Transformers│    │Validator │
└───┬────┘     └────┬────┘     └─────┬─────┘     └─────┬────┘     └─────┬────┘
    │               │                │                 │                │
    │ POST /generate│                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │ normalize(data)│                 │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │ buildPrompt()   │                │
    │               │                │────────────────>│                │
    │               │                │                 │                │
    │               │                │    generate()   │                │
    │               │                │────────────────>│                │
    │               │                │                 │ (50-60s)       │
    │               │                │<────────────────│                │
    │               │                │     text        │                │
    │               │                │                 │                │
    │               │ validate(text) │                 │                │
    │               │───────────────────────────────────────────────────>│
    │               │                │                 │                │
    │               │<───────────────────────────────────────────────────│
    │               │   ValidationResult              │                │
    │               │                │                 │                │
    │<──────────────│                │                 │                │
    │   Response    │                │                 │                │
    │               │                │                 │                │
```

---

## 14. Troubleshooting

### 14.1 Texto Generado Muy Corto

**Causa:** El modelo puede terminar prematuramente.
**Solución:** Aumentar `max_new_tokens` o ajustar `temperature`.

### 14.2 Códigos Faltantes en Output

**Causa:** El modelo no aprendió bien el formato.
**Solución:** Verificar que el dataset tenga ejemplos consistentes con códigos.

### 14.3 Alucinaciones Frecuentes

**Causa:** Temperature muy alta o modelo base no fine-tuned.
**Solución:** Reducir `temperature` a 0.1-0.2 o usar modelo fine-tuned.

### 14.4 Timeout en Request

**Causa:** Inferencia toma ~60s en CPU.
**Solución:** Configurar timeout de cliente a 120s o implementar streaming.

---

## 15. Referencias

- [Dataset de Entrenamiento](../data_example/training_dataset_v3_template.jsonl)
- [Guía de Fine-tuning](./GUIA_FINETUNING_EPICRISIS.md)
- [Proceso de Cuantización](./PROCESO_CUANTIZACION_MODELO_FINETUNED.md)
- [Backend LLM Inferencia](./BACKEND_LLM_INFERENCIA_REAL.md)

---

*Documento creado: 15/01/2026*
*Última actualización: 15/01/2026*
