const postfix = require("../utils/postfix");

class Alias {
  static async findAll() {
    return await postfix.getAliases();
  }

  static async create(aliasData) {
    const aliases = await postfix.getAliases();

    // Verificar si el alias ya existe
    if (aliases.some((a) => a.name === aliasData.name)) {
      throw new Error("El alias ya existe");
    }

    aliases.push({
      name: aliasData.name,
      value: aliasData.value,
    });

    await postfix.updateAliases(aliases);
    return aliasData;
  }

  static async update(name, newValue) {
    const aliases = await postfix.getAliases();
    const aliasIndex = aliases.findIndex((a) => a.name === name);

    if (aliasIndex === -1) {
      throw new Error("Alias no encontrado");
    }

    aliases[aliasIndex].value = newValue;
    await postfix.updateAliases(aliases);

    return {
      name: name,
      value: newValue,
    };
  }

  static async delete(name) {
    const aliases = await postfix.getAliases();
    const filteredAliases = aliases.filter((a) => a.name !== name);

    await postfix.updateAliases(filteredAliases);
    return true;
  }
}

module.exports = Alias;
