// models/Alias.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const { ldap } = require("../config/ldapAsyncConfig");

const execPromise = util.promisify(exec);

class Alias {
  static getAliasesPath() {
    return (
      process.env.POSTFIX_ALIASES_PATH || "/etc/postfix/aliases/alias_virtuales"
    );
  }

  // Leer todos los aliases del archivo
  static async findAll() {
    try {
      const aliasesPath = this.getAliasesPath();
      const data = await fs.readFile(aliasesPath, "utf8");

      const aliases = [];
      const lines = data.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Saltar líneas vacías, comentarios y líneas especiales
        if (
          !trimmedLine ||
          trimmedLine.startsWith("#") ||
          trimmedLine.includes("postmap") ||
          trimmedLine.includes("postfix reload") ||
          trimmedLine.includes("DEFAULTS") ||
          trimmedLine.includes("TIENEN que apuntar")
        ) {
          continue;
        }

        // Procesar línea de alias
        const parts = trimmedLine.split(/\s+/).filter((part) => part.trim());
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const value = parts.slice(1).join(" ").trim();

          aliases.push({
            name,
            value,
          });
        }
      }

      return aliases;
    } catch (error) {
      console.error("Error reading aliases file:", error);
      throw new Error(`Error al leer los aliases: ${error.message}`);
    }
  }

  // Obtener usuarios existentes de Active Directory
  static async getExistingUsers() {
    try {
      const ldapBaseDN =
        process.env.LDAP_BASE_DN || "ou=users,dc=example,dc=com";
      const searchOptions = {
        scope: "sub",
        filter: "(&(objectClass=user)(mail=*))",
        attributes: ["mail", "sAMAccountName", "displayName"],
      };

      const users = await ldap.search(ldapBaseDN, searchOptions);

      return users.map((user) => ({
        email: user.get("mail"),
        username: user.get("sAMAccountName"),
        displayName: user.get("displayName"),
      }));
    } catch (error) {
      console.error("Error fetching users from AD:", error);
      return [];
    }
  }

  // Obtener aliases existentes
  static async getExistingAliases() {
    try {
      const aliases = await this.findAll();
      return aliases.map((alias) => alias.name);
    } catch (error) {
      console.error("Error fetching existing aliases:", error);
      return [];
    }
  }

  // Validar que el destino existe (usuario o alias)
  static async validateDestination(destination) {
    try {
      // Limpiar el destino (puede tener múltiples direcciones separadas por comas)
      const destinations = destination.split(",").map((dest) => dest.trim());

      const existingUsers = await this.getExistingUsers();
      const existingAliases = await this.getExistingAliases();

      const validDestinations = [];
      const invalidDestinations = [];

      for (const dest of destinations) {
        // Verificar si es un usuario existente
        const isUser = existingUsers.some((user) => user.email === dest);

        // Verificar si es un alias existente
        const isAlias = existingAliases.includes(dest);

        if (isUser || isAlias) {
          validDestinations.push(dest);
        } else {
          invalidDestinations.push(dest);
        }
      }

      return {
        isValid: invalidDestinations.length === 0,
        validDestinations,
        invalidDestinations,
        existingUsers: existingUsers.map((user) => user.email),
        existingAliases,
      };
    } catch (error) {
      console.error("Error validating destination:", error);
      throw new Error(`Error al validar el destino: ${error.message}`);
    }
  }

  // Crear nuevo alias
  static async create(aliasData) {
    try {
      const { name, value } = aliasData;

      if (!name || !value) {
        throw new Error("Nombre y valor del alias son obligatorios");
      }

      // Validar formato de email en el alias
      if (!name.includes("@")) {
        throw new Error("El alias debe ser una dirección de correo válida");
      }

      // Validar que el destino existe
      const validation = await this.validateDestination(value);
      if (!validation.isValid) {
        throw new Error(
          `Los siguientes destinos no existen: ${validation.invalidDestinations.join(
            ", "
          )}. Destinos válidos: usuarios (${validation.existingUsers.join(
            ", "
          )}) o aliases existentes.`
        );
      }

      const aliases = await this.findAll();

      // Verificar si el alias ya existe
      if (aliases.some((a) => a.name === name)) {
        throw new Error(`El alias ${name} ya existe`);
      }

      // Agregar el nuevo alias
      aliases.push({ name, value });

      // Guardar en el archivo
      await this.saveAliasesToFile(aliases);

      // Intentar recargar Postfix (pero no fallar si hay error)
      const reloadResult = await this.reloadPostfix();

      return {
        name,
        value,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error creating alias:", error);
      throw new Error(`Error al crear alias: ${error.message}`);
    }
  }

  // Actualizar alias existente
  static async update(name, newValue) {
    try {
      if (!newValue) {
        throw new Error("El valor del alias es obligatorio");
      }

      // Validar que el destino existe
      const validation = await this.validateDestination(newValue);
      if (!validation.isValid) {
        throw new Error(
          `Los siguientes destinos no existen: ${validation.invalidDestinations.join(
            ", "
          )}. Destinos válidos: usuarios (${validation.existingUsers.join(
            ", "
          )}) o aliases existentes.`
        );
      }

      const aliases = await this.findAll();
      const aliasIndex = aliases.findIndex((a) => a.name === name);

      if (aliasIndex === -1) {
        throw new Error(`Alias ${name} no encontrado`);
      }

      // Actualizar el valor
      aliases[aliasIndex].value = newValue;

      // Guardar en el archivo
      await this.saveAliasesToFile(aliases);

      // Intentar recargar Postfix (pero no fallar si hay error)
      const reloadResult = await this.reloadPostfix();

      return {
        name,
        value: newValue,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error updating alias:", error);
      throw new Error(`Error al actualizar alias: ${error.message}`);
    }
  }

  // Eliminar alias
  static async delete(name) {
    try {
      const aliases = await this.findAll();
      const filteredAliases = aliases.filter((a) => a.name !== name);

      if (filteredAliases.length === aliases.length) {
        throw new Error(`Alias ${name} no encontrado`);
      }

      // Guardar en el archivo
      await this.saveAliasesToFile(filteredAliases);

      // Intentar recargar Postfix (pero no fallar si hay error)
      const reloadResult = await this.reloadPostfix();

      return {
        success: true,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error deleting alias:", error);
      throw new Error(`Error al eliminar alias: ${error.message}`);
    }
  }

  // Guardar aliases en el archivo
  static async saveAliasesToFile(aliases) {
    try {
      const aliasesPath = this.getAliasesPath();

      let content = `# Listado de alias virtuales para el dominio\n`;
      content += `# \n`;
      content += `# hacer al terminar "postmap alias_virtuales && postfix reload"\n\n`;
      content += `# #####################################################\n`;
      content += `# DEFAULTS del dominio por RFC\n`;
      content += `# TIENEN que apuntar a una direccion valida\n`;
      content += `# incluso puede apuntar a otro alias\n`;
      content += `# #####################################################\n`;

      // Agregar cada alias
      aliases.forEach((alias) => {
        content += `${alias.name}\t\t\t\t\t${alias.value}\n`;
      });

      // Escribir el archivo
      await fs.writeFile(aliasesPath, content, "utf8");
    } catch (error) {
      console.error("Error saving aliases to file:", error);
      throw new Error(`Error al guardar aliases: ${error.message}`);
    }
  }

  // Recargar configuración de Postfix (maneja errores sin fallar)
  static async reloadPostfix() {
    try {
      const aliasesPath = this.getAliasesPath();
      const aliasesDir = path.dirname(aliasesPath);
      const fileName = path.basename(aliasesPath);

      // Ejecutar postmap en el directorio de aliases
      await execPromise(`cd ${aliasesDir} && postmap ${fileName}`);

      // Recargar postfix
      await execPromise("postfix reload");

      console.log("✓ Postfix configuration reloaded successfully");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error reloading postfix:", error);
      console.warn(
        "⚠ Alias fue guardado pero Postfix no pudo recargar. Ejecute manualmente:"
      );
      console.warn(
        `cd ${path.dirname(this.getAliasesPath())} && postmap ${path.basename(
          this.getAliasesPath()
        )} && postfix reload`
      );

      return {
        success: false,
        error: error.message,
        manualCommand: `cd ${path.dirname(
          this.getAliasesPath()
        )} && postmap ${path.basename(
          this.getAliasesPath()
        )} && postfix reload`,
      };
    }
  }

  // Buscar alias por nombre
  static async findByName(name) {
    try {
      const aliases = await this.findAll();
      return aliases.find((a) => a.name === name) || null;
    } catch (error) {
      console.error("Error finding alias by name:", error);
      return null;
    }
  }
}

module.exports = Alias;
