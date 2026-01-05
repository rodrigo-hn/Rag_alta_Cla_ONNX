# Modelos Locales para Epicrisis Automática

Este directorio contiene los modelos de Machine Learning necesarios para ejecutar el sistema de forma 100% local.

## 📁 Estructura

```
models/
├── llm/                      # Modelos de lenguaje (LLM)
│   └── tinyllama-1.1b-chat-q4/
│       └── tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
└── embeddings/               # Modelos de embeddings
    └── multilingual-e5-small/
        ├── config.json
        ├── pytorch_model.bin
        └── tokenizer files...
```

## 🚀 Descarga Rápida

### Opción 1: Script Python (Recomendado)

```bash
# Instalar dependencias
pip install tqdm

# Descargar todo (LLM + Embeddings)
python download_models.py --all

# Solo LLM
python download_models.py --llm

# Solo Embeddings
python download_models.py --embeddings

# Modelo alternativo más potente
python download_models.py --alternative-llm mistral-7b
```

### Opción 2: Script Bash

```bash
# Ejecutar script interactivo
./download-models.sh
```

### Opción 3: Manual

#### TinyLlama 1.1B Chat (637 MB)

```bash
cd models/llm/tinyllama-1.1b-chat-q4
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
```

#### Multilingual E5 Small Embeddings (118 MB)

```bash
cd models/embeddings
git lfs install
git clone https://huggingface.co/intfloat/multilingual-e5-small
```

O descarga manual:
```bash
cd models/embeddings/multilingual-e5-small
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/config.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/pytorch_model.bin
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/tokenizer.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/tokenizer_config.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/special_tokens_map.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/vocab.txt
```

## 🤖 Modelos Disponibles

### LLM (Modelos de Lenguaje)

| Modelo | Tamaño | Cuantización | Calidad | Velocidad | Recomendado Para |
|--------|--------|--------------|---------|-----------|------------------|
| **TinyLlama 1.1B** | 637 MB | Q4_K_M | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ | Pruebas, desarrollo |
| **Llama 3.2 3B** | 1.9 GB | Q4_K_M | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | Balance ideal |
| **Mistral 7B** | 4.1 GB | Q4_K_M | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Producción |
| **Llama 3.1 8B** | 4.7 GB | Q4_K_M | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Máxima calidad |

### Embeddings

| Modelo | Tamaño | Dimensiones | Idiomas | Rendimiento |
|--------|--------|-------------|---------|-------------|
| **E5 Small** | 118 MB | 384 | 100+ | ⚡⚡⚡⚡ |
| **BGE-M3** | 2.2 GB | 1024 | 100+ | ⚡⚡⚡ |
| **E5 Large** | 1.3 GB | 1024 | 100+ | ⚡⚡ |

## 📝 Configuración

Después de descargar los modelos, configura `backend/.env`:

```bash
# Tipo de modelo
MODEL_TYPE=local

# Ruta al modelo LLM
LOCAL_LLM_PATH=./models/llm/tinyllama-1.1b-chat-q4/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

# Ruta a embeddings
EMBEDDINGS_MODEL=./models/embeddings/multilingual-e5-small
EMBEDDINGS_TYPE=local

# Configuración de inferencia
MAX_TOKENS=2048
TEMPERATURE=0.3
TOP_P=0.9
```

## 🔄 Modelos Alternativos

### Para mejor calidad en español médico

#### Mistral 7B Instruct (Recomendado para Producción)

```bash
python download_models.py --alternative-llm mistral-7b
```

Actualiza `.env`:
```bash
LOCAL_LLM_PATH=./models/llm/mistral-7b-instruct-q4/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

#### Llama 3.2 3B (Balance entre tamaño y calidad)

```bash
python download_models.py --alternative-llm llama-3.2-3b
```

Actualiza `.env`:
```bash
LOCAL_LLM_PATH=./models/llm/llama-3.2-3b-instruct-q4/Llama-3.2-3B-Instruct-Q4_K_M.gguf
```

### BGE-M3 Embeddings (Mejor para español)

```bash
cd models/embeddings
git lfs install
git clone https://huggingface.co/BAAI/bge-m3
```

Actualiza `.env`:
```bash
EMBEDDINGS_MODEL=./models/embeddings/bge-m3
```

## ⚙️ Requisitos del Sistema

### Mínimos (TinyLlama + E5 Small)
- **RAM**: 4 GB
- **Disco**: 1 GB libre
- **CPU**: x86_64 o ARM64

### Recomendados (Mistral 7B + E5 Small)
- **RAM**: 8 GB
- **Disco**: 5 GB libre
- **CPU**: 4+ cores
- **GPU** (opcional): CUDA compatible para aceleración

### Producción (Mistral 7B + BGE-M3)
- **RAM**: 16 GB
- **Disco**: 10 GB libre
- **GPU**: NVIDIA con 8+ GB VRAM (recomendado)

## 🔍 Cuantización Explicada

Las cuantizaciones reducen el tamaño del modelo con mínima pérdida de calidad:

- **Q4_K_M**: 4-bit, balance entre calidad/tamaño (recomendado)
- **Q5_K_M**: 5-bit, mejor calidad, más grande
- **Q8_0**: 8-bit, casi sin pérdida, muy grande
- **F16**: 16-bit, sin cuantización, tamaño completo

## 🌐 Uso de APIs Externas (Alternativa)

Si no quieres usar modelos locales, configura APIs externas en `.env`:

```bash
# OpenAI
MODEL_TYPE=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# O Anthropic Claude
MODEL_TYPE=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-opus-20240229
```

## 📊 Comparación: Local vs API

| Aspecto | Modelos Locales | APIs Externas |
|---------|-----------------|---------------|
| **Privacidad** | ✅ 100% local | ❌ Datos salen del servidor |
| **Costo** | ✅ Gratis | 💰 Por token |
| **Velocidad** | ⚡ Depende del hardware | 🌐 Depende de internet |
| **Calidad** | 📈 Variable según modelo | ⭐ Alta (GPT-4, Claude) |
| **Setup** | 🔧 Requiere descarga | ✅ Solo API key |
| **Escalabilidad** | 💻 Limitado por hardware | ☁️ Ilimitado |

## 🛠️ Troubleshooting

### Error: "No se puede cargar el modelo"

```bash
# Verificar que el archivo existe
ls -lh models/llm/tinyllama-1.1b-chat-q4/*.gguf

# Verificar permisos
chmod 644 models/llm/tinyllama-1.1b-chat-q4/*.gguf
```

### Error: "Out of memory"

El modelo es muy grande para tu RAM. Opciones:

1. Usar un modelo más pequeño (TinyLlama)
2. Usar cuantización más agresiva (Q4 en lugar de Q5)
3. Aumentar swap/memoria virtual
4. Usar API externa

### Error de descarga: "Connection timeout"

```bash
# Usar wget con reintentos
wget -c --tries=5 https://huggingface.co/...

# O usar aria2 para descargas más rápidas
aria2c -x 16 https://huggingface.co/...
```

## 📚 Recursos

- [Hugging Face Model Hub](https://huggingface.co/models)
- [GGUF Format Documentation](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Motor de inferencia
- [Sentence Transformers](https://www.sbert.net/) - Embeddings

## 🔐 Nota de Privacidad

Los modelos locales garantizan que **NINGÚN dato clínico sale del servidor local**. Esto es crítico para cumplir con:

- ✅ HIPAA (Health Insurance Portability and Accountability Act)
- ✅ Ley chilena de protección de datos médicos
- ✅ Políticas internas de privacidad hospitalaria

---

**¿Necesitas ayuda?** Abre un issue en el repositorio o consulta la documentación completa.
