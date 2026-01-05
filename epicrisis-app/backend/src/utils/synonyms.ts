/**
 * Diccionario de sinónimos clínicos Chile
 */

export const CLINICAL_SYNONYMS: Record<string, string[]> = {
  // Procedimientos imagenológicos
  "tac": ["tomografia computada", "tc", "scanner"],
  "rx": ["radiografia", "rayos x"],

  // Unidades
  "uci": ["unidad de cuidados intensivos", "upc"],
  "uti": ["unidad de tratamiento intensivo"],

  // Vías de administración
  "ev": ["endovenoso", "intravenoso", "iv"],
  "vo": ["via oral", "oral"],
  "im": ["intramuscular"],
  "sc": ["subcutaneo", "subcutanea"],

  // Términos comunes
  "pcr": ["paro cardiorrespiratorio", "paro cardiorespiratorio"],
  "irc": ["insuficiencia renal cronica"],
  "ira": ["insuficiencia renal aguda"],
  "icc": ["insuficiencia cardiaca congestiva"],
  "epoc": ["enfermedad pulmonar obstructiva cronica"],
  "avc": ["accidente vascular cerebral", "ave"],
  "iam": ["infarto agudo al miocardio"],
  "tec": ["traumatismo encefalocraneano"],
  "hta": ["hipertension arterial"],
  "dm": ["diabetes mellitus"],
  "dm2": ["diabetes mellitus tipo 2"],

  // Signos vitales
  "pa": ["presion arterial"],
  "fc": ["frecuencia cardiaca"],
  "fr": ["frecuencia respiratoria"],
  "sat o2": ["saturacion de oxigeno", "sao2"],
  "temp": ["temperatura"]
};

/**
 * Obtiene todos los sinónimos para un término dado
 */
export function getSynonyms(term: string): string[] {
  const normalizedTerm = term.toLowerCase().trim();

  // Buscar si el término es una clave
  if (CLINICAL_SYNONYMS[normalizedTerm]) {
    return [normalizedTerm, ...CLINICAL_SYNONYMS[normalizedTerm]];
  }

  // Buscar si el término es un sinónimo
  for (const [key, synonyms] of Object.entries(CLINICAL_SYNONYMS)) {
    if (synonyms.includes(normalizedTerm)) {
      return [key, ...synonyms];
    }
  }

  return [normalizedTerm];
}

/**
 * Verifica si dos términos son sinónimos
 */
export function areSynonyms(term1: string, term2: string): boolean {
  const synonyms1 = getSynonyms(term1);
  const normalizedTerm2 = term2.toLowerCase().trim();
  return synonyms1.includes(normalizedTerm2);
}
