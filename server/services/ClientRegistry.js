import { randomUUID } from 'crypto';
import { CLIENT_TTL_MS } from '../config.js';

/**
 * Keeps track of which lobby / game each logical client was last associated with.
 * Keyed by a long-lived `clientId` that the browser stores in localStorage.
 * Only lightweight, in-memory persistence is provided for now – once the server
 * restarts every mapping is cleared, which is acceptable for a demo.
 */
export class ClientRegistry {
  constructor(ttlMs = CLIENT_TTL_MS, cleanupIntervalMs = 60_000) {
    /** @type {Map<string, { roomId?: string, name?: string, updatedAt: number }>} */
    this.clients = new Map();
    this.ttlMs = ttlMs;
    // Periodically purge stale entries
    this.cleanupTimer = setInterval(() => this._cleanup(), cleanupIntervalMs);
  }

  /** Returns the stored record or `undefined`. */
  get(clientId) {
    return this.clients.get(clientId);
  }

  /** Creates a placeholder record for a brand-new client. */
  create(clientId = randomUUID()) {
    if (!this.clients.has(clientId)) this.clients.set(clientId, { updatedAt: Date.now() });
    return clientId;
  }

  /** Replace or update the record for a client. */
  set(clientId, data) {
    this.clients.set(clientId, { ...data, updatedAt: Date.now() });
  }

  /** Remove a client completely (not used at the moment). */
  delete(clientId) {
    this.clients.delete(clientId);
  }

  /** Internal: remove records older than TTL */
  _cleanup() {
    const now = Date.now();
    for (const [id, record] of this.clients) {
      if ((record.updatedAt ?? 0) < now - this.ttlMs) {
        this.clients.delete(id);
      }
    }
  }
} 