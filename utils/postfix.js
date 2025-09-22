const { exec } = require("child_process");
const util = require("util");
const fs = require("fs").promises;
const logger = require("./logger");

const execPromise = util.promisify(exec);

class PostfixManager {
  constructor() {
    this.aliasesPath = process.env.POSTFIX_ALIASES_PATH;
    this.transportPath = process.env.POSTFIX_TRANSPORT_PATH;
    this.mainCfPath = process.env.POSTFIX_MAIN_CF_PATH;
  }

  async reload() {
    try {
      await execPromise("postfix reload");
      logger.info("Postfix recargado exitosamente");
      return true;
    } catch (error) {
      logger.error("Error recargando Postfix:", error);
      return false;
    }
  }

  async getAliases() {
    try {
      const data = await fs.readFile(this.aliasesPath, "utf8");
      const aliases = [];

      data.split("\n").forEach((line) => {
        if (line.trim() && !line.startsWith("#")) {
          const [name, value] = line.split(":").map((part) => part.trim());
          if (name && value) {
            aliases.push({ name, value });
          }
        }
      });

      return aliases;
    } catch (error) {
      logger.error("Error leyendo aliases:", error);
      throw error;
    }
  }

  async updateAliases(aliases) {
    try {
      let content = "# Archivo de aliases generado por MailAD Admin\n";
      aliases.forEach((alias) => {
        if (alias.name && alias.value) {
          content += `${alias.name}: ${alias.value}\n`;
        }
      });

      await fs.writeFile(this.aliasesPath, content);

      // Regenerar base de datos de aliases
      await execPromise(`postalias ${this.aliasesPath}`);

      // Recargar Postfix
      await this.reload();

      logger.info("Aliases actualizados exitosamente");
      return true;
    } catch (error) {
      logger.error("Error actualizando aliases:", error);
      throw error;
    }
  }

  async getTransportRules() {
    try {
      const data = await fs.readFile(this.transportPath, "utf8");
      const rules = [];

      data.split("\n").forEach((line) => {
        if (line.trim() && !line.startsWith("#")) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            rules.push({
              pattern: parts[0],
              destination: parts.slice(1).join(" "),
            });
          }
        }
      });

      return rules;
    } catch (error) {
      logger.error("Error leyendo reglas de transporte:", error);
      throw error;
    }
  }

  async updateTransportRules(rules) {
    try {
      let content = "# Reglas de transporte generadas por MailAD Admin\n";
      rules.forEach((rule) => {
        if (rule.pattern && rule.destination) {
          content += `${rule.pattern} ${rule.destination}\n`;
        }
      });

      await fs.writeFile(this.transportPath, content);

      // Regenerar base de datos de transporte
      await execPromise(`postmap ${this.transportPath}`);

      // Recargar Postfix
      await this.reload();

      logger.info("Reglas de transporte actualizadas exitosamente");
      return true;
    } catch (error) {
      logger.error("Error actualizando reglas de transporte:", error);
      throw error;
    }
  }

  async getMainCf() {
    try {
      const data = await fs.readFile(this.mainCfPath, "utf8");
      return data;
    } catch (error) {
      logger.error("Error leyendo main.cf:", error);
      throw error;
    }
  }

  async updateMainCf(content) {
    try {
      await fs.writeFile(this.mainCfPath, content);

      // Recargar Postfix
      await this.reload();

      logger.info("main.cf actualizado exitosamente");
      return true;
    } catch (error) {
      logger.error("Error actualizando main.cf:", error);
      throw error;
    }
  }

  async getMailQueue() {
    try {
      const { stdout } = await execPromise("mailq");
      const queueCount = (stdout.match(/^[A-F0-9]/gm) || []).length;
      return queueCount;
    } catch (error) {
      logger.error("Error obteniendo cola de correo:", error);
      throw error;
    }
  }
}

module.exports = new PostfixManager();
