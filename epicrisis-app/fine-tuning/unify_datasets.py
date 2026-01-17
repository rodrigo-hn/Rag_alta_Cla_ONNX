#!/usr/bin/env python3
"""
Unifica todos los datasets en dos archivos: train.jsonl y validation.jsonl
Formato ChatML listo para fine-tuning en Google Colab.
"""

import json
import random
from pathlib import Path

# System instruction (igual que en app.js)
SYSTEM_INSTRUCTION = (
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


def load_all_datasets():
    """Carga todos los datasets disponibles."""
    base_dir = Path(__file__).parent
    datasets_dir = base_dir / "datasets"

    all_examples = []

    # Dataset principal
    train_file = base_dir / "train.jsonl"
    if train_file.exists():
        count = 0
        with open(train_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    example = json.loads(line)
                    all_examples.append(example)
                    count += 1
        print(f"Cargados {count} ejemplos de train.jsonl")

    # Datasets adicionales
    dataset_files = [
        "anatomia_coronaria.jsonl",
        "codigos_correctos.jsonl",
        "ejemplos_negativos.jsonl",
        "dataset_extra_1.jsonl",
        "dataset_extra_2.jsonl",
        "dataset_extra_3.jsonl",
    ]

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

    return all_examples


def convert_to_chatml(example):
    """Convierte un ejemplo al formato ChatML."""
    input_data = example.get("input", {})
    output_text = example.get("output", "")
    json_str = json.dumps(input_data, ensure_ascii=False, indent=2)

    chatml_text = (
        f"<|im_start|>system\n{SYSTEM_INSTRUCTION}<|im_end|>\n"
        f"<|im_start|>user\n{json_str}<|im_end|>\n"
        f"<|im_start|>assistant\n{output_text}<|im_end|>"
    )

    return {"text": chatml_text}


def main():
    print("=" * 60)
    print("Unificando datasets para fine-tuning")
    print("=" * 60)

    # Cargar todos los ejemplos
    all_examples = load_all_datasets()
    print(f"\nTotal de ejemplos cargados: {len(all_examples)}")

    # Convertir a formato ChatML
    chatml_examples = [convert_to_chatml(ex) for ex in all_examples]

    # Shuffle
    random.seed(42)
    random.shuffle(chatml_examples)

    # Split 90/10
    split_idx = int(len(chatml_examples) * 0.9)
    train_examples = chatml_examples[:split_idx]
    valid_examples = chatml_examples[split_idx:]

    # Guardar archivos
    output_dir = Path(__file__).parent / "unified_data"
    output_dir.mkdir(exist_ok=True)

    train_path = output_dir / "train.jsonl"
    valid_path = output_dir / "validation.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for example in train_examples:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")

    with open(valid_path, "w", encoding="utf-8") as f:
        for example in valid_examples:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")

    print(f"\n" + "=" * 60)
    print("Datasets unificados guardados:")
    print(f"  - {train_path} ({len(train_examples)} ejemplos)")
    print(f"  - {valid_path} ({len(valid_examples)} ejemplos)")
    print("=" * 60)

    # Mostrar ejemplo
    print("\nEjemplo del formato ChatML:")
    print("-" * 60)
    print(chatml_examples[0]["text"][:800])
    print("...")

    # Estadisticas
    print("\n" + "=" * 60)
    print("Estadisticas:")
    print(f"  - Total ejemplos: {len(chatml_examples)}")
    print(f"  - Train: {len(train_examples)} (90%)")
    print(f"  - Validation: {len(valid_examples)} (10%)")

    # Calcular longitud promedio
    lengths = [len(ex["text"]) for ex in chatml_examples]
    print(f"  - Longitud promedio: {sum(lengths) / len(lengths):.0f} caracteres")
    print(f"  - Longitud minima: {min(lengths)} caracteres")
    print(f"  - Longitud maxima: {max(lengths)} caracteres")


if __name__ == "__main__":
    main()
