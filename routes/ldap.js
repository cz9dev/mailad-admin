const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const { ldapConfig } = require("../models/Config");
const Log = require("../models/Log");

// Obtener configuración LDAP
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const config = await ldapConfig.read();
    res.render("ldap/config", {
      title: "Configuración LDAP/AD",
      config: config,
    });
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al cargar configuración LDAP: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar configuración LDAP
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const updatedConfig = await ldapConfig.update(req.body);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración LDAP actualizada",
      userId: req.user.id,
      action: "ldap_update",
      details: req.body,
    });

    req.flash("success_msg", "Configuración LDAP actualizada correctamente");
    res.redirect("/ldap");
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al actualizar configuración LDAP: " + error.message
    );

    // Intentar leer la configuración actual para mostrarla
    let currentConfig = {};
    try {
      currentConfig = await ldapConfig.read();
    } catch (e) {
      // Si no se puede leer, usar los valores del formulario
      currentConfig = req.body;
    }

    res.render("ldap/config", {
      title: "Configuración LDAP/AD",
      config: currentConfig,
      errors: [error.message],
    });
  }
});

// Probar conexión LDAP
router.post("/test", ensureAuthenticated, async (req, res) => {
  try {
    const ldap = require("../utils/ldap");
    await ldap.connect();

    // Registrar log
    await Log.create({
      level: "info",
      message: "Conexión LDAP probada exitosamente",
      userId: req.user.id,
      action: "ldap_test",
      details: { status: "success" },
    });

    req.flash("success_msg", "Conexión LDAP probada exitosamente");
    ldap.disconnect();
  } catch (error) {
    // Registrar log
    await Log.create({
      level: "error",
      message: "Error probando conexión LDAP",
      userId: req.user.id,
      action: "ldap_test",
      details: { status: "error", message: error.message },
    });

    req.flash("error_msg", "Error probando conexión LDAP: " + error.message);
  }

  res.redirect("/ldap");
});

module.exports = router;
