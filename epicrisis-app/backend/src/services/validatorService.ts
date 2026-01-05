/**
 * Servicio de validación clínica con whitelist
 * Detecta alucinaciones y menciones no permitidas
 */
import { ClinicalJson, ValidationResult, ValidationViolation } from '../types/clinical.types';
import { CLINICAL_SYNONYMS } from '../utils/synonyms';
import { logger } from '../config/logger';

interface Item {
  codigo?: string;
  nombre: string;
}

interface Whitelist {
  codes: Set<string>;
  names: Set<string>;
}

export class ValidatorService {
  // Triggers médicos para detectar menciones clínicas
  private readonly medicalTriggers = [
    'mg', 'ev', 'vo', 'im', 'sc', 'cada', 'hrs', 'horas', 'dias',
    'diagnostico', 'neumonia', 'insuficiencia', 'fractura', 'sepsis',
    'cirugia', 'procedimiento', 'tac', 'rx', 'ecg', 'endoscopia',
    'antibiotico', 'analgesia', 'infeccion', 'diabetes', 'hipertension',
    'cardiopatia', 'nefropatia', 'hepatopatia', 'anemia', 'leucocitosis'
  ];

  // Frases descriptivas comunes que NO son violaciones
  private readonly commonPhrases = [
    'dias de', 'dias del', 'horas de', 'horas del', 'cada dia', 'cada hora',
    'de evolucion', 'evolucion caracterizado', 'evolucion favorable',
    'con diagnostico', 'diagnostico de', 'sin diagnostico',
    'con procedimiento', 'procedimiento de', 'con cirugia', 'cirugia de',
    'con antibiotico', 'antibiotico por', 'con analgesia', 'analgesia con',
    'con tratamiento', 'tratamiento con', 'tratamiento antibiotico',
    'en tratamiento', 'a tratamiento', 'del tratamiento',
    'con medicamento', 'medicamento por', 'indicaciones farmacologicas'
  ];

  // Términos clínicos comunes relacionados con diagnósticos que NO son violaciones
  // (hallazgos clínicos frecuentes que aparecen en evoluciones pero no están codificados)
  private readonly commonClinicalTerms = [
    'ascitis',           // Relacionado con cirrosis/hipertensión portal
    'ictericia',         // Relacionado con enfermedad hepática
    'edema',             // Hallazgo común en múltiples patologías
    'derrame',           // Relacionado con derrames pleurales/pericárdicos
    'disnea',            // Síntoma respiratorio común
    'taquicardia',       // Signo vital alterado
    'hipertension',      // Muy común
    'hipotension',       // Muy común
    'fiebre',            // Síntoma común
    'dolor',             // Síntoma común
    'nauseas',           // Síntoma gastrointestinal
    'vomitos',           // Síntoma gastrointestinal
    'diarrea',           // Síntoma gastrointestinal
    'constipacion',      // Síntoma gastrointestinal
    'cefalea',           // Síntoma neurológico común
    'mareos'             // Síntoma común
  ];

  /**
   * Normaliza un string para comparación
   */
  private normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s/\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Crea whitelist a partir de items
   */
  private makeWhitelist(items: Item[]): Whitelist {
    const codes = new Set<string>();
    const names = new Set<string>();

    for (const item of items || []) {
      if (item.codigo) codes.add(this.normalize(item.codigo));
      names.add(this.normalize(item.nombre));
    }

    return { codes, names };
  }

  /**
   * Extrae n-gramas del texto
   */
  private extractNgrams(textNorm: string, minN = 2, maxN = 6): Set<string> {
    const words = textNorm.split(' ').filter(Boolean);
    const out = new Set<string>();

    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        out.add(words.slice(i, i + n).join(' '));
      }
    }

    return out;
  }

  /**
   * Verifica si una mención está permitida
   */
  private allowedMention(mention: string, wl: Whitelist): boolean {
    const m = this.normalize(mention);

    if (wl.codes.has(m)) return true;
    if (wl.names.has(m)) return true;

    // Aplica sinónimos
    for (const [key, syns] of Object.entries(CLINICAL_SYNONYMS)) {
      if (m === key || syns.includes(m)) {
        if (wl.names.has(key)) return true;
        for (const s of syns) {
          if (wl.names.has(s)) return true;
        }
      }
    }

    return false;
  }

  /**
   * Valida epicrisis contra datos clínicos
   */
  validateEpicrisis(text: string, data: ClinicalJson): ValidationResult {
    const startTime = Date.now();
    logger.info('Validando epicrisis...');

    const textNorm = this.normalize(text);
    const grams = this.extractNgrams(textNorm);

    // Crear whitelists
    const dxWL = this.makeWhitelist([
      ...(data.diagnostico_ingreso || []),
      ...(data.diagnostico_egreso || [])
    ]);

    const procWL = this.makeWhitelist(data.procedimientos || []);

    const medWL = this.makeWhitelist([
      ...((data.indicaciones_alta?.medicamentos || []).map((m) => ({
        codigo: m.codigo,
        nombre: m.nombre
      }))),
      ...((data.tratamientos_intrahosp || []).map((m) => ({
        codigo: m.codigo,
        nombre: m.nombre
      })))
    ]);

    const violations: ValidationViolation[] = [];

    // Función para verificar categoría
    const checkCategory = (
      type: 'dx' | 'proc' | 'med',
      wl: Whitelist
    ): void => {
      for (const g of grams) {
        // SOLO validar códigos médicos explícitos (CIE-10, ATC, etc)
        if (
          /^[a-z]\d{2}(\.\d)?$/i.test(g) ||  // Código CIE10 como J18.9
          g.startsWith('atc:') ||              // Código ATC explícito
          /^[a-z0-9]{3,10}[:\-][a-z0-9]{2,10}$/i.test(g)  // Códigos con separadores
        ) {
          if (!wl.codes.has(g)) {
            violations.push({
              type,
              mention: g,
              reason: 'Código médico no permitido por whitelist'
            });
          }
          continue;
        }

        // SOLO validar nombres de medicamentos/diagnósticos MUY específicos
        // que contengan triggers Y sean lo suficientemente largos (>= 4 palabras)
        const hasTrigger = this.medicalTriggers.some((t) => g.includes(t));
        if (!hasTrigger) continue;

        const wordCount = g.split(' ').length;
        if (wordCount < 4) continue;  // Frases cortas son contexto, no violaciones

        // Si es una frase común, ok
        if (this.commonPhrases.includes(g)) continue;

        // Si g es exactamente un nombre permitido, ok
        if (wl.names.has(g)) continue;

        // Si es sub-ngrama de un nombre permitido, ok
        let overlapsAllowed = false;
        for (const name of wl.names) {
          // Si g contiene el nombre permitido, ok (ej: "amoxicilina 500mg vo" contiene "amoxicilina")
          if (g.includes(name) && name.length >= 5) {
            overlapsAllowed = true;
            break;
          }
          // Si el nombre permitido contiene g, ok (ej: "neumonia adquirida" está en "neumonia adquirida en la comunidad")
          if (name.includes(g) && g.length >= 8) {
            overlapsAllowed = true;
            break;
          }
        }
        if (overlapsAllowed) continue;

        // Si contiene un término clínico común (hallazgo/síntoma frecuente), ok
        const hasCommonClinicalTerm = this.commonClinicalTerms.some(term => g.includes(term));
        if (hasCommonClinicalTerm) continue;

        // Solo marcar si parece un nombre de enfermedad/medicamento específico
        // (contiene sufijos médicos típicos)
        const medicalSuffixes = ['itis', 'osis', 'emia', 'penia', 'patia', 'algia',
                                  'tropin', 'micina', 'azol', 'prazol'];
        const hasMedicalSuffix = medicalSuffixes.some(s => g.includes(s));

        if (hasMedicalSuffix) {
          violations.push({
            type,
            mention: g,
            reason: 'Posible término médico específico no encontrado en whitelist'
          });
        }
      }
    };

    // Chequeos por categoría
    checkCategory('dx', dxWL);
    checkCategory('proc', procWL);
    checkCategory('med', medWL);

    // Dedupe violaciones
    const seen = new Set<string>();
    const uniqueViolations = violations.filter((v) => {
      const k = `${v.type}|${v.mention}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const processingTime = Date.now() - startTime;
    logger.info(
      `Validación completada en ${processingTime}ms. ` +
      `Violaciones: ${uniqueViolations.length}`
    );

    return {
      ok: uniqueViolations.length === 0,
      violations: uniqueViolations
    };
  }

  /**
   * Verifica si el texto contiene información mínima requerida
   */
  validateCompleteness(text: string, data: ClinicalJson): string[] {
    const warnings: string[] = [];
    const textLower = text.toLowerCase();

    // Verificar diagnóstico de egreso
    if (data.diagnostico_egreso.length > 0) {
      const hasEgreso = data.diagnostico_egreso.some((dx) =>
        textLower.includes(dx.nombre.toLowerCase()) ||
        textLower.includes(dx.codigo.toLowerCase())
      );
      if (!hasEgreso) {
        warnings.push('Falta diagnóstico de egreso en el texto');
      }
    }

    // Verificar medicamentos de alta
    if (data.indicaciones_alta.medicamentos.length > 0) {
      const hasMeds = data.indicaciones_alta.medicamentos.some((med) =>
        textLower.includes(med.nombre.toLowerCase())
      );
      if (!hasMeds) {
        warnings.push('Faltan indicaciones farmacológicas al alta');
      }
    }

    // Verificar que no sea muy corto
    if (text.length < 100 && data.diagnostico_egreso.length > 0) {
      warnings.push('El texto parece demasiado corto para una epicrisis completa');
    }

    return warnings;
  }
}

export const validatorService = new ValidatorService();
