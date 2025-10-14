// models/Host.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execPromise = util.promisify(exec);

class Host {
  static getMainCfPath() {
    return process.env.POSTFIX_MAIN_CF_PATH || "/etc/postfix/main.cf";
  }

  static getHostnamePath() {
    return "/etc/hostname";
  }

  static getHostsPath() {
    return "/etc/hosts";
  }

  // Leer configuración actual
  static async getConfig() {
    try {
      const mainCfPath = this.getMainCfPath();
      const data = await fs.readFile(mainCfPath, "utf8");

      // Extraer configuraciones importantes
      const mydomainMatch = data.match(/^mydomain\s*=\s*(.+)$/m);
      const myhostnameMatch = data.match(/^myhostname\s*=\s*(.+)$/m);
      const virtualDomainsMatch = data.match(
        /^virtual_mailbox_domains\s*=\s*(.+)$/m
      );
      const mynetworksMatch = data.match(/^mynetworks\s*=\s*(.+)$/m);
      const messageSizeMatch = data.match(/^message_size_limit\s*=\s*(.+)$/m);

      // Leer archivos del sistema
      const hostname = await fs.readFile(this.getHostnamePath(), "utf8");
      const hosts = await fs.readFile(this.getHostsPath(), "utf8");

      return {
        hostname: hostname.trim(),
        hosts: hosts,
        mydomain: mydomainMatch ? mydomainMatch[1].trim() : "",
        myhostname: myhostnameMatch ? myhostnameMatch[1].trim() : "",
        virtualDomains: virtualDomainsMatch
          ? virtualDomainsMatch[1].trim()
          : "",
        mynetworks: mynetworksMatch ? mynetworksMatch[1].trim() : "",
        messageSizeLimit: messageSizeMatch
          ? messageSizeMatch[1].trim()
          : "5662310",
      };
    } catch (error) {
      console.error("Error reading host config:", error);
      throw new Error(`Error al leer configuración de host: ${error.message}`);
    }
  }

  // Actualizar configuración
  static async updateConfig(config) {
    try {
      const {
        hostname,
        mydomain,
        myhostname,
        hosts,
        virtualDomains,
        mynetworks,
        messageSizeLimit,
      } = config;

      // Validar configuración
      this.validateConfig(config);

      // Actualizar archivos del sistema
      await this.updateSystemFiles(hostname, hosts);

      // Actualizar main.cf
      await this.updateMainCf({
        mydomain,
        myhostname,
        virtualDomains,
        mynetworks,
        messageSizeLimit,
      });

      // Aplicar cambios al sistema
      const systemResult = await this.applySystemChanges(hostname);

      // Recargar Postfix
      const reloadResult = await this.reloadPostfix();

      return {
        hostname,
        mydomain,
        myhostname,
        virtualDomains,
        mynetworks,
        messageSizeLimit,
        systemApplied: systemResult.success,
        systemError: systemResult.error,
        postfixReloaded: reloadResult.success,
        postfixError: reloadResult.error,
      };
    } catch (error) {
      console.error("Error updating host config:", error);
      throw new Error(
        `Error al actualizar configuración de host: ${error.message}`
      );
    }
  }

  // Actualizar archivos del sistema
  static async updateSystemFiles(hostname, hosts) {
    try {
      // Actualizar /etc/hostname
      await fs.writeFile(this.getHostnamePath(), hostname + "\n", "utf8");

      // Actualizar /etc/hosts
      await fs.writeFile(this.getHostsPath(), hosts, "utf8");

      console.log("✓ Archivos del sistema actualizados");
    } catch (error) {
      console.error("Error updating system files:", error);
      throw new Error(
        `Error al actualizar archivos del sistema: ${error.message}`
      );
    }
  }

  // Actualizar main.cf
  static async updateMainCf(config) {
    try {
      const mainCfPath = this.getMainCfPath();
      let data = await fs.readFile(mainCfPath, "utf8");

      // Función auxiliar para actualizar o agregar configuración
      const updateConfigLine = (key, value) => {
        const regex = new RegExp(`^${key}\\s*=.*$`, "m");
        const newLine = `${key} = ${value}`;

        if (data.match(regex)) {
          data = data.replace(regex, newLine);
        } else {
          data += `\n${newLine}\n`;
        }
      };

      // Actualizar cada configuración
      updateConfigLine("mydomain", config.mydomain);
      updateConfigLine("myhostname", config.myhostname);

      if (config.virtualDomains) {
        updateConfigLine("virtual_mailbox_domains", config.virtualDomains);
      }

      if (config.mynetworks) {
        updateConfigLine("mynetworks", config.mynetworks);
      }

      if (config.messageSizeLimit) {
        updateConfigLine("message_size_limit", config.messageSizeLimit);
      }

      // Limpiar líneas vacías adicionales
      data = data.replace(/\n{3,}/g, "\n\n");

      // Escribir archivo
      await fs.writeFile(mainCfPath, data, "utf8");
      console.log("✓ main.cf actualizado correctamente");
    } catch (error) {
      console.error("Error updating main.cf:", error);
      throw new Error(`Error al actualizar main.cf: ${error.message}`);
    }
  }

  // Aplicar cambios al sistema
  static async applySystemChanges(hostname) {
    try {
      // Establecer nuevo hostname
      await execPromise(`hostnamectl set-hostname ${hostname}`);

      // Recargar servicios relacionados
      await execPromise("systemctl restart postfix").catch(() => {
        console.warn("No se pudo reiniciar postfix, continuando...");
      });

      console.log("✓ Cambios del sistema aplicados");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error applying system changes:", error);
      return {
        success: false,
        error: error.message,
        manualCommand: `hostnamectl set-hostname ${hostname} && systemctl restart postfix`,
      };
    }
  }

  // Recargar Postfix
  static async reloadPostfix() {
    try {
      await execPromise("postfix reload");
      console.log("✓ Postfix recargado correctamente");
      return { success: true, error: null };
    } catch (error) {
      console.error("Error reloading postfix:", error);
      return {
        success: false,
        error: error.message,
        manualCommand: "postfix reload",
      };
    }
  }

  // Validar configuración - CORREGIDO
  static validateConfig(config) {
    const {
      hostname,
      mydomain,
      myhostname,
      hosts,
      virtualDomains,
      mynetworks,
    } = config;

    if (!hostname || !mydomain || !myhostname || !hosts) {
      throw new Error("Todos los campos obligatorios deben completarse");
    }

    // Validar formato de hostname - más flexible
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(hostname)
    ) {
      throw new Error(
        "Nombre de host inválido. Use solo letras, números, puntos y guiones"
      );
    }

    // Validar formato de dominio - MUCHO más flexible
    // Acepta: dominio.com, sub.dominio.com, dominio.local, etc.
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(mydomain)) {
      throw new Error(
        "Formato de dominio inválido. Ejemplos válidos: dominio.com, sub.dominio.com"
      );
    }

    // Validar formato de myhostname (FQDN) - más flexible
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(myhostname)) {
      throw new Error(
        "Hostname de Postfix debe ser un FQDN válido. Ejemplo: servidor.dominio.com"
      );
    }

    // Validar redes - más flexible
    if (mynetworks && mynetworks.trim()) {
      const networks = mynetworks.split(/\s+/);
      for (const network of networks) {
        // Acepta: 127.0.0.0/8, 10.0.0.0/24, 192.168.1.0/24, etc.
        if (!/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})$/.test(network)) {
          throw new Error(
            `Formato de red inválido: ${network}. Use formato CIDR: 192.168.1.0/24`
          );
        }

        // Validar que la IP sea válida
        const [ip, mask] = network.split("/");
        const ipParts = ip.split(".");
        if (ipParts.length !== 4) {
          throw new Error(`IP inválida: ${ip}`);
        }

        for (const part of ipParts) {
          const num = parseInt(part);
          if (num < 0 || num > 255) {
            throw new Error(
              `IP inválida: ${ip}. Cada octeto debe estar entre 0-255`
            );
          }
        }

        // Validar máscara
        const maskNum = parseInt(mask);
        if (maskNum < 0 || maskNum > 32) {
          throw new Error(`Máscara inválida: ${mask}. Debe estar entre 0-32`);
        }
      }
    }

    return true;
  }

  // Probar configuración
  static async testConfig() {
    try {
      const config = await this.getConfig();

      // Verificar que el hostname del sistema coincide
      const currentHostname = await execPromise("hostname");
      const matches = currentHostname.stdout.trim() === config.hostname;

      // Verificar que Postfix está ejecutándose
      const postfixStatus = await execPromise("systemctl is-active postfix");

      return {
        success: true,
        message: `✓ Configuración verificada: ${config.myhostname}`,
        details: {
          hostnameMatch: matches,
          postfixActive: postfixStatus.stdout.trim() === "active",
          domain: config.mydomain,
          virtualDomains: config.virtualDomains,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `✗ Error verificando configuración: ${error.message}`,
      };
    }
  }
}

module.exports = Host;
