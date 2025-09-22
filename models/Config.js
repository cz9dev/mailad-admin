const fs = require("fs").promises;
const path = require("path");
const ini = require("ini");

class Config {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, "utf8");

      if (this.filePath.endsWith(".conf")) {
        return ini.parse(data);
      }

      return data;
    } catch (error) {
      throw new Error(`Error leyendo configuración: ${error.message}`);
    }
  }

  async write(data) {
    try {
      let content;

      if (this.filePath.endsWith(".conf")) {
        content = ini.stringify(data);
      } else {
        content = data;
      }

      await fs.writeFile(this.filePath, content);
      return true;
    } catch (error) {
      throw new Error(`Error escribiendo configuración: ${error.message}`);
    }
  }

  async update(updates) {
    const currentConfig = await this.read();

    if (typeof currentConfig === "object") {
      const newConfig = { ...currentConfig, ...updates };
      await this.write(newConfig);
      return newConfig;
    } else {
      // Para archivos que no son INI, simplemente reemplazar el contenido
      await this.write(updates);
      return updates;
    }
  }
}

// Configuraciones específicas
const ldapConfig = new Config(process.env.LDAP_CONFIG_PATH);
const antivirusConfig = new Config(process.env.ANTIVIRUS_CONFIG_PATH);
const sslConfig = new Config(process.env.SSL_CONFIG_PATH);

module.exports = {
  Config,
  ldapConfig,
  antivirusConfig,
  sslConfig,
};
