// routes/host.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Host = require("../models/Host");
const Log = require("../models/Log");

// Obtener configuración de host
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const config = await Host.getConfig();

    res.render("host/config", {
      title: "Configuración de Host y Dominio",
      ...config,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading host config:", error);
    req.flash(
      "error_msg",
      "Error al cargar configuración de host: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar configuración de host
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const {
      hostname,
      mydomain,
      myhostname,
      hosts,
      virtualDomains,
      mynetworks,
      messageSizeLimit,
    } = req.body;

    const updateResult = await Host.updateConfig({
      hostname: hostname.trim(),
      mydomain: mydomain.trim(),
      myhostname: myhostname.trim(),
      hosts: hosts,
      virtualDomains: virtualDomains ? virtualDomains.trim() : "",
      mynetworks: mynetworks ? mynetworks.trim() : "",
      messageSizeLimit: messageSizeLimit ? messageSizeLimit.trim() : "5662310",
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de host y dominio actualizada",
      username: req.user.username,
      action: "host_update",
      details: {
        hostname,
        mydomain,
        myhostname,
        virtualDomains,
        postfixReloaded: updateResult.postfixReloaded,
        systemApplied: updateResult.systemApplied,
      },
    });

    // Mostrar advertencias si hay problemas
    const warnings = [];
    if (!updateResult.postfixReloaded) {
      warnings.push(
        "Postfix no pudo recargar. Ejecute manualmente: postfix reload"
      );
    }
    if (!updateResult.systemApplied) {
      warnings.push("Cambios del sistema no aplicados completamente.");
    }

    if (warnings.length > 0) {
      req.flash("warning_msg", warnings.join(" "));
    } else {
      req.flash(
        "success_msg",
        "Configuración de host y dominio actualizada correctamente"
      );
    }

    res.redirect("/host");
  } catch (error) {
    console.error("Error updating host config:", error);

    // Cargar configuración actual para mostrar en el formulario
    let currentConfig = req.body;
    try {
      currentConfig = await Host.getConfig();
    } catch (e) {
      // Usar valores del formulario si no se puede cargar la configuración actual
    }

    res.render("host/config", {
      title: "Configuración de Host y Dominio",
      ...currentConfig,
      errors: [error.message],
      error_msg: [error.message],
    });
  }
});

// Probar configuración
router.post("/test", ensureAuthenticated, async (req, res) => {
  try {
    const testResult = await Host.testConfig();

    if (testResult.success) {
      req.flash("success_msg", testResult.message);
    } else {
      req.flash("error_msg", testResult.message);
    }

    res.redirect("/host");
  } catch (error) {
    console.error("Error testing host config:", error);
    req.flash("error_msg", "Error al probar configuración: " + error.message);
    res.redirect("/host");
  }
});

module.exports = router;
