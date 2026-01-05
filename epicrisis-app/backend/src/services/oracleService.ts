/**
 * Servicio de Oracle para obtener datos clínicos
 */
import { executeClobFunction, executeQuery } from '../config/database';
import { logger } from '../config/logger';
import { ClinicalJson } from '../types/clinical.types';

export class OracleService {
  /**
   * Obtiene el resumen de alta en formato JSON desde Oracle
   */
  async getDischargeSummary(episodeId: number): Promise<ClinicalJson> {
    const startTime = Date.now();

    try {
      logger.info(`Obteniendo resumen de alta para episodio: ${episodeId}`);

      const jsonString = await executeClobFunction('get_discharge_summary_json', {
        p_episodio_id: episodeId
      });

      const clinicalData = JSON.parse(jsonString) as ClinicalJson;

      const processingTime = Date.now() - startTime;
      logger.info(`Resumen de alta obtenido en ${processingTime}ms`);

      return clinicalData;
    } catch (error) {
      logger.error(`Error obteniendo resumen de alta: ${error}`);
      throw new Error(`Error al obtener datos del episodio ${episodeId}`);
    }
  }

  /**
   * Busca episodios por paciente
   */
  async searchEpisodes(patientId: string): Promise<{ episodeId: number; fechaIngreso: string; fechaAlta: string | null }[]> {
    const sql = `
      SELECT
        id_episodio,
        TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') as fecha_ingreso,
        TO_CHAR(fecha_alta, 'YYYY-MM-DD') as fecha_alta
      FROM atenciones
      WHERE id_paciente = :patientId
      ORDER BY fecha_ingreso DESC
    `;

    interface EpisodeRow {
      EPISODIO_ID: number;
      FECHA_INGRESO: string;
      FECHA_ALTA: string | null;
    }

    const rows = await executeQuery<EpisodeRow>(sql, { patientId });

    return rows.map((row) => ({
      episodeId: row.EPISODIO_ID,
      fechaIngreso: row.FECHA_INGRESO,
      fechaAlta: row.FECHA_ALTA
    }));
  }

  /**
   * Verifica si un episodio existe
   */
  async episodeExists(episodeId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count
      FROM atenciones
      WHERE id_episodio = :episodeId
    `;

    interface CountRow {
      COUNT: number;
    }

    const rows = await executeQuery<CountRow>(sql, { episodeId });
    return rows[0]?.COUNT > 0;
  }

  /**
   * Obtiene información del paciente
   */
  async getPatientInfo(episodeId: number): Promise<{ nombre: string; rut: string; fechaNacimiento: string } | null> {
    const sql = `
      SELECT
        p.nombre || ' ' || p.apellido_paterno || ' ' || p.apellido_materno as nombre,
        p.rut,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento
      FROM atenciones a
      JOIN pacientes p ON a.id_paciente = p.id_paciente
      WHERE a.id_episodio = :episodeId
    `;

    interface PatientRow {
      NOMBRE: string;
      RUT: string;
      FECHA_NACIMIENTO: string;
    }

    const rows = await executeQuery<PatientRow>(sql, { episodeId });

    if (rows.length === 0) {
      return null;
    }

    return {
      nombre: rows[0].NOMBRE,
      rut: rows[0].RUT,
      fechaNacimiento: rows[0].FECHA_NACIMIENTO
    };
  }
}

export const oracleService = new OracleService();
