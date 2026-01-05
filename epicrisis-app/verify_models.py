#!/usr/bin/env python3
"""
Script para verificar que los modelos estén correctamente instalados
"""

import os
import sys
from pathlib import Path


def format_size(bytes_size: int) -> str:
    """Formatea tamaño en bytes a formato legible"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} TB"


def check_file(file_path: Path, min_size_mb: int = 0) -> bool:
    """Verifica que un archivo exista y tenga el tamaño mínimo"""
    if not file_path.exists():
        print(f"  ✗ NO ENCONTRADO: {file_path.name}")
        return False

    size_mb = file_path.stat().st_size / (1024 * 1024)

    if min_size_mb > 0 and size_mb < min_size_mb:
        print(f"  ⚠ TAMAÑO INCORRECTO: {file_path.name} ({format_size(file_path.stat().st_size)})")
        print(f"    Esperado: mínimo {min_size_mb} MB")
        return False

    print(f"  ✓ {file_path.name} ({format_size(file_path.stat().st_size)})")
    return True


def verify_tinyllama(base_dir: Path) -> bool:
    """Verifica TinyLlama"""
    print("\n" + "="*60)
    print("VERIFICANDO: TinyLlama 1.1B Chat Q4_K_M")
    print("="*60)

    model_file = base_dir / "llm" / "tinyllama-1.1b-chat-q4" / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

    # El archivo debe ser ~637 MB, verificamos mínimo 600 MB
    success = check_file(model_file, min_size_mb=600)

    if success:
        print("\n✅ TinyLlama instalado correctamente")
    else:
        print("\n❌ TinyLlama NO instalado o corrupto")
        print("   Ejecuta: python download_models.py --llm")

    return success


def verify_e5_embeddings(base_dir: Path) -> bool:
    """Verifica E5 Embeddings"""
    print("\n" + "="*60)
    print("VERIFICANDO: Multilingual E5 Small Embeddings")
    print("="*60)

    model_dir = base_dir / "embeddings" / "multilingual-e5-small"

    required_files = {
        "config.json": 0,
        "pytorch_model.bin": 400,  # Mínimo 400 MB
        "tokenizer.json": 10,      # Mínimo 10 MB
        "tokenizer_config.json": 0,
        "special_tokens_map.json": 0,
    }

    all_ok = True
    for filename, min_size in required_files.items():
        file_path = model_dir / filename
        if not check_file(file_path, min_size_mb=min_size):
            all_ok = False

    if all_ok:
        print("\n✅ E5 Embeddings instalados correctamente")
    else:
        print("\n❌ E5 Embeddings NO instalados o incompletos")
        print("   Ejecuta: python download_models.py --embeddings")

    return all_ok


def verify_mistral(base_dir: Path) -> bool:
    """Verifica Mistral 7B (opcional)"""
    model_file = base_dir / "llm" / "mistral-7b-instruct-q4" / "mistral-7b-instruct-v0.2.Q4_K_M.gguf"

    if not model_file.exists():
        return False

    print("\n" + "="*60)
    print("VERIFICANDO: Mistral 7B Instruct Q4_K_M (Opcional)")
    print("="*60)

    # Mistral debe ser ~4.1 GB
    success = check_file(model_file, min_size_mb=3500)

    if success:
        print("\n✅ Mistral 7B instalado correctamente")
    else:
        print("\n❌ Mistral 7B corrupto")

    return success


def verify_llama_3_2(base_dir: Path) -> bool:
    """Verifica Llama 3.2 3B (opcional)"""
    model_file = base_dir / "llm" / "llama-3.2-3b-instruct-q4" / "Llama-3.2-3B-Instruct-Q4_K_M.gguf"

    if not model_file.exists():
        return False

    print("\n" + "="*60)
    print("VERIFICANDO: Llama 3.2 3B Instruct Q4_K_M (Opcional)")
    print("="*60)

    # Llama 3.2 3B debe ser ~1.9 GB
    success = check_file(model_file, min_size_mb=1700)

    if success:
        print("\n✅ Llama 3.2 3B instalado correctamente")
    else:
        print("\n❌ Llama 3.2 3B corrupto")

    return success


def generate_env_config(base_dir: Path, has_tinyllama: bool, has_mistral: bool, has_llama: bool, has_e5: bool):
    """Genera configuración para .env"""
    print("\n" + "="*60)
    print("CONFIGURACIÓN RECOMENDADA PARA backend/.env")
    print("="*60)
    print()

    if not (has_tinyllama or has_mistral or has_llama):
        print("⚠ No hay modelos LLM instalados")
        print()
        print("Opción 1: Descargar modelos locales")
        print("  python download_models.py --llm")
        print()
        print("Opción 2: Usar API externa")
        print("  MODEL_TYPE=openai")
        print("  OPENAI_API_KEY=sk-...")
        return

    if not has_e5:
        print("⚠ No hay embeddings instalados")
        print("  python download_models.py --embeddings")
        print()

    # Determinar mejor modelo disponible
    if has_mistral:
        recommended_llm = "../models/llm/mistral-7b-instruct-q4/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
        model_name = "Mistral 7B (Producción)"
    elif has_llama:
        recommended_llm = "../models/llm/llama-3.2-3b-instruct-q4/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
        model_name = "Llama 3.2 3B (Balance)"
    else:
        recommended_llm = "../models/llm/tinyllama-1.1b-chat-q4/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
        model_name = "TinyLlama 1.1B (Desarrollo)"

    print(f"Modelo LLM recomendado: {model_name}")
    print()
    print("Agrega esto a backend/.env:")
    print("-" * 60)
    print("MODEL_TYPE=local")
    print(f"LLM_MODEL_PATH={recommended_llm}")

    if has_e5:
        print("EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small")
    else:
        print("# EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small  # Descarga pendiente")

    print()
    print("# Configuración de inferencia")
    print("MAX_TOKENS=2048")
    print("TEMPERATURE=0.3")
    print("TOP_P=0.9")
    print("N_THREADS=4  # Ajusta según tus CPU cores")
    print("-" * 60)


def main():
    print("\n" + "="*60)
    print("  VERIFICADOR DE MODELOS")
    print("  Epicrisis Automática")
    print("="*60)

    # Verificar que estamos en el directorio correcto
    base_dir = Path("models")
    if not base_dir.exists():
        print("\n✗ Error: No se encuentra el directorio 'models'")
        print("  Ejecuta este script desde el directorio raíz del proyecto")
        sys.exit(1)

    # Verificar modelos principales
    has_tinyllama = verify_tinyllama(base_dir)
    has_e5 = verify_e5_embeddings(base_dir)

    # Verificar modelos opcionales
    has_mistral = verify_mistral(base_dir)
    has_llama = verify_llama_3_2(base_dir)

    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN")
    print("="*60)

    models_status = []

    if has_tinyllama:
        models_status.append("✅ TinyLlama 1.1B (Desarrollo)")
    else:
        models_status.append("❌ TinyLlama 1.1B")

    if has_mistral:
        models_status.append("✅ Mistral 7B (Producción)")

    if has_llama:
        models_status.append("✅ Llama 3.2 3B (Balance)")

    if has_e5:
        models_status.append("✅ E5 Embeddings")
    else:
        models_status.append("❌ E5 Embeddings")

    for status in models_status:
        print(status)

    # Generar configuración
    generate_env_config(base_dir, has_tinyllama, has_mistral, has_llama, has_e5)

    # Calcular espacio total usado
    total_size = 0
    if has_tinyllama:
        total_size += (base_dir / "llm" / "tinyllama-1.1b-chat-q4" / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf").stat().st_size
    if has_mistral:
        total_size += (base_dir / "llm" / "mistral-7b-instruct-q4" / "mistral-7b-instruct-v0.2.Q4_K_M.gguf").stat().st_size
    if has_llama:
        total_size += (base_dir / "llm" / "llama-3.2-3b-instruct-q4" / "Llama-3.2-3B-Instruct-Q4_K_M.gguf").stat().st_size
    if has_e5:
        e5_dir = base_dir / "embeddings" / "multilingual-e5-small"
        for file in e5_dir.glob("*"):
            if file.is_file():
                total_size += file.stat().st_size

    print()
    print(f"Espacio total usado: {format_size(total_size)}")

    # Estado final
    print("\n" + "="*60)

    if has_tinyllama and has_e5:
        print("✅ CONFIGURACIÓN MÍNIMA COMPLETA")
        print("   ¡Listo para ejecutar el sistema con modelos locales!")
        print()
        print("Siguiente paso:")
        print("  1. Copia la configuración arriba a backend/.env")
        print("  2. cd backend && npm run dev")
        print("  3. cd frontend && npm start")
    elif has_tinyllama or has_e5:
        print("⚠ CONFIGURACIÓN PARCIAL")
        print("   Faltan algunos modelos para funcionar completamente")
        print()
        print("Ejecuta para completar:")
        if not has_tinyllama:
            print("  python download_models.py --llm")
        if not has_e5:
            print("  python download_models.py --embeddings")
    else:
        print("❌ NO HAY MODELOS INSTALADOS")
        print()
        print("Ejecuta para instalar:")
        print("  python download_models.py --all")

    print("="*60)


if __name__ == "__main__":
    main()
