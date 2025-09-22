const { runMailAdCommand } = require("./helpers");
const logger = require("./logger");

class MailAdManager {
  // Gestión de usuarios
  async listUsers() {
    try {
      const output = await runMailAdCommand("user", ["list"]);
      // Parsear la salida del comando mailad user list
      // Esto puede variar según la implementación específica de mailad
      return this.parseUserList(output);
    } catch (error) {
      logger.error("Error listando usuarios:", error);
      throw error;
    }
  }

  async createUser(username, password, email, displayName) {
    try {
      await runMailAdCommand("user", [
        "create",
        username,
        password,
        email,
        displayName,
      ]);
      logger.info(`Usuario ${username} creado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error creando usuario:", error);
      throw error;
    }
  }

  async updateUser(username, updates) {
    try {
      const args = ["update", username];

      if (updates.password) args.push("--password", updates.password);
      if (updates.email) args.push("--email", updates.email);
      if (updates.displayName) args.push("--display-name", updates.displayName);

      await runMailAdCommand("user", args);
      logger.info(`Usuario ${username} actualizado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error actualizando usuario:", error);
      throw error;
    }
  }

  async deleteUser(username) {
    try {
      await runMailAdCommand("user", ["delete", username]);
      logger.info(`Usuario ${username} eliminado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error eliminando usuario:", error);
      throw error;
    }
  }

  // Gestión de grupos/listas
  async listGroups() {
    try {
      const output = await runMailAdCommand("group", ["list"]);
      return this.parseGroupList(output);
    } catch (error) {
      logger.error("Error listando grupos:", error);
      throw error;
    }
  }

  async createGroup(name, options = {}) {
    try {
      const args = ["create", name];

      if (options.mailingList) args.push("--mailing-list");
      if (options.members) args.push("--members", options.members.join(","));

      await runMailAdCommand("group", args);
      logger.info(`Grupo ${name} creado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error creando grupo:", error);
      throw error;
    }
  }

  async updateGroup(name, options = {}) {
    try {
      const args = ["update", name];

      if (options.addMembers)
        args.push("--add-members", options.addMembers.join(","));
      if (options.removeMembers)
        args.push("--remove-members", options.removeMembers.join(","));

      await runMailAdCommand("group", args);
      logger.info(`Grupo ${name} actualizado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error actualizando grupo:", error);
      throw error;
    }
  }

  async deleteGroup(name) {
    try {
      await runMailAdCommand("group", ["delete", name]);
      logger.info(`Grupo ${name} eliminado exitosamente`);
      return true;
    } catch (error) {
      logger.error("Error eliminando grupo:", error);
      throw error;
    }
  }

  // Métodos auxiliares para parsear salida
  parseUserList(output) {
    // Implementar parsing según el formato de salida de mailad
    // Esto es un ejemplo básico
    const lines = output.split("\n");
    const users = [];

    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          users.push({
            username: parts[0],
            email: parts[1],
            displayName: parts.slice(2).join(" "),
          });
        }
      }
    }

    return users;
  }

  parseGroupList(output) {
    // Implementar parsing según el formato de salida de mailad
    const lines = output.split("\n");
    const groups = [];

    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          groups.push({
            name: parts[0].trim(),
            members: parts[1].split(",").map((m) => m.trim()),
          });
        }
      }
    }

    return groups;
  }
}

module.exports = new MailAdManager();
