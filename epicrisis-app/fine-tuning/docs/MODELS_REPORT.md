# Reporte de Modelos Probados - Epicrisis App

Este documento resume todos los modelos probados para la generación de epicrisis médicas, incluyendo configuraciones de fine-tuning, datasets utilizados y resultados obtenidos.

---

## 1. Modelos Base (Sin Fine-tuning)

| Modelo | Parámetros | Tamaño (q4f16) | WebGPU | Funciona | Calidad | Recomendado | Notas |
|--------|-----------|----------------|--------|----------|---------|-------------|-------|
| **Qwen2.5-0.5B-Instruct** | 500M | 483 MB | ✅ | ✅ | ⭐⭐⭐ | ✅ **Sí** | Mejor balance tamaño/calidad, genera códigos con prompt adecuado |
| **Qwen2.5-1.5B-Instruct** | 1.5B | 1.2 GB | ✅ | ✅ | ⭐⭐⭐⭐ | ⚠️ | Mejor calidad pero más lento |
| **Qwen3-4B-ONNX** | 4B | 2.8 GB | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⚠️ | Excelente pero grande, modo "thinking" |
| **Llama-3.2-1B-Instruct** | 1B | 1.1 GB | ✅ | ✅ | ⭐⭐⭐ | ❌ | Funciona pero peor en español |
| **SmolLM2-360M-Instruct** | 360M | 200 MB | ✅ | ✅ | ⭐⭐ | ❌ | Muy pequeño, calidad limitada |
| **Phi-3.5-mini-instruct** | 3.8B | 2.2 GB | ✅ | ✅ | ⭐⭐⭐⭐ | ⚠️ | Bueno pero grande |
| **Ministral-3B-Instruct** | 3B | 2.4 GB | ✅ | ✅ | ⭐⭐⭐ | ❌ | Multimodal, no necesario |
| **Granite-3.0-2B** | 2B | 1.6 GB | ✅ | ⚠️ | ⭐⭐⭐ | ❌ | IBM, funciona pero no ideal |

---

## 2. Modelos Fine-tuned

| Modelo Fine-tuned | Base | Método | Dataset | Ejemplos | Precisión | WebGPU | Funciona | Calidad Códigos | Notas |
|-------------------|------|--------|---------|----------|-----------|--------|----------|-----------------|-------|
| **Unsloth FP16** | Qwen2.5-0.5B | Unsloth + LoRA | ChatML unificado | 321 train | FP16 | ✅ | ⚠️ | ❌ No genera | Texto coherente pero sin códigos CIE-10/K/ATC |
| **Unsloth ONNX-cached** | Qwen2.5-0.5B | Unsloth → ONNX | ChatML unificado | 321 train | FP16 + KV-cache | ✅ | ✅ | ❌ No genera | KV-cache funciona, pero no aprendió códigos |
| **MLX Merged** | Qwen2.5-1.5B | MLX + LoRA | mlx_data | 971 train | FP16 | ❌ | ✅ (Mac) | ⚠️ Parcial | Solo Mac M1-M4, genera algunos códigos |
| **HF PEFT q4f16** | Qwen2.5-0.5B | Transformers + PEFT | train.jsonl | 321 train | q4f16 | ❌ | ❌ | N/A | Opset 18 incompatible con Transformers.js |
| **HF PEFT q8** | Qwen2.5-0.5B | Transformers + PEFT | train.jsonl | 321 train | INT8 | ❌ | ❌ | N/A | Cuantización corrompe pesos |
| **HF PEFT FP32** | Qwen2.5-0.5B | Transformers + PEFT | train.jsonl | 321 train | FP32 | ❌ | ❌ | N/A | 6GB - demasiado grande para navegador |

---

## 3. Configuración de Fine-tuning

### Métodos Probados

| Método | Librería | GPU Requerida | Tiempo | VRAM | Salida | Recomendado |
|--------|----------|---------------|--------|------|--------|-------------|
| **Unsloth** | unsloth + peft | T4 (Colab gratis) | ~30 min | 6 GB | LoRA → FP16 → GGUF/ONNX | ✅ **Sí** |
| **MLX** | mlx-lm | Apple M1-M4 | ~45 min | 8 GB | LoRA → Merged | ⚠️ Solo Mac |
| **HF Standard** | transformers + peft | T4/A100 | ~60 min | 8-16 GB | LoRA → Merged → ONNX | ⚠️ Problemas cuantización |

### Hiperparámetros Utilizados (Unsloth - Recomendado)

```python
# Configuración óptima para Qwen2.5-0.5B
epochs = 3
batch_size = 4
learning_rate = 2e-4
lora_rank = 16
lora_alpha = 16
lora_dropout = 0
max_seq_length = 1024
gradient_accumulation_steps = 2
warmup_steps = 5
weight_decay = 0.01
optimizer = "adamw_8bit"
```

### Hiperparámetros MLX (Apple Silicon)

```python
# Configuración para Mac M1-M4
epochs = 3-5
batch_size = 4
learning_rate = 1e-5  # Conservador
lora_rank = 8-16
lora_layers = 16-24
```

---

## 4. Datasets Disponibles

### Dataset Principal

| Dataset | Ubicación | Ejemplos | Propósito | Calidad |
|---------|-----------|----------|-----------|---------|
| **train.jsonl** | datasets/ | 321 | Entrenamiento principal | ⭐⭐⭐ |
| **validation.jsonl** | datasets/ | 36 | Validación | ⭐⭐⭐ |
| **mlx_data/train.jsonl** | datasets/mlx_data/ | 971 | MLX training | ⭐⭐⭐⭐ |

### Datasets Especializados

| Dataset | Ubicación | Ejemplos | Propósito | Calidad |
|---------|-----------|----------|-----------|---------|
| **anatomia_coronaria.jsonl** | datasets/ | 43 | Anatomía DA/CD/CX correcta | ⭐⭐⭐⭐⭐ |
| **codigos_correctos.jsonl** | datasets/ | 48 | CIE-10, K, ATC correctos | ⭐⭐⭐⭐⭐ |
| **ejemplos_negativos.jsonl** | datasets/ | 29 | Contraejemplos (qué NO hacer) | ⭐⭐⭐⭐ |
| **dataset_extra_1.jsonl** | datasets/ | 250 | Sintéticos generados | ⭐⭐ |
| **dataset_extra_2.jsonl** | datasets/ | 250 | Sintéticos generados | ⭐⭐ |
| **dataset_extra_3.jsonl** | datasets/ | 250 | Sintéticos generados | ⭐⭐ |

### Formato de Datos

```json
{
  "instruction": "Epicrisis:",
  "input": {
    "dx": ["diagnóstico (CIE-10)"],
    "proc": ["procedimiento (código K)"],
    "tto": ["tratamiento (ATC)"],
    "evo": "evolución clínica",
    "dx_alta": ["diagnóstico alta"],
    "med": ["medicación alta"]
  },
  "output": "Texto narrativo de epicrisis con códigos..."
}
```

### Formato ChatML (para Qwen2.5-Instruct)

```
<|im_start|>system
Eres un médico especialista que genera epicrisis...<|im_end|>
<|im_start|>user
{json_input}<|im_end|>
<|im_start|>assistant
{output}<|im_end|>
```

---

## 5. Modelos Funcionales Actuales

Ubicación: `app/public/models/`

| Modelo | Tamaño | Tipo | Uso Principal |
|--------|--------|------|---------------|
| `lora-unsloth` | 49 MB | Adaptadores LoRA | Re-entrenar/fusionar |
| `merged-f16-unsloth` | 957 MB | Safetensors FP16 | Modelo base merged |
| `onnx-finetuned-unsloth` | 1.9 GB | ONNX + KV-cache | Inferencia con cache |
| `onnx-webgpu-fp16-chatml-v3` | 959 MB | ONNX WebGPU | ORT GenAI format |
| `onnx-webgpu-fp16-unsloth` | 1.9 GB | ONNX WebGPU | Transformers.js |

---

## 6. Modelos Eliminados (No Funcionan)

| Modelo | Tamaño | Razón de Eliminación |
|--------|--------|---------------------|
| epicrisis-q4f16-finetuned-tjs | 26 GB | Opset 18 incompatible con Transformers.js |
| epicrisis-q8-finetuned-tjs | 16 GB | INT8 corrompe pesos del modelo |
| onnx-cpu-fp16 | 5.8 GB | Demasiado grande para navegador |
| onnx-cpu-fp32 | 5.8 GB | Demasiado grande para navegador |
| onnx-cpu-int4* | 1.1 GB | CPU only, no soporta WebGPU |
| onnx-cpu-int8 | 0 GB | Carpeta vacía |
| epicrisis-merged | 2.9 GB | Qwen 1.5B FP32 safetensors, no ONNX |
| epicrisis-onnx | 5.8 GB | ONNX FP32 con .onnx_data externo |
| epicrisis-onnx-q8 | 1.5 GB | INT8 corrompe pesos |
| mlx_adapters | 67 MB | Solo Mac, checkpoints intermedios |
| mlx_merged | 953 MB | Solo Mac (MLX format), no WebGPU |

**Total espacio liberado:** ~60 GB

---

## 7. Problemas Identificados y Soluciones

| Problema | Causa | Solución | Estado |
|----------|-------|----------|--------|
| Modelo no genera códigos CIE-10/K/ATC | Fine-tuning insuficiente | Más ejemplos + prompts explícitos | 🔴 Pendiente |
| Texto repetitivo | Sin repetition penalty | Agregar `repetition_penalty=1.2-1.5` | ✅ Resuelto |
| INT8/q8 incompatible | Opset ONNX incorrecto | Usar q4f16 o FP16 | ✅ Resuelto |
| Modelo >3GB falla en browser | Límite WASM | Usar modelos <2GB | ✅ Resuelto |
| KV-cache no funciona | Inputs faltantes | Inicializar past_key_values | ✅ Resuelto |
| Opset 18 incompatible | Transformers.js no soporta | Usar scripts oficiales de conversión | ✅ Resuelto |

---

## 8. Tamaños de Referencia por Precisión

| Modelo | Parámetros | FP32 | FP16 | q4f16 | q8 |
|--------|-----------|------|------|-------|-----|
| Qwen2.5-0.5B | 500M | 2GB | 1GB | 512MB | 650MB |
| Qwen2.5-1.5B | 1.5B | 6GB | 3GB | 1.2GB | 1.5GB |
| Qwen3-4B | 4B | ~8GB | ~4GB | 2.8GB | 3.5GB |
| Llama-3.2-1B | 1B | 4GB | 2GB | 1.1GB | 1.3GB |
| SmolLM2-360M | 360M | 1.5GB | 750MB | 200MB | 350MB |
| Phi-3.5-mini | 3.8B | ~8GB | ~4GB | 2.2GB | 2.8GB |

---

## 9. Recomendaciones Finales

### Para Producción (WebGPU en Navegador)

| Escenario | Modelo Recomendado | Razón |
|-----------|-------------------|-------|
| **Uso general** | Qwen2.5-0.5B-Instruct (base) | Funciona, genera códigos con prompt adecuado |
| **Mejor calidad** | Qwen3-4B-ONNX | Excelente pero 2.8GB, requiere buena GPU |
| **Desarrollo Mac** | MLX + Qwen2.5-1.5B | Rápido en Apple Silicon |
| **Fine-tuning futuro** | Unsloth + más datos | Necesita 500+ ejemplos con códigos |

### Próximos Pasos para Mejorar Fine-tuning

1. **Aumentar dataset** a 500-1000 ejemplos con códigos explícitos
2. **Usar few-shot prompting** en el system prompt
3. **Entrenar más epochs** (5-10) con learning rate más bajo
4. **Probar Qwen2.5-1.5B** como base (más capacidad)
5. **Validar con métricas** de presencia de códigos CIE-10/K/ATC

---

## 10. Scripts y Notebooks Disponibles

### Notebooks (en `notebooks/`)

| Notebook | Propósito |
|----------|-----------|
| `colab_finetune_unsloth.ipynb` | ⭐ **Principal** - Fine-tuning con Unsloth en Colab |
| `colab_finetune.ipynb` | Fine-tuning estándar con HuggingFace |
| `Epicrisis_FineTuning_ORTGenAI_UPDATED.ipynb` | Exportación a ORT GenAI |
| `epicrisis_transformersjs_export.ipynb` | Exportación a Transformers.js |

### Scripts de Conversión (en `scripts/conversion/`)

| Script | Propósito |
|--------|-----------|
| `convert_to_chatml.py` | Convertir datasets a formato ChatML |
| `convert_to_onnx.py` | Exportar modelo a ONNX |
| `export_ortgenai.py` | Exportar a ORT GenAI format |
| `quantize_onnx.py` | Cuantizar modelo ONNX |

### Scripts de Entrenamiento (en `scripts/training/`)

| Script | Propósito |
|--------|-----------|
| `finetune_epicrisis.py` | Fine-tuning con Transformers + PEFT |
| `mlx_finetune.py` | Fine-tuning con MLX (Mac) |
| `generate_extra_datasets.py` | Generar datasets sintéticos |
| `unify_datasets.py` | Combinar múltiples datasets |

---

*Documento generado: Enero 2025*
*Última actualización: Enero 17, 2025*
