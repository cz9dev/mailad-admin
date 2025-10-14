// routes/transport.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Transport = require("../models/Transport");
const Log = require("../models/Log");

// Listar reglas de transporte
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const rules = await Transport.findAll();

    res.render("transport/list", {
      title: "Reglas de Transporte/Reenvío",
      rules: rules,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading transport rules:", error);
    req.flash(
      "error_msg",
      "Error al cargar reglas de transporte: " + error.message
    );
    res.redirect("/");
  }
});

// Formulario crear regla
router.get("/new", ensureAuthenticated, async (req, res) => {
  try {
    res.render("transport/form", {
      title: "Crear Regla de Transporte",
      rule: {},
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading form:", error);
    res.render("transport/form", {
      title: "Crear Regla de Transporte",
      rule: {},
      error_msg: ["Error al cargar formulario"],
    });
  }
});

// Crear regla de transporte
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { pattern, destination } = req.body;

    if (!pattern || !destination) {
      req.flash("error_msg", "Patrón y destino son obligatorios");
      return res.redirect("/transport/new");
    }

    const newRule = await Transport.create({
      pattern: pattern.trim(),
      destination: destination.trim(),
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Regla de transporte ${pattern} creada`,
      username: req.user.username,
      action: "transport_create",
      details: {
        pattern,
        destination,
        postfixReloaded: newRule.postfixReloaded,
        postfixError: newRule.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!newRule.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Regla creada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_TRANSPORT_PATH || "/etc/postfix/transport"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Regla de transporte creada correctamente");
    }

    res.redirect("/transport");
  } catch (error) {
    console.error("Error creating transport rule:", error);

    res.render("transport/form", {
      title: "Crear Regla de Transporte",
      rule: req.body,
      errors: [error.message],
      error_msg: [error.message],
    });
  }
});

// Formulario editar regla
router.get("/:pattern/edit", ensureAuthenticated, async (req, res) => {
  try {
    const pattern = decodeURIComponent(req.params.pattern);
    const rule = await Transport.findByPattern(pattern);

    if (!rule) {
      req.flash("error_msg", "Regla de transporte no encontrada");
      return res.redirect("/transport");
    }

    res.render("transport/form", {
      title: "Editar Regla de Transporte",
      rule: rule,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading transport rule for edit:", error);
    req.flash("error_msg", "Error al cargar regla: " + error.message);
    res.redirect("/transport");
  }
});

// Actualizar regla de transporte
router.put("/:pattern", ensureAuthenticated, async (req, res) => {
  try {
    const pattern = decodeURIComponent(req.params.pattern);
    const { destination } = req.body;

    if (!destination) {
      req.flash("error_msg", "El destino es obligatorio");
      return res.redirect(`/transport/${encodeURIComponent(pattern)}/edit`);
    }

    const updatedRule = await Transport.update(pattern, destination.trim());

    // Registrar log
    await Log.create({
      level: "info",
      message: `Regla de transporte ${pattern} actualizada`,
      username: req.user.username,
      action: "transport_update",
      details: {
        pattern: pattern,
        destination,
        postfixReloaded: updatedRule.postfixReloaded,
        postfixError: updatedRule.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!updatedRule.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Regla actualizada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_TRANSPORT_PATH || "/etc/postfix/transport"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Regla de transporte actualizada correctamente");
    }

    res.redirect("/transport");
  } catch (error) {
    console.error("Error updating transport rule:", error);

    const rule = (await Transport.findByPattern(
      decodeURIComponent(req.params.pattern)
    )) || {
      pattern: decodeURIComponent(req.params.pattern),
      destination: req.body.destination,
    };

    res.render("transport/form", {
      title: "Editar Regla de Transporte",
      rule: rule,
      errors: [error.message],
      error_msg: [error.message],
    });
  }
});

// Eliminar regla de transporte
router.post("/:pattern/delete", ensureAuthenticated, async (req, res) => {
  try {
    const pattern = decodeURIComponent(req.params.pattern);
    const deleteResult = await Transport.delete(pattern);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Regla de transporte ${pattern} eliminada`,
      username: req.user.username,
      action: "transport_delete",
      details: {
        pattern: pattern,
        postfixReloaded: deleteResult.postfixReloaded,
        postfixError: deleteResult.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!deleteResult.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Regla eliminada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_TRANSPORT_PATH || "/etc/postfix/transport"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Regla de transporte eliminada correctamente");
    }

    res.redirect("/transport");
  } catch (error) {
    console.error("Error deleting transport rule:", error);
    req.flash("error_msg", "Error al eliminar regla: " + error.message);
    res.redirect("/transport");
  }
});

module.exports = router;
