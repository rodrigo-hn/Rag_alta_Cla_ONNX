#!/usr/bin/env python3
"""
Fine-tuning con MLX para Mac M4
================================
Script para hacer LoRA fine-tuning del modelo Qwen2.5-0.5B usando MLX.
Optimizado para Apple Silicon (M4).

Uso:
    # Instalar dependencias
    pip install mlx mlx-lm

    # Ejecutar fine-tuning
    python mlx_finetune.py

    # Ejecutar con parámetros personalizados
    python mlx_finetune.py --epochs 5 --batch-size 2 --learning-rate 1e-5
"""

import argparse
import json
import os
from pathlib import Path


def prepare_datasets():
    """Combina los datasets y los prepara en formato ChatML completo para MLX."""
    datasets_dir = Path(__file__).parent / "datasets"
    output_dir = Path(__file__).parent / "mlx_data"
    output_dir.mkdir(exist_ok=True)

    # Archivos de datasets
    dataset_files = [
        "anatomia_coronaria.jsonl",
        "codigos_correctos.jsonl",
        "ejemplos_negativos.jsonl",
        "dataset_extra_1.jsonl",
        "dataset_extra_2.jsonl",
        "dataset_extra_3.jsonl",
    ]

    # Dataset original de entrenamiento
    train_file = Path(__file__).parent / "train.jsonl"

    all_examples = []

    # Cargar dataset original
    if train_file.exists():
        with open(train_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    example = json.loads(line)
                    all_examples.append(example)
        print(f"Cargados {len(all_examples)} ejemplos de train.jsonl")

    # Cargar datasets focalizados
    for dataset_file in dataset_files:
        file_path = datasets_dir / dataset_file
        if file_path.exists():
            count = 0
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        example = json.loads(line)
                        # Remover campos extra
                        example.pop("negative_note", None)
                        example.pop("instruction", None)
                        all_examples.append(example)
                        count += 1
            print(f"Cargados {count} ejemplos de {dataset_file}")

    print(f"\nTotal de ejemplos: {len(all_examples)}")

    # System instruction actualizada (igual que en app.js)
    system_instruction = (
        "Genera una epicrisis narrativa en UN SOLO PARRAFO. "
        "USA SOLO la informacion del JSON, NO inventes datos. "
        "IMPORTANTE: Incluye TODOS los codigos entre parentesis: "
        "diagnostico de ingreso con codigo CIE-10 (ej: I20.0), "
        "procedimientos con codigo K (ej: K492, K493), "
        "medicacion con dosis y codigo ATC (ej: B01AC06). "
        "Estructura: dx ingreso -> procedimientos -> evolucion -> dx alta -> medicacion alta. "
        "Abreviaturas: DA=descendente anterior, CD=coronaria derecha, CX=circunfleja, "
        "SDST=supradesnivel ST, IAM=infarto agudo miocardio."
    )

    # Convertir a formato ChatML completo para Qwen2.5-Instruct
    chatml_examples = []
    for example in all_examples:
        input_data = example.get("input", {})
        output_text = example.get("output", "")
        json_str = json.dumps(input_data, ensure_ascii=False, indent=2)

        # Formato ChatML completo con tokens especiales
        chatml_text = (
            f"<|im_start|>system\n{system_instruction}<|im_end|>\n"
            f"<|im_start|>user\n{json_str}<|im_end|>\n"
            f"<|im_start|>assistant\n{output_text}<|im_end|>"
        )

        chatml_examples.append({"text": chatml_text})

    # Dividir en train/valid (90/10)
    import random
    random.seed(42)
    random.shuffle(chatml_examples)

    split_idx = int(len(chatml_examples) * 0.9)
    train_examples = chatml_examples[:split_idx]
    valid_examples = chatml_examples[split_idx:]

    # Guardar datasets
    train_path = output_dir / "train.jsonl"
    valid_path = output_dir / "valid.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for example in train_examples:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")

    with open(valid_path, "w", encoding="utf-8") as f:
        for example in valid_examples:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")

    print(f"\nDatasets guardados en {output_dir}/")
    print(f"  - train.jsonl: {len(train_examples)} ejemplos")
    print(f"  - valid.jsonl: {len(valid_examples)} ejemplos")

    return output_dir


def run_finetuning(
    data_dir: Path,
    model_name: str = "Qwen/Qwen2.5-0.5B-Instruct",
    output_dir: str = "mlx_adapters",
    epochs: int = 3,
    batch_size: int = 4,
    learning_rate: float = 1e-5,
    lora_rank: int = 8,
    lora_layers: int = 16,
):
    """Ejecuta fine-tuning con MLX-LM."""
    import subprocess
    import sys

    output_path = Path(__file__).parent / output_dir
    output_path.mkdir(exist_ok=True)

    # Crear archivo de configuración YAML para LoRA
    config_path = output_path / "lora_config.yaml"
    config_content = f"""# Configuración LoRA para MLX-LM
lora_parameters:
  rank: {lora_rank}
  alpha: {lora_rank * 2}
  dropout: 0.05
  scale: 1.0
"""
    with open(config_path, "w") as f:
        f.write(config_content)

    print(f"\n{'='*60}")
    print("Fine-tuning con MLX")
    print(f"{'='*60}")
    print(f"Modelo base: {model_name}")
    print(f"Directorio de datos: {data_dir}")
    print(f"Directorio de salida: {output_path}")
    print(f"Epochs: {epochs}")
    print(f"Batch size: {batch_size}")
    print(f"Learning rate: {learning_rate}")
    print(f"LoRA rank: {lora_rank}")
    print(f"LoRA layers: {lora_layers}")
    print(f"{'='*60}\n")

    # Calcular iteraciones basadas en epochs y tamaño del dataset
    # Asumiendo ~400 ejemplos y batch_size 4 = 100 iteraciones por epoch
    iters = epochs * 100

    # Ejecutar entrenamiento usando mlx_lm CLI (nueva API)
    cmd = [
        sys.executable, "-m", "mlx_lm", "lora",
        "--model", model_name,
        "--data", str(data_dir),
        "--train",
        "--adapter-path", str(output_path),
        "--iters", str(iters),
        "--batch-size", str(batch_size),
        "--learning-rate", str(learning_rate),
        "--num-layers", str(lora_layers),
        "-c", str(config_path),
    ]

    print(f"Ejecutando: {' '.join(cmd)}\n")
    result = subprocess.run(cmd)

    if result.returncode != 0:
        print(f"\nError durante el entrenamiento (código: {result.returncode})")
        return None

    print(f"\n{'='*60}")
    print(f"Fine-tuning completado!")
    print(f"Adaptadores guardados en: {output_path}")
    print(f"{'='*60}")

    return output_path


def merge_and_export(
    adapter_path: str = "mlx_adapters",
    model_name: str = "Qwen/Qwen2.5-0.5B-Instruct",
    output_dir: str = "mlx_merged",
):
    """Fusiona los adaptadores LoRA con el modelo base y exporta."""
    import subprocess
    import sys

    adapter_full_path = Path(__file__).parent / adapter_path
    output_full_path = Path(__file__).parent / output_dir

    # Verificar que existen los adaptadores
    adapter_config = adapter_full_path / "adapter_config.json"
    if not adapter_config.exists():
        print(f"Error: No se encontraron adaptadores en {adapter_full_path}")
        print("Asegúrate de ejecutar --train primero.")
        return None

    print(f"\n{'='*60}")
    print("Fusionando adaptadores LoRA con modelo base")
    print(f"{'='*60}")

    cmd = [
        sys.executable, "-m", "mlx_lm", "fuse",
        "--model", model_name,
        "--adapter-path", str(adapter_full_path),
        "--save-path", str(output_full_path),
    ]

    print(f"Ejecutando: {' '.join(cmd)}\n")
    result = subprocess.run(cmd)

    if result.returncode != 0:
        print(f"\nError durante la fusión (código: {result.returncode})")
        return None

    print(f"\nModelo fusionado guardado en: {output_full_path}")
    return output_full_path


def test_model(
    model_path: str = "mlx_merged",
    adapter_path: str = None,
    model_name: str = "Qwen/Qwen2.5-0.5B-Instruct",
):
    """Prueba el modelo fine-tuneado."""
    try:
        from mlx_lm import load, generate
    except ImportError:
        print("Error: mlx-lm no está instalado.")
        return

    # Usar modelo fusionado o modelo base con adaptadores
    if adapter_path:
        model_to_load = model_name
        adapter_full_path = Path(__file__).parent / adapter_path
        print(f"Cargando modelo base con adaptadores de: {adapter_full_path}")
        model, tokenizer = load(model_to_load, adapter_path=str(adapter_full_path))
    else:
        model_full_path = Path(__file__).parent / model_path
        if not model_full_path.exists():
            print(f"Error: No se encuentra el modelo en {model_full_path}")
            return
        print(f"Cargando modelo fusionado de: {model_full_path}")
        model, tokenizer = load(str(model_full_path))

    # Prompt de prueba
    test_input = {
        "dx": ["Angina inestable (I20.0)"],
        "proc": ["Coronariografia (K492)", "Angioplastia (K493)"],
        "tto": [
            "Aspirina 300mg carga (B01AC06)",
            "Enoxaparina 60mg SC c/12h (B01AB05)",
        ],
        "evo": "SDST V1-V4. Oclusion DA proximal. Angioplastia exitosa con stent.",
        "dx_alta": ["IAM pared anterior (I21.0)"],
        "med": [
            "Aspirina 100mg VO c/24h (B01AC06)",
            "Clopidogrel 75mg VO c/24h 12m (B01AC04)",
        ],
    }

    system_instruction = (
        "Genera una epicrisis narrativa en UN SOLO PARRAFO. "
        "USA SOLO la informacion del JSON, NO inventes datos. "
        "Incluye: diagnostico de ingreso, procedimientos con codigos, evolucion, "
        "diagnostico de alta y medicacion de alta con dosis y codigos ATC. "
        "Abreviaturas: DA=descendente anterior, CD=coronaria derecha, CX=circunfleja, "
        "SDST=supradesnivel ST, IAM=infarto agudo miocardio."
    )

    prompt = f"{system_instruction}\n\nEpicrisis:\n{json.dumps(test_input, ensure_ascii=False)}"

    print(f"\n{'='*60}")
    print("Prueba del modelo")
    print(f"{'='*60}")
    print(f"Prompt:\n{prompt[:200]}...")
    print(f"\n{'='*60}")
    print("Generando respuesta...")
    print(f"{'='*60}\n")

    response = generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=256,
    )

    print("Respuesta:")
    print(response)


def main():
    parser = argparse.ArgumentParser(
        description="Fine-tuning con MLX para modelo de epicrisis"
    )
    parser.add_argument(
        "--prepare-only",
        action="store_true",
        help="Solo preparar datasets sin entrenar",
    )
    parser.add_argument(
        "--train",
        action="store_true",
        help="Ejecutar fine-tuning",
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Fusionar adaptadores con modelo base",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Probar modelo fine-tuneado",
    )
    parser.add_argument(
        "--test-adapters",
        action="store_true",
        help="Probar modelo con adaptadores (sin fusionar)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Número de epochs (default: 3)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=4,
        help="Batch size (default: 4)",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=1e-5,
        help="Learning rate (default: 1e-5)",
    )
    parser.add_argument(
        "--lora-rank",
        type=int,
        default=8,
        help="LoRA rank (default: 8)",
    )
    parser.add_argument(
        "--lora-layers",
        type=int,
        default=16,
        help="Número de capas LoRA (default: 16)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="Qwen/Qwen2.5-0.5B-Instruct",
        help="Modelo base de HuggingFace",
    )

    args = parser.parse_args()

    # Si no se especifica ninguna acción, mostrar ayuda
    if not any([args.prepare_only, args.train, args.merge, args.test, args.test_adapters]):
        print("Flujo completo de fine-tuning:")
        print("  1. python mlx_finetune.py --prepare-only  # Preparar datasets")
        print("  2. python mlx_finetune.py --train         # Entrenar LoRA")
        print("  3. python mlx_finetune.py --test-adapters # Probar con adaptadores")
        print("  4. python mlx_finetune.py --merge         # Fusionar modelo")
        print("  5. python mlx_finetune.py --test          # Probar modelo fusionado")
        print("\nO ejecutar todo:")
        print("  python mlx_finetune.py --train --merge --test")
        parser.print_help()
        return

    # Preparar datasets
    if args.prepare_only or args.train:
        data_dir = prepare_datasets()

    # Entrenar
    if args.train:
        run_finetuning(
            data_dir=data_dir,
            model_name=args.model,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            lora_rank=args.lora_rank,
            lora_layers=args.lora_layers,
        )

    # Fusionar
    if args.merge:
        merge_and_export(model_name=args.model)

    # Probar
    if args.test:
        test_model()

    if args.test_adapters:
        test_model(adapter_path="mlx_adapters", model_name=args.model)


if __name__ == "__main__":
    main()
