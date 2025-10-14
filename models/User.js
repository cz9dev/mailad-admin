//models/User.js

const { ldap } = require("../config/ldapAsyncConfig");
const ldapConfig = require("../config/ldap");
const LdapAuth = require("ldapauth-fork");
const ldapClient = require("../config/ldap");
const iconv = require("iconv-lite");
const ldapBaseDN = process.env.LDAP_BASE_DN || "ou=users,dc=example,dc=com";

function encodePassword(password) {
  let convertedPassword = "";
  let passwordString = '"' + password + '"';
  for (let i = 0; i < passwordString.length; i++) {
    convertedPassword += String.fromCharCode(
      passwordString.charCodeAt(i) & 0xff,
      (passwordString.charCodeAt(i) >>> 8) & 0xff
    );
  }
  return convertedPassword;
}

class User {
  // Verifica si un usuario está activo según userAccountControl
  static isUserActive(userAccountControl) {
    // Valor 2 en userAccountControl indica que la cuenta está deshabilitada
    return !(userAccountControl & 2);
  }

  static async findAll() {
    try {
      const searchBase = ldapBaseDN;
      const searchOptions = {
        scope: "sub",
        filter: "(&(objectClass=user)(mail=*))",
        attributes: [
          "sAMAccountName",
          "distinguishedName",
          "cn",
          "mail",
          "displayName",
          "userAccountControl",
        ],
      };

      // ldap-async search returns a promise and handles the event loop internally
      const users = await ldap.search(searchBase, searchOptions);

      // Process the results to match your desired format
      return users.map((userObj) => {
        const userData = {
          username: userObj.get("sAMAccountName") || "", // ← ESTA ES LA CLAVE
          cn: userObj.get("cn") || "",
          mail: userObj.get("mail") || "",
          displayName: userObj.get("displayName") || "",
          userAccountControl: parseInt(userObj.get("userAccountControl")) || 0,
          isActive: this.isUserActive(
            parseInt(userObj.get("userAccountControl"))
          ),
        };
        return userData;
      });
    } catch (error) {
      throw new Error(`Error listing users: ${error.message}`);
    }
  }

  static async findById(username) {
    try {
      const searchBase = ldapBaseDN;
      const searchFilter = `(&(objectClass=user)(sAMAccountName=${username}))`;

      const searchOptions = {
        scope: "sub",
        filter: searchFilter,
        attributes: [
          "sAMAccountName",
          "mail",
          "displayName",
          "userAccountControl",
          "distinguishedName",
        ],
      };

      console.log(`Buscando usuario: ${username}`);
      console.log("Filtro:", searchFilter);

      const users = await ldap.search(searchBase, searchOptions);

      if (users.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      // Assuming username is unique, take the first result
      const userObj = users[0];
      return {
        username: userObj.get("sAMAccountName") || "",
        email: userObj.get("mail") || "",
        displayName: userObj.get("displayName") || "",
        distinguishedName: userObj.get("distinguishedName") || "",
        isActive: this.isUserActive(
          parseInt(userObj.get("userAccountControl"))
        ),
      };
    } catch (error) {
      console.error("Error en findById:", error);
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  static async create(userData) {
    try {
      const { username, password, email, displayName } = userData;

      console.log("Creando nuevo usuario:", {
        username,
        email,
        displayName,
        password: password ? "***" : "no",
      });

      // Validaciones básicas
      if (!username || !password || !email || !displayName) {
        throw new Error(
          "Todos los campos son obligatorios: username, password, email, displayName"
        );
      }

      if (password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres");
      }

      // El DN para el nuevo usuario
      const userDN = `cn=${username},${ldapBaseDN}`;
      console.log(`DN del nuevo usuario: ${userDN}`);

      // Preparar atributos del usuario - Asegurar que los valores son strings
      const userAttributes = {
        cn: String(username), // <- Convertir a string explícitamente
        sAMAccountName: String(username), // <- Convertir a string explícitamente
        userPrincipalName: String(
          `${username}@${process.env.LDAP_DOMAIN || "example.com"}`
        ),
        mail: String(email),
        displayName: String(displayName),
        objectClass: ["top", "person", "organizationalPerson", "user"],
        userAccountControl: String(512),
      };

      // Codificar la contraseña para Active Directory
      if (password) {
        //const passwordString = `"${password}"`;
        const passwordString = '"' + password + '"';
        console.log(passwordString);
        const passwordBuffer = Buffer.from(passwordString, "utf16le");
        console.log(passwordBuffer);
        //const passwordBuffer = encodePassword(password);
        userAttributes.unicodePwd = passwordBuffer;
      }

      console.log("Atributos del usuario a crear:", {
        ...userAttributes,
        unicodePwd: userAttributes.unicodePwd ? "***" : "no",
      });

      // Crear el usuario usando ldap-async
      await ldap.add(userDN, userAttributes);

      console.log("✓ Usuario creado exitosamente");

      return {
        username,
        email,
        displayName,
        dn: userDN,
        message: "Usuario creado correctamente",
      };
    } catch (error) {
      console.error("Error en create:", error);

      // Mensajes de error específicos
      if (
        error.message.includes("already exists") ||
        error.message.includes("ENTRY_EXISTS")
      ) {
        throw new Error(
          `El usuario '${userData.username}' ya existe en el directorio`
        );
      } else if (
        error.message.includes("constraint") ||
        error.message.includes("unicodePwd")
      ) {
        throw new Error(
          "Error con la contraseña: no cumple los requisitos de complejidad de Active Directory"
        );
      } else if (
        error.message.includes("invalid credentials") ||
        error.message.includes("insufficient access")
      ) {
        throw new Error(
          "Permisos insuficientes para crear usuarios en el directorio"
        );
      } else if (error.message.includes("no such object")) {
        throw new Error(`La unidad organizativa no existe: ${ldapBaseDN}`);
      } else {
        throw new Error(`Error creando usuario: ${error.message}`);
      }
    }
  }

  static async update(username, updates) {
    try {
      console.log(`Iniciando actualización para usuario: ${username}`);
      console.log("Datos a actualizar:", {
        ...updates,
        password: updates.password ? "***" : "no",
      });

      // 1. Buscar el usuario para obtener su DN
      const user = await this.findById(username);
      if (!user || !user.distinguishedName) {
        throw new Error("Usuario no encontrado o no se pudo obtener el DN");
      }

      const userDN = user.distinguishedName;
      console.log(`DN del usuario: ${userDN}`);

      const { password, ...otherUpdates } = updates;

      // 2. Actualizar atributos básicos usando setAttributes
      if (Object.keys(otherUpdates).length > 0) {
        const attributesToUpdate = {};

        if (otherUpdates.email && otherUpdates.email.trim() !== "") {
          attributesToUpdate.mail = otherUpdates.email.trim();
        }

        if (
          otherUpdates.displayName &&
          otherUpdates.displayName.trim() !== ""
        ) {
          attributesToUpdate.displayName = otherUpdates.displayName.trim();
        }

        // ⚠️ Cambiar sAMAccountName requiere precaución
        if (
          otherUpdates.username &&
          otherUpdates.username.trim() !== "" &&
          otherUpdates.username !== username
        ) {
          console.warn(
            "⚠️  Cambio de username requiere consideraciones especiales"
          );
          attributesToUpdate.sAMAccountName = otherUpdates.username.trim();
          //attributesToUpdate.cn = otherUpdates.username.trim();
        }

        if (Object.keys(attributesToUpdate).length > 0) {
          console.log("Actualizando atributos:", attributesToUpdate);
          await ldap.setAttributes(userDN, attributesToUpdate);
        }
      }

      // 3. Manejar cambio de contraseña por separado
      if (password && password.trim() !== "") {
        console.log("Procesando cambio de contraseña...");

        const passwordString = `"${password}"`;
        const passwordBuffer = Buffer.from(passwordString, "utf16le");
        await ldap.setAttribute(userDN, "unicodePwd", passwordBuffer);
        console.log("✓ Contraseña actualizada");
      }

      return {
        username: otherUpdates.username || username,
        ...otherUpdates,
        message:
          "Usuario actualizado correctamente" +
          (password ? " (contraseña cambiada)" : ""),
      };
    } catch (error) {
      console.error("Error en update:", error);

      // Mensajes de error específicos
      if (
        error.message.includes("unicodePwd") ||
        error.message.includes("constraint")
      ) {
        throw new Error(
          "Error con la contraseña: no cumple los requisitos de complejidad de Active Directory."
        );
      } else if (error.message.includes("no such object")) {
        throw new Error("Usuario no encontrado en el directorio LDAP.");
      } else if (error.message.includes("already exists")) {
        throw new Error("El nombre de usuario ya existe.");
      } else {
        throw new Error(`Error actualizando usuario: ${error.message}`);
      }
    }
  }

  static async delete(username) {
    try {
      // 1. Buscar el usuario para obtener su DN
      const user = await this.findById(username);
      if (!user || !user.distinguishedName) {
        throw new Error("Usuario no encontrado o no se pudo obtener el DN");
      }

      const userDN = user.distinguishedName;

      await ldap.remove(userDN);

      return {
        message: "Usuario eliminado correctamante",
      };
    } catch (error) {
      console.error("Error en delete:", error);

      // Mensajes de error específicos
      if (error.message.includes("no such object")) {
        throw new Error("Usuario no encontrado en el directorio LDAP.");
      } else {
        throw new Error(`Error eliminando el usuario: ${error.message}`);
      }
    }
  }

  static async count() {
    try {
      const users = await this.findAll();
      return users.length; // Retorna el número total de usuarios
    } catch (error) {
      console.error("Error contando usuarios:", error);
      throw new Error(`Error al contar usuarios: ${error.message}`);
    }
  }
}

module.exports = User;
