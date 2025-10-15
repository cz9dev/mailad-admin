const fs = require("fs").promises;
const path = require("path");
const ini = require("ini");
const sqlite3 = require("sqlite3").verbose();

class SQLiteConfig {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new sqlite3.Database(dbPath);
    this.init().catch((err) => {
      console.error("Error inicializando la base de datos:", err);
    });
  }

  async init() {
    // Crear la tabla 'configs'
    await new Promise((resolve, reject) => {
      this.db.run(
        "CREATE TABLE IF NOT EXISTS configs (key TEXT PRIMARY KEY, value TEXT)",
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  async read(key) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT value FROM configs WHERE key = ?",
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.value) : null);
        }
      );
    });
  }

  async write(key, value) {
    const valueStr = JSON.stringify(value);
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)",
        [key, valueStr],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }
}

class Config {
  constructor(configType) {
    this.configType = configType;
    this.db = new SQLiteConfig("database.sqlite");
  }

  async read() {
    try {
      await this.db.init();
      return await this.db.read(this.configType);
    } catch (error) {
      throw new Error(`Error leyendo configuración: ${error.message}`);
    }
  }

  async write(data) {
    try {
      await this.db.init();
      await this.db.write(this.configType, data);
      return true;
    } catch (error) {
      throw new Error(`Error escribiendo configuración: ${error.message}`);
    }
  }

  async update(updates) {
    try {
      const currentConfig = (await this.read()) || {};
      const newConfig = { ...currentConfig, ...updates };
      await this.write(newConfig);
      return newConfig;
    } catch (error) {
      throw new Error(`Error actualizando configuración: ${error.message}`);
    }
  }
}

// Configuraciones específicas
const ldapConfig = new Config("ldap");
const antivirusConfig = new Config("antivirus");
const sslConfig = new Config("ssl");

module.exports = {
  Config,
  ldapConfig,
  antivirusConfig,
  sslConfig,
  SQLiteConfig,
};
