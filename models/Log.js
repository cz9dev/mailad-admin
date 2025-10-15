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
      return logs.slice(0, limit); // Retorna los últimos 'limit' logs
    } catch (error) {
      console.error("Error obteniendo logs recientes:", error);
      throw new Error(`Error al obtener logs: ${error.message}`);
    }
  }
}

module.exports = Log;
