/**
 * Configuración de logging con Winston
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { randomUUID } from 'crypto';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, sessionId, step, ...meta }) => {
  const sessionInfo = sessionId ? `[${sessionId}]` : '';
  const stepInfo = step ? `[${step}]` : '';
  const metaInfo = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${sessionInfo}${stepInfo} [${level}]: ${stack || message}${metaInfo}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat)
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    // Log específico para auditoría de generaciones
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info'
    }),
    // Log incremental del flujo completo con rotación diaria
    new DailyRotateFile({
      filename: 'logs/flow-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info'
    })
  ]
});

// Stream para morgan
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

/**
 * Clase para manejar logs de flujo con contexto
 */
export class FlowLogger {
  private sessionId: string;
  private startTime: number;
  private logs: Array<{ step: string; timestamp: number; data: any }> = [];

  constructor(episodeId?: string) {
    this.sessionId = `${episodeId || 'unknown'}-${randomUUID().substring(0, 8)}`;
    this.startTime = Date.now();
    this.logStep('FLOW_START', { sessionId: this.sessionId });
  }

  logStep(step: string, data?: any) {
    const timestamp = Date.now();
    const elapsed = timestamp - this.startTime;

    this.logs.push({ step, timestamp, data });

    logger.info({
      message: `${step}`,
      sessionId: this.sessionId,
      step,
      elapsed: `${elapsed}ms`,
      ...data
    });
  }

  logError(step: string, error: any) {
    const timestamp = Date.now();
    const elapsed = timestamp - this.startTime;

    logger.error({
      message: `ERROR in ${step}: ${error.message || error}`,
      sessionId: this.sessionId,
      step,
      elapsed: `${elapsed}ms`,
      error: error.stack || error
    });
  }

  logEnd(data?: any) {
    const totalTime = Date.now() - this.startTime;

    logger.info({
      message: 'FLOW_END',
      sessionId: this.sessionId,
      step: 'FLOW_END',
      totalTime: `${totalTime}ms`,
      totalSteps: this.logs.length,
      ...data
    });

    // Log resumen completo en archivo JSON
    this.writeFlowSummary();
  }

  private writeFlowSummary() {
    const summary = {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      steps: this.logs
    };

    logger.info({
      message: 'FLOW_SUMMARY',
      sessionId: this.sessionId,
      summary: JSON.stringify(summary, null, 2)
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
