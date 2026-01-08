#!/bin/bash
# ============================================
# Script de descarga de modelos ONNX
# ============================================
# Este script descarga los modelos ONNX necesarios para
# ejecutar la aplicacion en modo local (navegador)
#
# Uso: ./scripts/download-models.sh [modelo]
# Modelos disponibles: ministral-3b, llama-1b, smollm
# ============================================

set -e

MODELS_DIR="models"
BASE_HF_URL="https://huggingface.co"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Funcion para descargar archivo con reintentos
download_file() {
    local url=$1
    local output=$2
    local max_retries=3
    local retry=0

    while [ $retry -lt $max_retries ]; do
        echo "Descargando: $(basename $output)..."
        if curl -L --progress-bar -o "$output" "$url"; then
            print_success "Descargado: $(basename $output)"
            return 0
        else
            retry=$((retry + 1))
            print_warning "Reintento $retry de $max_retries..."
            sleep 2
        fi
    done

    print_error "Error descargando: $url"
    return 1
}

# ============================================
# MINISTRAL-3-3B-INSTRUCT-2512-ONNX (Multimodal)
# ============================================
download_ministral_3b() {
    print_header "Descargando Ministral-3-3B-Instruct-2512-ONNX"
    echo "Modelo multimodal con 3 componentes (~3.6 GB total)"
    echo ""

    local MODEL_ID="mistralai/Ministral-3-3B-Instruct-2512-ONNX"
    local MODEL_DIR="$MODELS_DIR/Ministral-3-3B-Instruct-2512-ONNX"

    # Crear directorios
    mkdir -p "$MODEL_DIR/onnx"
    cd "$MODEL_DIR"

    # Archivos de configuracion
    print_header "Descargando archivos de configuracion..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/config.json" "config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/generation_config.json" "generation_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/preprocessor_config.json" "preprocessor_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/processor_config.json" "processor_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer_config.json" "tokenizer_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/special_tokens_map.json" "special_tokens_map.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer.json" "tokenizer.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/chat_template.jinja" "chat_template.jinja"

    # COMPONENTE 1: Decoder Q4F16 (~2 GB)
    print_header "Descargando decoder_model_merged_q4f16 (~2 GB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/decoder_model_merged_q4f16.onnx" "onnx/decoder_model_merged_q4f16.onnx"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/decoder_model_merged_q4f16.onnx_data" "onnx/decoder_model_merged_q4f16.onnx_data"

    # COMPONENTE 2: Embed Tokens FP16 (~805 MB)
    print_header "Descargando embed_tokens_fp16 (~805 MB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/embed_tokens_fp16.onnx" "onnx/embed_tokens_fp16.onnx"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/embed_tokens_fp16.onnx_data" "onnx/embed_tokens_fp16.onnx_data"

    # COMPONENTE 3: Vision Encoder FP16 (~840 MB)
    print_header "Descargando vision_encoder_fp16 (~840 MB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/vision_encoder_fp16.onnx" "onnx/vision_encoder_fp16.onnx"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/vision_encoder_fp16.onnx_data" "onnx/vision_encoder_fp16.onnx_data"

    cd - > /dev/null

    print_success "Ministral-3-3B completado!"
    echo ""
    ls -lh "$MODEL_DIR/onnx/"
}

# ============================================
# LLAMA-3.2-1B-INSTRUCT (Solo texto)
# ============================================
download_llama_1b() {
    print_header "Descargando Llama-3.2-1B-Instruct"
    echo "Modelo de texto (~1.1 GB total)"
    echo ""

    local MODEL_ID="onnx-community/Llama-3.2-1B-Instruct"
    local MODEL_DIR="$MODELS_DIR/Llama-3.2-1B-Instruct"

    mkdir -p "$MODEL_DIR/onnx"
    cd "$MODEL_DIR"

    # Archivos de configuracion
    print_header "Descargando archivos de configuracion..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/config.json" "config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/generation_config.json" "generation_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer_config.json" "tokenizer_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/special_tokens_map.json" "special_tokens_map.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer.json" "tokenizer.json"

    # Modelo Q4 (~600 MB)
    print_header "Descargando modelo Q4 (~600 MB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/model_q4.onnx" "onnx/model_q4.onnx"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/model_q4.onnx_data" "onnx/model_q4.onnx_data"

    cd - > /dev/null

    print_success "Llama-3.2-1B completado!"
    echo ""
    ls -lh "$MODEL_DIR/onnx/"
}

# ============================================
# SMOLLM2-360M-INSTRUCT (Ultra ligero)
# ============================================
download_smollm() {
    print_header "Descargando SmolLM2-360M-Instruct"
    echo "Modelo ultra ligero (~200 MB total)"
    echo ""

    local MODEL_ID="HuggingFaceTB/SmolLM2-360M-Instruct"
    local MODEL_DIR="$MODELS_DIR/SmolLM2-360M-Instruct"

    mkdir -p "$MODEL_DIR/onnx"
    cd "$MODEL_DIR"

    # Archivos de configuracion
    print_header "Descargando archivos de configuracion..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/config.json" "config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/generation_config.json" "generation_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer_config.json" "tokenizer_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/special_tokens_map.json" "special_tokens_map.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer.json" "tokenizer.json"

    # Modelo Q4 (~200 MB)
    print_header "Descargando modelo Q4 (~200 MB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/model_q4.onnx" "onnx/model_q4.onnx"

    cd - > /dev/null

    print_success "SmolLM2-360M completado!"
    echo ""
    ls -lh "$MODEL_DIR/onnx/"
}

# ============================================
# EMBEDDINGS: Multilingual-E5-Small
# ============================================
download_embeddings() {
    print_header "Descargando Xenova/multilingual-e5-small"
    echo "Modelo de embeddings (~120 MB)"
    echo ""

    local MODEL_ID="Xenova/multilingual-e5-small"
    local MODEL_DIR="$MODELS_DIR/multilingual-e5-small"

    mkdir -p "$MODEL_DIR/onnx"
    cd "$MODEL_DIR"

    # Archivos de configuracion
    print_header "Descargando archivos de configuracion..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/config.json" "config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer_config.json" "tokenizer_config.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/special_tokens_map.json" "special_tokens_map.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/tokenizer.json" "tokenizer.json"
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/vocab.txt" "vocab.txt"

    # Modelo quantizado Q8
    print_header "Descargando modelo Q8 (~120 MB)..."
    download_file "$BASE_HF_URL/$MODEL_ID/resolve/main/onnx/model_quantized.onnx" "onnx/model_quantized.onnx"

    cd - > /dev/null

    print_success "Embeddings completado!"
    echo ""
    ls -lh "$MODEL_DIR/onnx/"
}

# ============================================
# MAIN
# ============================================
show_help() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  ministral-3b   Descargar Ministral-3-3B-Instruct-2512 (~3.6 GB)"
    echo "  llama-1b       Descargar Llama-3.2-1B-Instruct (~1.1 GB)"
    echo "  smollm         Descargar SmolLM2-360M-Instruct (~200 MB)"
    echo "  embeddings     Descargar multilingual-e5-small (~120 MB)"
    echo "  all            Descargar todos los modelos"
    echo "  help           Mostrar esta ayuda"
    echo ""
    echo "Ejemplo:"
    echo "  $0 ministral-3b embeddings"
}

# Crear directorio de modelos
mkdir -p "$MODELS_DIR"

# Si no hay argumentos, mostrar ayuda
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Procesar argumentos
for arg in "$@"; do
    case $arg in
        ministral-3b)
            download_ministral_3b
            ;;
        llama-1b)
            download_llama_1b
            ;;
        smollm)
            download_smollm
            ;;
        embeddings)
            download_embeddings
            ;;
        all)
            download_ministral_3b
            download_llama_1b
            download_smollm
            download_embeddings
            ;;
        help|--help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Comando desconocido: $arg"
            show_help
            exit 1
            ;;
    esac
done

print_header "Descarga completada!"
echo ""
echo "Modelos descargados en: $MODELS_DIR/"
du -sh "$MODELS_DIR"/*
echo ""
echo "Para usar los modelos locales, configura en .env:"
echo "  NG_APP_USE_LOCAL_MODELS=true"
echo "  NG_APP_LOCAL_MODELS_PATH=/ruta/a/models"
