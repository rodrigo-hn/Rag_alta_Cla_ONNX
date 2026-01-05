/**
 * Tipos clínicos para el frontend Angular
 */

export interface DiagnosisItem {
  codigo: string;
  nombre: string;
}

export interface ProcedureItem {
  codigo: string;
  nombre: string;
  fecha: string;
}

export interface MedicationItem {
  codigo: string;
  nombre: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion?: string;
}

export interface EvolutionItem {
  fecha: string;
  nota: string;
  profesional?: string;
}

export interface LabItem {
  parametro: string;
  valor: string;
  fecha: string;
}

export interface DischargeInstructions {
  medicamentos: MedicationItem[];
  controles: string[];
  recomendaciones: string[];
}

export interface ClinicalJson {
  motivo_ingreso: string;
  diagnostico_ingreso: DiagnosisItem[];
  procedimientos: ProcedureItem[];
  tratamientos_intrahosp: MedicationItem[];
  evolucion: EvolutionItem[];
  laboratorios_relevantes: LabItem[];
  diagnostico_egreso: DiagnosisItem[];
  indicaciones_alta: DischargeInstructions;
}

export interface ValidationViolation {
  type: 'dx' | 'proc' | 'med';
  mention: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ValidationViolation[];
  warnings?: string[];
}

export interface EpicrisisResponse {
  text: string;
  validation: ValidationResult;
  generatedAt: string;
  processingTimeMs: number;
}

export interface EpisodeResponse {
  episodeId: string;
  clinicalData: ClinicalJson;
  patientInfo?: {
    nombre: string;
    rut: string;
    fechaNacimiento: string;
  };
  processingTimeMs?: number;
}

export interface ExportRequest {
  text: string;
  patientName?: string;
  episodeId?: string;
}
