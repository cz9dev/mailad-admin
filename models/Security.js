// models/Antivirus.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execPromise = util.promisify(exec);

class Antivirus {
  static getFreshclamConfigPath() {
    const configPath = process.env.CLAMAV_CONFIG_PATH;
    if (configPath && !configPath.endsWith(".conf")) {
      return path.join(configPath, "freshclam.conf");
    }
    return configPath || "/etc/clamav/freshclam.conf";
  }

  static getClamdConfigPath() {
    const configPath = process.env.CLAMAV_CONFIG_PATH;
    if (configPath && !configPath.endsWith(".conf")) {
      return path.join(configPath, "clamd.conf");
    }
    return (
      configPath?.replace("freshclam.conf", "clamd.conf") ||
      "/etc/clamav/clamd.conf"
    );
  }

  // Verificar si ClamAV está habilitado en MailAD
  static async isEnabled() {
    try {
      const mailadConfigPath =
        process.env.MAILAD_PATH + "/mailad.conf" || "/etc/mailad/mailad.conf";
      const data = await fs.readFile(mailadConfigPath, "utf8");
      const enabled = data.includes("ENABLE_AV=yes");
      return enabled;
    } catch (error) {
      console.error("Error checking ClamAV status:", error);
      return false;
    }
  }

  // Leer configuración actual de freshclam
  static async getConfig() {
    try {
      const isEnabled = await this.isEnabled();

      if (!isEnabled) {
        return {
          enabled: false,
          message:
            "ClamAV no está habilitado en MailAD (ENABLE_AV=yes no está configurado)",
        };
      }

      let freshclamConfig = {};
      try {
        const freshclamData = await fs.readFile(
          this.getFreshclamConfigPath(),
          "utf8"
        );
        freshclamConfig = this.parseConfig(freshclamData);
      } catch (error) {
        console.error("Error reading freshclam.conf:", error);
        throw new Error("No se pudo leer la configuración de freshclam");
      }

      return {
        enabled: true,
        useAlternateMirror: freshclamConfig.DatabaseMirror !== undefined,
        alternateMirrors:
          freshclamConfig.DatabaseMirror || freshclamConfig.PrivateMirror || "",
        useProxy: freshclamConfig.HTTPProxyServer !== undefined,
        proxyServer: freshclamConfig.HTTPProxyServer || "",
        proxyPort: freshclamConfig.HTTPProxyPort || "",
        proxyUsername: freshclamConfig.HTTPProxyUsername || "",
        proxyPassword: freshclamConfig.HTTPProxyPassword || "",
        maxAttempts: freshclamConfig.MaxAttempts || "5",
        checks: freshclamConfig.Checks || "24",
      };
    } catch (error) {
      console.error("Error getting antivirus config:", error);
      throw error;
    }
  }

  // Parsear archivo de configuración
  static parseConfig(configData) {
    const config = {};
    const lines = configData.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const key = match[1];
        let value = match[2].replace(/^"|"$/g, "");
        config[key] = value;
      }
    }

    return config;
  }

  // Actualizar configuración de ClamAV
  static async updateConfig(configData) {
    try {
      const isEnabled = await this.isEnabled();
      if (!isEnabled) {
        throw new Error(
          "ClamAV no está habilitado en MailAD. Active ENABLE_AV=yes en mailad.conf"
        );
      }

      // Leer configuración existente
      let freshclamData = await fs.readFile(
        this.getFreshclamConfigPath(),
        "utf8"
      );

      // Preparar nuevas configuraciones
      const updates = {};

      // Configurar mirror alternativo
      if (configData.useAlternateMirror && configData.alternateMirrors) {
        updates.DatabaseMirror = configData.alternateMirrors;
        // Remover PrivateMirror si existe
        updates.PrivateMirror = null;
      } else {
        updates.DatabaseMirror = null;
        updates.PrivateMirror = null;
      }

      // Configurar proxy
      if (configData.useProxy && configData.proxyServer) {
        updates.HTTPProxyServer = configData.proxyServer;
        if (configData.proxyPort) {
          updates.HTTPProxyPort = configData.proxyPort;
        }
        if (configData.proxyUsername) {
          updates.HTTPProxyUsername = configData.proxyUsername;
        }
        if (configData.proxyPassword) {
          updates.HTTPProxyPassword = configData.proxyPassword;
        }
      } else {
        updates.HTTPProxyServer = null;
        updates.HTTPProxyPort = null;
        updates.HTTPProxyUsername = null;
        updates.HTTPProxyPassword = null;
      }

      // Otras configuraciones
      if (configData.maxAttempts) {
        updates.MaxAttempts = configData.maxAttempts;
      }
      if (configData.checks) {
        updates.Checks = configData.checks;
      }

      // Aplicar actualizaciones
      freshclamData = this.applyConfigUpdates(freshclamData, updates);

      // Guardar configuración
      await fs.writeFile(this.getFreshclamConfigPath(), freshclamData, "utf8");

      // Recargar servicio
      await this.reloadServices();

      return {
        success: true,
        message: "Configuración actualizada correctamente",
      };
    } catch (error) {
      console.error("Error updating antivirus config:", error);
      throw error;
    }
  }

  // Aplicar actualizaciones a la configuración
  static applyConfigUpdates(configData, updates) {
    let lines = configData.split("\n");
    const newLines = [];
    const updatedKeys = new Set();

    // Procesar líneas existentes
    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        newLines.push(line);
        continue;
      }

      const match = trimmed.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const key = match[1];

        if (updates.hasOwnProperty(key)) {
          if (updates[key] !== null) {
            // Actualizar valor existente
            newLines.push(`${key} ${updates[key]}`);
            updatedKeys.add(key);
          }
          // Si es null, eliminar la línea (no agregarla)
        } else {
          // Mantener línea sin cambios
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }

    // Agregar nuevas configuraciones que no existían
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== null && !updatedKeys.has(key)) {
        // Insertar después de los comentarios iniciales
        let insertIndex = 0;
        for (let i = 0; i < newLines.length; i++) {
          if (newLines[i].trim() && !newLines[i].trim().startsWith("#")) {
            insertIndex = i;
            break;
          }
        }
        newLines.splice(insertIndex, 0, `${key} ${value}`);
      }
    });

    return newLines.join("\n");
  }

  // Recargar servicios
  static async reloadServices() {
    try {
      // Recargar freshclam
      await execPromise("systemctl reload freshclam");

      // Forzar actualización de bases de datos
      await execPromise("freshclam --daemon-notify").catch((error) => {
        console.warn("Advertencia en actualización:", error.message);
      });

      return { success: true };
    } catch (error) {
      console.error("Error reloading services:", error);
      return {
        success: false,
        error: error.message,
        manualCommand: "systemctl reload freshclam && freshclam",
      };
    }
  }

  // Obtener estado del servicio
  static async getStatus() {
    try {
      const [clamdStatus, freshclamStatus, version] = await Promise.all([
        execPromise("systemctl is-active clamav-daemon").catch(() => ({
          stdout: "inactive",
        })),
        execPromise("systemctl is-active freshclam").catch(() => ({
          stdout: "inactive",
        })),
        execPromise("clamscan --version").catch(() => ({
          stdout: "No disponible",
        })),
      ]);

      return {
        clamd: clamdStatus.stdout.trim(),
        freshclam: freshclamStatus.stdout.trim(),
        version: version.stdout.trim().split("\n")[0] || "No disponible",
      };
    } catch (error) {
      return {
        clamd: "error",
        freshclam: "error",
        version: "error",
        error: error.message,
      };
    }
  }

  // Probar configuración
  static async testConfig() {
    try {
      const status = await this.getStatus();
      const config = await this.getConfig();

      const details = [];

      if (status.freshclam === "active") {
        details.push("✓ Servicio freshclam activo");
      } else {
        details.push("✗ Servicio freshclam inactivo");
      }

      if (config.enabled) {
        details.push("✓ ClamAV habilitado en MailAD");
      } else {
        details.push("✗ ClamAV no habilitado en MailAD");
      }

      if (config.useProxy) {
        if (config.proxyServer) {
          details.push("✓ Proxy configurado");
        } else {
          details.push("⚠ Proxy habilitado pero servidor no configurado");
        }
      }

      if (config.useAlternateMirror) {
        if (config.alternateMirrors) {
          details.push("✓ Mirror alternativo configurado");
        } else {
          details.push("⚠ Mirror alternativo habilitado pero no configurado");
        }
      }

      return {
        success: status.freshclam === "active" && config.enabled,
        message: config.enabled
          ? status.freshclam === "active"
            ? "Configuración OK"
            : "Servicio inactivo"
          : "ClamAV no habilitado",
        details,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`,
        details: [],
      };
    }
  }
}

module.exports = Antivirus;
