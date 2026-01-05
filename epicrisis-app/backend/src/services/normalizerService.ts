/**
 * Servicio de normalización de datos clínicos
 */
import { ClinicalJson, DiagnosisItem, MedicationItem, ProcedureItem, EvolutionItem, LabItem } from '../types/clinical.types';
import { logger } from '../config/logger';

export class NormalizerService {
  /**
   * Normaliza el JSON clínico recibido de Oracle
   */
  normalize(rawData: Partial<ClinicalJson>): ClinicalJson {
    logger.info('Normalizando datos clínicos');

    const normalized: ClinicalJson = {
      motivo_ingreso: this.normalizeString(rawData.motivo_ingreso),
      diagnostico_ingreso: this.normalizeDiagnoses(rawData.diagnostico_ingreso),
      procedimientos: this.normalizeProcedures(rawData.procedimientos),
      tratamientos_intrahosp: this.normalizeMedications(rawData.tratamientos_intrahosp),
      evolucion: this.normalizeEvolutions(rawData.evolucion),
      laboratorios_relevantes: this.normalizeLabs(rawData.laboratorios_relevantes),
      diagnostico_egreso: this.normalizeDiagnoses(rawData.diagnostico_egreso),
      indicaciones_alta: {
        medicamentos: this.normalizeMedications(rawData.indicaciones_alta?.medicamentos),
        controles: this.normalizeStringArray(rawData.indicaciones_alta?.controles),
        recomendaciones: this.normalizeStringArray(rawData.indicaciones_alta?.recomendaciones)
      }
    };

    return normalized;
  }

  /**
   * Normaliza un string (trim, elimina caracteres especiales problemáticos)
   */
  private normalizeString(value: string | undefined | null): string {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, ''); // Elimina caracteres de control
  }

  /**
   * Normaliza un array de strings
   */
  private normalizeStringArray(arr: string[] | string | undefined | null): string[] {
    // Si es string, parsear primero
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch (e) {
        logger.warn('Error parsing string array:', e);
        return [];
      }
    }

    if (!arr || !Array.isArray(arr)) return [];
    return arr
      .filter((item) => item != null)
      .map((item) => this.normalizeString(item))
      .filter((item) => item.length > 0);
  }

  /**
   * Normaliza diagnósticos
   */
  private normalizeDiagnoses(diagnoses: DiagnosisItem[] | string | undefined | null): DiagnosisItem[] {
    // Si es string, parsear primero
    if (typeof diagnoses === 'string') {
      try {
        diagnoses = JSON.parse(diagnoses);
      } catch (e) {
        logger.warn('Error parsing diagnoses string:', e);
        return [];
      }
    }

    if (!diagnoses || !Array.isArray(diagnoses)) return [];

    return diagnoses
      .filter((dx) => dx != null)
      .map((dx) => ({
        codigo: this.normalizeCIE10Code(dx.codigo),
        nombre: this.normalizeString(dx.nombre)
      }))
      .filter((dx) => dx.codigo || dx.nombre);
  }

  /**
   * Normaliza código CIE-10
   */
  private normalizeCIE10Code(code: string | undefined | null): string {
    if (!code) return '';
    // Formato CIE-10: letra + 2 dígitos + opcional punto + dígito(s)
    const normalized = code.toString().toUpperCase().trim();
    return normalized.replace(/[^A-Z0-9.]/g, '');
  }

  /**
   * Normaliza procedimientos
   */
  private normalizeProcedures(procedures: ProcedureItem[] | string | undefined | null): ProcedureItem[] {
    // Si es string, parsear primero
    if (typeof procedures === 'string') {
      try {
        procedures = JSON.parse(procedures);
      } catch (e) {
        logger.warn('Error parsing procedures string:', e);
        return [];
      }
    }

    if (!procedures || !Array.isArray(procedures)) return [];

    return procedures
      .filter((proc) => proc != null)
      .map((proc) => ({
        codigo: this.normalizeString(proc.codigo),
        nombre: this.normalizeString(proc.nombre),
        fecha: this.normalizeDate(proc.fecha)
      }))
      .filter((proc) => proc.nombre)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Normaliza medicamentos
   */
  private normalizeMedications(meds: MedicationItem[] | string | undefined | null): MedicationItem[] {
    // Si es string, parsear primero
    if (typeof meds === 'string') {
      try {
        meds = JSON.parse(meds);
      } catch (e) {
        logger.warn('Error parsing medications string:', e);
        return [];
      }
    }

    if (!meds || !Array.isArray(meds)) return [];

    return meds
      .filter((med) => med != null)
      .map((med) => ({
        codigo: this.normalizeATCCode(med.codigo),
        nombre: this.normalizeString(med.nombre),
        dosis: this.normalizeDosis(med.dosis),
        via: this.normalizeVia(med.via),
        frecuencia: this.normalizeString(med.frecuencia),
        duracion: med.duracion ? this.normalizeString(med.duracion) : undefined
      }))
      .filter((med) => med.nombre);
  }

  /**
   * Normaliza código ATC
   */
  private normalizeATCCode(code: string | undefined | null): string {
    if (!code) return '';
    // Formato ATC: letra + 2 dígitos + 2 letras + 2 dígitos
    return code.toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Normaliza dosis
   */
  private normalizeDosis(dosis: string | undefined | null): string {
    if (!dosis) return '';
    // Normaliza unidades comunes
    return dosis
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/miligram[oa]s?/gi, 'mg')
      .replace(/gram[oa]s?/gi, 'g')
      .replace(/microgr?am[oa]s?/gi, 'mcg')
      .replace(/mililitros?/gi, 'ml')
      .replace(/litros?/gi, 'L')
      .replace(/unidades?/gi, 'UI');
  }

  /**
   * Normaliza vía de administración
   */
  private normalizeVia(via: string | undefined | null): string {
    if (!via) return '';

    const normalizedVia = via.toString().toLowerCase().trim();

    // Mapeo de vías comunes
    const viaMap: Record<string, string> = {
      'oral': 'VO',
      'via oral': 'VO',
      'vo': 'VO',
      'endovenoso': 'EV',
      'endovenosa': 'EV',
      'intravenoso': 'EV',
      'intravenosa': 'EV',
      'ev': 'EV',
      'iv': 'EV',
      'intramuscular': 'IM',
      'im': 'IM',
      'subcutaneo': 'SC',
      'subcutanea': 'SC',
      'sc': 'SC',
      'sublingual': 'SL',
      'sl': 'SL',
      'topico': 'TOP',
      'topica': 'TOP',
      'inhalatoria': 'INH',
      'nebulizacion': 'NBZ',
      'rectal': 'REC'
    };

    return viaMap[normalizedVia] || via.toUpperCase();
  }

  /**
   * Normaliza evoluciones clínicas
   */
  private normalizeEvolutions(evolutions: EvolutionItem[] | string | undefined | null): EvolutionItem[] {
    // Si es string, parsear primero
    if (typeof evolutions === 'string') {
      try {
        evolutions = JSON.parse(evolutions);
      } catch (e) {
        logger.warn('Error parsing evolutions string:', e);
        return [];
      }
    }

    if (!evolutions || !Array.isArray(evolutions)) return [];

    return evolutions
      .filter((ev) => ev != null)
      .map((ev) => ({
        fecha: this.normalizeDate(ev.fecha),
        nota: this.normalizeString(ev.nota),
        profesional: ev.profesional ? this.normalizeString(ev.profesional) : undefined
      }))
      .filter((ev) => ev.nota)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Normaliza exámenes de laboratorio
   */
  private normalizeLabs(labs: LabItem[] | string | undefined | null): LabItem[] {
    // Si es string, parsear primero
    if (typeof labs === 'string') {
      try {
        labs = JSON.parse(labs);
      } catch (e) {
        logger.warn('Error parsing labs string:', e);
        return [];
      }
    }

    if (!labs || !Array.isArray(labs)) return [];

    return labs
      .filter((lab) => lab != null)
      .map((lab) => ({
        parametro: this.normalizeString(lab.parametro),
        valor: this.normalizeLabValue(lab.valor),
        fecha: this.normalizeDate(lab.fecha)
      }))
      .filter((lab) => lab.parametro && lab.valor);
  }

  /**
   * Normaliza valor de laboratorio
   */
  private normalizeLabValue(value: string | undefined | null): string {
    if (!value) return '';
    return value.toString().trim();
  }

  /**
   * Normaliza fecha a formato ISO
   */
  private normalizeDate(date: string | undefined | null): string {
    if (!date) return '';

    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return '';
      return parsed.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
}

export const normalizerService = new NormalizerService();
