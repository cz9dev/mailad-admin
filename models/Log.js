const { readDb, writeDb } = require("../config/database");

class Log {
  static async create(logData) {
    const db = await readDb();

    const newLog = {
      id: db.logs.length > 0 ? Math.max(...db.logs.map((l) => l.id)) + 1 : 1,
      timestamp: new Date().toISOString(),
      level: logData.level || "info",
      message: logData.message,
      userId: logData.userId || null,
      action: logData.action,
      details: logData.details || {},
    };

    db.logs.push(newLog);

    // Mantener sólo los últimos 1000 logs
    if (db.logs.length > 1000) {
      db.logs = db.logs.slice(-1000);
    }

    await writeDb(db);
    return newLog;
  }

  static async findAll(limit = 100) {
    const db = await readDb();
    return db.logs.slice(-limit).reverse();
  }

  static async findByAction(action, limit = 50) {
    const db = await readDb();
    return db.logs
      .filter((log) => log.action === action)
      .slice(-limit)
      .reverse();
  }

  static async findByUser(userId, limit = 50) {
    const db = await readDb();
    return db.logs
      .filter((log) => log.userId === userId)
      .slice(-limit)
      .reverse();
  }
}

module.exports = Log;
