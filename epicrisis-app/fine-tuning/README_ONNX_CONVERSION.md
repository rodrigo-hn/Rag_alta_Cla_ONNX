# Conversión de Modelo Fine-tuned a ONNX para Transformers.js

## Problema

El modelo fine-tuned (Qwen2.5-1.5B-Instruct con LoRA para epicrisis) necesita ser convertido a formato ONNX compatible con Transformers.js para ejecutarse en el navegador.

La cuantización INT8 de `optimum.onnxruntime.ORTQuantizer` **NO es compatible** con Transformers.js y genera garbage output.

## Solución Recomendada

Usar el script oficial de conversión de Transformers.js que genera cuantización q4f16 compatible.

### Opción 1: Usar modelo base cuantizado y aplicar fine-tuning

La forma más eficiente es:

1. Descargar el modelo Qwen2.5-1.5B-Instruct ya cuantizado en q4f16 desde HuggingFace
2. Hacer fine-tuning directamente sobre ese modelo
3. No requiere conversión adicional

```bash
# Descargar modelo cuantizado
pip install huggingface_hub
huggingface-cli download onnx-community/Qwen2.5-1.5B-Instruct-ONNX \
    --local-dir ./models/Qwen2.5-1.5B-Instruct-q4f16
```

### Opción 2: Convertir usando scripts oficiales de Transformers.js

El repositorio de Transformers.js tiene scripts de conversión que generan modelos compatibles:

```bash
# Clonar repositorio de Transformers.js
git clone https://github.com/xenova/transformers.js.git
cd transformers.js

# Instalar dependencias
pip install -r scripts/requirements.txt

# Convertir modelo merged
python scripts/convert.py \
    --quantize q4f16 \
    --model_id /path/to/epicrisis-merged \
    --output_path /path/to/output
```

### Opción 3: Re-hacer fine-tuning con QLoRA 4-bit

Hacer fine-tuning directamente en precisión 4-bit usando QLoRA:

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16
)

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-1.5B-Instruct",
    quantization_config=bnb_config,
    device_map="auto"
)
```

## Estado Actual

- ✅ Fine-tuning completado (357 ejemplos, Loss 0.45)
- ✅ Modelo merged guardado en `epicrisis-merged/`
- ❌ Conversión a ONNX q8 incompatible con Transformers.js
- ⏳ Pendiente: Re-convertir con método compatible

## Archivos Generados

```
fine-tuning/
├── epicrisis-model-finetuned/  # Adaptadores LoRA
├── epicrisis-merged/           # Modelo merged (completo)
├── epicrisis-onnx/             # ONNX FP32 (6GB, muy grande)
├── epicrisis-onnx-q8/          # ONNX INT8 (incompatible)
├── train.jsonl                 # Dataset entrenamiento (321)
└── validation.jsonl            # Dataset validación (36)
```

## Próximos Pasos

1. Instalar scripts de conversión de Transformers.js
2. Ejecutar conversión con `--quantize q4f16`
3. Copiar modelo generado a `models/epicrisis-finetuned-q4f16/`
4. Habilitar en `rag.types.ts` cambiando `disabled: false`
5. Probar en el navegador

## Recursos

- [Transformers.js Conversion Scripts](https://github.com/xenova/transformers.js/tree/main/scripts)
- [ONNX Runtime Quantization](https://onnxruntime.ai/docs/performance/quantization.html)
- [Optimum ONNX Export](https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model)
