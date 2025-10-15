// utils/cache.js
const NodeCache = require("node-cache");
const logger = require("./logger");

class AuthCache {
  constructor() {
    // Cache con TTL de 15 minutos y checkperiod de 60 segundos
    this.cache = new NodeCache({
      stdTTL: 900, // 15 minutos
      checkperiod: 60,
      useClones: false,
    });

    // Estadísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  // Generar clave única para caché basada en usuario y password
  generateKey(username, password) {
    // Usamos hash simple para no almacenar passwords en claro
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(username + ":" + password);
    return `auth:${hash.digest("hex")}`;
  }

  // Almacenar resultado de autenticación
  setAuthResult(username, password, result) {
    try {
      const key = this.generateKey(username, password);
      const success = this.cache.set(key, {
        result: result,
        username: username,
        timestamp: Date.now(),
      });

      if (success) this.stats.sets++;
      return success;
    } catch (error) {
      logger.error("Error setting auth cache:", error);
      return false;
    }
  }

  // Obtener resultado de autenticación
  getAuthResult(username, password) {
    try {
      const key = this.generateKey(username, password);
      const cached = this.cache.get(key);

      if (cached) {
        this.stats.hits++;
        logger.debug(`Cache HIT para usuario: ${username}`);
        return cached.result;
      } else {
        this.stats.misses++;
        logger.debug(`Cache MISS para usuario: ${username}`);
        return null;
      }
    } catch (error) {
      logger.error("Error getting auth cache:", error);
      return null;
    }
  }

  // Invalidar caché para un usuario específico
  invalidateUser(username) {
    try {
      const keys = this.cache.keys();
      let invalidated = 0;

      keys.forEach((key) => {
        const cached = this.cache.get(key);
        if (cached && cached.username === username) {
          this.cache.del(key);
          invalidated++;
        }
      });

      logger.info(
        `Invalidados ${invalidated} items de caché para usuario: ${username}`
      );
      return invalidated;
    } catch (error) {
      logger.error("Error invalidating user cache:", error);
      return 0;
    }
  }

  // Limpiar caché completo
  clear() {
    this.cache.flushAll();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    logger.info("Cache de autenticación limpiado completamente");
  }

  // Obtener estadísticas
  getStats() {
    const keys = this.cache.keys();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      size: keys.length,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? (
              (this.stats.hits / (this.stats.hits + this.stats.misses)) *
              100
            ).toFixed(2)
          : 0,
    };
  }
}

// Instancia singleton
module.exports = new AuthCache();
