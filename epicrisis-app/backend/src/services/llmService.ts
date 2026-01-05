/**
 * Servicio LLM para generación de epicrisis
 * Utiliza TinyLlama-1.1B-Chat para generación local
 */
import { ClinicalJson, ValidationViolation } from '../types/clinical.types';
import { logger } from '../config/logger';

// Prompt principal para generación de epicrisis
const EPICRISIS_PROMPT = `Eres un médico especialista en medicina interna. Genera un informe de alta hospitalaria (epicrisis) en español de Chile, siguiendo este formato EXACTO:

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
6. Formato: UN SOLO PÁRRAFO continuo, sin bullets ni saltos de línea

JSON CLÍNICO:
{{JSON_CLINICO}}`;

// Prompt de corrección para regeneración
const CORRECTION_PROMPT = `Tu texto anterior contiene menciones NO permitidas (alucinaciones) o fuera de la lista blanca.

VIOLACIONES DETECTADAS:
{{VIOLACIONES}}

Debes reescribir el informe de alta en 1 solo párrafo CUMPLIENDO:
- Solo puedes mencionar diagnósticos de esta lista: {{DX_LISTA}}
- Solo puedes mencionar procedimientos de esta lista: {{PROC_LISTA}}
- Solo puedes mencionar medicamentos de esta lista: {{MED_LISTA}}

Si necesitas algo fuera de las listas, escribe "No consignado".
Incluye SIEMPRE los códigos entre paréntesis.

Reescribe completo el informe usando el mismo JSON.

JSON CLÍNICO:
{{JSON_CLINICO}}`;

export class LlmService {
  private modelPath: string;
  private isModelLoaded: boolean = false;

  constructor() {
    this.modelPath = process.env.LLM_MODEL_PATH || '../models/llm/tinyllama-1.1b-chat-q4';
  }

  /**
   * Inicializa el modelo LLM
   * En producción, aquí se cargaría el modelo real
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Inicializando modelo LLM desde: ${this.modelPath}`);
      // En producción: cargar modelo TinyLlama
      // Aquí usamos una implementación mock para desarrollo
      this.isModelLoaded = true;
      logger.info('Modelo LLM inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando modelo LLM:', error);
      throw error;
    }
  }

  /**
   * Genera una epicrisis a partir de datos clínicos
   */
  async generateEpicrisis(clinicalData: ClinicalJson): Promise<string> {
    const startTime = Date.now();
    const metrics: Record<string, number> = {};

    logger.info('=== LLM GENERATION START ===');
    logger.info('[LLM_METRICS] Iniciando generación de epicrisis');

    // 1. Preparación del prompt
    const promptStartTime = Date.now();
    const clinicalJsonStr = JSON.stringify(clinicalData, null, 2);

    //console.log(clinicalJsonStr);
//imprimir el contenido del clinicalJsonStr para depuración 

    const prompt = EPICRISIS_PROMPT.replace('{{JSON_CLINICO}}', clinicalJsonStr);

    metrics.prompt_preparation_ms = Date.now() - promptStartTime;
    metrics.prompt_length = prompt.length;
    metrics.clinical_json_size = clinicalJsonStr.length;

    logger.info('[LLM_METRICS] Prompt preparado', {
      time_ms: metrics.prompt_preparation_ms,
      prompt_length: metrics.prompt_length,
      json_size: metrics.clinical_json_size
    });

    // 2. Tokenización (simulada en desarrollo)
    const tokenizeStartTime = Date.now();
    const estimatedTokens = Math.ceil(prompt.length / 4); // Aproximación: 1 token ≈ 4 caracteres
    metrics.tokenization_ms = Date.now() - tokenizeStartTime;
    metrics.estimated_input_tokens = estimatedTokens;

    logger.info('[LLM_METRICS] Tokenización', {
      time_ms: metrics.tokenization_ms,
      estimated_tokens: estimatedTokens,
      tokens_per_char: estimatedTokens / prompt.length
    });

    // 3. Generación con el modelo
    const inferenceStartTime = Date.now();

    // En producción: usar el modelo real
    // const response = await this.callModel(prompt);

    // Implementación determinista para desarrollo
    logger.info('[LLM_METRICS] Ejecutando inferencia (modo: deterministic)');
    const epicrisis = this.generateDeterministicEpicrisis(clinicalData);

    metrics.inference_ms = Date.now() - inferenceStartTime;
    metrics.output_length = epicrisis.length;
    metrics.estimated_output_tokens = Math.ceil(epicrisis.length / 4);

    logger.info('[LLM_METRICS] Inferencia completada', {
      time_ms: metrics.inference_ms,
      output_length: metrics.output_length,
      output_tokens: metrics.estimated_output_tokens
    });

    // 4. Post-procesamiento
    const postProcessStartTime = Date.now();
    // Aquí se puede agregar limpieza, formateo, etc.
    metrics.post_processing_ms = Date.now() - postProcessStartTime;

    // Métricas totales
    const totalTime = Date.now() - startTime;
    metrics.total_generation_ms = totalTime;
    metrics.tokens_per_second = metrics.estimated_output_tokens / (metrics.inference_ms / 1000);

    logger.info('[LLM_METRICS] === GENERACIÓN COMPLETADA ===', {
      total_time_ms: metrics.total_generation_ms,
      breakdown: {
        prompt_prep: `${metrics.prompt_preparation_ms}ms (${((metrics.prompt_preparation_ms/totalTime)*100).toFixed(1)}%)`,
        tokenization: `${metrics.tokenization_ms}ms (${((metrics.tokenization_ms/totalTime)*100).toFixed(1)}%)`,
        inference: `${metrics.inference_ms}ms (${((metrics.inference_ms/totalTime)*100).toFixed(1)}%)`,
        post_processing: `${metrics.post_processing_ms}ms (${((metrics.post_processing_ms/totalTime)*100).toFixed(1)}%)`
      },
      performance: {
        tokens_per_second: metrics.tokens_per_second.toFixed(2),
        total_tokens: metrics.estimated_input_tokens + metrics.estimated_output_tokens,
        input_tokens: metrics.estimated_input_tokens,
        output_tokens: metrics.estimated_output_tokens
      }
    });

    return epicrisis;
  }

  /**
   * Regenera epicrisis con corrección de violaciones
   */
  async regenerateWithCorrections(
    clinicalData: ClinicalJson,
    violations: ValidationViolation[]
  ): Promise<string> {
    const startTime = Date.now();
    const metrics: Record<string, number> = {};

    logger.info('=== LLM REGENERATION START ===');
    logger.info('[LLM_METRICS] Iniciando regeneración con correcciones', {
      violations_count: violations.length,
      violation_types: violations.map(v => v.type)
    });

    // 1. Preparación de listas blancas
    const whitelistStartTime = Date.now();

    const violationsText = violations
      .map((v) => `- ${this.getViolationType(v.type)}: "${v.mention}" (${v.reason})`)
      .join('\n');

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

    metrics.whitelist_preparation_ms = Date.now() - whitelistStartTime;

    logger.info('[LLM_METRICS] Whitelists preparadas', {
      time_ms: metrics.whitelist_preparation_ms,
      dx_count: clinicalData.diagnostico_ingreso.length + clinicalData.diagnostico_egreso.length,
      proc_count: clinicalData.procedimientos.length,
      med_count: clinicalData.tratamientos_intrahosp.length + clinicalData.indicaciones_alta.medicamentos.length
    });

    // 2. Construcción del prompt de corrección
    const promptStartTime = Date.now();

    const prompt = CORRECTION_PROMPT
      .replace('{{VIOLACIONES}}', violationsText)
      .replace('{{DX_LISTA}}', dxLista || 'No consignado')
      .replace('{{PROC_LISTA}}', procLista || 'No consignado')
      .replace('{{MED_LISTA}}', medLista || 'No consignado')
      .replace('{{JSON_CLINICO}}', JSON.stringify(clinicalData, null, 2));

    metrics.prompt_preparation_ms = Date.now() - promptStartTime;
    metrics.prompt_length = prompt.length;

    logger.info('[LLM_METRICS] Prompt de corrección preparado', {
      time_ms: metrics.prompt_preparation_ms,
      prompt_length: metrics.prompt_length,
      violations_text_length: violationsText.length
    });

    // 3. Tokenización
    const tokenizeStartTime = Date.now();
    const estimatedTokens = Math.ceil(prompt.length / 4);
    metrics.tokenization_ms = Date.now() - tokenizeStartTime;
    metrics.estimated_input_tokens = estimatedTokens;

    logger.info('[LLM_METRICS] Tokenización', {
      time_ms: metrics.tokenization_ms,
      estimated_tokens: estimatedTokens
    });

    // 4. Regeneración con el modelo
    const inferenceStartTime = Date.now();

    // En producción: usar el modelo real
    // const response = await this.callModel(prompt);

    // Implementación determinista corregida
    logger.info('[LLM_METRICS] Ejecutando regeneración (modo: deterministic)');
    const epicrisis = this.generateDeterministicEpicrisis(clinicalData);

    metrics.inference_ms = Date.now() - inferenceStartTime;
    metrics.output_length = epicrisis.length;
    metrics.estimated_output_tokens = Math.ceil(epicrisis.length / 4);

    logger.info('[LLM_METRICS] Regeneración completada', {
      time_ms: metrics.inference_ms,
      output_length: metrics.output_length,
      output_tokens: metrics.estimated_output_tokens
    });

    // Métricas totales
    const totalTime = Date.now() - startTime;
    metrics.total_regeneration_ms = totalTime;
    metrics.tokens_per_second = metrics.estimated_output_tokens / (metrics.inference_ms / 1000);

    logger.info('[LLM_METRICS] === REGENERACIÓN COMPLETADA ===', {
      total_time_ms: metrics.total_regeneration_ms,
      breakdown: {
        whitelist_prep: `${metrics.whitelist_preparation_ms}ms (${((metrics.whitelist_preparation_ms/totalTime)*100).toFixed(1)}%)`,
        prompt_prep: `${metrics.prompt_preparation_ms}ms (${((metrics.prompt_preparation_ms/totalTime)*100).toFixed(1)}%)`,
        tokenization: `${metrics.tokenization_ms}ms (${((metrics.tokenization_ms/totalTime)*100).toFixed(1)}%)`,
        inference: `${metrics.inference_ms}ms (${((metrics.inference_ms/totalTime)*100).toFixed(1)}%)`
      },
      performance: {
        tokens_per_second: metrics.tokens_per_second.toFixed(2),
        total_tokens: metrics.estimated_input_tokens + metrics.estimated_output_tokens,
        input_tokens: metrics.estimated_input_tokens,
        output_tokens: metrics.estimated_output_tokens
      }
    });

    return epicrisis;
  }

  /**
   * Genera epicrisis de forma determinista (para desarrollo/testing)
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
}

export const llmService = new LlmService();
