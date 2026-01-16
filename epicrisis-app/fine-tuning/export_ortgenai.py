#!/usr/bin/env python3
"""
Exportar modelo epicrisis a formato ORT GenAI.
FP16 ofrece mejor calidad que INT4 con tamaño razonable (~2.9GB).
ORT GenAI soporta: int4, bf16, fp16, fp32 (no soporta int8).
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Exportar modelo a ORT GenAI")
    parser.add_argument(
        "--model-dir",
        default=str(Path(__file__).resolve().parent.parent / "models" / "epicrisis-merged"),
        help="Directorio del modelo HuggingFace base",
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent / "app" / "public" / "models" / "onnx-webgpu-fp16"),
        help="Directorio de salida",
    )
    parser.add_argument(
        "--precision",
        choices=["int4", "bf16", "fp16", "fp32"],
        default="fp16",
        help="Precisión (ORT GenAI soporta: int4, bf16, fp16, fp32)",
    )
    parser.add_argument(
        "--execution-provider",
        choices=["cpu", "cuda", "dml", "webgpu"],
        default="webgpu",
        help="Proveedor de ejecución objetivo",
    )
    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    output_dir = Path(args.output_dir)

    if not model_dir.exists():
        print(f"ERROR: Modelo no encontrado en {model_dir}")
        sys.exit(1)

    # Limpiar directorio de salida si existe
    if output_dir.exists():
        print(f"Limpiando directorio existente: {output_dir}")
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("EXPORTACIÓN A ORT GENAI")
    print("=" * 60)
    print(f"Modelo origen: {model_dir}")
    print(f"Directorio salida: {output_dir}")
    print(f"Precisión: {args.precision}")
    print(f"Execution Provider: {args.execution_provider}")
    print("=" * 60)

    # Construir comando para el builder
    cmd = [
        sys.executable,
        "-m",
        "onnxruntime_genai.models.builder",
        "-m", str(model_dir),
        "-o", str(output_dir),
        "-p", args.precision,
        "-e", args.execution_provider,
    ]

    print(f"\nEjecutando: {' '.join(cmd)}\n")

    try:
        result = subprocess.run(cmd, check=True, capture_output=False)
        print("\n" + "=" * 60)
        print("EXPORTACIÓN COMPLETADA")
        print("=" * 60)
        print(f"Modelo exportado a: {output_dir}")

        # Listar archivos generados
        print("\nArchivos generados:")
        for f in sorted(output_dir.iterdir()):
            size = f.stat().st_size / (1024 * 1024)
            print(f"  - {f.name}: {size:.1f} MB")

    except subprocess.CalledProcessError as e:
        print(f"\nERROR: Falló la exportación: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
