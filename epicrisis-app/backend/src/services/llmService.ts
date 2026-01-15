/**
 * Servicio LLM para generación de epicrisis
 * Utiliza Transformers.js con ONNX Runtime para inferencia local
 */
import { ClinicalJson, ValidationViolation } from '../types/clinical.types';
import { logger } from '../config/logger';
import path from 'path';

// Importación dinámica de Transformers.js (@huggingface/transformers - ESM module)
let pipeline: any = null;

// Prompt principal para generación de epicrisis
const EPICRISIS_SYSTEM_PROMPT = `Eres un médico especialista en medicina interna. Genera un informe de alta hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:

ESTRUCTURA OBLIGATORIA (un solo párrafo corrido):
- Motivo y diagnóstico de ingreso (incluye código CIE-10 entre paréntesis)
- Procedimientos y tratamientos relevantes durante hospitalización (incluye códigos entre paréntesis)
- Evolución clínica resumida (por días si corresponde, sin repetir)
- Diagnóstico(s) de egreso (incluye código CIE-10 entre paréntesis)
- Indicaciones post-alta: medicamentos con dosis/vía/frecuencia/duración (incluye código ATC entre paréntesis)

REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE la información del JSON proporcionado
2. NO inventes ni agregues información
3. Incluye SIEMPRE los códigos entre paréntesis para dx, procedimientos y medicamentos
4. Si falta información, escribe "No consignado"
5. Escribe en español clínico de Chile
6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea`;

// Prompt de corrección para regeneración
const CORRECTION_SYSTEM_PROMPT = `Tu texto anterior contiene menciones NO permitidas (alucinaciones) o fuera de la lista blanca.

Debes reescribir el informe de alta en 1 solo párrafo CUMPLIENDO:
- Solo puedes mencionar diagnósticos, procedimientos y medicamentos de las listas proporcionadas
- Si necesitas algo fuera de las listas, escribe "No consignado"
- Incluye SIEMPRE los códigos entre paréntesis

REGLAS ESTRICTAS: No inventes información. Usa SOLO lo que está en el JSON.`;

export class LlmService {
  private modelPath: string;
  private isModelLoaded: boolean = false;
  private generator: any = null;
  private tokenizer: any = null;
  private useFallback: boolean = false;

  // Configuración de generación
  private maxNewTokens: number;
  private temperature: number;
  private topP: number;
  private topK: number;

  constructor() {
    // Ruta al modelo ONNX local - debe ser absoluta para Transformers.js
    const envModelPath = process.env.LLM_ONNX_MODEL_PATH;
    if (envModelPath) {
      // Si es ruta relativa, convertirla a absoluta desde el directorio backend
      this.modelPath = path.isAbsolute(envModelPath)
        ? envModelPath
        : path.resolve(__dirname, '../../', envModelPath);
    } else {
      this.modelPath = path.resolve(__dirname, '../../../models/onnx-community/Qwen2.5-0.5B-Instruct');
    }

    // Configuración de inferencia
    this.maxNewTokens = parseInt(process.env.MAX_TOKENS || '512', 10);
    this.temperature = parseFloat(process.env.TEMPERATURE || '0.3');
    this.topP = parseFloat(process.env.TOP_P || '0.9');
    this.topK = parseInt(process.env.TOP_K || '40', 10);

    // Usar fallback determinista si está configurado
    this.useFallback = process.env.USE_DETERMINISTIC_FALLBACK === 'true';
  }

  /**
   * Inicializa el modelo LLM con Transformers.js
   */
  async initialize(): Promise<void> {
    if (this.useFallback) {
      logger.info('[LLM] Modo fallback determinista activado');
      this.isModelLoaded = true;
      return;
    }

    try {
      logger.info(`[LLM] Inicializando modelo desde: ${this.modelPath}`);

      // Importar @huggingface/transformers dinámicamente (versión más reciente)
      const transformers = await import('@huggingface/transformers');
      pipeline = transformers.pipeline;

      // Configurar caché
      const cacheDir = path.resolve(__dirname, '../../../models/.cache');

      logger.info('[LLM] Cargando pipeline de generación de texto...');
      logger.info('[LLM] El modelo se descargará de HuggingFace si no está en caché');
      logger.info(`[LLM] Cache dir: ${cacheDir}`);

      // Usar el modelo desde HuggingFace
      // onnx-community/Qwen2.5-0.5B-Instruct tiene soporte para Transformers.js
      const modelName = 'onnx-community/Qwen2.5-0.5B-Instruct';

      // Crear pipeline de generación de texto
      this.generator = await pipeline('text-generation', modelName, {
        dtype: 'q4f16', // Usar cuantización q4f16 para menor uso de memoria
        device: 'auto', // Detectar automáticamente (CPU o GPU)
        cache_dir: cacheDir,
        progress_callback: (progress: any) => {
          if (progress.status === 'initiate') {
            logger.info(`[LLM] Iniciando carga: ${progress.file || progress.name}`);
          } else if (progress.status === 'progress') {
            const pct = progress.progress ? Math.round(progress.progress) : 0;
            if (pct % 20 === 0) { // Log cada 20%
              logger.info(`[LLM] Cargando: ${progress.file || ''} ${pct}%`);
            }
          } else if (progress.status === 'done') {
            logger.info(`[LLM] Cargado: ${progress.file || progress.name}`);
          }
        }
      });

      this.isModelLoaded = true;
      logger.info('[LLM] Modelo inicializado correctamente con Transformers.js');

    } catch (error) {
      logger.error('[LLM] Error inicializando modelo:', error);
      logger.warn('[LLM] Activando modo fallback determinista');
      this.useFallback = true;
      this.isModelLoaded = true;
    }
  }

  /**
   * Genera una epicrisis a partir de datos clínicos
   */
  async generateEpicrisis(clinicalData: ClinicalJson): Promise<string> {
    const startTime = Date.now();
    const metrics: Record<string, number> = {};

    logger.info('=== LLM GENERATION START ===');

    // Si estamos en modo fallback, usar generación determinista
    if (this.useFallback || !this.generator) {
      logger.info('[LLM] Usando generación determinista (fallback)');
      const result = this.generateDeterministicEpicrisis(clinicalData);
      metrics.total_generation_ms = Date.now() - startTime;
      logger.info(`[LLM] Generación determinista completada en ${metrics.total_generation_ms}ms`);
      return result;
    }

    try {
      // 1. Preparación del prompt
      const promptStartTime = Date.now();
      const clinicalJsonStr = JSON.stringify(clinicalData, null, 2);

      // Construir el prompt en formato chat de Qwen
      const messages = [
        { role: 'system', content: EPICRISIS_SYSTEM_PROMPT },
        { role: 'user', content: `Genera la epicrisis para el siguiente paciente:\n\nJSON CLÍNICO:\n${clinicalJsonStr}` }
      ];

      // Aplicar chat template de Qwen
      const prompt = this.applyChatTemplate(messages);

      metrics.prompt_preparation_ms = Date.now() - promptStartTime;
      metrics.prompt_length = prompt.length;

      logger.info('[LLM] Prompt preparado', {
        time_ms: metrics.prompt_preparation_ms,
        prompt_length: metrics.prompt_length
      });

      // 2. Generación con el modelo
      const inferenceStartTime = Date.now();

      logger.info('[LLM] Ejecutando inferencia con Transformers.js...');

      const output = await this.generator(prompt, {
        max_new_tokens: this.maxNewTokens,
        temperature: this.temperature,
        top_p: this.topP,
        top_k: this.topK,
        do_sample: this.temperature > 0,
        return_full_text: false,
        pad_token_id: 151645, // EOS token de Qwen
        eos_token_id: 151645
      });

      metrics.inference_ms = Date.now() - inferenceStartTime;

      // Extraer texto generado
      let generatedText = '';
      if (Array.isArray(output) && output.length > 0) {
        generatedText = output[0].generated_text || '';
      } else if (typeof output === 'string') {
        generatedText = output;
      }

      // Limpiar el texto (remover tokens especiales)
      generatedText = this.cleanGeneratedText(generatedText);

      metrics.output_length = generatedText.length;
      metrics.total_generation_ms = Date.now() - startTime;

      logger.info('[LLM] Generación completada', {
        inference_ms: metrics.inference_ms,
        total_ms: metrics.total_generation_ms,
        output_length: metrics.output_length
      });

      // Si el texto generado está vacío o muy corto, usar fallback
      if (generatedText.length < 50) {
        logger.warn('[LLM] Texto generado muy corto, usando fallback determinista');
        return this.generateDeterministicEpicrisis(clinicalData);
      }

      return generatedText;

    } catch (error) {
      logger.error('[LLM] Error durante inferencia:', error);
      logger.warn('[LLM] Usando fallback determinista debido a error');
      return this.generateDeterministicEpicrisis(clinicalData);
    }
  }

  /**
   * Regenera epicrisis con corrección de violaciones
   */
  async regenerateWithCorrections(
    clinicalData: ClinicalJson,
    violations: ValidationViolation[]
  ): Promise<string> {
    const startTime = Date.now();

    logger.info('[LLM] Regenerando con correcciones', {
      violations_count: violations.length
    });

    // Si estamos en modo fallback, usar generación determinista
    if (this.useFallback || !this.generator) {
      return this.generateDeterministicEpicrisis(clinicalData);
    }

    try {
      // Preparar información de violaciones
      const violationsText = violations
        .map((v) => `- ${this.getViolationType(v.type)}: "${v.mention}" (${v.reason})`)
        .join('\n');

      // Preparar listas blancas
      const dxLista = [
        ...clinicalData.diagnostico_ingreso.map((d) => `${d.nombre} (${d.codigo})`),
        ...clinicalData.diagnostico_egreso.map((d) => `${d.nombre} (${d.codigo})`)
      ].join(', ');

      const procLista = clinicalData.procedimientos
        .map((p) => `${p.nombre} (${p.codigo})`)
        .join(', ');

      const medLista = [
        ...clinicalData.tratamientos_intrahosp.map((m) => `${m.nombre} (${m.codigo})`),
        ...clinicalData.indicaciones_alta.medicamentos.map((m) => `${m.nombre} (${m.codigo})`)
      ].join(', ');

      const clinicalJsonStr = JSON.stringify(clinicalData, null, 2);

      // Construir prompt de corrección
      const userMessage = `VIOLACIONES DETECTADAS:
${violationsText}

LISTAS PERMITIDAS:
- Diagnósticos: ${dxLista || 'No consignado'}
- Procedimientos: ${procLista || 'No consignado'}
- Medicamentos: ${medLista || 'No consignado'}

JSON CLÍNICO:
${clinicalJsonStr}

Reescribe la epicrisis completa corrigiendo las violaciones.`;

      const messages = [
        { role: 'system', content: CORRECTION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ];

      const prompt = this.applyChatTemplate(messages);

      // Generar
      const output = await this.generator(prompt, {
        max_new_tokens: this.maxNewTokens,
        temperature: this.temperature,
        top_p: this.topP,
        top_k: this.topK,
        do_sample: this.temperature > 0,
        return_full_text: false,
        pad_token_id: 151645,
        eos_token_id: 151645
      });

      let generatedText = '';
      if (Array.isArray(output) && output.length > 0) {
        generatedText = output[0].generated_text || '';
      } else if (typeof output === 'string') {
        generatedText = output;
      }

      generatedText = this.cleanGeneratedText(generatedText);

      logger.info('[LLM] Regeneración completada', {
        total_ms: Date.now() - startTime,
        output_length: generatedText.length
      });

      if (generatedText.length < 50) {
        return this.generateDeterministicEpicrisis(clinicalData);
      }

      return generatedText;

    } catch (error) {
      logger.error('[LLM] Error en regeneración:', error);
      return this.generateDeterministicEpicrisis(clinicalData);
    }
  }

  /**
   * Aplica el chat template de Qwen2.5
   */
  private applyChatTemplate(messages: Array<{role: string, content: string}>): string {
    let prompt = '';

    for (const msg of messages) {
      prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }

    // Agregar el inicio del turno del asistente
    prompt += '<|im_start|>assistant\n';

    return prompt;
  }

  /**
   * Limpia el texto generado de tokens especiales
   */
  private cleanGeneratedText(text: string): string {
    return text
      .replace(/<\|im_start\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|endoftext\|>/g, '')
      .replace(/assistant\n?/g, '')
      .trim();
  }

  /**
   * Genera epicrisis de forma determinista (para desarrollo/fallback)
   */
  private generateDeterministicEpicrisis(data: ClinicalJson): string {
    const parts: string[] = [];

    // Motivo de ingreso
    if (data.motivo_ingreso) {
      parts.push(`Paciente ingresa por ${data.motivo_ingreso.toLowerCase()}`);
    }

    // Diagnósticos de ingreso
    if (data.diagnostico_ingreso.length > 0) {
      const dxIngreso = data.diagnostico_ingreso
        .map((dx) => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      parts.push(`con diagnóstico de ingreso de ${dxIngreso}`);
    }

    // Procedimientos
    if (data.procedimientos.length > 0) {
      const procs = data.procedimientos
        .map((p) => `${p.nombre} (${p.codigo}) el ${this.formatDate(p.fecha)}`)
        .join(', ');
      parts.push(`Durante la hospitalización se realizaron: ${procs}`);
    }

    // Tratamientos intrahospitalarios
    if (data.tratamientos_intrahosp.length > 0) {
      const tratamientos = data.tratamientos_intrahosp
        .map((t) => `${t.nombre} (${t.codigo}) ${t.dosis} ${t.via} ${t.frecuencia}`)
        .join(', ');
      parts.push(`Se indicó tratamiento con ${tratamientos}`);
    }

    // Evolución
    if (data.evolucion.length > 0) {
      const evolucionResumen = data.evolucion
        .map((e) => `${this.formatDate(e.fecha)}: ${this.summarizeNote(e.nota)}`)
        .join('; ');
      parts.push(`Evolución: ${evolucionResumen}`);
    }

    // Laboratorios relevantes
    if (data.laboratorios_relevantes.length > 0) {
      const labs = data.laboratorios_relevantes
        .map((l) => `${l.parametro}: ${l.valor}`)
        .join(', ');
      parts.push(`Exámenes de laboratorio relevantes: ${labs}`);
    }

    // Diagnósticos de egreso
    if (data.diagnostico_egreso.length > 0) {
      const dxEgreso = data.diagnostico_egreso
        .map((dx) => `${dx.nombre} (${dx.codigo})`)
        .join(', ');
      parts.push(`Se egresa con diagnóstico de ${dxEgreso}`);
    }

    // Indicaciones de alta
    if (data.indicaciones_alta.medicamentos.length > 0) {
      const meds = data.indicaciones_alta.medicamentos
        .map((m) => {
          let med = `${m.nombre} (${m.codigo}) ${m.dosis} ${m.via} ${m.frecuencia}`;
          if (m.duracion) med += ` por ${m.duracion}`;
          return med;
        })
        .join(', ');
      parts.push(`Indicaciones farmacológicas al alta: ${meds}`);
    }

    // Controles
    if (data.indicaciones_alta.controles.length > 0) {
      parts.push(`Controles: ${data.indicaciones_alta.controles.join(', ')}`);
    }

    // Recomendaciones
    if (data.indicaciones_alta.recomendaciones.length > 0) {
      parts.push(`Recomendaciones: ${data.indicaciones_alta.recomendaciones.join(', ')}`);
    }

    // Si no hay información
    if (parts.length === 0) {
      return 'No consignado.';
    }

    return parts.join('. ') + '.';
  }

  /**
   * Formatea fecha para texto
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Resume una nota de evolución (primeras 100 caracteres)
   */
  private summarizeNote(note: string): string {
    if (!note) return '';
    const clean = note.replace(/\s+/g, ' ').trim();
    if (clean.length <= 100) return clean;
    return clean.substring(0, 100) + '...';
  }

  /**
   * Obtiene tipo de violación en español
   */
  private getViolationType(type: 'dx' | 'proc' | 'med'): string {
    const types: Record<string, string> = {
      dx: 'Diagnóstico',
      proc: 'Procedimiento',
      med: 'Medicamento'
    };
    return types[type] || type;
  }

  /**
   * Verifica si el modelo está cargado
   */
  isReady(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Obtiene información del modelo actual
   */
  getModelInfo(): { path: string; loaded: boolean; fallbackMode: boolean } {
    return {
      path: this.modelPath,
      loaded: this.isModelLoaded,
      fallbackMode: this.useFallback
    };
  }
}

export const llmService = new LlmService();
