const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const postfix = require("../utils/postfix");
const Log = require("../models/Log");

// Obtener configuración de relay
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const mainCf = await postfix.getMainCf();
    const relayHostMatch = mainCf.match(/relayhost\s*=\s*(.*)/);
    const relayHost = relayHostMatch ? relayHostMatch[1] : "";

    res.render("relay/config", {
      title: "Configuración de Relay",
      relayHost: relayHost,
      mainCf: mainCf,
    });
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al cargar configuración de relay: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar configuración de relay
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { relayHost } = req.body;
    let mainCf = await postfix.getMainCf();

    // Actualizar o agregar relayhost
    if (mainCf.includes("relayhost")) {
      mainCf = mainCf.replace(/relayhost\s*=\s*.*/, `relayhost = ${relayHost}`);
    } else {
      mainCf += `\nrelayhost = ${relayHost}\n`;
    }

    await postfix.updateMainCf(mainCf);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de relay actualizada",
      userId: req.user.id,
      action: "relay_update",
      details: { relayHost },
    });

    req.flash(
      "success_msg",
      "Configuración de relay actualizada correctamente"
    );
    res.redirect("/relay");
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al actualizar configuración de relay: " + error.message
    );

    // Intentar cargar la configuración actual
    let currentMainCf = "";
    let currentRelayHost = "";

    try {
      currentMainCf = await postfix.getMainCf();
      const relayHostMatch = currentMainCf.match(/relayhost\s*=\s*(.*)/);
      currentRelayHost = relayHostMatch ? relayHostMatch[1] : "";
    } catch (e) {
      currentRelayHost = req.body.relayHost;
    }

    res.render("relay/config", {
      title: "Configuración de Relay",
      relayHost: currentRelayHost,
      mainCf: currentMainCf,
      errors: [error.message],
    });
  }
});

module.exports = router;
