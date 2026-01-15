# Inferencia LLM Real en Backend con Transformers.js

## Resumen

Este documento describe la implementación de inferencia LLM real en el backend Node.js usando `@huggingface/transformers` con ONNX Runtime, reemplazando la generación determinista/mock anterior.

**Estado Actual:** Modelo `onnx-community/Qwen2.5-0.5B-Instruct` funcionando con inferencia real (~50-60s en CPU).

---

## 1. Arquitectura de Inferencia

### 1.1 Flujo de Generación

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Angular)                          │
│                                                                     │
│  ┌─────────────┐    POST /api/generate-epicrisis    ┌────────────┐ │
│  │ Componente  │ ──────────────────────────────────>│  Backend   │ │
│  │ Epicrisis   │                                     │  Express   │ │
│  └─────────────┘                                     └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                    │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐ │
│  │ epicrisisRoutes │───>│   llmService     │───>│ Transformers.js│ │
│  │     .ts         │    │      .ts         │    │  + ONNX Runtime│ │
│  └─────────────────┘    └──────────────────┘    └────────────────┘ │
│                                   │                                 │
│                                   ▼                                 │
│                         ┌──────────────────┐                        │
│                         │  Qwen2.5-0.5B    │                        │
│                         │   (q4f16 ONNX)   │                        │
│                         │     ~461MB       │                        │
│                         └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Comparación: Mock vs Real

| Aspecto | Modo Determinista (Anterior) | Inferencia Real (Actual) |
|---------|------------------------------|--------------------------|
| Tiempo de respuesta | ~19ms | ~50-60s (CPU) |
| Calidad de texto | Template fijo | Generación variada |
| Uso de recursos | Mínimo | Alto (CPU/RAM) |
| Dependencias | Ninguna | @huggingface/transformers |
| Tamaño del modelo | N/A | ~461MB (q4f16) |

---

## 2. Configuración del Backend

### 2.1 Dependencias Instaladas

```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.x",
    "express": "^4.18.2"
  }
}
```

### 2.2 Variables de Entorno (.env)

```bash
# Modelo ONNX para Transformers.js
LLM_ONNX_MODEL_PATH=../models/onnx-community/Qwen2.5-0.5B-Instruct

# Desactivar fallback para usar modelo real
USE_DETERMINISTIC_FALLBACK=false

# Configuración de inferencia
MAX_TOKENS=512
TEMPERATURE=0.3
TOP_P=0.9
TOP_K=40
```

### 2.3 Estructura de Archivos

```
backend/
├── src/
│   ├── services/
│   │   └── llmService.ts      # Servicio de inferencia LLM
│   ├── routes/
│   │   └── epicrisisRoutes.ts # API endpoints
│   └── types/
│       └── modules.d.ts       # Declaraciones de tipos
├── package.json
└── .env
```

---

## 3. Servicio LLM (llmService.ts)

### 3.1 Inicialización del Modelo

```typescript
async initialize(): Promise<void> {
  // Importar @huggingface/transformers dinámicamente
  const transformers = await import('@huggingface/transformers');
  pipeline = transformers.pipeline;

  // Crear pipeline de generación de texto
  this.generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
    dtype: 'q4f16',        // Cuantización 4-bit
    device: 'auto',        // CPU o GPU automático
    cache_dir: cacheDir,   // Caché local
  });
}
```

### 3.2 Chat Template de Qwen

El modelo Qwen2.5 requiere un formato específico de prompt:

```
<|im_start|>system
Eres un médico especialista en medicina interna...
<|im_end|>
<|im_start|>user
Genera la epicrisis para el siguiente paciente:

JSON CLÍNICO:
{...datos clínicos...}
<|im_end|>
<|im_start|>assistant
```

### 3.3 Parámetros de Generación

```typescript
const output = await this.generator(prompt, {
  max_new_tokens: 512,      // Máximo de tokens a generar
  temperature: 0.3,         // Creatividad (0.1-1.0)
  top_p: 0.9,              // Nucleus sampling
  top_k: 40,               // Top-K sampling
  do_sample: true,         // Habilitar sampling
  return_full_text: false, // Solo texto nuevo
  pad_token_id: 151645,    // Token de padding (Qwen)
  eos_token_id: 151645     // Token de fin (Qwen)
});
```

### 3.4 Fallback Determinista

Si el modelo falla al cargar, el sistema activa automáticamente un modo fallback:

```typescript
if (this.useFallback || !this.generator) {
  return this.generateDeterministicEpicrisis(clinicalData);
}
```

---

## 4. API Endpoints

### 4.1 POST /api/generate-epicrisis

**Request:**
```json
{
  "clinicalData": {
    "motivo_ingreso": "Dolor torácico agudo",
    "diagnostico_ingreso": [{"codigo": "I20.0", "nombre": "Angina inestable"}],
    "diagnostico_egreso": [{"codigo": "I21.0", "nombre": "Infarto agudo"}],
    "procedimientos": [{"codigo": "K492", "nombre": "Coronariografía", "fecha": "2024-01-15"}],
    "tratamientos_intrahosp": [...],
    "evolucion": [...],
    "indicaciones_alta": {...}
  }
}
```

**Response:**
```json
{
  "text": "Paciente ingresa por dolor torácico agudo con diagnóstico de angina inestable (I20.0)...",
  "validation": {
    "ok": true,
    "violations": []
  },
  "generatedAt": "2026-01-15T03:19:11.260Z",
  "processingTimeMs": 51962
}
```

### 4.2 GET /api/health

Verifica el estado del modelo LLM:

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T03:11:35.721Z",
  "llm": {
    "ready": true,
    "modelPath": "/path/to/models/onnx-community/Qwen2.5-0.5B-Instruct",
    "fallbackMode": false
  }
}
```

---

## 5. Modelos Disponibles

### 5.1 Modelo Actual: Qwen2.5-0.5B-Instruct

| Propiedad | Valor |
|-----------|-------|
| Fuente | onnx-community/Qwen2.5-0.5B-Instruct |
| Tamaño | ~461MB (q4f16) |
| Parámetros | 0.5B |
| Cuantización | 4-bit (q4f16) |
| Tiempo inferencia | ~50-60s (CPU) |

### 5.2 Alternativa: Modelo Fine-tuned (Pendiente)

Para usar el modelo fine-tuned `epicrisis-q4f16-finetuned`:

1. Asegurar que el modelo esté en formato compatible con Transformers.js
2. Actualizar `LLM_ONNX_MODEL_PATH` en `.env`
3. Verificar que tenga la estructura de archivos correcta

---

## 6. Prompt de Sistema

El prompt está optimizado para generación de epicrisis clínicas:

```
Eres un médico especialista en medicina interna. Genera un informe de alta hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo párrafo corrido):
- Motivo y diagnóstico de ingreso (incluye código CIE-10 entre paréntesis)
- Procedimientos y tratamientos relevantes durante hospitalización (incluye códigos entre paréntesis)
- Evolución clínica resumida (por días si corresponde, sin repetir)
- Diagnóstico(s) de egreso (incluye código CIE-10 entre paréntesis)
- Indicaciones post-alta: medicamentos con dosis/vía/frecuencia/duración (incluye código ATC entre paréntesis)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la información del JSON proporcionado
2. NO inventes ni agregues información
3. Incluye SIEMPRE los códigos entre paréntesis para dx, procedimientos y medicamentos
4. Si falta información, escribe "No consignado"
5. Escribe en español clínico de Chile
6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea
```

---

## 7. Validación Post-Generación

El sistema valida automáticamente el texto generado contra una whitelist de términos médicos permitidos:

```typescript
const validation = validatorService.validateEpicrisis(epicrisisText, normalizedData);

if (!validation.ok) {
  // Regenerar con correcciones
  const correctedText = await llmService.regenerateWithCorrections(
    normalizedData,
    validation.violations
  );
}
```

### 7.1 Tipos de Violaciones

| Tipo | Descripción |
|------|-------------|
| `dx` | Diagnóstico no presente en datos de entrada |
| `proc` | Procedimiento no presente en datos de entrada |
| `med` | Medicamento no presente en datos de entrada |

---

## 8. Rendimiento y Optimización

### 8.1 Métricas Observadas

| Métrica | Valor |
|---------|-------|
| Carga inicial del modelo | ~30-60s |
| Inferencia por request | ~50-60s (CPU) |
| Uso de RAM | ~2-3GB |
| Tamaño modelo en disco | ~461MB |

### 8.2 Recomendaciones para Producción

1. **Pre-cargar modelo al iniciar:** El modelo se carga durante `server.initialize()`
2. **Usar GPU si disponible:** Configurar `device: 'cuda'` en sistemas con NVIDIA
3. **Caché de modelo:** El modelo se cachea en `models/.cache` después de la primera descarga
4. **Aumentar memoria Node.js:** `NODE_OPTIONS="--max-old-space-size=4096"`

### 8.3 Para Mejor Rendimiento

```bash
# Ejecutar con más memoria
NODE_OPTIONS="--max-old-space-size=4096" npm run start

# O en package.json scripts
"start": "NODE_OPTIONS='--max-old-space-size=4096' node dist/index.js"
```

---

## 9. Troubleshooting

### 9.1 Error: Model not found

```
Error: Could not locate file: ".../config.json"
```

**Solución:** Verificar que el modelo esté descargado correctamente:
```bash
ls -la models/.cache/models--onnx-community--Qwen2.5-0.5B-Instruct/
```

### 9.2 Fallback Mode Activado

Si el health check muestra `fallbackMode: true`:

1. Verificar logs de inicialización
2. Comprobar que `@huggingface/transformers` esté instalado
3. Verificar conexión a internet (para primera descarga)

### 9.3 Error de Memoria

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solución:** Aumentar límite de memoria de Node.js:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 9.4 Timeout en Requests

La inferencia puede tomar ~60 segundos. Configurar timeout apropiado en cliente:

```typescript
// Angular HttpClient
this.http.post(url, data, { timeout: 120000 }) // 2 minutos
```

---

## 10. Próximos Pasos

1. **Optimizar tiempo de inferencia:** Considerar GPU o modelo más pequeño
2. **Integrar modelo fine-tuned:** Usar `epicrisis-q4f16-finetuned` cuando esté listo
3. **Implementar streaming:** Devolver tokens mientras se generan
4. **Caché de respuestas:** Para inputs idénticos, devolver respuestas cacheadas

---

## 11. Referencias

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript.html)
- [Qwen2.5 Model Card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct)
- [onnx-community Models](https://huggingface.co/onnx-community)

---

*Documento creado: 15/01/2026*
*Última actualización: 15/01/2026*
