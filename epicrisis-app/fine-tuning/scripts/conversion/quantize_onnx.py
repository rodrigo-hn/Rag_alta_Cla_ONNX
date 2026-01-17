#!/usr/bin/env python3
"""
Cuantiza el modelo ONNX a formato compatible con Transformers.js

Este script toma el modelo ONNX FP32 y lo convierte a FP16 para reducir tamaño.
El FP16 es compatible con Transformers.js y funciona correctamente.

Uso:
    python quantize_onnx.py
"""

import os
import sys
import shutil
from pathlib import Path

# Ruta del modelo
INPUT_PATH = "../models/epicrisis-finetuned-q4f16/onnx"
OUTPUT_PATH = "../models/epicrisis-finetuned-fp16/onnx"

print("=" * 60)
print("CUANTIZACIÓN DE MODELO ONNX A FP16")
print("=" * 60)

# Verificar entrada
input_model = os.path.join(INPUT_PATH, "model_fp16.onnx")
input_data = os.path.join(INPUT_PATH, "model_fp16.onnx_data")

if not os.path.exists(input_model):
    print(f"❌ Error: No se encuentra {input_model}")
    sys.exit(1)

print(f"\n✓ Modelo encontrado: {input_model}")

# Verificar tamaño
input_size = os.path.getsize(input_model)
if os.path.exists(input_data):
    input_size += os.path.getsize(input_data)
print(f"  Tamaño actual: {input_size / (1024**3):.2f} GB")

# Intentar convertir a FP16 real usando onnx
print("\n[1] Cargando modelo ONNX...")

try:
    import onnx
    from onnx import TensorProto
    from onnxconverter_common import float16

    model = onnx.load(input_model)
    print(f"   Modelo cargado: {len(model.graph.node)} nodos")

    print("\n[2] Convirtiendo a FP16...")
    model_fp16 = float16.convert_float_to_float16(model, keep_io_types=True)

    # Crear directorio de salida
    os.makedirs(OUTPUT_PATH, exist_ok=True)

    # Guardar modelo
    output_model = os.path.join(OUTPUT_PATH, "model_fp16.onnx")
    print(f"\n[3] Guardando modelo en {output_model}...")
    onnx.save(model_fp16, output_model)

    # Verificar tamaño
    output_size = os.path.getsize(output_model)
    print(f"\n✓ Conversión completada!")
    print(f"  Tamaño original: {input_size / (1024**3):.2f} GB")
    print(f"  Tamaño FP16: {output_size / (1024**3):.2f} GB")
    print(f"  Reducción: {(1 - output_size/input_size) * 100:.1f}%")

    # Copiar archivos de tokenizer
    print("\n[4] Copiando archivos de tokenizer...")
    parent_input = os.path.dirname(INPUT_PATH)
    parent_output = os.path.dirname(OUTPUT_PATH)

    for f in os.listdir(parent_input):
        if f.endswith(('.json', '.txt', '.jinja')) and f != 'config.json':
            src = os.path.join(parent_input, f)
            dst = os.path.join(parent_output, f)
            if os.path.isfile(src):
                shutil.copy2(src, dst)
                print(f"   Copiado: {f}")

    # Copiar y actualizar config.json
    import json
    config_path = os.path.join(parent_input, "config.json")
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)

        config["transformers.js_config"] = {
            "dtype": "fp16",
            "kv_cache_dtype": {
                "fp16": "float16"
            }
        }

        output_config = os.path.join(parent_output, "config.json")
        with open(output_config, 'w') as f:
            json.dump(config, f, indent=2)
        print("   Actualizado: config.json")

except ImportError as e:
    print(f"❌ Error: Módulo no disponible: {e}")
    print("   Instale: pip install onnxconverter-common")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error en conversión: {e}")
    print("\n   El modelo puede ser muy grande para convertir en memoria.")
    print("   Alternativa: usar el modelo directamente sin cuantización adicional.")
    sys.exit(1)

print("\n" + "=" * 60)
print("PROCESO COMPLETADO")
print("=" * 60)
print(f"\nModelo disponible en: {os.path.dirname(OUTPUT_PATH)}")
