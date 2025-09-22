// controllers/relayController.js
const fs = require("fs").promises;
const path = require("path");
const ini = require("ini");

const MAIN_CF_PATH = "/etc/postfix/main.cf";

exports.getRelayConfig = async (req, res) => {
  try {
    const data = await fs.readFile(MAIN_CF_PATH, "utf8");

    // Parsear configuración de Postfix
    const relayHostMatch = data.match(/relayhost\s*=\s*(.*)/);
    const relayHost = relayHostMatch ? relayHostMatch[1] : "";

    res.render("relay/config", {
      relayHost: relayHost,
      title: "Configuración de Relay",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer configuración de relay",
    });
  }
};

exports.updateRelayConfig = async (req, res) => {
  try {
    const { relayHost } = req.body;
    let data = await fs.readFile(MAIN_CF_PATH, "utf8");

    // Actualizar o agregar relayhost
    if (data.includes("relayhost")) {
      data = data.replace(/relayhost\s*=\s*.*/, `relayhost = ${relayHost}`);
    } else {
      data += `\nrelayhost = ${relayHost}\n`;
    }

    await fs.writeFile(MAIN_CF_PATH, data);

    // Recargar Postfix
    const { exec } = require("child_process");
    exec("systemctl reload postfix");

    req.flash("success", "Configuración de relay actualizada correctamente");
    res.redirect("/relay");
  } catch (error) {
    res.status(500).render("relay/config", {
      relayHost: req.body.relayHost,
      errors: ["Error al actualizar relay: " + error.message],
      title: "Configuración de Relay",
    });
  }
};
