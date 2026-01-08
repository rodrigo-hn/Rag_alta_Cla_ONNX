/**
 * Punto de entrada del servidor de Epicrisis
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';
import * as fs from 'fs';
import { initializeDatabase, closeDatabase } from './config/database';
import { logger, morganStream } from './config/logger';
import { llmService } from './services/llmService';
import epicrisisRoutes from './routes/epicrisisRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuracion de modelos ONNX locales
const MODEL_SOURCE = process.env.MODEL_SOURCE || 'remote';
const DEFAULT_ONNX_MODEL = process.env.DEFAULT_ONNX_MODEL || 'onnx-community/Llama-3.2-1B-Instruct';

// Middlewares de seguridad
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS con headers para SharedArrayBuffer (necesario para WebGPU/WASM multi-threading)
app.use(cors({
  origin: (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:4200').split(','),
  credentials: true
}));

// Headers adicionales COOP/COEP para crossOriginIsolated
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging HTTP
app.use(morgan('combined', { stream: morganStream }));

// ============================================
// Endpoint de configuracion ONNX
// ============================================
app.get('/api/onnx-config', (req, res) => {
  res.json({
    modelSource: MODEL_SOURCE,
    defaultModel: DEFAULT_ONNX_MODEL,
    modelsBaseUrl: MODEL_SOURCE === 'local' ? '/models' : 'https://huggingface.co',
    availableModels: MODEL_SOURCE === 'local' ? getLocalModels() : []
  });
});

// ============================================
// Servir modelos ONNX locales
// ============================================
if (MODEL_SOURCE === 'local') {
  const modelsPath = path.join(__dirname, '../../models');

  // Verificar que exista la carpeta models
  if (!fs.existsSync(modelsPath)) {
    logger.warn(`Carpeta models/ no existe. Creandola...`);
    fs.mkdirSync(modelsPath, { recursive: true });
  }

  // Servir modelos ONNX con headers apropiados
  app.use('/models', express.static(modelsPath, {
    setHeaders: (res, filePath) => {
      // Headers CORP para que funcione con COEP
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      // Configurar Content-Type segun extension
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

  logger.info(`Sirviendo modelos ONNX desde: ${modelsPath}`);

  // Listar modelos disponibles al iniciar
  const localModels = getLocalModels();
  if (localModels.length > 0) {
    logger.info(`Modelos ONNX locales disponibles:`);
    localModels.forEach(m => logger.info(`   - ${m}`));
  } else {
    logger.warn(`No se encontraron modelos ONNX en ${modelsPath}`);
  }
}

/**
 * Obtiene lista de modelos ONNX disponibles localmente
 */
function getLocalModels(): string[] {
  const modelsPath = path.join(__dirname, '../../models');
  try {
    if (!fs.existsSync(modelsPath)) return [];
    return fs.readdirSync(modelsPath)
      .filter(name => {
        const fullPath = path.join(modelsPath, name);
        return fs.statSync(fullPath).isDirectory();
      });
  } catch {
    return [];
  }
}

// Rutas API
app.use('/api', epicrisisRoutes);

// Manejo de errores global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Ruta 404
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

/**
 * Inicializa el servidor
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Iniciando servidor de Epicrisis...');

    // Inicializar base de datos
    if (process.env.DB_USER && process.env.DB_PASSWORD) {
      await initializeDatabase();
      logger.info('Conexión a Oracle establecida');
    } else {
      logger.warn('Credenciales de Oracle no configuradas. Ejecutando en modo desarrollo.');
    }

    // Inicializar LLM
    await llmService.initialize();

    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      logger.info(`Servidor escuchando en puerto ${PORT}`);
      logger.info(`API disponible en http://localhost:${PORT}/api`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Manejo de señales para shutdown graceful
    const shutdown = async (signal: string) => {
      logger.info(`Señal ${signal} recibida. Iniciando shutdown...`);

      server.close(async () => {
        logger.info('Servidor HTTP cerrado');

        try {
          await closeDatabase();
          logger.info('Pool de conexiones cerrado');
        } catch (error) {
          logger.error('Error cerrando pool:', error);
        }

        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        logger.error('Shutdown forzado después de timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Error fatal iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();
