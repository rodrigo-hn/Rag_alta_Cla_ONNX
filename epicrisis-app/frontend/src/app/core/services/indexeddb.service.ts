/**
 * Servicio para almacenamiento vectorial en IndexedDB
 * Almacena chunks de texto y sus embeddings para busqueda semantica
 */
import { Injectable, signal } from '@angular/core';
import { Chunk, VectorRecord } from '../models/rag.types';

const DB_NAME = 'epicrisis-rag-db';
const DB_VERSION = 1;
const CHUNKS_STORE = 'chunks';
const VECTORS_STORE = 'vectors';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private db: IDBDatabase | null = null;

  // Estado
  isReady = signal<boolean>(false);
  error = signal<string | null>(null);
  chunksCount = signal<number>(0);

  /**
   * Inicializa la base de datos
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para chunks de texto
        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          db.createObjectStore(CHUNKS_STORE, { keyPath: 'chunkKey' });
        }

        // Store para vectores (embeddings)
        if (!db.objectStoreNames.contains(VECTORS_STORE)) {
          db.createObjectStore(VECTORS_STORE, { keyPath: 'chunkKey' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isReady.set(true);
        this.updateChunksCount();
        resolve();
      };

      request.onerror = (event) => {
        const error = `Error abriendo IndexedDB: ${(event.target as IDBOpenDBRequest).error}`;
        this.error.set(error);
        reject(new Error(error));
      };
    });
  }

  /**
   * Guarda un chunk de texto
   */
  async putChunk(chunk: Chunk): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readwrite');
      const store = tx.objectStore(CHUNKS_STORE);
      const request = store.put(chunk);

      request.onsuccess = () => {
        this.updateChunksCount();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda un vector (embedding)
   */
  async putVector(vectorData: VectorRecord): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VECTORS_STORE, 'readwrite');
      const store = tx.objectStore(VECTORS_STORE);
      const request = store.put(vectorData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los vectores
   */
  async getAllVectors(): Promise<VectorRecord[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VECTORS_STORE, 'readonly');
      const store = tx.objectStore(VECTORS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene chunks por sus claves
   */
  async getChunksByKeys(keys: string[]): Promise<Chunk[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const chunks: Chunk[] = [];

    for (const key of keys) {
      const chunk = await this.getChunk(key);
      if (chunk) chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Obtiene un chunk por su clave
   */
  async getChunk(key: string): Promise<Chunk | null> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los chunks
   */
  async getAllChunks(): Promise<Chunk[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia toda la base de datos
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([CHUNKS_STORE, VECTORS_STORE], 'readwrite');

      tx.objectStore(CHUNKS_STORE).clear();
      tx.objectStore(VECTORS_STORE).clear();

      tx.oncomplete = () => {
        this.chunksCount.set(0);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Actualiza el contador de chunks
   */
  private async updateChunksCount(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const request = store.count();

      request.onsuccess = () => {
        this.chunksCount.set(request.result);
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  /**
   * Elimina la base de datos completamente
   */
  async deleteDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        this.isReady.set(false);
        this.chunksCount.set(0);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
