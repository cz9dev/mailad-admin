// routes/relay.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Relay = require("../models/Relay");
const Log = require("../models/Log");

// Obtener configuración de relay
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const config = await Relay.getConfig();

    res.render("relay/config", {
      title: "Configuración de Relay",
      relayHost: config.relayHost,
      relayUsername: config.relayUsername,
      relayPassword: config.relayPassword, // Mostrar vacío por seguridad
    });
  } catch (error) {
    console.error("Error loading relay config:", error);
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
    const { relayHost, relayUsername, relayPassword } = req.body;

    // Si el relayHost está vacío, limpiar todo
    const config = {
      relayHost: relayHost ? relayHost.trim() : "",
      relayUsername: relayUsername ? relayUsername.trim() : "",
      relayPassword: relayPassword ? relayPassword.trim() : "",
    };

    const updateResult = await Relay.updateConfig(config);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de relay actualizada",
      username: req.user.username,
      action: "relay_update",
      details: {
        relayHost: updateResult.relayHost,
        hasCredentials: !!config.relayUsername,
        postfixReloaded: updateResult.postfixReloaded,
        postfixError: updateResult.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!updateResult.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Configuración guardada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postfix reload`
      );
    } else {
      req.flash(
        "success_msg",
        "Configuración de relay actualizada correctamente"
      );
    }

    res.redirect("/relay");
  } catch (error) {
    console.error("Error updating relay config:", error);

    res.render("relay/config", {
      title: "Configuración de Relay",
      relayHost: req.body.relayHost || "",
      relayUsername: req.body.relayUsername || "",
      relayPassword: "", // Nunca mostrar la contraseña en el formulario
      errors: [error.message],
      error_msg: [error.message],
    });
  }
});

// Probar conexión al relay - CORREGIDO
router.post("/test", ensureAuthenticated, async (req, res) => {
  try {
    console.log("Probando conexión de relay...");
    const testResult = await Relay.testConnection();
    console.log("Resultado de prueba:", testResult);

    if (testResult.success) {
      req.flash("success_msg", testResult.message);
    } else {
      req.flash("error_msg", testResult.message);
    }

    res.redirect("/relay");
  } catch (error) {
    console.error("Error testing relay connection:", error);
    req.flash("error_msg", "Error al probar conexión: " + error.message);
    res.redirect("/relay");
  }
});

module.exports = router;
