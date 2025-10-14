// models/LdapConfig.js
const { ldap } = require("../config/ldapAsyncConfig");

class LdapConfig {
  // Obtener configuración desde variables de entorno
  static getConfig() {
    return {
      url: process.env.LDAP_URL || "",
      baseDN: process.env.LDAP_BASE_DN || "",
      bindDN: process.env.LDAP_BIND_DN || "",
      // No exponer la contraseña completa por seguridad
      bindPassword: process.env.LDAP_BIND_PASSWORD ? "••••••••" : "",
      hasPassword: !!process.env.LDAP_BIND_PASSWORD,
    };
  }

  // Probar conexión LDAP
  static async testConnection() {
    try {
      console.log("Probando conexión LDAP...");

      // Verificar que todas las variables estén configuradas
      const config = this.getConfig();
      const missingVars = [];

      if (!config.url) missingVars.push("LDAP_URL");
      if (!config.baseDN) missingVars.push("LDAP_BASE_DN");
      if (!config.bindDN) missingVars.push("LDAP_BIND_DN");
      if (!process.env.LDAP_BIND_PASSWORD)
        missingVars.push("LDAP_BIND_PASSWORD");

      if (missingVars.length > 0) {
        throw new Error(
          `Variables de entorno faltantes: ${missingVars.join(", ")}`
        );
      }

      // Intentar una búsqueda simple para verificar la conexión
      const searchOptions = {
        scope: "base",
        filter: "(objectClass=*)",
        attributes: ["namingContexts"],
      };

      const result = await ldap.search(config.baseDN, searchOptions);

      return {
        success: true,
        message: "✓ Conexión LDAP/AD exitosa",
        details: {
          entriesFound: result.length,
          baseDN: config.baseDN,
          server: config.url,
        },
      };
    } catch (error) {
      console.error("Error en conexión LDAP:", error);

      let userMessage = "Error de conexión LDAP/AD";

      if (error.name === "InvalidCredentialsError") {
        userMessage = "Credenciales LDAP inválidas";
      } else if (error.code === "ECONNREFUSED") {
        userMessage = "No se puede conectar al servidor LDAP";
      } else if (error.message.includes("variables de entorno faltantes")) {
        userMessage = error.message;
      }

      return {
        success: false,
        message: `✗ ${userMessage}`,
        details: error.message,
      };
    }
  }

  // Obtener información básica del dominio (opcional)
  static async getDomainInfo() {
    try {
      const config = this.getConfig();

      const searchOptions = {
        scope: "base",
        filter: "(objectClass=*)",
        attributes: [
          "defaultNamingContext",
          "dnsHostName",
          "domainFunctionality",
        ],
      };

      const result = await ldap.search("", searchOptions);

      if (result.length > 0) {
        const entry = result[0];
        return {
          domain: entry.get("defaultNamingContext") || "No disponible",
          server: entry.get("dnsHostName") || "No disponible",
          functionality: entry.get("domainFunctionality") || "No disponible",
        };
      }

      return {
        domain: "No disponible",
        server: "No disponible",
        functionality: "No disponible",
      };
    } catch (error) {
      console.error("Error obteniendo información del dominio:", error);
      return {
        domain: "Error al obtener",
        server: "Error al obtener",
        functionality: "Error al obtener",
      };
    }
  }
}

module.exports = LdapConfig;
