// controllers/transportController.js
const fs = require("fs").promises;
const path = require("path");

const TRANSPORT_PATH = "/etc/postfix/transport";

exports.getTransportRules = async (req, res) => {
  try {
    const data = await fs.readFile(TRANSPORT_PATH, "utf8");
    const rules = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => {
        const [pattern, destination] = line.split(/\s+/);
        return { pattern, destination };
      });

    res.render("transport/rules", {
      rules: rules,
      title: "Reglas de Transporte/Reenvío",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer reglas de transporte",
    });
  }
};

exports.updateTransportRules = async (req, res) => {
  try {
    const { rules } = req.body;

    let content = "# Reglas de transporte generadas por MailAD Admin\n";
    rules.forEach((rule) => {
      if (rule.pattern && rule.destination) {
        content += `${rule.pattern} ${rule.destination}\n`;
      }
    });

    await fs.writeFile(TRANSPORT_PATH, content);

    // Compilar mapa de transporte y recargar Postfix
    const { exec } = require("child_process");
    exec("postmap " + TRANSPORT_PATH);
    exec("systemctl reload postfix");

    req.flash("success", "Reglas de transporte actualizadas correctamente");
    res.redirect("/transport");
  } catch (error) {
    res.status(500).render("transport/rules", {
      rules: req.body.rules,
      errors: ["Error al actualizar reglas: " + error.message],
      title: "Reglas de Transporte/Reenvío",
    });
  }
};
