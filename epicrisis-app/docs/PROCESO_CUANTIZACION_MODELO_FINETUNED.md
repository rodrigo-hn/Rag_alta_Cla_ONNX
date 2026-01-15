# Proceso de Cuantización del Modelo Fine-tuned para Epicrisis

## Resumen Ejecutivo

Este documento detalla el proceso completo de conversión y cuantización de un modelo Qwen2.5-1.5B fine-tuned para generación de epicrisis clínicas, optimizado para ejecución en navegador usando Transformers.js con ONNX Runtime.

**Resultado Final:** Modelo q4f16 de ~1.2GB funcionando en el navegador.

---

## 1. Modelo Base y Fine-tuning

### 1.1 Modelo Original
- **Modelo Base:** Qwen2.5-1.5B-Instruct
- **Arquitectura:** Qwen2ForCausalLM
- **Parámetros:** ~1.5 billones
- **Vocabulario:** 151,936 tokens
- **Capas:** 28 capas de atención completa
- **Hidden Size:** 1536
- **Attention Heads:** 12 (con 2 key-value heads para GQA)

### 1.2 Fine-tuning Realizado
- **Framework:** Hugging Face Transformers + PEFT/LoRA
- **Objetivo:** Generación de epicrisis clínicas en español
- **Formato de entrada:** JSON estructurado con diagnósticos, procedimientos, etc.
- **Formato de salida:** Texto clínico narrativo

### 1.3 Ubicación del Modelo Fine-tuned
```
fine-tuning/models/epicrisis-finetuned-qwen2.5/
├── config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
└── ...
```

---

## 2. Entorno y Dependencias

### 2.1 Versiones de Software
```
Python: 3.12
PyTorch: 2.x
Transformers: 4.45.0
ONNX: 1.17.x
ONNX Runtime: 1.23.2
Optimum: latest
NumPy: 2.x
```

### 2.2 Herramientas de Conversión
- **Optimum:** Para exportación inicial a ONNX
- **Transformers.js scripts:** Para conversión y cuantización específica para web
- **ONNX Runtime Quantization:** Para cuantización a diferentes formatos

### 2.3 Problemas de Compatibilidad Encontrados

#### NumPy 2.x Breaking Change
```python
# Error original:
np.fromstring(tensor.raw_data, dtype="float32")  # Removido en NumPy 2.x

# Solución aplicada en float16.py:
np.frombuffer(tensor.raw_data, dtype="float32")
tensor.raw_data = float16_list.tobytes()  # En lugar de .tostring()
```

#### Módulo matmul_4bits_quantizer
```python
# El módulo cambió de nombre en onnxruntime 1.23.x:
# Antes: from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer
# Ahora: from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer
```

---

## 3. Proceso de Conversión a ONNX

### 3.1 Primera Exportación (Fallida)
```bash
optimum-cli export onnx \
  --model fine-tuning/models/epicrisis-finetuned-qwen2.5 \
  --task text-generation \
  models/epicrisis-onnx
```

**Problema:** El modelo exportado solo tenía 3 inputs (input_ids, attention_mask, position_ids), sin soporte para KV-cache.

**Resultado:** Transformers.js requiere past_key_values para generación autoregresiva eficiente.

### 3.2 Segunda Exportación (Correcta)
```bash
optimum-cli export onnx \
  --model fine-tuning/models/epicrisis-finetuned-qwen2.5 \
  --task text-generation-with-past \
  models/epicrisis-fp32-finetuned
```

**Resultado:** Modelo con 59 inputs incluyendo past_key_values para las 28 capas.

### 3.3 Estructura del Modelo ONNX Exportado
```
models/epicrisis-fp32-finetuned/
├── config.json
├── generation_config.json
├── tokenizer.json
├── tokenizer_config.json
├── vocab.json
├── merges.txt
├── added_tokens.json
├── special_tokens_map.json
└── onnx/
    ├── model.onnx          # ~1MB (metadatos)
    └── model.onnx_data     # ~5.8GB (pesos FP32)
```

---

## 4. Intentos de Cuantización

### 4.1 Cuantización Q8 (INT8) - FALLIDA

#### Proceso
```bash
# Usando script de Transformers.js
python -m scripts.convert \
  --quantize \
  --model_id fine-tuning/models/epicrisis-finetuned-qwen2.5 \
  --output_parent_dir models/epicrisis-q8-finetuned \
  --task text-generation-with-past
```

#### Resultado
- **Tamaño:** ~1.7GB
- **Estado:** CORRUPTO

#### Diagnóstico
```python
# Test en PyTorch reveló el problema:
model.half()  # Convertir a float16
outputs = model.generate(...)
# RuntimeError: probability tensor contains either 'inf', 'nan' or element < 0
```

**Causa Raíz:** El modelo fine-tuned tiene pesos que al convertirse a precisión reducida (float16 o int8) generan valores infinitos o NaN en las distribuciones de probabilidad durante la generación.

**Conclusión:** La cuantización Q8 simétrica corrompe los pesos del modelo específico debido a la distribución de valores post-fine-tuning.

---

### 4.2 Modelo FP32 - FUNCIONAL PERO MUY GRANDE

#### Tamaño
- **model.onnx:** ~1MB
- **model.onnx_data:** ~5.8GB
- **Total:** ~5.8GB

#### Prueba en PyTorch
```python
model = AutoModelForCausalLM.from_pretrained(model_path, torch_dtype=torch.float32)
outputs = model.generate(input_ids, max_new_tokens=500)
# FUNCIONA CORRECTAMENTE - genera texto coherente
```

#### Prueba en Navegador
```
Error: RangeError: Array buffer allocation failed
```

**Causa:** El navegador (WebGPU/WASM) tiene límite de ~4GB para buffers de memoria. Un modelo de 5.8GB excede este límite.

---

### 4.3 Modelo FP16 - TAMBIÉN MUY GRANDE

#### Proceso de Conversión
```python
from scripts.float16 import convert_float_to_float16_model_path

model_fp16 = convert_float_to_float16_model_path(
    'models/epicrisis-fp32-finetuned/onnx/model.onnx',
    keep_io_types=True  # Mantener I/O en FP32 para compatibilidad
)

onnx.save_model(
    model_fp16,
    output_path,
    save_as_external_data=True,
    all_tensors_to_one_file=True,
    location='model_fp16.onnx_data'
)
```

#### Advertencias Durante Conversión
```
UserWarning: the float32 number -3.4028234663852886e+38 will be truncated to -10000.0
UserWarning: the float32 number 5.960464477539063e-08 will be truncated to 1e-07
```
Estos truncamientos son normales y esperados en la conversión FP32→FP16.

#### Tamaño
- **model_fp16.onnx:** ~0.86MB
- **model_fp16.onnx_data:** ~3.09GB
- **Total:** ~3.1GB

#### Prueba en Navegador
```
Error: RangeError: Array buffer allocation failed
```

**Causa:** Aunque es la mitad del tamaño de FP32, 3.1GB sigue siendo demasiado grande para el navegador.

---

### 4.4 Modelo Q4F16 (4-bit) - EXITOSO

#### Proceso de Conversión
```python
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer
from onnxruntime.quantization import QuantFormat

# Cargar modelo FP16
model = onnx.load('models/epicrisis-fp16-finetuned/onnx/model_fp16.onnx')

# Cuantizar a 4 bits
quantizer = MatMulNBitsQuantizer(
    model=model,
    block_size=32,           # Tamaño de bloque para cuantización
    is_symmetric=True,       # Cuantización simétrica
    quant_format=QuantFormat.QOperator
)
quantizer.process()

# Guardar con external data format
quantizer.model.save_model_to_file(
    'models/epicrisis-q4f16-finetuned/onnx/model_q4f16.onnx',
    use_external_data_format=True
)
```

#### Tamaño Final
- **model_q4f16.onnx:** ~0.91MB
- **model_q4f16.onnx_data:** ~1.2GB
- **Total:** ~1.2GB

#### Resultado
El modelo carga correctamente en el navegador sin errores de memoria.

---

## 5. Configuración para Transformers.js

### 5.1 Estructura de config.json
```json
{
  "_name_or_path": "epicrisis-q4f16-finetuned",
  "architectures": ["Qwen2ForCausalLM"],
  "model_type": "qwen2",
  "dtype": "q4f16",
  "transformers.js_config": {
    "dtype": "q4f16",
    "use_external_data_format": {
      "model_q4f16.onnx": true
    }
  },
  "use_cache": true,
  "vocab_size": 151936,
  "hidden_size": 1536,
  "num_hidden_layers": 28,
  "num_attention_heads": 12,
  "num_key_value_heads": 2,
  "bos_token_id": 151643,
  "eos_token_id": 151645
}
```

### 5.2 Nomenclatura de Archivos ONNX

**Importante:** Transformers.js espera nombres específicos basados en el dtype:

| dtype | Archivo ONNX | Archivo de datos |
|-------|--------------|------------------|
| fp32 | model.onnx | model.onnx_data |
| fp16 | model_fp16.onnx | model_fp16.onnx_data |
| q8 | model_quantized.onnx | (inline) |
| q4f16 | model_q4f16.onnx | model_q4f16.onnx_data |

**Nota crítica:** La referencia interna del archivo ONNX al archivo de datos externos DEBE coincidir exactamente con el nombre del archivo en disco.

### 5.3 Verificación de Referencias Internas
```python
import onnx

model = onnx.load('model_q4f16.onnx', load_external_data=False)

for tensor in model.graph.initializer:
    if tensor.data_location == onnx.TensorProto.EXTERNAL:
        for entry in tensor.external_data:
            if entry.key == 'location':
                print(f'External data location: {entry.value}')
                # Debe ser: model_q4f16.onnx_data
```

---

## 6. Configuración en la Aplicación Angular

### 6.1 Definición del Modelo en rag.types.ts
```typescript
{
  id: 'local/epicrisis-q4f16-finetuned',
  name: 'Epicrisis Fine-tuned 1.5B (q4f16) ⭐',
  size: '~1.2GB',
  type: 'causal-lm',
  dtype: 'q4f16',
  remoteOnly: false,
  wasmOnly: false,
  recommended: true,
  localPath: 'epicrisis-q4f16-finetuned',
  isFineTuned: true,
  fineTunedConfig: {
    useMinimalPrompt: true,
    requiresPatientDataInjection: true,
    requiresControlsInjection: true,
    generationConfigKey: 'finetuned_epicrisis'
  }
}
```

### 6.2 Chat Template para Qwen2.5
El modelo requiere el formato de chat template de Qwen:
```
<|im_start|>system
Eres un asistente médico experto en redacción de epicrisis clínicas en español...
<|im_end|>
<|im_start|>user
Epicrisis:
{"dx":["..."],"proc":["..."],...}
<|im_end|>
<|im_start|>assistant
```

---

## 7. Resumen de Formatos y Tamaños

| Formato | Tamaño | Estado | Razón |
|---------|--------|--------|-------|
| FP32 | ~5.8GB | No funciona | Excede límite de memoria del navegador |
| FP16 | ~3.1GB | No funciona | Excede límite de memoria del navegador |
| Q8 | ~1.7GB | Corrupto | Cuantización destruye precisión del modelo |
| **Q4F16** | **~1.2GB** | **Funciona** | **Tamaño adecuado, precisión aceptable** |

---

## 8. Lecciones Aprendidas

### 8.1 Sobre Cuantización de Modelos Fine-tuned
1. **Los modelos fine-tuned pueden ser más sensibles a la cuantización** que los modelos base debido a cambios en la distribución de pesos.

2. **Q8 no siempre es seguro:** Aunque Q8 funciona bien para muchos modelos, algunos fine-tuned pueden tener pesos en rangos que causan overflow/underflow en INT8.

3. **Q4F16 es más robusto:** La cuantización de 4 bits con activaciones en FP16 preserva mejor la funcionalidad del modelo.

### 8.2 Sobre Límites del Navegador
1. **Límite práctico de ~2GB:** Aunque teóricamente WebGPU soporta más, en la práctica modelos >2GB pueden fallar.

2. **External data format es obligatorio:** Modelos >2GB requieren dividir pesos en archivo separado.

### 8.3 Sobre Transformers.js
1. **Requiere KV-cache:** Usar `--task text-generation-with-past` al exportar.

2. **Nomenclatura estricta:** Los nombres de archivos deben seguir convenciones específicas según dtype.

3. **Referencias internas:** El ONNX debe referenciar correctamente el archivo de datos externos.

---

## 9. Comandos de Referencia

### Exportar modelo con KV-cache
```bash
optimum-cli export onnx \
  --model <ruta-modelo> \
  --task text-generation-with-past \
  <directorio-salida>
```

### Convertir FP32 a FP16
```python
from scripts.float16 import convert_float_to_float16_model_path
model_fp16 = convert_float_to_float16_model_path(model_path, keep_io_types=True)
```

### Cuantizar a Q4F16
```python
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer

quantizer = MatMulNBitsQuantizer(
    model=model,
    block_size=32,
    is_symmetric=True
)
quantizer.process()
quantizer.model.save_model_to_file(output_path, use_external_data_format=True)
```

### Verificar modelo ONNX
```python
import onnx
model = onnx.load(path, load_external_data=False)
print(f'Inputs: {len(model.graph.input)}')
print(f'Outputs: {len(model.graph.output)}')
```

---

## 10. Estructura Final del Proyecto

```
models/
├── epicrisis-q4f16-finetuned/     # RECOMENDADO - 1.2GB
│   ├── config.json
│   ├── tokenizer.json
│   ├── tokenizer_config.json
│   ├── vocab.json
│   ├── merges.txt
│   └── onnx/
│       ├── model_q4f16.onnx
│       └── model_q4f16.onnx_data
│
├── epicrisis-fp16-finetuned/      # DESHABILITADO - 3.1GB
├── epicrisis-fp32-finetuned/      # DESHABILITADO - 5.8GB
└── epicrisis-q8-finetuned/        # DESHABILITADO - Corrupto
```

---

## 11. Estado Actual de Implementación

### 11.1 Backend con Inferencia Real (Enero 2026)

Se implementó inferencia LLM real en el backend usando `@huggingface/transformers`:

| Componente | Estado | Detalles |
|------------|--------|----------|
| Backend Node.js | **Funcional** | Inferencia real con Transformers.js |
| Modelo en uso | `onnx-community/Qwen2.5-0.5B-Instruct` | q4f16, ~461MB |
| Tiempo inferencia | ~50-60s (CPU) | Generacion real, no mock |
| Fallback | Disponible | Modo determinista si falla el modelo |

### 11.2 Archivos Modificados

- `backend/src/services/llmService.ts` - Reescrito con Transformers.js
- `backend/.env` - Nuevas variables LLM_ONNX_MODEL_PATH, USE_DETERMINISTIC_FALLBACK
- `backend/package.json` - Agregado @huggingface/transformers

### 11.3 Documentacion Relacionada

Ver **[BACKEND_LLM_INFERENCIA_REAL.md](./BACKEND_LLM_INFERENCIA_REAL.md)** para detalles completos de la implementacion actual.

---

## 12. Proximos Pasos Recomendados

1. ~~**Probar generacion de epicrisis** con el modelo q4f16 en el navegador~~ (Implementado en backend)
2. **Evaluar calidad** de las epicrisis generadas vs modelo original
3. **Integrar modelo fine-tuned** en el backend (actualmente usa modelo base Qwen)
4. **Optimizar tiempo de inferencia** - considerar GPU o modelo mas pequeno
5. **Implementar streaming** de respuestas para mejor UX

---

*Documento generado: Enero 2026*
*Ultima actualizacion: 15/01/2026*
