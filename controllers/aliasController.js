// controllers/aliasController.js
const fs = require("fs").promises;
const path = require("path");

// Ruta al archivo de aliases de Postfix
const ALIASES_PATH = "/etc/postfix/aliases";

exports.listAliases = async (req, res) => {
  try {
    const data = await fs.readFile(ALIASES_PATH, "utf8");
    const aliases = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => {
        const [name, value] = line.split(":").map((part) => part.trim());
        return { name, value };
      });

    res.render("aliases/list", {
      aliases: aliases,
      title: "Gestión de Alias",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer los alias",
    });
  }
};

exports.updateAliases = async (req, res) => {
  try {
    const { aliases } = req.body;

    let content = "# Archivo de aliases generado por MailAD Admin\n";
    aliases.forEach((alias) => {
      if (alias.name && alias.value) {
        content += `${alias.name}: ${alias.value}\n`;
      }
    });

    await fs.writeFile(ALIASES_PATH, content);

    // Recargar configuración de Postfix
    const { exec } = require("child_process");
    exec("postalias " + ALIASES_PATH);
    exec("systemctl reload postfix");

    req.flash("success", "Aliases actualizados correctamente");
    res.redirect("/aliases");
  } catch (error) {
    res.status(500).render("aliases/list", {
      aliases: req.body.aliases,
      errors: ["Error al actualizar alias: " + error.message],
      title: "Gestión de Alias",
    });
  }
};
