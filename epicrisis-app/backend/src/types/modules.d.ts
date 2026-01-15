/**
 * Declaraciones de tipos para módulos sin tipado
 */

declare module 'oracledb' {
  export const OUT_FORMAT_OBJECT: number;
  export const CLOB: number;
  export const STRING: number;
  export const BIND_OUT: number;

  export let outFormat: number;
  export let autoCommit: boolean;
  export let fetchAsString: number[];

  export interface PoolAttributes {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
    poolTimeout?: number;
    poolAlias?: string;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    [key: string]: unknown;
  }

  export interface BindParameters {
    [key: string]: unknown;
  }

  export interface ExecuteResult<T = unknown> {
    rows?: T[];
    outBinds?: Record<string, unknown>;
    rowsAffected?: number;
  }

  export interface Connection {
    execute<T = unknown>(sql: string, binds?: BindParameters, options?: ExecuteOptions): Promise<ExecuteResult<T>>;
    close(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export function createPool(attrs: PoolAttributes): Promise<Pool>;
}

declare module 'pdfkit';
