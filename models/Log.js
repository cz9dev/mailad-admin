const { Config } = require("./Config");
const logConfig = new Config("logs");

class Log {
  static async create(logData) {
    try {
      const logs = (await logConfig.read()) || [];
      const newLog = {
        id: logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
        timestamp: new Date().toISOString(),
        level: logData.level || "info",
        message: logData.message,
        userId: logData.userId || null,
        action: logData.action,
        details: logData.details || {},
      };

      logs.push(newLog);

      // Mantener sólo los últimos 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      await logConfig.write(logs);
      return newLog;
    } catch (error) {
      throw new Error(`Error creando log: ${error.message}`);
    }
  }

  static async findAll(limit = 100) {
    try {
      const logs = (await logConfig.read()) || [];
      return logs.slice(-limit).reverse();
    } catch (error) {
      throw new Error(`Error obteniendo logs: ${error.message}`);
    }
  }

  static async findByAction(action, limit = 50) {
    try {
      const logs = (await logConfig.read()) || [];
      return logs
        .filter((log) => log.action === action)
        .slice(-limit)
        .reverse();
    } catch (error) {
      throw new Error(`Error obteniendo logs por acción: ${error.message}`);
    }
  }

  static async findByUser(userId, limit = 50) {
    try {
      const logs = (await logConfig.read()) || [];
      return logs
        .filter((log) => log.userId === userId)
        .slice(-limit)
        .reverse();
    } catch (error) {
      throw new Error(`Error obteniendo logs por usuario: ${error.message}`);
    }
  }

  static async findRecent(limit = 10) {
    try {
      const logs = (await logConfig.read()) || [];
      // Ordenar por timestamp (más reciente primero)
      const sortedLogs = logs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      return sortedLogs.slice(0, limit); // Retorna los 'limit' logs más recientes
    } catch (error) {
      console.error("Error obteniendo logs recientes:", error);
      throw new Error(`Error al obtener logs: ${error.message}`);
    }
  }

  static async cleanupOldLogs(daysToKeep = 30) {
    try {
      const logs = (await logConfig.read()) || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredLogs = logs.filter(
        (log) => new Date(log.timestamp) > cutoffDate
      );

      await logConfig.write(filteredLogs);
      return logs.length - filteredLogs.length;
    } catch (error) {
      throw new Error(`Error limpiando logs antiguos: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const logs = (await logConfig.read()) || [];
      const stats = {
        total: logs.length,
        byLevel: {},
        byAction: {},
        recent: logs.slice(0, 10),
      };

      logs.forEach((log) => {
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas de logs: ${error.message}`
      );
    }
  }
}

module.exports = Log;
