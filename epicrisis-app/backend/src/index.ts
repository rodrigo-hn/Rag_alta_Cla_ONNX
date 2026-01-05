/**
 * Punto de entrada del servidor de Epicrisis
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase, closeDatabase } from './config/database';
import { logger, morganStream } from './config/logger';
import { llmService } from './services/llmService';
import epicrisisRoutes from './routes/epicrisisRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:4200').split(','),
  credentials: true
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging HTTP
app.use(morgan('combined', { stream: morganStream }));

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
