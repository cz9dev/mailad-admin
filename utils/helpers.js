const { exec } = require("child_process");
const util = require("util");
const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");

const execPromise = util.promisify(exec);

// Verificar credenciales de administrador
async function checkAdminCredentials(username, password) {
  try {
    // En un entorno real, esto verificaría contra LDAP/AD o una base de datos
    // Por ahora, usamos una verificación simple para demostración
    if (username === "admin" && password === "admin123") {
      return true;
    }

    // Si hay un comando mailad auth, lo usamos
    if (process.env.MAILAD_PATH) {
      const { stdout } = await execPromise(
        `${process.env.MAILAD_PATH} auth ${username} ${password}`
      );
      return stdout.trim() === "OK";
    }

    return false;
  } catch (error) {
    logger.error("Error verificando credenciales:", error);
    return false;
  }
}

// Ejecutar comando mailad
async function runMailAdCommand(command, args = []) {
  try {
    if (!process.env.MAILAD_PATH) {
      throw new Error("MAILAD_PATH no configurado");
    }

    const fullCommand = `${process.env.MAILAD_PATH} ${command} ${args.join(
      " "
    )}`;
    const { stdout, stderr } = await execPromise(fullCommand);

    if (stderr) {
      logger.warn(`Comando mailad ${command} generó stderr:`, stderr);
    }

    return stdout;
  } catch (error) {
    logger.error(`Error ejecutando comando mailad ${command}:`, error);
    throw error;
  }
}

// Leer archivo de configuración
async function readConfigFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return data;
  } catch (error) {
    logger.error(`Error leyendo archivo de configuración ${filePath}:`, error);
    throw error;
  }
}

// Escribir archivo de configuración
async function writeConfigFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content);
    logger.info(`Archivo ${filePath} actualizado exitosamente`);
    return true;
  } catch (error) {
    logger.error(
      `Error escribiendo archivo de configuración ${filePath}:`,
      error
    );
    throw error;
  }
}

// Validar dirección de correo
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Generar contraseña aleatoria
function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

module.exports = {
  checkAdminCredentials,
  runMailAdCommand,
  readConfigFile,
  writeConfigFile,
  validateEmail,
  generatePassword,
};
