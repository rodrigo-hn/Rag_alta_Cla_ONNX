"""
Convierte el modelo fine-tuned a ONNX para Transformers.js
Paso 1: Merge LoRA con modelo base
Paso 2: Exportar a ONNX
Paso 3: Cuantizar a INT8
"""

import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

print("=" * 60)
print("CONVERSIÓN DE MODELO FINE-TUNED A ONNX")
print("=" * 60)

# Configuración
MODEL_PATH = "./epicrisis-model-finetuned"
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
MERGED_PATH = "./epicrisis-merged"
ONNX_PATH = "./epicrisis-onnx"

# ============================================
# PASO 1: Merge LoRA con modelo base
# ============================================

print("\n[1/3] Merging LoRA adapters con modelo base...")

# Cargar tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

# Cargar modelo base en float16
print("   Cargando modelo base...")
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16,
    trust_remote_code=True,
    low_cpu_mem_usage=True
)

# Aplicar adaptadores LoRA
print("   Aplicando adaptadores LoRA...")
model = PeftModel.from_pretrained(base_model, MODEL_PATH)

# Merge y unload
print("   Merging adapters...")
model = model.merge_and_unload()

# Guardar modelo mergeado
print(f"   Guardando en {MERGED_PATH}...")
os.makedirs(MERGED_PATH, exist_ok=True)
model.save_pretrained(MERGED_PATH, safe_serialization=True)
tokenizer.save_pretrained(MERGED_PATH)

print("✓ Modelo mergeado guardado!")

# Liberar memoria
del model
del base_model
torch.cuda.empty_cache() if torch.cuda.is_available() else None

# ============================================
# PASO 2: Exportar a ONNX
# ============================================

print("\n[2/3] Exportando a ONNX...")

# Usar optimum para exportar
from optimum.exporters.onnx import main_export

try:
    main_export(
        MERGED_PATH,
        output=ONNX_PATH,
        task="text-generation-with-past",
        opset=14,
        device="cpu",
        fp16=False,  # Exportar en fp32 primero
    )
    print("✓ Modelo ONNX exportado!")
except Exception as e:
    print(f"❌ Error en exportación ONNX: {e}")
    print("\nIntentando método alternativo...")

    # Método alternativo con optimum-cli
    import subprocess
    result = subprocess.run([
        "optimum-cli", "export", "onnx",
        "--model", MERGED_PATH,
        "--task", "text-generation-with-past",
        ONNX_PATH
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print("✓ Modelo ONNX exportado (método alternativo)!")
    else:
        print(f"❌ Error: {result.stderr}")
        exit(1)

# ============================================
# PASO 3: Cuantizar a INT8
# ============================================

print("\n[3/3] Cuantizando a INT8...")

ONNX_Q8_PATH = "./epicrisis-onnx-q8"

try:
    from optimum.onnxruntime import ORTQuantizer
    from optimum.onnxruntime.configuration import AutoQuantizationConfig

    # Configuración de cuantización
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)

    quantizer = ORTQuantizer.from_pretrained(ONNX_PATH)
    quantizer.quantize(save_dir=ONNX_Q8_PATH, quantization_config=qconfig)

    print("✓ Modelo cuantizado guardado!")
except Exception as e:
    print(f"⚠️  Cuantización falló: {e}")
    print("   Usando modelo sin cuantizar...")
    ONNX_Q8_PATH = ONNX_PATH

# ============================================
# RESUMEN
# ============================================

print("\n" + "=" * 60)
print("CONVERSIÓN COMPLETADA")
print("=" * 60)

# Mostrar tamaños
def get_dir_size(path):
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total += os.path.getsize(fp)
    return total / (1024 * 1024)  # MB

print(f"\n📁 Archivos generados:")
print(f"   {MERGED_PATH}: {get_dir_size(MERGED_PATH):.1f} MB")
print(f"   {ONNX_PATH}: {get_dir_size(ONNX_PATH):.1f} MB")
if os.path.exists(ONNX_Q8_PATH) and ONNX_Q8_PATH != ONNX_PATH:
    print(f"   {ONNX_Q8_PATH}: {get_dir_size(ONNX_Q8_PATH):.1f} MB")

print(f"\n📋 Archivos en {ONNX_PATH}:")
for f in os.listdir(ONNX_PATH):
    size = os.path.getsize(os.path.join(ONNX_PATH, f)) / (1024 * 1024)
    print(f"   {f}: {size:.1f} MB")

print("\n✅ Listo para usar con Transformers.js!")
print(f"   Copiar {ONNX_PATH}/* al backend/models/epicrisis-finetuned/")
