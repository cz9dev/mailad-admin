const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const { antivirusConfig, sslConfig } = require("../models/Config");
const Log = require("../models/Log");

// Obtener configuración de seguridad
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const antivirus = await antivirusConfig.read();
    const ssl = await sslConfig.read();

    res.render("security/config", {
      title: "Configuración de Seguridad",
      antivirusConfig:
        typeof antivirus === "object"
          ? JSON.stringify(antivirus, null, 2)
          : antivirus,
      sslConfig: typeof ssl === "object" ? JSON.stringify(ssl, null, 2) : ssl,
    });
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al cargar configuración de seguridad: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar configuración de seguridad
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { antivirusConfig, sslConfig } = req.body;

    await antivirusConfig.update(antivirusConfig);
    await sslConfig.update(sslConfig);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de seguridad actualizada",
      userId: req.user.id,
      action: "security_update",
      details: {
        antivirus:
          typeof antivirusConfig === "string" ? "updated" : antivirusConfig,
        ssl: typeof sslConfig === "string" ? "updated" : sslConfig,
      },
    });

    req.flash(
      "success_msg",
      "Configuración de seguridad actualizada correctamente"
    );
    res.redirect("/security");
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al actualizar configuración de seguridad: " + error.message
    );

    // Intentar cargar la configuración actual
    let currentAntivirus = req.body.antivirusConfig;
    let currentSsl = req.body.sslConfig;

    try {
      currentAntivirus = await antivirusConfig.read();
      currentSsl = await sslConfig.read();

      if (typeof currentAntivirus === "object") {
        currentAntivirus = JSON.stringify(currentAntivirus, null, 2);
      }

      if (typeof currentSsl === "object") {
        currentSsl = JSON.stringify(currentSsl, null, 2);
      }
    } catch (e) {
      // Si no se puede cargar, usar los valores del formulario
    }

    res.render("security/config", {
      title: "Configuración de Seguridad",
      antivirusConfig: currentAntivirus,
      sslConfig: currentSsl,
      errors: [error.message],
    });
  }
});

module.exports = router;
