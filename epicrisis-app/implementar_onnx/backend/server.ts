import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env en la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
app.disable('etag');

const PORT = parseInt(process.env.PORT || '4040', 10);
const MODEL_SOURCE = process.env.MODEL_SOURCE || 'remote';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'onnx-community/Qwen2.5-0.5B-Instruct';
const GENERATION_CONFIG = process.env.GENERATION_CONFIG || 'rag';

// Validar GENERATION_CONFIG
const VALID_CONFIGS = ['rag', 'analysis', 'extraction', 'legacy'];
if (!VALID_CONFIGS.includes(GENERATION_CONFIG)) {
  console.warn(`⚠️ GENERATION_CONFIG="${GENERATION_CONFIG}" no válido. Usando "rag" por defecto.`);
}

// Headers COOP/COEP/CORP globales (requeridos para crossOriginIsolated y SharedArrayBuffer)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// API endpoint para obtener configuración
app.get('/api/config', (req, res) => {
  res.json({
    modelSource: MODEL_SOURCE,
    defaultModel: DEFAULT_MODEL,
    modelsBaseUrl: MODEL_SOURCE === 'local' ? '/models' : 'https://huggingface.co',
    generationConfig: VALID_CONFIGS.includes(GENERATION_CONFIG) ? GENERATION_CONFIG : 'rag',
  });
});

// Si MODEL_SOURCE=local, servir modelos desde /models
if (MODEL_SOURCE === 'local') {
  const modelsPath = path.join(__dirname, '../../models');

  // Verificar que exista la carpeta models
  if (!fs.existsSync(modelsPath)) {
    console.warn(`Warning: Carpeta models/ no existe. Creándola...`);
    fs.mkdirSync(modelsPath, { recursive: true });
  }

  // Servir modelos ONNX con headers apropiados
  app.use('/models', express.static(modelsPath, {
    setHeaders: (res, filePath) => {
      // Configurar Content-Type según extensión
      if (filePath.endsWith('.onnx')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.onnx_data')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filePath.endsWith('.bin')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.safetensors')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
    }
  }));

  console.log(`Serving models from: ${modelsPath}`);

  // Listar modelos disponibles
  try {
    const modelDirs = fs.readdirSync(modelsPath)
      .filter(name => fs.statSync(path.join(modelsPath, name)).isDirectory());

    if (modelDirs.length > 0) {
      console.log(`Available local models:`);
      modelDirs.forEach(dir => console.log(`   - ${dir}`));
    } else {
      console.warn(`Warning: No local models found in ${modelsPath}`);
      console.log(`   Para usar modelos locales, descargue los artefactos ONNX en /models/<model-name>/`);
    }
  } catch (err) {
    console.error(`Error reading models directory:`, err);
  }
}

// Servir archivos estáticos desde public/
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// SPA fallback - servir index.html para todas las rutas (excepto /api y /models)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/models/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running at http://0.0.0.0:${PORT}`);
  console.log(`Serving public/ from ${publicPath}`);
  console.log(`Model source: ${MODEL_SOURCE}`);

  if (MODEL_SOURCE === 'local') {
    console.log(`Models served locally from /models`);
  } else {
    console.log(`Models will be downloaded from HuggingFace`);
  }

  console.log(`COOP/COEP/CORP headers enabled for crossOriginIsolated\n`);
});
