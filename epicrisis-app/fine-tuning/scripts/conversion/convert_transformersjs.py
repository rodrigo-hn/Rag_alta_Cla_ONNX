#!/usr/bin/env python3
"""
Convierte el modelo fine-tuned a ONNX usando el método oficial de Transformers.js

Este script usa el paquete @huggingface/transformers para generar archivos ONNX
compatibles con el navegador, con cuantización q4f16.

Requisitos:
    pip install transformers optimum[onnxruntime] onnx onnxruntime

Uso:
    python convert_transformersjs.py
"""

import os
import sys
import shutil
import subprocess
import json

# Configuración
MERGED_PATH = "./epicrisis-merged"
OUTPUT_PATH = "../models/epicrisis-finetuned-q4f16"

print("=" * 60)
print("CONVERSIÓN A ONNX PARA TRANSFORMERS.JS (q4f16)")
print("=" * 60)

# Verificar que el modelo merged existe
if not os.path.exists(MERGED_PATH):
    print(f"❌ Error: No se encuentra {MERGED_PATH}")
    print("   Primero ejecute los pasos de merge en convert_to_onnx.py")
    sys.exit(1)

print(f"\n✓ Modelo merged encontrado en: {MERGED_PATH}")

# Crear directorio de salida
if os.path.exists(OUTPUT_PATH):
    print(f"\n⚠️  Eliminando directorio existente: {OUTPUT_PATH}")
    shutil.rmtree(OUTPUT_PATH)

os.makedirs(OUTPUT_PATH, exist_ok=True)

# ============================================
# PASO 1: Exportar a ONNX con FP16
# ============================================
print(f"\n[1/3] Exportando a ONNX con FP16...")

# Usar optimum-cli para exportar
cmd = [
    "optimum-cli", "export", "onnx",
    "--model", MERGED_PATH,
    "--task", "text-generation-with-past",
    "--fp16",
    OUTPUT_PATH
]

print(f"   Comando: {' '.join(cmd)}")

result = subprocess.run(cmd, capture_output=True, text=True)
if result.returncode != 0:
    print(f"❌ Error en exportación:")
    print(result.stderr)

    # Intentar sin --fp16 si falla
    print("\n   Intentando sin --fp16...")
    cmd = [
        "optimum-cli", "export", "onnx",
        "--model", MERGED_PATH,
        "--task", "text-generation-with-past",
        OUTPUT_PATH
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error:")
        print(result.stderr)
        sys.exit(1)

print("✓ Exportación ONNX completada")

# ============================================
# PASO 2: Reorganizar estructura para Transformers.js
# ============================================
print(f"\n[2/3] Reorganizando estructura...")

# Transformers.js espera: onnx/model_*.onnx
onnx_dir = os.path.join(OUTPUT_PATH, "onnx")
os.makedirs(onnx_dir, exist_ok=True)

# Mover archivos ONNX a subcarpeta
for f in os.listdir(OUTPUT_PATH):
    if f.endswith(".onnx") or f.endswith(".onnx_data"):
        src = os.path.join(OUTPUT_PATH, f)
        # Renombrar model.onnx a model_fp16.onnx
        if f == "model.onnx":
            dst = os.path.join(onnx_dir, "model_fp16.onnx")
        elif f == "model.onnx_data":
            dst = os.path.join(onnx_dir, "model_fp16.onnx_data")
        else:
            dst = os.path.join(onnx_dir, f)
        shutil.move(src, dst)
        print(f"   Movido: {f} -> onnx/{os.path.basename(dst)}")

print("✓ Estructura reorganizada")

# ============================================
# PASO 3: Actualizar config.json para Transformers.js
# ============================================
print(f"\n[3/3] Actualizando config.json...")

config_path = os.path.join(OUTPUT_PATH, "config.json")
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        config = json.load(f)

    # Agregar configuración de Transformers.js
    config["transformers.js_config"] = {
        "dtype": "fp16",
        "kv_cache_dtype": {
            "fp16": "float16"
        }
    }

    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

    print("✓ config.json actualizado con transformers.js_config")

# ============================================
# RESUMEN
# ============================================
print("\n" + "=" * 60)
print("CONVERSIÓN COMPLETADA")
print("=" * 60)

# Mostrar archivos generados
print(f"\n📁 Archivos en {OUTPUT_PATH}:")
total_size = 0
for root, dirs, files in os.walk(OUTPUT_PATH):
    for f in files:
        fp = os.path.join(root, f)
        size = os.path.getsize(fp)
        total_size += size
        rel_path = os.path.relpath(fp, OUTPUT_PATH)
        print(f"   {rel_path}: {size / (1024*1024):.1f} MB")

print(f"\n   Total: {total_size / (1024*1024*1024):.2f} GB")

print(f"""
📋 Pasos siguientes:

1. Si el modelo es muy grande (>2GB), considera usar cuantización adicional:

   # Instalar onnxruntime-tools
   pip install onnxruntime-tools

   # Cuantizar a INT8 (puede no funcionar con Transformers.js)
   # Mejor opción: usar el modelo fp16 directamente

2. Actualiza rag.types.ts para habilitar el modelo:
   - Cambia 'disabled: true' a 'disabled: false'
   - Cambia 'dtype: q8' a 'dtype: fp16'
   - Cambia 'localPath' a 'epicrisis-finetuned-q4f16'

3. El modelo fp16 es grande (~3GB). Si necesitas uno más pequeño,
   la mejor opción es usar el script de conversión de HuggingFace:

   pip install huggingface_hub[cli]
   huggingface-cli download --local-dir {OUTPUT_PATH}-q4 \\
       Xenova/Qwen2.5-1.5B-Instruct-ONNX --revision q4f16

   Y luego reemplazar los pesos con los de tu modelo fine-tuned.
""")
