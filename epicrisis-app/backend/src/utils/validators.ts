/**
 * Utilidades de validacion
 */

/**
 * Valida formato de codigo CIE-10
 */
export function isValidCIE10(code: string): boolean {
  if (!code) return false;
  // Formato: Letra + 2 digitos + opcional (punto + 1-2 digitos)
  const cie10Regex = /^[A-Z]\d{2}(\.\d{1,2})?$/i;
  return cie10Regex.test(code.trim());
}

/**
 * Valida formato de codigo ATC
 */
export function isValidATC(code: string): boolean {
  if (!code) return false;
  // Formato: Letra + 2 digitos + 2 letras + 2 digitos (ej: A02BC01)
  const atcRegex = /^[A-Z]\d{2}[A-Z]{2}\d{2}$/i;
  return atcRegex.test(code.trim());
}

/**
 * Valida RUT chileno
 */
export function isValidRUT(rut: string): boolean {
  if (!rut) return false;

  // Limpiar RUT
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase();

  if (cleanRut.length < 8 || cleanRut.length > 9) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Calcular digito verificador
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDV = 11 - (sum % 11);
  let calculatedDV: string;

  if (expectedDV === 11) calculatedDV = '0';
  else if (expectedDV === 10) calculatedDV = 'K';
  else calculatedDV = expectedDV.toString();

  return dv === calculatedDV;
}

/**
 * Valida formato de fecha ISO
 */
export function isValidISODate(date: string): boolean {
  if (!date) return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Valida que un texto no contenga caracteres peligrosos
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Remover HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
    .trim();
}

/**
 * Valida longitud de texto
 */
export function validateTextLength(
  text: string,
  minLength: number,
  maxLength: number
): { valid: boolean; message?: string } {
  if (!text) {
    return { valid: minLength === 0, message: 'Texto requerido' };
  }

  if (text.length < minLength) {
    return { valid: false, message: `Texto muy corto (minimo ${minLength} caracteres)` };
  }

  if (text.length > maxLength) {
    return { valid: false, message: `Texto muy largo (maximo ${maxLength} caracteres)` };
  }

  return { valid: true };
}

/**
 * Valida estructura de JSON clinico
 */
export function validateClinicalJsonStructure(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Datos invalidos'] };
  }

  const json = data as Record<string, unknown>;

  // Validar campos requeridos
  const requiredFields = [
    'motivo_ingreso',
    'diagnostico_ingreso',
    'diagnostico_egreso',
    'indicaciones_alta'
  ];

  for (const field of requiredFields) {
    if (!(field in json)) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }

  // Validar arrays
  const arrayFields = [
    'diagnostico_ingreso',
    'diagnostico_egreso',
    'procedimientos',
    'tratamientos_intrahosp',
    'evolucion',
    'laboratorios_relevantes'
  ];

  for (const field of arrayFields) {
    if (field in json && !Array.isArray(json[field])) {
      errors.push(`Campo ${field} debe ser un array`);
    }
  }

  // Validar indicaciones_alta
  if ('indicaciones_alta' in json) {
    const indicaciones = json.indicaciones_alta as Record<string, unknown>;
    if (!indicaciones || typeof indicaciones !== 'object') {
      errors.push('indicaciones_alta debe ser un objeto');
    } else {
      if (!Array.isArray(indicaciones.medicamentos)) {
        errors.push('indicaciones_alta.medicamentos debe ser un array');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Genera hash simple para auditoria
 */
export function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
