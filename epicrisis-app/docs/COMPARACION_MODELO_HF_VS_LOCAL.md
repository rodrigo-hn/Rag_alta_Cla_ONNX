# Comparación: Modelo HuggingFace vs Modelo Local Fine-tuned

## Resumen Ejecutivo

Este documento compara el modelo `onnx-community/Qwen2.5-0.5B-Instruct` de HuggingFace (que funciona) con nuestro modelo local `epicrisis-q4f16-finetuned` (que falla en Transformers.js pero funciona con ONNX Runtime directo).

---

## 1. Tabla Comparativa General

| Característica | HuggingFace | Local |
|----------------|-------------|-------|
| **Modelo base** | Qwen2.5-0.5B | Qwen2.5-1.5B |
| **Parámetros** | ~500M | ~1.5B |
| **Número de capas** | 24 | 28 |
| **Hidden size** | 896 | 1536 |
| **Formato** | q4f16 | q4f16 |
| **Tamaño archivo ONNX** | 483 MB (único archivo) | 0.9 MB + 1.2 GB (external data) |
| **External data format** | ❌ No | ✅ Sí |
| **ONNX Opset version** | 14 | 18 |
| **Funciona en browser** | ✅ Sí | ❌ No |
| **Funciona con ORT directo** | ✅ Sí | ✅ Sí |

---

## 2. Diferencias Estructurales del ONNX

### 2.1 Número de Inputs/Outputs

| Modelo | Inputs | Outputs |
|--------|--------|---------|
| HuggingFace | 51 | 49 |
| Local | 59 | 57 |

**Diferencia:** El modelo local tiene 8 inputs más (28 capas × 2 KV vs 24 capas × 2 KV = 8 más).

### 2.2 Tipos de Datos de Inputs

```
HuggingFace: {'INT64': 3, 'FLOAT': 48}
Local:       {'INT64': 3, 'FLOAT': 56}
```

Ambos usan FLOAT (float32) para los past_key_values, no float16.

### 2.3 Opset Domains

**HuggingFace:**
```
ai.onnx: 14
com.microsoft: 1
```

**Local:**
```
ai.onnx: 18
com.microsoft: 1
```

**⚠️ DIFERENCIA CRÍTICA:** El modelo local usa **opset 18** mientras HuggingFace usa **opset 14**.

---

## 3. Diferencias en config.json

### HuggingFace config.json
```json
{
  "_name_or_path": "Qwen/Qwen2.5-0.5B-Instruct",
  "architectures": ["Qwen2ForCausalLM"],
  "hidden_size": 896,
  "num_hidden_layers": 24,
  "num_attention_heads": 14,
  "num_key_value_heads": 2,
  "use_cache": true
  // NO tiene "transformers.js_config"
  // NO tiene "dtype"
  // NO tiene "layer_types"
}
```

### Local config.json
```json
{
  "_name_or_path": "epicrisis-q4f16-finetuned",
  "architectures": ["Qwen2ForCausalLM"],
  "hidden_size": 1536,
  "num_hidden_layers": 28,
  "num_attention_heads": 12,
  "num_key_value_heads": 2,
  "dtype": "q4f16",
  "transformers.js_config": {
    "dtype": "q4f16",
    "use_external_data_format": {
      "model_q4f16.onnx": true
    }
  },
  "layer_types": ["full_attention", ...],  // 28 elementos
  "use_cache": true
}
```

**Diferencias:**
1. HuggingFace NO tiene `transformers.js_config` - Transformers.js lo infiere automáticamente
2. HuggingFace NO tiene `dtype` en el config
3. Local tiene `layer_types` que HuggingFace no tiene

---

## 4. External Data Format

### HuggingFace
- **Archivos:** `onnx/model_q4f16.onnx` (483 MB único archivo)
- **Todo incluido:** Los pesos están embebidos en el archivo ONNX

### Local
- **Archivos:**
  - `onnx/model_q4f16.onnx` (0.9 MB - solo estructura)
  - `onnx/model_q4f16.onnx_data` (1.2 GB - pesos)
- **Separado:** Los pesos están en archivo externo

**⚠️ DIFERENCIA CRÍTICA:** El uso de external data format puede causar problemas con Transformers.js.

---

## 5. Proceso de Cuantización

### HuggingFace (quantize_config.json)
```json
{
  "modes": ["fp16", "q8", "int8", "uint8", "q4", "q4f16", "bnb4"],
  "per_channel": false,
  "reduce_range": false,
  "block_size": null,
  "is_symmetric": true,
  "accuracy_level": null,
  "quant_type": 1
}
```

### Local (nuestro proceso)
```python
MatMulNBitsQuantizer(
    model=model,
    block_size=32,           # vs null en HF
    is_symmetric=True,       # igual
    quant_format=QuantFormat.QOperator
)
```

**Diferencias:**
- HuggingFace usa `block_size: null` (default)
- Local usa `block_size: 32`

---

## 6. Nodos ONNX

### Distribución de nodos principales

| Tipo de Nodo | HuggingFace | Local |
|--------------|-------------|-------|
| Unsqueeze | 299 | 265 |
| Mul | 291 | 339 |
| Gather | 271 | 205 |
| Add | 270 | 285 |
| Concat | 267 | 313 |
| Slice | 170 | 142 |
| **MatMulNBits** | **168** | **196** |
| Shape | 149 | 119 |
| Reshape | 148 | 171 |
| Transpose | 121 | 142 |
| **TOTAL** | **2759** | **2888** |

Ambos usan `MatMulNBits` (operador de cuantización 4-bit de Microsoft).

---

## 7. Posibles Causas del Fallo en Transformers.js

### 7.1 Opset Version (MÁS PROBABLE)
- Local usa **opset 18**, HuggingFace usa **opset 14**
- ONNX Runtime Web puede no soportar completamente opset 18
- Algunas optimizaciones de grafo pueden fallar con opset más nuevo

### 7.2 External Data Format
- El manejo de archivos externos puede tener bugs en Transformers.js
- La carga de archivos grandes fragmentados puede fallar

### 7.3 Tamaño del Modelo
- 1.2 GB es 2.5x más grande que 483 MB
- Puede haber límites de memoria no documentados

### 7.4 Optimizaciones de Grafo
- El script `onnx_min_infer.py` usa `ORT_DISABLE_ALL`
- Transformers.js usa optimizaciones por defecto
- Las optimizaciones pueden fallar con el modelo local

---

## 8. Soluciones Propuestas

### Opción 1: Re-exportar con Opset 14 (RECOMENDADO)
```bash
optimum-cli export onnx \
  --model fine-tuning/models/epicrisis-finetuned-qwen2.5 \
  --task text-generation-with-past \
  --opset 14 \
  output_dir
```

### Opción 2: Consolidar External Data
```python
import onnx
model = onnx.load("model.onnx")
onnx.save_model(model, "model_consolidated.onnx",
                save_as_external_data=False)  # Todo en un archivo
```

### Opción 3: Fine-tune Qwen2.5-0.5B
- Usar el modelo más pequeño (500M params)
- Exportar igual que HuggingFace
- Resultado: ~480 MB archivo único

### Opción 4: Usar el Modelo Directamente desde Python
- El script `onnx_min_infer.py` ya funciona
- Implementar un backend Python que sirva inferencias
- El frontend llama a la API en lugar de ejecutar en browser

---

## 9. Recomendación

**Solución inmediata:** Intentar re-exportar el modelo con opset 14 y sin external data format.

**Solución a largo plazo:** Fine-tune Qwen2.5-0.5B que es más compatible con el ecosistema web y usa menos recursos.

---

*Documento generado: 14/01/2026*
