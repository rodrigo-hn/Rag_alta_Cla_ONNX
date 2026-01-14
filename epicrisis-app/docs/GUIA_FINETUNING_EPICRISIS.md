# Guía Completa de Fine-Tuning para Modelo de Epicrisis

## Resumen

Esta guía detalla los pasos para realizar fine-tuning de un modelo pequeño (1.5B-3B parámetros) para generar epicrisis clínicas en español, usando el dataset de 350 ejemplos generado.

---

## 1. Preparación del Dataset

### 1.1 Unificar archivos JSONL

```bash
cd /Users/rodrigoherrera/code/RAG/Rag_alta_Cla_ONNX/epicrisis-app/data_example

# Concatenar los dos archivos principales
cat dataset_epicrisis_175.jsonl dataset_epicrisis_176_350_final.jsonl > dataset_epicrisis_350_completo.jsonl

# Verificar cantidad de ejemplos
wc -l dataset_epicrisis_350_completo.jsonl
# Debería mostrar: 350
```

### 1.2 Validar formato JSON

```bash
# Verificar que cada línea sea JSON válido
python3 -c "
import json
with open('dataset_epicrisis_350_completo.jsonl', 'r') as f:
    for i, line in enumerate(f, 1):
        try:
            json.loads(line)
        except json.JSONDecodeError as e:
            print(f'Error línea {i}: {e}')
print(f'Validación completa: {i} ejemplos')
"
```

### 1.3 Dividir en train/validation (90/10)

```bash
# Mezclar aleatoriamente y dividir
python3 << 'EOF'
import json
import random

with open('dataset_epicrisis_350_completo.jsonl', 'r') as f:
    lines = f.readlines()

random.seed(42)
random.shuffle(lines)

split_idx = int(len(lines) * 0.9)  # 315 train, 35 val

with open('train.jsonl', 'w') as f:
    f.writelines(lines[:split_idx])

with open('validation.jsonl', 'w') as f:
    f.writelines(lines[split_idx:])

print(f"Train: {split_idx} ejemplos")
print(f"Validation: {len(lines) - split_idx} ejemplos")
EOF
```

---

## 2. Opciones de Fine-Tuning

### Opción A: Unsloth (Recomendado - Local con GPU)
- **Requisitos**: GPU con 8GB+ VRAM (RTX 3060, 4060 o superior)
- **Ventajas**: 2x más rápido, menor consumo de memoria
- **Costo**: $0 (local)

### Opción B: Google Colab Pro
- **Requisitos**: Suscripción Colab Pro ($10/mes)
- **Ventajas**: Sin hardware propio, GPU T4/A100 incluida
- **Costo**: ~$10/mes

### Opción C: RunPod/Vast.ai (Cloud GPU)
- **Requisitos**: Cuenta con créditos
- **Ventajas**: GPUs potentes bajo demanda
- **Costo**: ~$0.30-0.50/hora (RTX 4090)

### Opción D: Hugging Face AutoTrain
- **Requisitos**: Cuenta HuggingFace
- **Ventajas**: Sin código, interfaz web
- **Costo**: ~$5-15 por entrenamiento

---

## 3. Fine-Tuning con Unsloth (Opción A - Recomendada)

### 3.1 Instalar dependencias

```bash
# Crear entorno virtual
python3 -m venv venv-finetuning
source venv-finetuning/bin/activate

# Instalar Unsloth (más rápido que HuggingFace tradicional)
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
pip install transformers datasets
```

### 3.2 Script de Fine-Tuning

Crear archivo `finetune_epicrisis.py`:

```python
"""
Fine-tuning de modelo para generación de epicrisis clínicas
Usando Unsloth para optimización de memoria y velocidad
"""

from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import torch

# ============================================
# CONFIGURACIÓN
# ============================================

# Modelo base (elegir uno):
MODEL_OPTIONS = {
    "qwen2.5-1.5b": "Qwen/Qwen2.5-1.5B-Instruct",      # Recomendado: buena calidad, rápido
    "qwen2.5-3b": "Qwen/Qwen2.5-3B-Instruct",          # Mejor calidad, más lento
    "llama3.2-1b": "meta-llama/Llama-3.2-1B-Instruct", # Alternativa
    "llama3.2-3b": "meta-llama/Llama-3.2-3B-Instruct", # Alternativa mayor
    "phi3.5-mini": "microsoft/Phi-3.5-mini-instruct",  # 3.8B, muy bueno en español
}

MODEL_NAME = MODEL_OPTIONS["qwen2.5-1.5b"]  # Cambiar según preferencia
MAX_SEQ_LENGTH = 2048
DTYPE = None  # Auto-detectar (float16 para GPU, bfloat16 para Ampere+)
LOAD_IN_4BIT = True  # QLoRA - reduce VRAM a ~6GB

# Rutas
TRAIN_FILE = "train.jsonl"
VAL_FILE = "validation.jsonl"
OUTPUT_DIR = "./epicrisis-model-finetuned"

# ============================================
# CARGAR MODELO BASE
# ============================================

print(f"Cargando modelo: {MODEL_NAME}")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=DTYPE,
    load_in_4bit=LOAD_IN_4BIT,
)

# ============================================
# CONFIGURAR LoRA
# ============================================

model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # Rank de LoRA (8-64, mayor = más capacidad pero más VRAM)
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,  # 0 es óptimo para Unsloth
    bias="none",
    use_gradient_checkpointing="unsloth",  # Reduce VRAM 30%
    random_state=42,
)

# ============================================
# PREPARAR DATASET
# ============================================

def format_prompt(example):
    """Convierte el formato JSONL al formato de chat del modelo"""
    instruction = example.get("instruction", "Epicrisis:")
    input_data = example.get("input", {})
    output = example.get("output", "")

    # Formato de prompt mínimo (como en el dataset v3)
    if isinstance(input_data, dict):
        import json
        input_str = json.dumps(input_data, ensure_ascii=False)
    else:
        input_str = str(input_data)

    # Formato chat para el modelo
    messages = [
        {"role": "system", "content": "Eres un asistente médico experto en redacción de epicrisis clínicas en español. Genera texto clínico preciso basado en los datos proporcionados."},
        {"role": "user", "content": f"{instruction}\n{input_str}"},
        {"role": "assistant", "content": output}
    ]

    # Aplicar template del tokenizer
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )

    return {"text": text}

# Cargar datasets
print("Cargando datasets...")
train_dataset = load_dataset("json", data_files=TRAIN_FILE, split="train")
val_dataset = load_dataset("json", data_files=VAL_FILE, split="train")

# Formatear
train_dataset = train_dataset.map(format_prompt)
val_dataset = val_dataset.map(format_prompt)

print(f"Train: {len(train_dataset)} ejemplos")
print(f"Validation: {len(val_dataset)} ejemplos")

# ============================================
# CONFIGURAR ENTRENAMIENTO
# ============================================

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,

    # Epochs y batch
    num_train_epochs=3,  # 3-5 epochs para dataset pequeño
    per_device_train_batch_size=2,  # Ajustar según VRAM
    per_device_eval_batch_size=2,
    gradient_accumulation_steps=4,  # Effective batch = 2*4 = 8

    # Learning rate
    learning_rate=2e-4,  # Standard para LoRA
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,

    # Optimización
    optim="adamw_8bit",  # Reduce VRAM
    weight_decay=0.01,
    max_grad_norm=0.3,

    # Logging
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=50,
    save_strategy="steps",
    save_steps=50,
    save_total_limit=3,

    # Precisión
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),

    # Misc
    seed=42,
    report_to="none",  # Cambiar a "wandb" si usas Weights & Biases
)

# ============================================
# ENTRENAR
# ============================================

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    args=training_args,
)

print("Iniciando entrenamiento...")
trainer_stats = trainer.train()

print(f"\nEntrenamiento completado!")
print(f"Tiempo total: {trainer_stats.metrics['train_runtime']:.2f} segundos")
print(f"Loss final: {trainer_stats.metrics['train_loss']:.4f}")

# ============================================
# GUARDAR MODELO
# ============================================

print(f"\nGuardando modelo en {OUTPUT_DIR}...")

# Guardar adaptadores LoRA
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# Opción: Merge LoRA con modelo base (modelo completo)
# model.save_pretrained_merged(f"{OUTPUT_DIR}-merged", tokenizer, save_method="merged_16bit")

print("Modelo guardado exitosamente!")
```

### 3.3 Ejecutar entrenamiento

```bash
# Activar entorno
source venv-finetuning/bin/activate

# Ejecutar fine-tuning
python finetune_epicrisis.py

# Tiempo estimado:
# - RTX 3060 (12GB): ~45 min
# - RTX 4070 (12GB): ~30 min
# - RTX 4090 (24GB): ~15 min
```

---

## 4. Fine-Tuning con Google Colab (Opción B)

### 4.1 Notebook de Colab

Crear notebook `Epicrisis_FineTuning.ipynb`:

```python
# Celda 1: Instalar dependencias
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps trl peft accelerate bitsandbytes

# Celda 2: Subir dataset
from google.colab import files
uploaded = files.upload()  # Subir train.jsonl y validation.jsonl

# Celda 3: Copiar el código de finetune_epicrisis.py y ejecutar

# Celda 4: Descargar modelo entrenado
!zip -r epicrisis-model.zip epicrisis-model-finetuned/
files.download('epicrisis-model.zip')
```

---

## 5. Conversión a ONNX para uso en navegador

### 5.1 Instalar Optimum

```bash
pip install optimum[exporters] onnx onnxruntime
```

### 5.2 Exportar a ONNX

```python
"""
Convertir modelo fine-tuned a ONNX para Transformers.js
"""

from optimum.exporters.onnx import main_export
from transformers import AutoTokenizer

MODEL_PATH = "./epicrisis-model-finetuned"
ONNX_PATH = "./epicrisis-model-onnx"

# Exportar a ONNX
main_export(
    MODEL_PATH,
    output=ONNX_PATH,
    task="text-generation-with-past",  # Causal LM con KV cache
    opset=14,
    device="cpu",
)

print(f"Modelo ONNX guardado en: {ONNX_PATH}")
```

### 5.3 Cuantizar a INT8/INT4

```bash
# Cuantización con optimum-cli
optimum-cli export onnx \
    --model ./epicrisis-model-finetuned \
    --task text-generation-with-past \
    ./epicrisis-model-onnx

# Cuantizar a INT8
optimum-cli onnxruntime quantize \
    --onnx_model ./epicrisis-model-onnx \
    --avx512 \
    -o ./epicrisis-model-onnx-int8
```

### 5.4 Estructura final para Transformers.js

```
epicrisis-model-onnx/
├── config.json
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
├── model.onnx              # Modelo cuantizado
└── model.onnx_data         # Pesos (si es grande)
```

---

## 6. Integración con la App Angular

### 6.1 Copiar modelo a la app

```bash
# Copiar modelo ONNX al backend
cp -r epicrisis-model-onnx/* /path/to/epicrisis-app/backend/models/epicrisis-finetuned/
```

### 6.2 Registrar modelo en configuración

Editar `frontend/src/app/core/models/rag.types.ts`:

```typescript
export const LLM_MODELS: LLMModelConfig[] = [
  // ... modelos existentes ...

  {
    id: 'local/epicrisis-finetuned',
    name: 'Epicrisis Fine-tuned (1.5B)',
    description: 'Modelo optimizado para epicrisis clínicas',
    size: '1.2GB',
    type: 'causal-lm',
    dtype: 'q4',  // o 'q8' según cuantización
    localPath: 'epicrisis-finetuned',
    wasmOnly: false,
    disabled: false
  }
];
```

### 6.3 Usar el método fine-tuned

```typescript
// En el componente que genera epicrisis
const result = await this.localRAGService.generateLocalEpicrisisFineTuned(
  clinicalData,
  'episode-123',
  { sexo: 'M', edad: 72 }
);

console.log(result.text);
// "Paciente masculino de 72 años ingresa por neumonía (J18.9)..."
```

---

## 7. Validación del Modelo Fine-tuned

### 7.1 Métricas de evaluación

```python
"""
Evaluar calidad del modelo fine-tuned
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
import json

MODEL_PATH = "./epicrisis-model-finetuned"
VAL_FILE = "validation.jsonl"

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH)

def evaluate_sample(input_data):
    prompt = f"Epicrisis:\n{json.dumps(input_data)}\n"

    messages = [
        {"role": "system", "content": "Eres un asistente médico experto en epicrisis."},
        {"role": "user", "content": prompt}
    ]

    inputs = tokenizer.apply_chat_template(messages, return_tensors="pt")
    outputs = model.generate(inputs, max_new_tokens=300, temperature=0.3)

    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# Evaluar 10 ejemplos aleatorios
with open(VAL_FILE, 'r') as f:
    samples = [json.loads(line) for line in f][:10]

for i, sample in enumerate(samples):
    generated = evaluate_sample(sample['input'])
    expected = sample['output']

    print(f"\n=== Ejemplo {i+1} ===")
    print(f"Esperado: {expected[:100]}...")
    print(f"Generado: {generated[:100]}...")
```

### 7.2 Checklist de validación

- [ ] Output siempre empieza con "Ingresa por..."
- [ ] Códigos CIE-10 correctos y entre paréntesis
- [ ] Códigos ATC correctos y entre paréntesis
- [ ] Sin formato markdown (negritas, corchetes)
- [ ] Coherencia clínica (tratamiento apropiado para diagnóstico)
- [ ] Longitud apropiada (80-200 palabras)
- [ ] Sin alucinaciones de datos no presentes en input

---

## 8. Troubleshooting

### Error: CUDA out of memory
```bash
# Reducir batch size
per_device_train_batch_size=1
gradient_accumulation_steps=8

# O usar cuantización más agresiva
LOAD_IN_4BIT = True
```

### Error: Model too large for ONNX export
```bash
# Exportar solo con fp16
optimum-cli export onnx --model ./model --fp16 ./output
```

### Modelo genera texto repetitivo
```python
# Aumentar repetition_penalty en generación
outputs = model.generate(
    inputs,
    repetition_penalty=1.3,
    no_repeat_ngram_size=3
)
```

### Modelo no sigue el formato
```python
# Aumentar epochs de entrenamiento
num_train_epochs=5

# O aumentar learning rate
learning_rate=3e-4
```

---

## 9. Resumen de Comandos

```bash
# 1. Preparar dataset
cat dataset_epicrisis_175.jsonl dataset_epicrisis_176_350_final.jsonl > dataset_350.jsonl
python3 split_dataset.py  # Crear train.jsonl y validation.jsonl

# 2. Instalar dependencias
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"

# 3. Entrenar
python finetune_epicrisis.py

# 4. Convertir a ONNX
optimum-cli export onnx --model ./epicrisis-model-finetuned ./epicrisis-onnx

# 5. Cuantizar
optimum-cli onnxruntime quantize --onnx_model ./epicrisis-onnx -o ./epicrisis-onnx-q8

# 6. Copiar a la app
cp -r epicrisis-onnx-q8/* ../backend/models/epicrisis-finetuned/
```

---

## 10. Costos Estimados

| Método | Costo | Tiempo | Hardware |
|--------|-------|--------|----------|
| Local (RTX 3060+) | $0 | 30-60 min | GPU propia |
| Google Colab Pro | $10/mes | 45-90 min | T4/A100 |
| RunPod RTX 4090 | ~$2-3 | 15-20 min | Cloud |
| HuggingFace AutoTrain | $10-15 | 1-2 hrs | Cloud |

**Recomendación**: Si tienes GPU local con 8GB+ VRAM, usa Unsloth local. Si no, Google Colab Pro es la opción más económica.
