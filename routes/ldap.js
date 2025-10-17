// routes/ldap.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const LdapConfig = require("../models/LdapConfig");
const Log = require("../models/Log");

// Vista principal de configuración LDAP/AD
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const config = LdapConfig.getConfig();
    const domainInfo = await LdapConfig.getDomainInfo().catch(() => null);

    res.render("ldap/config", {
      title: "Configuración LDAP/Active Directory",
      config: config,
      domainInfo: domainInfo,      
    });
  } catch (error) {
    console.error("Error loading LDAP config:", error);
    req.flash(
      "error_msg",
      "Error al cargar configuración LDAP: " + error.message
    );
    res.redirect("/");
  }
});

// Probar conexión LDAP/AD
router.post("/test-connection", ensureAuthenticated, async (req, res) => {
  try {
    console.log("Iniciando prueba de conexión LDAP...");
    const testResult = await LdapConfig.testConnection();

    // Registrar log
    await Log.create({
      level: testResult.success ? "info" : "error",
      message: `Prueba de conexión LDAP: ${
        testResult.success ? "Exitosa" : "Fallida"
      }`,
      userId: req.user.id,
      username: req.user.username,
      action: "ldap_test_connection",
      details: {
        success: testResult.success,
        message: testResult.message,
        details: testResult.details,
      },
    });

    if (testResult.success) {
      req.flash("success_msg", testResult.message);      
    } else {
      req.flash("error_msg", testResult.message);      
    }    

    res.redirect("/ldap");
  } catch (error) {
    console.error("Error testing LDAP connection:", error);

    await Log.create({
      level: "error",
      message: "Error en prueba de conexión LDAP",
      username: req.user.username,
      action: "ldap_test_connection_error",
      details: {
        error: error.message,
      },
    });

    req.flash("error_msg", "Error al probar conexión LDAP: " + error.message);
    res.redirect("/ldap");
  }
});

// Obtener información del dominio (API endpoint opcional)
router.get("/domain-info", ensureAuthenticated, async (req, res) => {
  try {
    const domainInfo = await LdapConfig.getDomainInfo();
    res.json({
      success: true,
      data: domainInfo,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
