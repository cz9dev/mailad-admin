// models/Relay.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execPromise = util.promisify(exec);

class Relay {
  static getMainCfPath() {
    return process.env.POSTFIX_MAIN_CF_PATH || "/etc/postfix/main.cf";
  }

  static getSaslPasswordPath() {
    return process.env.POSTFIX_SASL_PASSWORD_PATH || "/etc/postfix/sasl_passwd";
  }

  // Leer configuración actual del relay
  static async getConfig() {
    try {
      const mainCfPath = this.getMainCfPath();
      const data = await fs.readFile(mainCfPath, "utf8");

      // Extraer relayhost - buscar línea que comience con relayhost
      const relayHostMatch = data.match(/^relayhost\s*=\s*(.+)$/m);
      const relayHost = relayHostMatch ? relayHostMatch[1].trim() : "";

      // Leer credenciales SASL si existen
      let relayUsername = "";
      let relayPassword = "";

      try {
        const saslData = await fs.readFile(this.getSaslPasswordPath(), "utf8");
        // Buscar cualquier línea que tenga formato [host] usuario:password
        const saslLines = saslData
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"));
        if (saslLines.length > 0) {
          const saslMatch = saslLines[0].match(
            /^\s*\[([^\]]+)\]\s+(\S+):(\S+)/
          );
          if (saslMatch) {
            relayUsername = saslMatch[2];
            relayPassword = saslMatch[3];
          }
        }
      } catch (error) {
        // Archivo SASL no existe, es normal
        console.log("No se encontró archivo SASL:", error.message);
      }

      return {
        relayHost,
        relayUsername,
        relayPassword,
      };
    } catch (error) {
      console.error("Error reading relay config:", error);
      throw new Error(`Error al leer configuración de relay: ${error.message}`);
    }
  }

  // Actualizar configuración del relay
  static async updateConfig(config) {
    try {
      const { relayHost, relayUsername, relayPassword } = config;

      // Validar configuración
      this.validateConfig({ relayHost, relayUsername, relayPassword });

      // Actualizar main.cf
      await this.updateMainCf(relayHost);

      // Actualizar credenciales SASL si se proporcionan
      if (relayHost && relayUsername && relayPassword) {
        await this.updateSaslPassword(relayHost, relayUsername, relayPassword);
      } else {
        // Eliminar credenciales si no se proporcionan
        await this.removeSaslPassword();
      }

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        relayHost: relayHost || "",
        relayUsername: relayUsername || "",
        relayPassword: relayPassword ? "***" : "",
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error updating relay config:", error);
      throw new Error(
        `Error al actualizar configuración de relay: ${error.message}`
      );
    }
  }

  // Actualizar archivo main.cf - CORREGIDO
  static async updateMainCf(relayHost) {
    try {
      const mainCfPath = this.getMainCfPath();
      let data = await fs.readFile(mainCfPath, "utf8");

      // Buscar línea existente de relayhost
      const relayHostRegex = /^relayhost\s*=.*$/m;

      if (relayHost && relayHost.trim()) {
        const newRelayLine = `relayhost = ${relayHost.trim()}`;

        if (data.match(relayHostRegex)) {
          // Reemplazar línea existente
          data = data.replace(relayHostRegex, newRelayLine);
        } else {
          // Agregar nueva línea al final
          data += `\n${newRelayLine}\n`;
        }
      } else {
        // Eliminar relayhost si está vacío
        data = data.replace(relayHostRegex, "");
        // Limpiar líneas vacías adicionales
        data = data.replace(/\n{3,}/g, "\n\n");
      }

      // Escribir archivo
      await fs.writeFile(mainCfPath, data, "utf8");
      console.log("✓ main.cf actualizado correctamente");
    } catch (error) {
      console.error("Error updating main.cf:", error);
      throw new Error(`Error al actualizar main.cf: ${error.message}`);
    }
  }

  // Actualizar credenciales SASL - CORREGIDO
  static async updateSaslPassword(relayHost, username, password) {
    try {
      const saslPath = this.getSaslPasswordPath();

      // Extraer el host del relayhost (puede ser [host]:port o host:port)
      let host = relayHost;
      // Si está entre corchetes, extraer el contenido
      const bracketMatch = relayHost.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        host = bracketMatch[1];
      } else {
        // Si no tiene corchetes, tomar hasta el primer : (si hay puerto)
        host = relayHost.split(":")[0];
      }

      const content = `[${host}]\t${username}:${password}\n`;

      await fs.writeFile(saslPath, content, "utf8");

      // Establecer permisos seguros
      await execPromise(`chmod 600 ${saslPath}`);

      // Crear mapa de base de datos
      await execPromise(`postmap ${saslPath}`);

      console.log("✓ Credenciales SASL actualizadas correctamente");
    } catch (error) {
      console.error("Error updating SASL password:", error);
      throw new Error(
        `Error al actualizar credenciales SASL: ${error.message}`
      );
    }
  }

  // Eliminar credenciales SASL
  static async removeSaslPassword() {
    try {
      const saslPath = this.getSaslPasswordPath();
      await fs.unlink(saslPath).catch(() => {
        // Archivo no existe, no hay problema
        console.log("Archivo SASL no existe, no se requiere eliminación");
      });
      console.log("✓ Credenciales SASL eliminadas");
    } catch (error) {
      console.error("Error removing SASL password:", error);
      // No lanzar error, es opcional
    }
  }

  // Recargar configuración de Postfix
  static async reloadPostfix() {
    try {
      // Recargar postfix
      await execPromise("postfix reload");

      console.log("✓ Postfix relay configuration reloaded successfully");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error reloading postfix:", error);
      console.warn(
        "⚠ Configuración de relay guardada pero Postfix no pudo recargar."
      );

      return {
        success: false,
        error: error.message,
        manualCommand: "postfix reload",
      };
    }
  }

  // Validar configuración de relay - CORREGIDO (menos estricta)
  static validateConfig(config) {
    const { relayHost, relayUsername, relayPassword } = config;

    // Si se proporciona relayHost, debe tener formato válido
    if (relayHost && relayHost.trim()) {
      // Validar formato más flexible: [host]:port o host:port o host
      const relayRegex = /^(\[[^\]]+\]|[^:\s]+)(:\d+)?$/;
      if (!relayRegex.test(relayHost.trim())) {
        throw new Error(
          "Formato de relayhost inválido. Use: [host]:puerto o host:puerto o host"
        );
      }
    }

    // Si se proporciona username o password, verificar que ambos estén presentes
    // Pero permitir que se envíen vacíos para eliminar credenciales
    if (
      (relayUsername && !relayPassword) ||
      (!relayUsername && relayPassword)
    ) {
      throw new Error("Usuario y contraseña deben proporcionarse juntos");
    }

    return true;
  }

  // Probar conexión al relay - MEJORADO
  static async testConnection() {
    try {
      const config = await this.getConfig();

      if (!config.relayHost) {
        return {
          success: true,
          message:
            "✓ Relay no configurado - el servidor enviará correo directamente a internet",
        };
      }

      // Probar conexión básica con telnet o nc
      let host = config.relayHost;

      // Extraer host y puerto
      let port = "25"; // puerto por defecto
      const portMatch = host.match(/:(\d+)$/);
      if (portMatch) {
        port = portMatch[1];
        host = host.replace(/:\d+$/, "");
      }

      // Remover corchetes si existen
      host = host.replace(/[\[\]]/g, "");

      try {
        // Intentar conexión básica con timeout
        const { exec } = require("child_process");
        const testCommand = `timeout 5 bash -c "echo QUIT | nc -w 3 ${host} ${port}"`;

        await new Promise((resolve, reject) => {
          exec(testCommand, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(`No se pudo conectar a ${host}:${port}`));
            } else if (stdout.includes("220") || stdout.includes("ESMTP")) {
              resolve();
            } else {
              reject(new Error(`Respuesta inesperada del servidor: ${stdout}`));
            }
          });
        });

        return {
          success: true,
          message: `✓ Conexión exitosa a ${config.relayHost}`,
        };
      } catch (connectionError) {
        return {
          success: false,
          message: `✗ No se pudo conectar a ${config.relayHost}: ${connectionError.message}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `✗ Error probando relay: ${error.message}`,
      };
    }
  }
}

module.exports = Relay;
