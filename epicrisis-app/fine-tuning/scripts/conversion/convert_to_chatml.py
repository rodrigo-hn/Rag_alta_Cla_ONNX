#!/usr/bin/env python3
"""
Convierte datasets de epicrisis a formato ChatML para fine-tuning.
El formato ChatML es compatible con modelos Qwen2.5-Instruct.
"""

import json
from pathlib import Path

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


def convert_to_chatml(input_data: dict, output_text: str) -> str:
    """
    Convierte un ejemplo a formato ChatML completo.

    Formato:
    <|im_start|>system
    {system_instruction}<|im_end|>
    <|im_start|>user
    {json_input}<|im_end|>
    <|im_start|>assistant
    {output}<|im_end|>
    """
    json_str = json.dumps(input_data, ensure_ascii=False, indent=2)

    chatml = (
        f"<|im_start|>system\n{SYSTEM_INSTRUCTION}<|im_end|>\n"
        f"<|im_start|>user\n{json_str}<|im_end|>\n"
        f"<|im_start|>assistant\n{output_text}<|im_end|>"
    )

    return chatml


def process_datasets():
    """Procesa todos los datasets y los convierte a formato ChatML."""
    base_dir = Path(__file__).parent
    datasets_dir = base_dir / "datasets"
    output_dir = base_dir / "chatml_data"
    output_dir.mkdir(exist_ok=True)

    # Archivos de datasets
    dataset_files = [
        "anatomia_coronaria.jsonl",
        "codigos_correctos.jsonl",
        "ejemplos_negativos.jsonl",
    ]

    # Dataset original
    train_file = base_dir / "train.jsonl"

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

    # Convertir a formato ChatML
    chatml_examples = []
    for example in all_examples:
        input_data = example.get("input", {})
        output_text = example.get("output", "")

        chatml_text = convert_to_chatml(input_data, output_text)
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

    print(f"\nDatasets ChatML guardados en {output_dir}/")
    print(f"  - train.jsonl: {len(train_examples)} ejemplos")
    print(f"  - valid.jsonl: {len(valid_examples)} ejemplos")

    # Mostrar ejemplo
    print("\n" + "="*60)
    print("Ejemplo de formato ChatML:")
    print("="*60)
    print(chatml_examples[0]["text"][:800] + "...")

    return output_dir


if __name__ == "__main__":
    process_datasets()
