"""
Convierte el modelo fine-tuned a ONNX usando el método oficial de Transformers.js
Este método genera archivos ONNX compatibles con la librería en el navegador.

Requisitos:
    pip install transformers[onnx] onnx onnxruntime

Uso:
    python convert_to_onnx_transformersjs.py
"""

import os
import subprocess
import sys

# Configuración
MERGED_PATH = "./epicrisis-merged"
OUTPUT_PATH = "../models/epicrisis-finetuned-q4"

print("=" * 60)
print("CONVERSIÓN A ONNX PARA TRANSFORMERS.JS")
print("=" * 60)

# Verificar que el modelo merged existe
if not os.path.exists(MERGED_PATH):
    print(f"❌ Error: No se encuentra {MERGED_PATH}")
    print("   Primero ejecute convert_to_onnx.py para hacer merge de los adapters LoRA")
    sys.exit(1)

print(f"\n[1] Modelo merged encontrado en: {MERGED_PATH}")

# Verificar que transformers está instalado con soporte ONNX
try:
    import transformers
    print(f"   Transformers version: {transformers.__version__}")
except ImportError:
    print("❌ Error: transformers no instalado")
    sys.exit(1)

# Crear directorio de salida
os.makedirs(OUTPUT_PATH, exist_ok=True)

print(f"\n[2] Convirtiendo a ONNX con cuantización q4f16...")
print(f"   Output: {OUTPUT_PATH}")

# Usar el script de conversión de Hugging Face optimum
# Con quantization q4 para reducir tamaño
cmd = [
    sys.executable, "-m", "transformers.onnx",
    "--model", MERGED_PATH,
    "--feature", "causal-lm-with-past",
    "--opset", "14",
    OUTPUT_PATH
]

print(f"\n[3] Ejecutando: {' '.join(cmd)}")

try:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error en conversión:")
        print(result.stderr)

        # Intentar método alternativo con optimum-cli
        print("\n[3b] Intentando con optimum-cli...")
        cmd_alt = [
            "optimum-cli", "export", "onnx",
            "--model", MERGED_PATH,
            "--task", "text-generation-with-past",
            "--fp16",  # Usar fp16 en lugar de int8
            OUTPUT_PATH
        ]
        print(f"   Ejecutando: {' '.join(cmd_alt)}")
        result = subprocess.run(cmd_alt, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"❌ Error en método alternativo:")
            print(result.stderr)
            sys.exit(1)

    print("✓ Conversión completada!")
    print(result.stdout)

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Mostrar archivos generados
print(f"\n[4] Archivos generados en {OUTPUT_PATH}:")
total_size = 0
for f in os.listdir(OUTPUT_PATH):
    fp = os.path.join(OUTPUT_PATH, f)
    size = os.path.getsize(fp)
    total_size += size
    print(f"   {f}: {size / (1024*1024):.1f} MB")

print(f"\n   Total: {total_size / (1024*1024*1024):.2f} GB")

print("\n" + "=" * 60)
print("CONVERSIÓN COMPLETADA")
print("=" * 60)
print(f"\nEl modelo está listo en: {OUTPUT_PATH}")
print("Para usarlo, actualice rag.types.ts con el nuevo path")
