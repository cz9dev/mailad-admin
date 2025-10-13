// models/Blacklist.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const Log = require("./Log");

const execPromise = util.promisify(exec);

class Blacklist {
  static getBlacklistPath() {
    return (
      process.env.POSTFIX_BLACKLIST_PATH || "/etc/postfix/rules/lista_negra"
    );
  }

  // Leer todas las entradas de la lista negra
  static async findAll() {
    try {
      const blacklistPath = this.getBlacklistPath();
      const data = await fs.readFile(blacklistPath, "utf8");

      const entries = [];
      const lines = data.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Saltar líneas vacías, comentarios y líneas especiales
        if (
          !trimmedLine ||
          trimmedLine.startsWith("#") ||
          trimmedLine.includes("postmap") ||
          trimmedLine.includes("hash table") ||
          trimmedLine.includes("Ban list")
        ) {
          continue;
        }

        // Procesar línea de lista negra (formato: email ACTION CODE message)
        const parts = trimmedLine.split(/\s+/).filter((part) => part.trim());
        if (parts.length >= 4) {
          const email = parts[0].trim();
          const action = parts[1].trim();
          const code = parts[2].trim();
          const message = parts.slice(3).join(" ").trim();

          entries.push({
            email,
            action,
            code,
            message,
          });
        }
      }

      return entries;
    } catch (error) {
      console.error("Error reading blacklist file:", error);
      throw new Error(`Error al leer la lista negra: ${error.message}`);
    }
  }

  // Crear nueva entrada en lista negra
  static async create(entryData) {
    try {
      const { email, action = "REJECT", code = "511", message } = entryData;

      if (!email) {
        throw new Error("El email o dominio es obligatorio");
      }

      if (!message) {
        throw new Error("El mensaje de rechazo es obligatorio");
      }

      // Validar formato básico
      if (!this.isValidEmailOrDomain(email)) {
        throw new Error("El formato del email o dominio no es válido");
      }

      // Validar acción
      if (!["REJECT", "DROP"].includes(action)) {
        throw new Error("La acción debe ser REJECT o DROP");
      }

      // Validar código (debe ser numérico)
      if (!/^\d+$/.test(code)) {
        throw new Error("El código debe ser numérico");
      }

      const entries = await this.findAll();

      // Verificar si la entrada ya existe
      if (entries.some((entry) => entry.email === email)) {
        throw new Error(`La entrada ${email} ya existe en la lista negra`);
      }

      // Agregar la nueva entrada
      entries.push({ email, action, code, message });

      // Guardar en el archivo
      await this.saveEntriesToFile(entries);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        email,
        action,
        code,
        message,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error creating blacklist entry:", error);
      throw new Error(
        `Error al crear entrada en lista negra: ${error.message}`
      );
    }
  }

  // Eliminar entrada de lista negra
  static async delete(email) {
    try {
      const entries = await this.findAll();
      const filteredEntries = entries.filter((entry) => entry.email !== email);

      if (filteredEntries.length === entries.length) {
        throw new Error(`Entrada ${email} no encontrada en la lista negra`);
      }

      // Guardar en el archivo
      await this.saveEntriesToFile(filteredEntries);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        success: true,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error deleting blacklist entry:", error);
      throw new Error(
        `Error al eliminar entrada de lista negra: ${error.message}`
      );
    }
  }

  // Guardar entradas en el archivo
  static async saveEntriesToFile(entries) {
    try {
      const blacklistPath = this.getBlacklistPath();

      let content = `# Ban list\n`;
      content += `#\n`;
      content += `# This is a hash table, you need to make a 'postmap [file]' after saving\n`;
      content += `#\n`;
      content += `# It's a good practice to put comments with the reason and not just c&p\n`;
      content += `# them, make it unique, in that way you will be able to identify which\n`;
      content += `# rule was triggered\n\n`;
      content += `# EXAMPLES\n`;
      content += `# horoscopofree@ofree.com     REJECT 511 horosco is not allowed here\n`;
      content += `# jodedor@ejemplo.cu\t\t\t\tDROP 511 jodedor not permitted\n`;
      content += `# @example.com\t\t\t\t\tREJECT 511 Domain not allowed (example.com)\n\n`;

      // Agregar cada entrada
      entries.forEach((entry) => {
        // Formatear con tabs para alineación similar al ejemplo
        const emailPart = entry.email.padEnd(40, " ");
        const actionPart = entry.action.padEnd(8, " ");
        const codePart = entry.code.padEnd(4, " ");

        content += `${emailPart}${actionPart}${codePart}${entry.message}\n`;
      });

      // Escribir el archivo
      await fs.writeFile(blacklistPath, content, "utf8");
    } catch (error) {
      console.error("Error saving blacklist to file:", error);
      throw new Error(`Error al guardar lista negra: ${error.message}`);
    }
  }

  // Recargar configuración de Postfix
  static async reloadPostfix() {
    try {
      const blacklistPath = this.getBlacklistPath();
      const blacklistDir = path.dirname(blacklistPath);
      const fileName = path.basename(blacklistPath);

      // Ejecutar postmap en el archivo de lista negra
      await execPromise(`cd ${blacklistDir} && postmap ${fileName}`);

      // Recargar postfix
      await execPromise("postfix reload");

      console.log("✓ Postfix blacklist reloaded successfully");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error reloading postfix:", error);
      console.warn(
        "⚠ Lista negra fue guardada pero Postfix no pudo recargar. Ejecute manualmente:"
      );
      console.warn(
        `cd ${path.dirname(this.getBlacklistPath())} && postmap ${path.basename(
          this.getBlacklistPath()
        )} && postfix reload`
      );

      return {
        success: false,
        error: error.message,
        manualCommand: `cd ${path.dirname(
          this.getBlacklistPath()
        )} && postmap ${path.basename(
          this.getBlacklistPath()
        )} && postfix reload`,
      };
    }
  }

  // Validar formato de email o dominio
  static isValidEmailOrDomain(input) {
    // Validar email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validar dominio simple
    const domainRegex = /^@[^\s@]+\.[^\s@]+$/;

    // Validar wildcard domain
    const wildcardRegex = /^@\*\.([^\s@]+\.[^\s@]+)$/;

    return (
      emailRegex.test(input) ||
      domainRegex.test(input) ||
      wildcardRegex.test(input)
    );
  }

  // Buscar entrada por email
  static async findByEmail(email) {
    try {
      const entries = await this.findAll();
      return entries.find((entry) => entry.email === email) || null;
    } catch (error) {
      console.error("Error finding blacklist entry by email:", error);
      return null;
    }
  }
}

module.exports = Blacklist;
