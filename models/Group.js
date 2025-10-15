// models/Group.js
const { ldap } = require("../config/ldapAsyncConfig");
const ldapBaseDN = process.env.LDAP_BASE_DN || "ou=users,dc=example,dc=com";

class Group {
  // Método para buscar todo
  static async findAll() {
    try {
      const searchBase = ldapBaseDN;
      const searchOptions = {
        scope: "sub",
        filter: "(&(objectClass=group)(mail=*))",
        attributes: [
          "sAMAccountName",
          "distinguishedName",
          "cn",
          "mail",
          "displayName",
        ],
      };

      const lists = await ldap.search(searchBase, searchOptions);

      // Procesar en paralelo para mejor rendimiento
      const results = await Promise.all(
        lists.map(async (groupObj) => {
          const groupDN = groupObj.get("distinguishedName");

          try {
            const members = await ldap.getMembers(groupDN);

            const memberInfo = members.map((member) => ({
              dn: member.get("distinguishedName"),
              name:
                member.get("cn") ||
                member.get("displayName") ||
                member.get("sAMAccountName") ||
                "Sin nombre",
              email: member.get("mail") || "Sin email",
              username: member.get("sAMAccountName"),
            }));

            return {
              name: groupObj.get("sAMAccountName") || "",
              cn: groupObj.get("cn") || "",
              mail: groupObj.get("mail") || "",
              displayName: groupObj.get("displayName") || "",
              distinguishedName: groupDN,
              members: memberInfo,
              memberCount: members.length,
            };
          } catch (memberError) {
            console.error(
              `Error obteniendo miembros para ${groupObj.get(
                "sAMAccountName"
              )}:`,
              memberError.message
            );

            return {
              name: groupObj.get("sAMAccountName") || "",
              cn: groupObj.get("cn") || "",
              mail: groupObj.get("mail") || "",
              displayName: groupObj.get("displayName") || "",
              distinguishedName: groupDN,
              members: [],
              memberCount: 0,
            };
          }
        })
      );

      return results;
    } catch (error) {
      throw new Error(`Error listing groups: ${error.message}`);
    }
  }

  // Método para buscar por nombre
  static async findByName(groupname) {
    try {
      const searchBase = ldapBaseDN;
      const searchFilter = `(&(objectClass=group)(sAMAccountName=${groupname}))`;

      const searchOptions = {
        scope: "sub",
        filter: searchFilter,
        attributes: [
          "sAMAccountName",
          "distinguishedName",
          "cn",
          "mail",
          "displayName",
        ],
      };

      const groups = await ldap.search(searchBase, searchOptions);

      if (groups.length === 0) {
        throw new Error("Grupo no encontrado");
      }

      const groupObj = groups[0];
      const groupDN = groupObj.get("distinguishedName");

      // Obtener miembros usando getMembers()
      const members = await ldap.getMembers(groupDN);
      const memberInfo = members.map((member) => ({
        dn: member.get("distinguishedName"),
        name:
          member.get("cn") ||
          member.get("displayName") ||
          member.get("sAMAccountName") ||
          "Sin nombre",
        email: member.get("mail") || "Sin email",
        username: member.get("sAMAccountName"),
      }));

      return {
        name: groupObj.get("sAMAccountName") || "",
        cn: groupObj.get("cn") || "",
        mail: groupObj.get("mail") || "",
        displayName: groupObj.get("displayName") || "",
        distinguishedName: groupDN,
        members: memberInfo,
        memberCount: members.length,
      };
    } catch (error) {
      console.error("Error en findByName:", error);
      throw new Error(`Error finding group: ${error.message}`);
    }
  }

  // Método para crear grupo
  static async create(groupData) {
    try {
      const { name, email, displayName } = groupData;

      console.log("Creando nuevo grupo:", { name, email, displayName });

      if (!name || !email) {
        throw new Error("Nombre y email son obligatorios");
      }

      const groupDN = `cn=${name},${ldapBaseDN}`;
      console.log(`DN del nuevo grupo: ${groupDN}`);

      const groupAttributes = {
        cn: String(name),
        sAMAccountName: String(name),
        mail: String(email),
        displayName: String(displayName || name),
        objectClass: ["top", "group"],
        groupType: String(-2147483646), // Grupo de seguridad global
      };

      await ldap.add(groupDN, groupAttributes);
      console.log("✓ Grupo creado exitosamente");

      return {
        name,
        email,
        displayName: displayName || name,
        message: "Lista de correo creada correctamente",
      };
    } catch (error) {
      console.error("Error en create:", error);

      if (
        error.message.includes("already exists") ||
        error.message.includes("ENTRY_EXISTS")
      ) {
        throw new Error(
          `El grupo '${groupData.name}' ya existe en el directorio`
        );
      } else if (
        error.message.includes("invalid credentials") ||
        error.message.includes("insufficient access")
      ) {
        throw new Error(
          "Permisos insuficientes para crear grupos en el directorio"
        );
      } else if (error.message.includes("no such object")) {
        throw new Error(`La unidad organizativa no existe: ${ldapBaseDN}`);
      } else {
        throw new Error(`Error creando el grupo: ${error.message}`);
      }
    }
  }

  // Método para agregar miembros
  static async addMembers(groupname, members) {
    try {
      const group = await this.findByName(groupname);
      if (!members || members.length === 0)
        return { message: "No hay miembros para agregar" };

      console.log("Agregando miembros:", members);

      let successCount = 0;
      let failedMembers = [];

      for (const identifier of members) {
        try {
          let memberDN;

          if (identifier.includes("DC=") || identifier.includes("CN=")) {
            memberDN = identifier.trim();
          } else {
            const user = await this.findUserByEmail(identifier.trim());
            if (user && user.distinguishedName) {
              memberDN = user.distinguishedName;
            } else {
              console.warn(`Usuario no encontrado para: ${identifier}`);
              failedMembers.push({
                identifier,
                error: "Usuario no encontrado",
              });
              continue;
            }
          }

          console.log(
            `Agregando miembro: ${memberDN} al grupo: ${group.distinguishedName}`
          );

          // Intentar usar addMember si existe, sino usar modify
          if (ldap.addMember) {
            await ldap.addMember(memberDN, group.distinguishedName);
          } else {
            // Fallback al método modify
            await ldap.modify(group.distinguishedName, [
              {
                operation: "add",
                attribute: "member",
                value: memberDN,
              },
            ]);
          }

          console.log(`✓ Miembro agregado: ${memberDN}`);
          successCount++;
        } catch (memberError) {
          console.error(
            `✗ Error agregando miembro ${identifier}:`,
            memberError.message
          );
          failedMembers.push({ identifier, error: memberError.message });
        }
      }

      if (successCount === 0 && failedMembers.length > 0) {
        throw new Error(
          `No se pudo agregar ningún miembro: ${failedMembers
            .map((f) => f.identifier)
            .join(", ")}`
        );
      }

      return {
        message: `${successCount} miembros agregados correctamente`,
        successCount: successCount,
        failedMembers: failedMembers,
        addedMembers: members.slice(0, successCount),
      };
    } catch (error) {
      console.error("Error en addMembers:", error);
      throw new Error(`Error agregando miembros: ${error.message}`);
    }
  }

  // Método para eliminar miembros
  static async removeMembers(groupname, members) {
    try {
      const group = await this.findByName(groupname);
      if (!members || members.length === 0)
        return { message: "No hay miembros para eliminar" };

      console.log("Eliminando miembros:", members);
      console.log("DN del grupo:", group.distinguishedName);

      let successCount = 0;
      let failedMembers = [];

      // Procesar cada miembro individualmente usando removeMember()
      for (const identifier of members) {
        try {
          let memberDN;

          if (identifier.includes("DC=") || identifier.includes("CN=")) {
            memberDN = identifier.trim();
          } else {
            const user = await this.findUserByEmail(identifier.trim());
            if (user && user.distinguishedName) {
              memberDN = user.distinguishedName;
            } else {
              console.warn(`Usuario no encontrado para: ${identifier}`);
              failedMembers.push({
                identifier,
                error: "Usuario no encontrado",
              });
              continue;
            }
          }

          console.log(
            `Eliminando miembro: ${memberDN} del grupo: ${group.distinguishedName}`
          );

          // Intentar usar addMember si existe, sino usar modify
          if (ldap.removeMember) {
            await ldap.removeMember(memberDN, group.distinguishedName);
          } else {
            // Fallback al método modify
            await ldap.modify(group.distinguishedName, [
              {
                operation: "remove",
                attribute: "member",
                value: memberDN,
              },
            ]);
          }

          console.log(`✓ Miembro eliminado: ${memberDN}`);
          successCount++;
        } catch (memberError) {
          console.error(
            `✗ Error eliminando miembro ${identifier}:`,
            memberError.message
          );
          failedMembers.push({ identifier, error: memberError.message });
        }
      }

      // Verificar el resultado
      if (successCount === 0 && failedMembers.length > 0) {
        throw new Error(
          `No se pudo eliminar ningún miembro: ${failedMembers
            .map((f) => f.identifier)
            .join(", ")}`
        );
      }

      const resultMessage =
        successCount > 0
          ? `${successCount} miembros eliminados correctamente`
          : "No se eliminaron miembros";

      if (failedMembers.length > 0) {
        console.warn("Miembros que fallaron:", failedMembers);
      }

      return {
        message: resultMessage,
        successCount: successCount,
        failedMembers: failedMembers,
        removedMembers: members.slice(0, successCount), // Solo los que se eliminaron exitosamente
      };
    } catch (error) {
      console.error("Error en removeMembers:", error);
      throw new Error(`Error eliminando miembros: ${error.message}`);
    }
  }

  // Método para buscar por dirección de correo electrónico
  static async findUserByEmail(email) {
    try {
      const searchBase = ldapBaseDN;
      const searchFilter = `(&(objectClass=user)(mail=${email}))`;

      const searchOptions = {
        scope: "sub",
        filter: searchFilter,
        attributes: ["distinguishedName", "mail", "sAMAccountName"],
      };

      const users = await ldap.search(searchBase, searchOptions);
      return users.length > 0
        ? {
            distinguishedName: users[0].get("distinguishedName"),
            mail: users[0].get("mail"),
            username: users[0].get("sAMAccountName"),
          }
        : null;
    } catch (error) {
      console.error("Error en findUserByEmail:", error);
      return null;
    }
  }

  // Método para eliminar - VERSIÓN CORREGIDA
  static async delete(groupname) {
    try {
      console.log(`Intentando eliminar grupo: ${groupname}`);

      // Buscar el grupo para obtener su DN
      const group = await this.findByName(groupname);
      console.log(`DN del grupo a eliminar: ${group.distinguishedName}`);

      // Verificar que el grupo existe y tiene miembros
      if (group.memberCount > 0) {
        console.log(
          `El grupo tiene ${group.memberCount} miembros, eliminándolos primero...`
        );

        // Eliminar todos los miembros antes de eliminar el grupo
        const memberDNs = group.members.map((member) => member.dn);
        if (memberDNs.length > 0) {
          await this.removeMembers(groupname, memberDNs);
          console.log(`✓ ${memberDNs.length} miembros eliminados del grupo`);
        }
      }

      // Eliminar el grupo
      await ldap.remove(group.distinguishedName);
      console.log("✓ Grupo eliminado exitosamente");

      return {
        message: "Grupo eliminado correctamente",
      };
    } catch (error) {
      console.error("Error en delete:", error);

      // Mejorar mensajes de error
      if (error.message.includes("no such object")) {
        throw new Error(`El grupo '${groupname}' no existe en el directorio`);
      } else if (error.message.includes("insufficient access")) {
        throw new Error("Permisos insuficientes para eliminar grupos");
      } else if (error.message.includes("not allowed on non-leaf")) {
        throw new Error(
          "No se puede eliminar un grupo que todavía tiene miembros"
        );
      } else {
        throw new Error(`Error eliminando el grupo: ${error.message}`);
      }
    }
  }

  // Método para contar las listas (grupos)
  static async count() {
    try {
      const lists = await this.findAll();
      return lists.length; // Retorna el número total de listas
    } catch (error) {
      console.error("Error contando listas:", error);
      throw new Error(`Error al contar listas: ${error.message}`);
    }
  }
}

module.exports = Group;
