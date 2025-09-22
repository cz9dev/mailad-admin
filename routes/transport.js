const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const postfix = require("../utils/postfix");
const Log = require("../models/Log");

// Obtener reglas de transporte
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const rules = await postfix.getTransportRules();
    res.render("transport/rules", {
      title: "Reglas de Transporte/Reenvío",
      rules: rules,
    });
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al cargar reglas de transporte: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar reglas de transporte
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { rules } = req.body;

    // Convertir a array si es necesario
    const rulesArray = Array.isArray(rules) ? rules : [rules];

    await postfix.updateTransportRules(rulesArray);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Reglas de transporte actualizadas",
      userId: req.user.id,
      action: "transport_update",
      details: { rules: rulesArray },
    });

    req.flash("success_msg", "Reglas de transporte actualizadas correctamente");
    res.redirect("/transport");
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al actualizar reglas de transporte: " + error.message
    );

    // Intentar cargar las reglas actuales
    let currentRules = [];
    try {
      currentRules = await postfix.getTransportRules();
    } catch (e) {
      // Si no se pueden cargar, usar las reglas del formulario
      const rulesArray = Array.isArray(req.body.rules)
        ? req.body.rules
        : [req.body.rules];
      currentRules = rulesArray;
    }

    res.render("transport/rules", {
      title: "Reglas de Transporte/Reenvío",
      rules: currentRules,
      errors: [error.message],
    });
  }
});

module.exports = router;
