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