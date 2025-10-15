const { exec } = require("child_process");
const util = require("util");
const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");
const { authenticate } = require("ldap-authentication");

const execPromise = util.promisify(exec);

// Configuración LDAP/AD (usa variables de entorno)
const LDAP_CONFIG = {
  ldapOpts: {
    url: process.env.LDAP_URL || "ldap://your-domain-controller:389",
    // Para certificados auto-firmados, puedes necesitar:
    // tlsOptions: { rejectUnauthorized: false }
  },
  // --- Modo de autenticación con Admin (Recomendado) ---
  // Usa esta sección si tienes un usuario administrador para buscar en el directorio
  adminDn: process.env.LDAP_BIND_DN || "cn=admin,dc=domain,dc=com",
  adminPassword: process.env.LDAP_BIND_PASSWORD,
  userSearchBase: process.env.LDAP_BASE_DN || "dc=domain,dc=com",
  usernameAttribute: process.env.LDAP_USER_ATTRIBUTE || "sAMAccountName", // Para AD típico
  // --- Modo de autenticación directa (Alternativa) ---
  // Si no usas adminDn, necesitarás construir el userDn de otra forma
  // userDn: `cn=${username},ou=users,dc=domain,dc=com`,

  // Configuración adicional
  userPassword: "", // Se establece dinámicamente
  username: "", // Se establece dinámicamente
  //groupsSearchBase: process.env.LDAP_GROUP_SEARCH_BASE || "ou=groups,dc=domain,dc=com",
  groupsSearchBase: process.env.LDAP_BASE_DN || "ou=groups,dc=domain,dc=com",
  groupClass: "group",
  groupMemberAttribute: "member",
  groupMemberUserAttribute: "distinguishedName",
};

// Verificar credenciales de administrador
async function checkAdminCredentials(username, password) {  
  // 1. Validación básica
  if (!username || !password) {
    logger.warn("Intento de autenticación sin usuario o contraseña");
    return false;
  }

  // 2. Credenciales de respaldo (opcional, para desarrollo)
  if (process.env.NODE_ENV === "development") {
    if (username === "admin" && password === "admin123") {
      logger.info("Autenticación con credenciales de desarrollo");
      return true;
    }
  }

  try {
    // 3. Configuración para autenticación LDAP
    const authOptions = {
      ...LDAP_CONFIG,
      username: username,
      userPassword: password,
      // Atributos a recuperar del usuario
      attributes: [
        "cn",
        "mail",
        "sAMAccountName",
        "memberOf",
        "distinguishedName",
      ],
    };

    // 4. Intentar autenticar contra LDAP/AD
    const user = await authenticate(authOptions);

    if (user) {
      // 5. Verificar si pertenece al grupo de administradores
      const isAdmin = await checkAdminGroupMembership(user);
      logger.info(`Usuario ${username} autenticado. ¿Es admin?: ${isAdmin}`);
      return isAdmin;
    }

    return false;
  } catch (error) {
    logger.error(
      `Error en autenticación LDAP para ${username}:`,
      error.message
    );

    // 6. Fallback a mailad auth si está disponible
    if (process.env.MAILAD_PATH) {
      try {
        const { stdout } = await execPromise(
          `${process.env.MAILAD_PATH} auth ${username} ${password}`
        );
        return stdout.trim() === "OK";
      } catch (mailadError) {
        logger.error("Fallback mailad auth también falló:", mailadError);
      }
    }

    return false;
  }
}

// Función para verificar pertenencia a grupo de administradores
async function checkAdminGroupMembership(user) {
  const adminGroupDN = process.env.LDAP_ADMIN_GROUP || 'CN=MailAd-Admins,OU=Groups,DC=domain,DC=com';
  
  // Verificar si el usuario tiene el atributo memberOf y si incluye el grupo admin
  if (user.memberOf) {
    const groups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
    return groups.some(groupDN => 
      groupDN.toLowerCase() === adminGroupDN.toLowerCase()
    );
  }
  
  // Si no hay memberOf, podrías hacer una búsqueda adicional aquí
  return false;
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
