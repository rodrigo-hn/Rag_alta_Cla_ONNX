/**
 * Tipos clínicos para el sistema de epicrisis
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
}

export interface EpicrisisResponse {
  text: string;
  validation: ValidationResult;
  generatedAt: string;
  processingTimeMs: number;
}

export interface GenerationRequest {
  clinicalData: ClinicalJson;
}

export interface RegenerationRequest {
  clinicalData: ClinicalJson;
  violations: ValidationViolation[];
}

export interface ValidateRequest {
  text: string;
  clinicalData: ClinicalJson;
}

export interface ExportRequest {
  text: string;
  patientName?: string;
  episodeId?: string;
}

// Respuesta del endpoint de episodio
export interface EpisodeResponse {
  episodeId: string;
  clinicalData: ClinicalJson;
  patientInfo?: {
    nombre: string;
    rut: string;
    fechaNacimiento: string;
  };
}

// Auditoría de generaciones
export interface AuditLog {
  id: string;
  episodeId: string;
  userId: string;
  action: 'generate' | 'regenerate' | 'validate' | 'export';
  timestamp: string;
  inputHash: string;
  outputHash?: string;
  validationResult?: ValidationResult;
  processingTimeMs: number;
}
