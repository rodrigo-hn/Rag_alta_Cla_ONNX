/**
 * Configuración de conexión a Oracle Database
 */
import oracledb from 'oracledb';
import { logger } from './logger';

export interface DatabaseConfig {
  user: string;
  password: string;
  connectString: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
  poolTimeout: number;
}

const config: DatabaseConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/ORCLPDB1',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60
};

let pool: oracledb.Pool | null = null;

/**
 * Inicializa el pool de conexiones Oracle
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Configurar Oracle client
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;
    oracledb.fetchAsString = [oracledb.CLOB];

    pool = await oracledb.createPool({
      user: config.user,
      password: config.password,
      connectString: config.connectString,
      poolMin: config.poolMin,
      poolMax: config.poolMax,
      poolIncrement: config.poolIncrement,
      poolTimeout: config.poolTimeout,
      poolAlias: 'epicrisis_pool'
    });

    logger.info('Pool de conexiones Oracle inicializado correctamente');
  } catch (error) {
    logger.error('Error inicializando pool de conexiones:', error);
    throw error;
  }
}

/**
 * Obtiene una conexión del pool
 */
export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    throw new Error('Pool de conexiones no inicializado');
  }
  return pool.getConnection();
}

/**
 * Cierra el pool de conexiones
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.close(10); // 10 segundos de gracia
      logger.info('Pool de conexiones cerrado');
    } catch (error) {
      logger.error('Error cerrando pool:', error);
      throw error;
    }
  }
}

/**
 * Ejecuta una consulta SQL
 */
export async function executeQuery<T>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<T[]> {
  let connection: oracledb.Connection | undefined;

  try {
    connection = await getConnection();
    const result = await connection.execute<T>(sql, binds, {
      ...options,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    return (result.rows || []) as T[];
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * Ejecuta una función PL/SQL que retorna CLOB
 */
export async function executeClobFunction(
  functionName: string,
  params: Record<string, unknown>
): Promise<string> {
  let connection: oracledb.Connection | undefined;

  try {
    connection = await getConnection();

    const paramNames = Object.keys(params);
    const bindVars: oracledb.BindParameters = {
      result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50000 }
    };

    paramNames.forEach((name) => {
      bindVars[name] = params[name];
    });

    const paramPlaceholders = paramNames.map((name) => `:${name}`).join(', ');
    const sql = `BEGIN :result := ${functionName}(${paramPlaceholders}); END;`;

    const result = await connection.execute(sql, bindVars);
    const outBinds = result.outBinds as { result: string };

    return outBinds.result || '';
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export { config };
