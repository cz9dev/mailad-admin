// routes/aliases.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Alias = require("../models/Alias");
const Log = require("../models/Log");

// Listar aliases
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const aliases = await Alias.findAll();

    // Pasar mensajes flash a la vista
    res.render("aliases/list", {
      title: "Gestión de Alias",
      aliases: aliases,
    });
  } catch (error) {
    console.error("Error loading aliases:", error);
    req.flash("error_msg", "Error al cargar aliases: " + error.message);
    res.redirect("/");
  }
});

// Formulario crear alias
router.get("/new", ensureAuthenticated, async (req, res) => {
  try {
    // Obtener usuarios y aliases existentes para validación en el frontend
    const existingUsers = await Alias.getExistingUsers();
    const existingAliases = await Alias.getExistingAliases();

    res.render("aliases/form", {
      title: "Crear Alias",
      alias: {},
      existingUsers: existingUsers.map((user) => user.email),
      existingAliases: existingAliases,
    });
  } catch (error) {
    console.error("Error loading form data:", error);
    res.render("aliases/form", {
      title: "Crear Alias",
      alias: {},
      existingUsers: [],
      existingAliases: [],
      error_msg: ["Error al cargar datos del formulario"],
    });
  }
});

// Crear alias
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { name, value } = req.body;

    if (!name || !value) {
      req.flash("error_msg", "Nombre y valor del alias son obligatorios");
      return res.redirect("/aliases/new");
    }

    const newAlias = await Alias.create({
      name: name.trim(),
      value: value.trim(),
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${name} creado`,
      userId: req.user.id,
      username: req.user.username,
      action: "alias_create",
      details: {
        name,
        value,
        postfixReloaded: newAlias.postfixReloaded,
        postfixError: newAlias.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!newAlias.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Alias creado correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_ALIASES_PATH ||
          "/etc/postfix/aliases/alias_virtuales"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Alias creado correctamente");
    }

    res.redirect("/aliases");
  } catch (error) {
    console.error("Error creating alias:", error);

    // Obtener datos existentes para mostrar en el formulario
    let existingUsers = [];
    let existingAliases = [];
    try {
      existingUsers = await Alias.getExistingUsers();
      existingAliases = await Alias.getExistingAliases();
    } catch (e) {
      console.error("Error loading existing data:", e);
    }

    res.render("aliases/form", {
      title: "Crear Alias",
      alias: req.body,
      errors: [error.message],
      existingUsers: existingUsers.map((user) => user.email),
      existingAliases: existingAliases,
      error_msg: [error.message],
    });
  }
});

// Formulario editar alias
router.get("/:name/edit", ensureAuthenticated, async (req, res) => {
  try {
    const alias = await Alias.findByName(req.params.name);

    if (!alias) {
      req.flash("error_msg", "Alias no encontrado");
      return res.redirect("/aliases");
    }

    // Obtener usuarios y aliases existentes para validación
    const existingUsers = await Alias.getExistingUsers();
    const existingAliases = await Alias.getExistingAliases();

    res.render("aliases/form", {
      title: "Editar Alias",
      alias: alias,
      existingUsers: existingUsers.map((user) => user.email),
      existingAliases: existingAliases,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      warning_msg: req.flash("warning_msg"),
    });
  } catch (error) {
    console.error("Error loading alias for edit:", error);
    req.flash("error_msg", "Error al cargar alias: " + error.message);
    res.redirect("/aliases");
  }
});

// Actualizar alias
router.put("/:name", ensureAuthenticated, async (req, res) => {
  try {
    const { value } = req.body;

    if (!value) {
      req.flash("error_msg", "El valor del alias es obligatorio");
      return res.redirect(`/aliases/${req.params.name}/edit`);
    }

    const updatedAlias = await Alias.update(req.params.name, value.trim());

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${req.params.name} actualizado`,
      userId: req.user.id,
      username: req.user.username,
      action: "alias_update",
      details: {
        name: req.params.name,
        value,
        postfixReloaded: updatedAlias.postfixReloaded,
        postfixError: updatedAlias.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!updatedAlias.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Alias actualizado correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_ALIASES_PATH ||
          "/etc/postfix/aliases/alias_virtuales"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Alias actualizado correctamente");
    }

    res.redirect("/aliases");
  } catch (error) {
    console.error("Error updating alias:", error);

    // Obtener datos existentes para mostrar en el formulario
    let existingUsers = [];
    let existingAliases = [];
    try {
      existingUsers = await Alias.getExistingUsers();
      existingAliases = await Alias.getExistingAliases();
    } catch (e) {
      console.error("Error loading existing data:", e);
    }

    const alias = (await Alias.findByName(req.params.name)) || {
      name: req.params.name,
      value: req.body.value,
    };

    res.render("aliases/form", {
      title: "Editar Alias",
      alias: alias,
      errors: [error.message],
      existingUsers: existingUsers.map((user) => user.email),
      existingAliases: existingAliases,
      error_msg: [error.message],
    });
  }
});

// Eliminar alias
router.post("/:name/delete", ensureAuthenticated, async (req, res) => {
  try {
    const deleteResult = await Alias.delete(req.params.name);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${req.params.name} eliminado`,
      userId: req.user.id,
      username: req.user.username,
      action: "alias_delete",
      details: {
        name: req.params.name,
        postfixReloaded: deleteResult.postfixReloaded,
        postfixError: deleteResult.postfixError,
      },
    });

    // Mostrar advertencia si Postfix no se pudo recargar
    if (!deleteResult.postfixReloaded) {
      req.flash(
        "warning_msg",
        `Alias eliminado correctamente, pero Postfix no pudo recargar. Ejecute manualmente: postmap ${
          process.env.POSTFIX_ALIASES_PATH ||
          "/etc/postfix/aliases/alias_virtuales"
        } && postfix reload`
      );
    } else {
      req.flash("success_msg", "Alias eliminado correctamente");
    }

    res.redirect("/aliases");
  } catch (error) {
    console.error("Error deleting alias:", error);
    req.flash("error_msg", "Error al eliminar alias: " + error.message);
    res.redirect("/aliases");
  }
});

module.exports = router;
