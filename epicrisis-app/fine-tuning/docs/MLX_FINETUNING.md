# Fine-tuning con MLX para Mac M4

## Requisitos

```bash
# Python 3.10+ recomendado
pip install mlx mlx-lm
```

## Datasets

Se han creado 3 datasets focalizados en `datasets/`:

| Dataset | Ejemplos | Propósito |
|---------|----------|-----------|
| `anatomia_coronaria.jsonl` | 50 | Uso correcto de DA, CD, CX, TCI, OM |
| `codigos_correctos.jsonl` | 50 | Códigos CIE-10, K y ATC correctos |
| `ejemplos_negativos.jsonl` | 30 | Evitar inventar datos |

Total: **130 ejemplos focalizados** + dataset original (`train.jsonl`)

## Uso

### Flujo completo paso a paso

```bash
# 1. Preparar datasets (combina todos y divide train/valid)
python mlx_finetune.py --prepare-only

# 2. Entrenar LoRA
python mlx_finetune.py --train

# 3. Probar con adaptadores (sin fusionar)
python mlx_finetune.py --test-adapters

# 4. Fusionar adaptadores con modelo base
python mlx_finetune.py --merge

# 5. Probar modelo fusionado
python mlx_finetune.py --test
```

### Ejecutar todo de una vez

```bash
python mlx_finetune.py --train --merge --test
```

### Parámetros personalizados

```bash
python mlx_finetune.py --train \
    --epochs 5 \
    --batch-size 2 \
    --learning-rate 1e-5 \
    --lora-rank 16 \
    --lora-layers 24
```

## Parámetros recomendados para Mac M4

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| `--epochs` | 3-5 | Más epochs puede causar overfitting |
| `--batch-size` | 4 | Reducir si hay OOM |
| `--learning-rate` | 1e-5 | Conservador para evitar olvido catastrófico |
| `--lora-rank` | 8-16 | Mayor rank = más parámetros |
| `--lora-layers` | 16-24 | Capas del modelo a adaptar |

## Estructura de salida

```
fine-tuning/
├── mlx_data/           # Datasets preparados
│   ├── train.jsonl     # 90% para entrenamiento
│   └── valid.jsonl     # 10% para validación
├── mlx_adapters/       # Adaptadores LoRA entrenados
└── mlx_merged/         # Modelo fusionado final
```

## Post-entrenamiento: Exportar a ONNX

Una vez fine-tuneado, exportar el modelo fusionado:

```bash
# Convertir a Hugging Face format primero
python -c "
from mlx_lm import load
from transformers import AutoModelForCausalLM, AutoTokenizer

# Cargar modelo MLX fusionado
model, tokenizer = load('mlx_merged')

# Guardar en formato HF
tokenizer.save_pretrained('hf_finetuned')
# Nota: MLX no soporta exportación directa a HF
# Se requiere conversión manual
"

# Luego usar export_ortgenai.py para exportar a ONNX
python export_ortgenai.py --precision fp16 --execution_provider webgpu
```

## Notas

- MLX está optimizado para Apple Silicon (M1-M4)
- El fine-tuning usa LoRA para eficiencia de memoria
- Los adaptadores son pequeños (~10-50MB) vs el modelo completo (~1GB)
- Se puede probar con adaptadores antes de fusionar para iterar rápido
