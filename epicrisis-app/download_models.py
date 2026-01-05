#!/usr/bin/env python3
"""
Script para descargar modelos de LLM y Embeddings desde Hugging Face
Para el proyecto Epicrisis Automática

Uso:
    python download_models.py --all
    python download_models.py --llm
    python download_models.py --embeddings
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Tuple
import urllib.request
from tqdm import tqdm


class DownloadProgressBar(tqdm):
    """Barra de progreso para descarga"""
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)


def download_file(url: str, output_path: Path, desc: str = None) -> bool:
    """Descarga un archivo con barra de progreso"""
    if output_path.exists():
        print(f"✓ Ya existe: {output_path.name}")
        return True

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc=desc or output_path.name) as t:
            urllib.request.urlretrieve(url, filename=output_path, reporthook=t.update_to)

        print(f"✓ Descargado: {output_path.name}")
        return True
    except Exception as e:
        print(f"✗ Error descargando {output_path.name}: {e}")
        if output_path.exists():
            output_path.unlink()
        return False


def download_tinyllama(base_dir: Path) -> bool:
    """Descarga el modelo TinyLlama cuantizado"""
    print("\n" + "="*60)
    print("MODELO LLM: TinyLlama 1.1B Chat Q4_K_M")
    print("="*60)
    print("Tamaño: ~637 MB")
    print("Cuantización: Q4_K_M (balance entre calidad y tamaño)")
    print()

    target_dir = base_dir / "llm" / "tinyllama-1.1b-chat-q4"
    target_dir.mkdir(parents=True, exist_ok=True)

    repo = "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF"
    files = [
        "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    ]

    success = True
    for filename in files:
        url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
        output_path = target_dir / filename

        if not download_file(url, output_path, f"TinyLlama: {filename}"):
            success = False

    # Crear archivo de configuración
    config_path = target_dir / "model_info.txt"
    if not config_path.exists():
        with open(config_path, 'w') as f:
            f.write(f"Modelo: TinyLlama 1.1B Chat\n")
            f.write(f"Cuantización: Q4_K_M\n")
            f.write(f"Repositorio: {repo}\n")
            f.write(f"Formato: GGUF\n")
            f.write(f"Uso: Generación de texto médico\n")

    return success


def download_e5_embeddings(base_dir: Path) -> bool:
    """Descarga el modelo de embeddings E5"""
    print("\n" + "="*60)
    print("EMBEDDINGS: Multilingual E5 Small")
    print("="*60)
    print("Tamaño: ~118 MB")
    print("Idiomas: 100+ incluyendo español")
    print()

    target_dir = base_dir / "embeddings" / "multilingual-e5-small"
    target_dir.mkdir(parents=True, exist_ok=True)

    repo = "intfloat/multilingual-e5-small"
    files = [
        "config.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "pytorch_model.bin",
    ]

    success = True
    for filename in files:
        url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
        output_path = target_dir / filename

        if not download_file(url, output_path, f"E5: {filename}"):
            success = False

    return success


def download_alternative_llm(base_dir: Path, model_name: str) -> bool:
    """Descarga modelos LLM alternativos"""
    models = {
        "mistral-7b": {
            "repo": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
            "file": "mistral-7b-instruct-v0.2.Q4_K_M.gguf",
            "size": "4.1GB",
            "dir": "mistral-7b-instruct-q4"
        },
        "llama-3.2-3b": {
            "repo": "bartowski/Llama-3.2-3B-Instruct-GGUF",
            "file": "Llama-3.2-3B-Instruct-Q4_K_M.gguf",
            "size": "1.9GB",
            "dir": "llama-3.2-3b-instruct-q4"
        },
    }

    if model_name not in models:
        print(f"✗ Modelo '{model_name}' no reconocido")
        print(f"Modelos disponibles: {', '.join(models.keys())}")
        return False

    model_info = models[model_name]
    print(f"\n{'='*60}")
    print(f"Descargando: {model_name}")
    print(f"Tamaño: {model_info['size']}")
    print('='*60)

    target_dir = base_dir / "llm" / model_info['dir']
    target_dir.mkdir(parents=True, exist_ok=True)

    url = f"https://huggingface.co/{model_info['repo']}/resolve/main/{model_info['file']}"
    output_path = target_dir / model_info['file']

    return download_file(url, output_path, f"{model_name}: {model_info['file']}")


def install_requirements():
    """Instala dependencias necesarias"""
    try:
        import tqdm
    except ImportError:
        print("Instalando dependencia: tqdm")
        os.system(f"{sys.executable} -m pip install tqdm")


def main():
    parser = argparse.ArgumentParser(
        description="Descarga modelos de LLM y Embeddings para Epicrisis Automática"
    )
    parser.add_argument("--all", action="store_true", help="Descargar todos los modelos")
    parser.add_argument("--llm", action="store_true", help="Descargar solo modelo LLM (TinyLlama)")
    parser.add_argument("--embeddings", action="store_true", help="Descargar solo embeddings (E5)")
    parser.add_argument("--alternative-llm", type=str,
                       help="Descargar modelo LLM alternativo (mistral-7b, llama-3.2-3b)")

    args = parser.parse_args()

    # Verificar que estamos en el directorio correcto
    base_dir = Path("models")
    if not base_dir.exists():
        print("✗ Error: No se encuentra el directorio 'models'")
        print("  Ejecuta este script desde el directorio raíz del proyecto")
        sys.exit(1)

    # Instalar dependencias
    install_requirements()

    print("\n" + "="*60)
    print("  DESCARGADOR DE MODELOS LOCALES")
    print("  Epicrisis Automática")
    print("="*60)

    # Si no se especifica nada, mostrar menú
    if not any([args.all, args.llm, args.embeddings, args.alternative_llm]):
        print("\nOpciones:")
        print("  1. Descargar todo (TinyLlama + E5 Embeddings)")
        print("  2. Solo TinyLlama LLM")
        print("  3. Solo E5 Embeddings")
        print("  4. Modelo LLM alternativo (más grande, mejor calidad)")
        print("  0. Salir")

        choice = input("\nSelecciona una opción: ").strip()

        if choice == "1":
            args.all = True
        elif choice == "2":
            args.llm = True
        elif choice == "3":
            args.embeddings = True
        elif choice == "4":
            print("\nModelos alternativos disponibles:")
            print("  • mistral-7b (4.1GB) - Excelente calidad general")
            print("  • llama-3.2-3b (1.9GB) - Balance entre tamaño y calidad")
            model = input("\nIngresa el nombre del modelo: ").strip()
            args.alternative_llm = model
        else:
            print("Saliendo...")
            sys.exit(0)

    # Descargar según opciones
    success = True

    if args.all or args.llm:
        if not download_tinyllama(base_dir):
            success = False

    if args.all or args.embeddings:
        if not download_e5_embeddings(base_dir):
            success = False

    if args.alternative_llm:
        if not download_alternative_llm(base_dir, args.alternative_llm):
            success = False

    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN")
    print("="*60)

    # Verificar archivos descargados
    tinyllama_path = base_dir / "llm" / "tinyllama-1.1b-chat-q4" / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
    e5_path = base_dir / "embeddings" / "multilingual-e5-small" / "pytorch_model.bin"

    if tinyllama_path.exists():
        size_mb = tinyllama_path.stat().st_size / (1024 * 1024)
        print(f"✓ TinyLlama LLM instalado ({size_mb:.1f} MB)")
    else:
        print("⊘ TinyLlama LLM no instalado")

    if e5_path.exists():
        size_mb = e5_path.stat().st_size / (1024 * 1024)
        print(f"✓ E5 Embeddings instalados ({size_mb:.1f} MB)")
    else:
        print("⊘ E5 Embeddings no instalados")

    print("\n" + "="*60)
    print("NOTAS IMPORTANTES")
    print("="*60)
    print()
    print("1. Los modelos locales son OPCIONALES")
    print("   Puedes usar APIs externas (OpenAI, Anthropic, etc.)")
    print()
    print("2. Para mejor calidad en español médico:")
    print("   • Considera usar Mistral 7B o Llama 3.2 3B")
    print("   • Ejecuta: python download_models.py --alternative-llm mistral-7b")
    print()
    print("3. Configuración en backend/.env:")
    print("   MODEL_TYPE=local")
    print("   LOCAL_LLM_PATH=./models/llm/tinyllama-1.1b-chat-q4")
    print("   EMBEDDINGS_PATH=./models/embeddings/multilingual-e5-small")
    print()

    if success:
        print("✓ Descarga completada exitosamente!")
    else:
        print("⚠ Algunas descargas fallaron. Revisa los errores arriba.")
        sys.exit(1)


if __name__ == "__main__":
    main()
