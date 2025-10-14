// models/Transport.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const Log = require("./Log");

const execPromise = util.promisify(exec);

class Transport {
  static getTransportPath() {
    return process.env.POSTFIX_TRANSPORT_PATH || "/etc/postfix/transport";
  }

  // Leer todas las reglas de transporte
  static async findAll() {
    try {
      const transportPath = this.getTransportPath();
      const data = await fs.readFile(transportPath, "utf8");

      const rules = [];
      const lines = data.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Saltar líneas vacías y comentarios
        if (!trimmedLine || trimmedLine.startsWith("#")) {
          continue;
        }

        // Procesar línea de transporte (formato: pattern destination)
        const parts = trimmedLine.split(/\s+/).filter((part) => part.trim());
        if (parts.length >= 2) {
          const pattern = parts[0].trim();
          const destination = parts.slice(1).join(" ").trim();

          rules.push({
            pattern,
            destination,
          });
        }
      }

      return rules;
    } catch (error) {
      console.error("Error reading transport file:", error);
      throw new Error(
        `Error al leer las reglas de transporte: ${error.message}`
      );
    }
  }

  // Crear nueva regla de transporte
  static async create(ruleData) {
    try {
      const { pattern, destination } = ruleData;

      if (!pattern || !destination) {
        throw new Error("Patrón y destino son obligatorios");
      }

      const rules = await this.findAll();

      // Verificar si la regla ya existe
      if (rules.some((rule) => rule.pattern === pattern)) {
        throw new Error(`Ya existe una regla para el patrón ${pattern}`);
      }

      // Agregar la nueva regla
      rules.push({ pattern, destination });

      // Guardar en el archivo
      await this.saveRulesToFile(rules);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        pattern,
        destination,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error creating transport rule:", error);
      throw new Error(`Error al crear regla de transporte: ${error.message}`);
    }
  }

  // Actualizar regla de transporte existente
  static async update(pattern, newDestination) {
    try {
      if (!newDestination) {
        throw new Error("El destino es obligatorio");
      }

      const rules = await this.findAll();
      const ruleIndex = rules.findIndex((rule) => rule.pattern === pattern);

      if (ruleIndex === -1) {
        throw new Error(`Regla para patrón ${pattern} no encontrada`);
      }

      // Actualizar el destino
      rules[ruleIndex].destination = newDestination;

      // Guardar en el archivo
      await this.saveRulesToFile(rules);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        pattern,
        destination: newDestination,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error updating transport rule:", error);
      throw new Error(
        `Error al actualizar regla de transporte: ${error.message}`
      );
    }
  }

  // Eliminar regla de transporte
  static async delete(pattern) {
    try {
      const rules = await this.findAll();
      const filteredRules = rules.filter((rule) => rule.pattern !== pattern);

      if (filteredRules.length === rules.length) {
        throw new Error(`Regla para patrón ${pattern} no encontrada`);
      }

      // Guardar en el archivo
      await this.saveRulesToFile(filteredRules);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        success: true,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error deleting transport rule:", error);
      throw new Error(
        `Error al eliminar regla de transporte: ${error.message}`
      );
    }
  }

  // Guardar reglas en el archivo
  static async saveRulesToFile(rules) {
    try {
      const transportPath = this.getTransportPath();

      let content = `# Reglas de transporte generadas por MailAD Admin\n`;
      content += `# Actualizado: ${new Date().toISOString()}\n\n`;

      // Agregar cada regla
      rules.forEach((rule) => {
        content += `${rule.pattern}\t${rule.destination}\n`;
      });

      // Escribir el archivo
      await fs.writeFile(transportPath, content, "utf8");
    } catch (error) {
      console.error("Error saving transport rules to file:", error);
      throw new Error(
        `Error al guardar reglas de transporte: ${error.message}`
      );
    }
  }

  // Recargar configuración de Postfix
  static async reloadPostfix() {
    try {
      const transportPath = this.getTransportPath();
      const transportDir = path.dirname(transportPath);
      const fileName = path.basename(transportPath);

      // Ejecutar postmap en el archivo de transporte
      await execPromise(`cd ${transportDir} && postmap ${fileName}`);

      // Recargar postfix
      await execPromise("postfix reload");

      console.log("✓ Postfix transport reloaded successfully");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error reloading postfix:", error);
      console.warn(
        "⚠ Reglas de transporte fueron guardadas pero Postfix no pudo recargar. Ejecute manualmente:"
      );
      console.warn(
        `cd ${path.dirname(this.getTransportPath())} && postmap ${path.basename(
          this.getTransportPath()
        )} && postfix reload`
      );

      return {
        success: false,
        error: error.message,
        manualCommand: `cd ${path.dirname(
          this.getTransportPath()
        )} && postmap ${path.basename(
          this.getTransportPath()
        )} && postfix reload`,
      };
    }
  }

  // Buscar regla por patrón
  static async findByPattern(pattern) {
    try {
      const rules = await this.findAll();
      return rules.find((rule) => rule.pattern === pattern) || null;
    } catch (error) {
      console.error("Error finding transport rule by pattern:", error);
      return null;
    }
  }
}

module.exports = Transport;
