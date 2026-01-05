#!/bin/bash

###############################################################################
# Script para descargar modelos de LLM y Embeddings locales
# Para el proyecto Epicrisis Automática
###############################################################################

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Descargador de Modelos Locales${NC}"
echo -e "${BLUE}  Epicrisis Automática${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "models" ]; then
    echo -e "${RED}Error: No se encuentra el directorio 'models'${NC}"
    echo -e "${YELLOW}Ejecuta este script desde el directorio raíz del proyecto${NC}"
    exit 1
fi

# Crear directorios si no existen
mkdir -p models/llm/tinyllama-1.1b-chat-q4
mkdir -p models/embeddings/multilingual-e5-small

echo -e "${GREEN}✓ Directorios creados${NC}"
echo ""

###############################################################################
# Función para descargar desde Hugging Face
###############################################################################
download_from_huggingface() {
    local repo=$1
    local target_dir=$2
    local files=("${@:3}")

    echo -e "${BLUE}Descargando desde: ${repo}${NC}"

    for file in "${files[@]}"; do
        local url="https://huggingface.co/${repo}/resolve/main/${file}"
        local output="${target_dir}/${file}"

        echo -e "${YELLOW}  → ${file}${NC}"

        if [ -f "$output" ]; then
            echo -e "${GREEN}    ✓ Ya existe, omitiendo${NC}"
        else
            curl -L -o "$output" "$url" --progress-bar
            echo -e "${GREEN}    ✓ Descargado${NC}"
        fi
    done
    echo ""
}

###############################################################################
# OPCIÓN 1: Descargar TinyLlama (Modelo LLM pequeño, ~637MB)
###############################################################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}1. Modelo LLM: TinyLlama 1.1B Chat Q4${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Tamaño: ~637 MB"
echo -e "Uso: Generación de texto médico"
echo ""
read -p "¿Descargar TinyLlama? (s/n): " download_llm

if [ "$download_llm" = "s" ] || [ "$download_llm" = "S" ]; then
    echo ""
    echo -e "${YELLOW}Nota: TinyLlama es un modelo pequeño y rápido${NC}"
    echo -e "${YELLOW}Para mejor calidad, considera usar modelos más grandes${NC}"
    echo ""

    # Archivos del modelo TinyLlama cuantizado en GGUF
    download_from_huggingface \
        "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF" \
        "models/llm/tinyllama-1.1b-chat-q4" \
        "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" \
        "config.json"

    echo -e "${GREEN}✓ TinyLlama descargado exitosamente${NC}"
else
    echo -e "${YELLOW}⊘ TinyLlama omitido${NC}"
fi

echo ""

###############################################################################
# OPCIÓN 2: Descargar Embeddings Multilingue (E5-Small, ~118MB)
###############################################################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}2. Embeddings: Multilingual E5 Small${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Tamaño: ~118 MB"
echo -e "Uso: Búsqueda semántica en español"
echo ""
read -p "¿Descargar Embeddings E5? (s/n): " download_emb

if [ "$download_emb" = "s" ] || [ "$download_emb" = "S" ]; then
    echo ""

    # Archivos del modelo de embeddings
    download_from_huggingface \
        "intfloat/multilingual-e5-small" \
        "models/embeddings/multilingual-e5-small" \
        "config.json" \
        "tokenizer.json" \
        "tokenizer_config.json" \
        "special_tokens_map.json" \
        "pytorch_model.bin" \
        "vocab.txt"

    echo -e "${GREEN}✓ Embeddings E5 descargados exitosamente${NC}"
else
    echo -e "${YELLOW}⊘ Embeddings E5 omitidos${NC}"
fi

echo ""

###############################################################################
# Alternativa: Usar Git LFS (si tienen Git LFS instalado)
###############################################################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ALTERNATIVA: Clonar con Git LFS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Si prefieres clonar repositorios completos con Git LFS:${NC}"
echo ""
echo -e "1. Instalar Git LFS:"
echo -e "   ${GREEN}brew install git-lfs${NC}  (macOS)"
echo -e "   ${GREEN}git lfs install${NC}"
echo ""
echo -e "2. Clonar TinyLlama:"
echo -e "   ${GREEN}cd models/llm${NC}"
echo -e "   ${GREEN}git clone https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF tinyllama-1.1b-chat-q4${NC}"
echo ""
echo -e "3. Clonar E5 Embeddings:"
echo -e "   ${GREEN}cd models/embeddings${NC}"
echo -e "   ${GREEN}git clone https://huggingface.co/intfloat/multilingual-e5-small${NC}"
echo ""

###############################################################################
# RESUMEN FINAL
###############################################################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RESUMEN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar qué se descargó
if [ -f "models/llm/tinyllama-1.1b-chat-q4/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" ]; then
    echo -e "${GREEN}✓ TinyLlama LLM instalado${NC}"
else
    echo -e "${YELLOW}⊘ TinyLlama LLM no instalado${NC}"
fi

if [ -f "models/embeddings/multilingual-e5-small/pytorch_model.bin" ]; then
    echo -e "${GREEN}✓ E5 Embeddings instalados${NC}"
else
    echo -e "${YELLOW}⊘ E5 Embeddings no instalados${NC}"
fi

echo ""
echo -e "${BLUE}Modelos recomendados alternativos:${NC}"
echo ""
echo -e "LLM más potentes (para mejor calidad):"
echo -e "  • Llama 3.2 3B Instruct (1.6GB cuantizado)"
echo -e "  • Mistral 7B Instruct (4.1GB cuantizado)"
echo -e "  • OpenHermes 2.5 Mistral 7B (4.1GB)"
echo ""
echo -e "Embeddings alternativos:"
echo -e "  • BGE-M3 (Mejor para español médico)"
echo -e "  • paraphrase-multilingual-MiniLM"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}¡Script completado!${NC}"
echo -e "${GREEN}========================================${NC}"
