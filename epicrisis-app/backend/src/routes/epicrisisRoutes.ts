/**
 * Rutas API para epicrisis
 */
import { Router, Request, Response, NextFunction } from 'express';
import { oracleService } from '../services/oracleService';
import { normalizerService } from '../services/normalizerService';
import { llmService } from '../services/llmService';
import { validatorService } from '../services/validatorService';
import { exportService } from '../services/exportService';
import { logger, FlowLogger } from '../config/logger';
import {
  ClinicalJson,
  GenerationRequest,
  RegenerationRequest,
  ValidateRequest,
  ExportRequest,
  EpicrisisResponse,
  ValidationResult
} from '../types/clinical.types';

const router = Router();

// Middleware de logging
router.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/episodes/:id
 * Obtiene datos clínicos de un episodio
 */
router.get('/episodes/:id', async (req: Request, res: Response) => {
  const episodeId = parseInt(req.params.id, 10);
  const flowLog = new FlowLogger(episodeId.toString());

  try {
    flowLog.logStep('STEP_1.1_VALIDATE_ID', { episodeId: req.params.id });

    if (isNaN(episodeId)) {
      flowLog.logError('STEP_1.1_VALIDATE_ID', new Error('ID de episodio inválido'));
      res.status(400).json({ error: 'ID de episodio inválido' });
      return;
    }

    // Verificar si existe
    flowLog.logStep('STEP_2.1_CHECK_EXISTENCE', { episodeId });
    const exists = await oracleService.episodeExists(episodeId);

    if (!exists) {
      flowLog.logError('STEP_2.1_CHECK_EXISTENCE', new Error('Episodio no encontrado'));
      res.status(404).json({ error: 'Episodio no encontrado' });
      return;
    }

    // Obtener datos clínicos
    flowLog.logStep('STEP_2.2_FETCH_FROM_ORACLE', { episodeId });
    const rawData = await oracleService.getDischargeSummary(episodeId);
    flowLog.logStep('STEP_2.2_ORACLE_SUCCESS', {
      dataSize: JSON.stringify(rawData).length
    });

    // Normalizar
    flowLog.logStep('STEP_2.3_NORMALIZE_DATA', {});
    const clinicalData = normalizerService.normalize(rawData);
    flowLog.logStep('STEP_2.3_NORMALIZE_SUCCESS', {
      fields: Object.keys(clinicalData),
      dxIngreso: clinicalData.diagnostico_ingreso?.length || 0,
      dxEgreso: clinicalData.diagnostico_egreso?.length || 0,
      procedimientos: clinicalData.procedimientos?.length || 0,
      medicamentos: clinicalData.tratamientos_intrahosp?.length || 0
    });

    // Obtener info del paciente
    flowLog.logStep('STEP_2.4_FETCH_PATIENT_INFO', { episodeId });
    const patientInfo = await oracleService.getPatientInfo(episodeId);
    flowLog.logStep('STEP_2.4_PATIENT_INFO_SUCCESS', {
      nombre: patientInfo?.nombre || 'N/A',
      rut: patientInfo?.rut || 'N/A'
    });

    flowLog.logEnd({
      success: true,
      episodeId,
      patientName: patientInfo?.nombre || 'N/A'
    });

    res.json({
      episodeId: episodeId.toString(),
      clinicalData,
      patientInfo,
      processingTimeMs: Date.now() - flowLog['startTime']
    });
  } catch (error) {
    flowLog.logError('EPISODE_FETCH_ERROR', error);
    logger.error('Error obteniendo episodio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/generate-epicrisis
 * Genera epicrisis a partir de datos clínicos
 */
router.post('/generate-epicrisis', async (req: Request, res: Response) => {
  const flowLog = new FlowLogger('generate');

  try {
    const { clinicalData } = req.body as GenerationRequest;

    flowLog.logStep('STEP_3.1_VALIDATE_INPUT', {
      hasData: !!clinicalData
    });

    if (!clinicalData) {
      flowLog.logError('STEP_3.1_VALIDATE_INPUT', new Error('Datos clínicos requeridos'));
      res.status(400).json({ error: 'Datos clínicos requeridos' });
      return;
    }

    // Normalizar datos
    flowLog.logStep('STEP_3.2_NORMALIZE_DATA', {});
    const normalizedData = normalizerService.normalize(clinicalData);
    flowLog.logStep('STEP_3.2_NORMALIZE_SUCCESS', {
      fields: Object.keys(normalizedData)
    });

    // Generar epicrisis
    flowLog.logStep('STEP_3.3_LLM_GENERATE', {});
    const epicrisisText = await llmService.generateEpicrisis(normalizedData);
    flowLog.logStep('STEP_3.3_LLM_SUCCESS', {
      textLength: epicrisisText.length,
      preview: epicrisisText.substring(0, 100) + '...'
    });

    // Validar
    flowLog.logStep('STEP_4.1_VALIDATE', {});
    const validation = validatorService.validateEpicrisis(epicrisisText, normalizedData);
    flowLog.logStep('STEP_4.1_VALIDATION_RESULT', {
      isValid: validation.ok,
      violationsCount: validation.violations.length,
      violations: validation.violations.map(v => ({ type: v.type, mention: v.mention }))
    });

    // Si hay violaciones, intentar regenerar una vez
    if (!validation.ok && validation.violations.length > 0) {
      flowLog.logStep('STEP_4.2_AUTO_REGENERATE', {
        violationsCount: validation.violations.length
      });

      const correctedText = await llmService.regenerateWithCorrections(
        normalizedData,
        validation.violations
      );

      flowLog.logStep('STEP_4.2_REGENERATE_SUCCESS', {
        textLength: correctedText.length
      });

      const revalidation = validatorService.validateEpicrisis(correctedText, normalizedData);

      flowLog.logStep('STEP_4.2_REVALIDATION', {
        isValid: revalidation.ok,
        violationsCount: revalidation.violations.length
      });

      flowLog.logEnd({
        success: true,
        wasRegenerated: true,
        finalValid: revalidation.ok,
        textLength: correctedText.length
      });

      const response: EpicrisisResponse = {
        text: correctedText,
        validation: revalidation,
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - flowLog['startTime']
      };

      res.json(response);
      return;
    }

    flowLog.logEnd({
      success: true,
      wasRegenerated: false,
      finalValid: validation.ok,
      textLength: epicrisisText.length
    });

    const response: EpicrisisResponse = {
      text: epicrisisText,
      validation,
      generatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - flowLog['startTime']
    };

    res.json(response);
  } catch (error) {
    flowLog.logError('GENERATE_ERROR', error);
    logger.error('Error generando epicrisis:', error);
    res.status(500).json({ error: 'Error generando epicrisis' });
  }
});

/**
 * POST /api/regenerate-epicrisis
 * Regenera epicrisis con corrección de violaciones
 */
router.post('/regenerate-epicrisis', async (req: Request, res: Response) => {
  const flowLog = new FlowLogger('regenerate');

  try {
    const { clinicalData, violations } = req.body as RegenerationRequest;

    flowLog.logStep('STEP_5.1_VALIDATE_INPUT', {
      hasData: !!clinicalData,
      violationsCount: violations?.length || 0
    });

    if (!clinicalData) {
      flowLog.logError('STEP_5.1_VALIDATE_INPUT', new Error('Datos clínicos requeridos'));
      res.status(400).json({ error: 'Datos clínicos requeridos' });
      return;
    }

    // Normalizar
    flowLog.logStep('STEP_5.2_NORMALIZE_DATA', {});
    const normalizedData = normalizerService.normalize(clinicalData);

    // Regenerar con correcciones
    flowLog.logStep('STEP_5.3_LLM_REGENERATE', {
      violationsToFix: violations?.map(v => ({ type: v.type, mention: v.mention }))
    });
    const epicrisisText = await llmService.regenerateWithCorrections(
      normalizedData,
      violations || []
    );
    flowLog.logStep('STEP_5.3_REGENERATE_SUCCESS', {
      textLength: epicrisisText.length
    });

    // Validar
    flowLog.logStep('STEP_5.4_VALIDATE', {});
    const validation = validatorService.validateEpicrisis(epicrisisText, normalizedData);
    flowLog.logStep('STEP_5.4_VALIDATION_RESULT', {
      isValid: validation.ok,
      violationsCount: validation.violations.length
    });

    flowLog.logEnd({
      success: true,
      isValid: validation.ok,
      textLength: epicrisisText.length
    });

    const response: EpicrisisResponse = {
      text: epicrisisText,
      validation,
      generatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - flowLog['startTime']
    };

    res.json(response);
  } catch (error) {
    flowLog.logError('REGENERATE_ERROR', error);
    logger.error('Error regenerando epicrisis:', error);
    res.status(500).json({ error: 'Error regenerando epicrisis' });
  }
});

/**
 * POST /api/validate-epicrisis
 * Valida texto de epicrisis contra datos clínicos
 */
router.post('/validate-epicrisis', async (req: Request, res: Response) => {
  try {
    const { text, clinicalData } = req.body as ValidateRequest;

    if (!text || !clinicalData) {
      res.status(400).json({ error: 'Texto y datos clínicos requeridos' });
      return;
    }

    const validation: ValidationResult = validatorService.validateEpicrisis(text, clinicalData);

    // Agregar warnings de completitud
    const warnings = validatorService.validateCompleteness(text, clinicalData);

    res.json({
      ...validation,
      warnings
    });
  } catch (error) {
    logger.error('Error validando epicrisis:', error);
    res.status(500).json({ error: 'Error validando epicrisis' });
  }
});

/**
 * POST /api/export/pdf
 * Exporta epicrisis a PDF
 */
router.post('/export/pdf', async (req: Request, res: Response) => {
  const flowLog = new FlowLogger('export-pdf');

  try {
    const { text, patientName, episodeId } = req.body as ExportRequest;

    flowLog.logStep('STEP_6.1_VALIDATE_INPUT', {
      hasText: !!text,
      textLength: text?.length || 0,
      patientName,
      episodeId
    });

    if (!text) {
      flowLog.logError('STEP_6.1_VALIDATE_INPUT', new Error('Texto requerido'));
      res.status(400).json({ error: 'Texto requerido' });
      return;
    }

    flowLog.logStep('STEP_6.2_GENERATE_PDF', {});
    const pdfBuffer = await exportService.generatePDF(text, {
      patientName,
      episodeId,
      generatedAt: new Date().toLocaleDateString('es-CL')
    });

    flowLog.logStep('STEP_6.2_PDF_SUCCESS', {
      bufferSize: pdfBuffer.length,
      filename: `epicrisis_${episodeId || 'export'}.pdf`
    });

    flowLog.logEnd({
      success: true,
      format: 'pdf',
      fileSize: pdfBuffer.length
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="epicrisis_${episodeId || 'export'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    flowLog.logError('EXPORT_PDF_ERROR', error);
    logger.error('Error exportando a PDF:', error);
    res.status(500).json({ error: 'Error exportando a PDF' });
  }
});

/**
 * POST /api/export/word
 * Exporta epicrisis a Word
 */
router.post('/export/word', async (req: Request, res: Response) => {
  try {
    const { text, patientName, episodeId } = req.body as ExportRequest;

    if (!text) {
      res.status(400).json({ error: 'Texto requerido' });
      return;
    }

    const wordBuffer = await exportService.generateWord(text, {
      patientName,
      episodeId,
      generatedAt: new Date().toLocaleDateString('es-CL')
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="epicrisis_${episodeId || 'export'}.docx"`
    );
    res.send(wordBuffer);
  } catch (error) {
    logger.error('Error exportando a Word:', error);
    res.status(500).json({ error: 'Error exportando a Word' });
  }
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    llmReady: llmService.isReady()
  });
});

export default router;
