// controllers/securityController.js
const Antivirus = require("../models/Security");
const fs = require("fs").promises;
const path = require("path");
const Log = require("../models/Log"); // Asegúrate de importar el modelo Log

exports.getSecurityConfig = async (req, res) => {
  try {
    const antivirusConfig = await Antivirus.getConfig();
    const antivirusStatus = await Antivirus.getStatus();
    const testResult = await Antivirus.testConfig();

    res.render("security/config", {
      title: "Configuración de Seguridad - Antivirus",
      antivirusConfig,
      antivirusStatus,
      testResult,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading security config:", error);
    res.render("security/config", {
      title: "Configuración de Seguridad - Antivirus",
      antivirusConfig: { enabled: false },
      antivirusStatus: {},
      testResult: { success: false, message: error.message, details: [] },
      error_msg: [`Error al cargar configuración: ${error.message}`],
    });
  }
};

exports.updateAntivirusConfig = async (req, res) => {
  try {
    const {
      useAlternateMirror,
      alternateMirrors,
      useProxy,
      proxyServer,
      proxyPort,
      proxyUsername,
      proxyPassword,
      maxAttempts,
      checks,
    } = req.body;

    const configData = {
      useAlternateMirror: useAlternateMirror === "on",
      alternateMirrors: alternateMirrors || "",
      useProxy: useProxy === "on",
      proxyServer: proxyServer || "",
      proxyPort: proxyPort || "",
      proxyUsername: proxyUsername || "",
      proxyPassword: proxyPassword || "",
      maxAttempts: maxAttempts || "5",
      checks: checks || "24",
    };

    const result = await Antivirus.updateConfig(configData);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de Antivirus actualizada",
      userId: req.user.id,
      username: req.user.username,
      action: "antivirus_update",
      details: {
        useAlternateMirror: configData.useAlternateMirror,
        useProxy: configData.useProxy,
        proxyServer: configData.proxyServer ? "configurado" : "no configurado",
        alternateMirrors: configData.alternateMirrors || "no configurado",
      },
    });

    req.flash("success_msg", result.message);
    res.redirect("/security");
  } catch (error) {
    console.error("Error updating antivirus config:", error);

    // Registrar log de error
    await Log.create({
      level: "error",
      message: "Error al actualizar configuración de Antivirus",
      username: req.user.username,
      action: "antivirus_update_error",
      details: {
        error: error.message,
      },
    });

    req.flash(
      "error_msg",
      `Error al actualizar configuración: ${error.message}`
    );
    res.redirect("/security");
  }
};

exports.testAntivirus = async (req, res) => {
  try {
    const testResult = await Antivirus.testConfig();

    // Registrar log de prueba
    await Log.create({
      level: testResult.success ? "info" : "warning",
      message: `Prueba de Antivirus: ${testResult.message}`,
      userId: req.user.id,
      username: req.user.username,
      action: "antivirus_test",
      details: {
        success: testResult.success,
        message: testResult.message,
        details: testResult.details,
      },
    });

    if (testResult.success) {
      req.flash("success_msg", `Prueba exitosa: ${testResult.message}`);      
    } else {
      req.flash("warning_msg", `Prueba fallida: ${testResult.message}`);
    }

    res.redirect("/security");
  } catch (error) {
    console.error("Error testing antivirus:", error);

    // Registrar log de error en prueba
    await Log.create({
      level: "error",
      message: "Error en prueba de Antivirus",
      userId: req.user.id,
      username: req.user.username,
      action: "antivirus_test_error",
      details: {
        error: error.message,
      },
    });

    req.flash("error_msg", `Error en la prueba: ${error.message}`);
    res.redirect("/security");
  }
};

exports.reloadAntivirus = async (req, res) => {
  try {
    const result = await Antivirus.reloadServices();

    // Registrar log de recarga
    await Log.create({
      level: result.success ? "info" : "warning",
      message: "Servicios de Antivirus recargados",
      userId: req.user.id,
      username: req.user.username,
      action: "antivirus_reload",
      details: {
        success: result.success,
        error: result.error || null,
        manualCommand: result.manualCommand || null,
      },
    });

    if (result.success) {
      req.flash("success_msg", "Servicios de ClamAV recargados correctamente");
    } else {
      const warningMsg = result.manualCommand
        ? `Error al recargar servicios: ${result.error}. Comando manual: ${result.manualCommand}`
        : `Error al recargar servicios: ${result.error}`;
      req.flash("warning_msg", warningMsg);
    }

    res.redirect("/security");
  } catch (error) {
    console.error("Error reloading antivirus:", error);

    // Registrar log de error en recarga
    await Log.create({
      level: "error",
      message: "Error al recargar servicios de Antivirus",
      userId: req.user.id,
      username: req.user.username,
      action: "antivirus_reload_error",
      details: {
        error: error.message,
      },
    });

    req.flash("error_msg", `Error al recargar servicios: ${error.message}`);
    res.redirect("/security");
  }
};
