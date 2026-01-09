# 🚀 Guía Rápida: Descarga de Modelos

## ¿Por qué son opcionales?

Los modelos locales son **OPCIONALES** porque:

✅ **Flexibilidad**: Puedes usar APIs externas (OpenAI, Anthropic, etc.) en lugar de modelos locales
✅ **Desarrollo rápido**: En desarrollo puedes usar APIs, en producción modelos locales
✅ **Recursos**: Los modelos requieren espacio en disco y RAM
✅ **Privacidad**: Los modelos locales garantizan que los datos clínicos NUNCA salen del servidor

## 📥 Descarga Paso a Paso

### Método 1: Script Python (Recomendado) ⭐

```bash
# 1. Instalar dependencia
pip install tqdm

# 2. Descargar todo (LLM + Embeddings)
python download_models.py --all
```

**Resultado:**
```
✓ TinyLlama LLM instalado (637 MB)
✓ E5 Embeddings instalados (118 MB)
Total: ~755 MB
```

### Método 2: Script Bash

```bash
# Ejecutar script interactivo
./download-models.sh
```

El script te preguntará qué descargar:
- TinyLlama LLM (s/n)
- E5 Embeddings (s/n)

### Método 3: Descarga Manual

#### TinyLlama 1.1B (637 MB)

```bash
cd models/llm/tinyllama-1.1b-chat-q4

# Con wget
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

# O con curl
curl -L -o tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf \
  https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
```

#### E5 Embeddings (118 MB)

```bash
cd models/embeddings/multilingual-e5-small

# Archivos necesarios
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/config.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/pytorch_model.bin
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/tokenizer.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/tokenizer_config.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/special_tokens_map.json
wget https://huggingface.co/intfloat/multilingual-e5-small/resolve/main/vocab.txt
```

## 🎯 Modelos Recomendados por Caso de Uso

### Para Desarrollo/Pruebas

```bash
python download_models.py --all
```
- **TinyLlama 1.1B** (637 MB)
- **E5 Small** (118 MB)
- **Total**: ~755 MB
- **RAM necesaria**: 4 GB

### Para Producción (Calidad Alta)

```bash
python download_models.py --alternative-llm mistral-7b
python download_models.py --embeddings
```
- **Mistral 7B** (4.1 GB)
- **E5 Small** (118 MB)
- **Total**: ~4.2 GB
- **RAM necesaria**: 8-16 GB

### Para Balance (Calidad/Tamaño)

```bash
python download_models.py --alternative-llm llama-3.2-3b
python download_models.py --embeddings
```
- **Llama 3.2 3B** (1.9 GB)
- **E5 Small** (118 MB)
- **Total**: ~2 GB
- **RAM necesaria**: 6-8 GB

## ⚙️ Configuración Post-Descarga

Después de descargar, edita `backend/.env`:

### Con TinyLlama (Desarrollo)

```env
MODEL_TYPE=local
LLM_MODEL_PATH=../models/llm/tinyllama-1.1b-chat-q4/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small
```

### Con Mistral 7B (Producción)

```env
MODEL_TYPE=local
LLM_MODEL_PATH=../models/llm/mistral-7b-instruct-q4/mistral-7b-instruct-v0.2.Q4_K_M.gguf
EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small
```

### Con Llama 3.2 3B (Balance)

```env
MODEL_TYPE=local
LLM_MODEL_PATH=../models/llm/llama-3.2-3b-instruct-q4/Llama-3.2-3B-Instruct-Q4_K_M.gguf
EMBEDDING_MODEL_PATH=../models/embeddings/multilingual-e5-small
```

## 🌐 Alternativa: Usar APIs Externas

Si no quieres descargar modelos, configura `backend/.env`:

### OpenAI

```env
MODEL_TYPE=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

### Anthropic Claude

```env
MODEL_TYPE=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-opus-20240229
```

## 📊 Comparación Rápida

| Modelo | Tamaño | RAM | Calidad | Velocidad | Caso de Uso |
|--------|--------|-----|---------|-----------|-------------|
| TinyLlama 1.1B | 637 MB | 4 GB | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ | Desarrollo/Pruebas |
| Llama 3.2 3B | 1.9 GB | 6 GB | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | **Recomendado** |
| Mistral 7B | 4.1 GB | 8 GB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Producción |
| GPT-4 API | 0 MB | 0 GB | ⭐⭐⭐⭐⭐ | 🌐🌐🌐 | Cloud (con costo) |

## ✅ Verificación

Después de descargar, verifica:

```bash
# Verificar TinyLlama
ls -lh models/llm/tinyllama-1.1b-chat-q4/*.gguf

# Verificar E5
ls -lh models/embeddings/multilingual-e5-small/pytorch_model.bin

# Ver estructura completa
tree models/
```

Deberías ver:
```
models/
├── embeddings/
│   └── multilingual-e5-small/
│       ├── config.json
│       ├── pytorch_model.bin (117 MB)
│       └── ...
└── llm/
    └── tinyllama-1.1b-chat-q4/
        └── tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf (637 MB)
```

## 🐛 Troubleshooting

### Error: "Connection timeout"

```bash
# Usar wget con reintentos
wget -c --tries=5 https://huggingface.co/...

# O aria2 para descargas más rápidas
aria2c -x 16 -s 16 https://huggingface.co/...
```

### Error: "Out of memory"

1. Usar modelo más pequeño (TinyLlama)
2. Usar API externa en lugar de modelo local
3. Aumentar memoria virtual/swap

### Descarga muy lenta

```bash
# Instalar aria2 para descargas paralelas
# macOS
brew install aria2

# Ubuntu/Debian
sudo apt install aria2

# Usar con el script Python modificado
```

## 🔐 Privacidad y Seguridad

### Modelos Locales
- ✅ Datos clínicos NUNCA salen del servidor
- ✅ Cumplimiento HIPAA
- ✅ Sin costo por uso
- ✅ Control total

### APIs Externas
- ⚠️ Datos se envían a servidores externos
- ⚠️ Costo por token
- ✅ Mejor calidad de generación
- ✅ Sin requisitos de hardware

## 📚 Recursos Adicionales

- [Documentación completa de modelos](models/README.md)
- [Hugging Face Model Hub](https://huggingface.co/models)
- [GGUF Format](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)

## ❓ FAQ

**P: ¿Cuánto espacio necesito?**
R: Mínimo 1 GB para TinyLlama + E5. Recomendado 5 GB para Mistral.

**P: ¿Puedo usar GPU?**
R: Sí, si tienes NVIDIA GPU con CUDA. Configura en `.env`.

**P: ¿Los modelos se actualizan?**
R: Raramente. Puedes actualizar manualmente cuando salgan nuevas versiones.

**P: ¿Necesito ambos modelos?**
R: Sí, LLM para generación y Embeddings para búsqueda semántica.

**P: ¿Puedo usar otros modelos?**
R: Sí, cualquier modelo GGUF compatible con llama.cpp.

---

**¿Listo para empezar?** Ejecuta: `python download_models.py --all`
