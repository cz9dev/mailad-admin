// routes/blacklist.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Blacklist = require("../models/Blacklist");
const Log = require("../models/Log");

// Listar entradas de lista negra
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const entries = await Blacklist.findAll();

    res.render("blacklist/list", {
      title: "Lista Negra de Postfix",
      entries: entries,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading blacklist:", error);
    req.flash("error_msg", "Error al cargar lista negra: " + error.message);
    res.redirect("/");
  }
});

// Formulario crear entrada
router.get("/new", ensureAuthenticated, async (req, res) => {
  try {
    res.render("blacklist/form", {
      title: "Agregar a Lista Negra",
      entry: {},
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading form:", error);
    res.render("blacklist/form", {
      title: "Agregar a Lista Negra",
      entry: {},
      error_msg: ["Error al cargar formulario"],
    });
  }
});

// Crear entrada en lista negra
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { email, action, code, message } = req.body;

    if (!email) {
      req.flash("error_msg", "El email o dominio es obligatorio");
      return res.redirect("/blacklist/new");
    }

    if (!message) {
      req.flash("error_msg", "El mensaje de rechazo es obligatorio");
      return res.redirect("/blacklist/new");
    }

    const newEntry = await Blacklist.create({
      email: email.trim(),
      action: action || "REJECT",
      code: code || "511",
      message: message.trim(),
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Entrada ${email} agregada a lista negra`,
      username: req.user.username,
      action: "blacklist_create",
      details: {
        email,
        action: newEntry.action,
        code: newEntry.code,
        message: newEntry.message,
        postfixReloaded: newEntry.postfixReloaded,
        postfixError: newEntry.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!newEntry.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Entrada agregada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_BLACKLIST_PATH || "/etc/postfix/rules/lista_negra"
        } && postfix reload`
      );
    } else {
      req.flash(
        "success_msg",
        "Entrada agregada correctamente a la lista negra"
      );
    }

    res.redirect("/blacklist");
  } catch (error) {
    console.error("Error creating blacklist entry:", error);

    res.render("blacklist/form", {
      title: "Agregar a Lista Negra",
      entry: req.body,
      errors: [error.message],
      error_msg: [error.message],
    });
  }
});

// Eliminar entrada de lista negra
router.post("/:email/delete", ensureAuthenticated, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const deleteResult = await Blacklist.delete(email);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Entrada ${email} eliminada de lista negra`,
      username: req.user.username,
      action: "blacklist_delete",
      details: {
        email: email,
        postfixReloaded: deleteResult.postfixReloaded,
        postfixError: deleteResult.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!deleteResult.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Entrada eliminada correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_BLACKLIST_PATH || "/etc/postfix/rules/lista_negra"
        } && postfix reload`
      );
    } else {
      req.flash(
        "success_msg",
        "Entrada eliminada correctamente de la lista negra"
      );
    }

    res.redirect("/blacklist");
  } catch (error) {
    console.error("Error deleting blacklist entry:", error);
    req.flash("error_msg", "Error al eliminar entrada: " + error.message);
    res.redirect("/blacklist");
  }
});

module.exports = router;
