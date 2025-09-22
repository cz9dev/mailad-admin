const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Alias = require("../models/Alias");
const Log = require("../models/Log");

// Listar aliases
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const aliases = await Alias.findAll();
    res.render("aliases/list", {
      title: "Gestión de Alias",
      aliases: aliases,
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar aliases: " + error.message);
    res.redirect("/");
  }
});

// Formulario crear alias
router.get("/new", ensureAuthenticated, (req, res) => {
  res.render("aliases/form", {
    title: "Crear Alias",
    alias: {},
  });
});

// Crear alias
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { name, value } = req.body;

    const newAlias = await Alias.create({
      name,
      value,
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${name} creado`,
      userId: req.user.id,
      action: "alias_create",
      details: { name, value },
    });

    req.flash("success_msg", "Alias creado correctamente");
    res.redirect("/aliases");
  } catch (error) {
    req.flash("error_msg", "Error al crear alias: " + error.message);
    res.render("aliases/form", {
      title: "Crear Alias",
      alias: req.body,
      errors: [error.message],
    });
  }
});

// Formulario editar alias
router.get("/:name/edit", ensureAuthenticated, async (req, res) => {
  try {
    const aliases = await Alias.findAll();
    const alias = aliases.find((a) => a.name === req.params.name);

    if (!alias) {
      req.flash("error_msg", "Alias no encontrado");
      return res.redirect("/aliases");
    }

    res.render("aliases/form", {
      title: "Editar Alias",
      alias: alias,
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar alias: " + error.message);
    res.redirect("/aliases");
  }
});

// Actualizar alias
router.put("/:name", ensureAuthenticated, async (req, res) => {
  try {
    const { value } = req.body;

    const updatedAlias = await Alias.update(req.params.name, value);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${req.params.name} actualizado`,
      userId: req.user.id,
      action: "alias_update",
      details: { name: req.params.name, value },
    });

    req.flash("success_msg", "Alias actualizado correctamente");
    res.redirect("/aliases");
  } catch (error) {
    req.flash("error_msg", "Error al actualizar alias: " + error.message);

    const aliases = await Alias.findAll();
    const alias = aliases.find((a) => a.name === req.params.name) || {
      name: req.params.name,
      value: req.body.value,
    };

    res.render("aliases/form", {
      title: "Editar Alias",
      alias: alias,
      errors: [error.message],
    });
  }
});

// Eliminar alias
router.delete("/:name", ensureAuthenticated, async (req, res) => {
  try {
    await Alias.delete(req.params.name);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Alias ${req.params.name} eliminado`,
      userId: req.user.id,
      action: "alias_delete",
      details: { name: req.params.name },
    });

    req.flash("success_msg", "Alias eliminado correctamente");
    res.redirect("/aliases");
  } catch (error) {
    req.flash("error_msg", "Error al eliminar alias: " + error.message);
    res.redirect("/aliases");
  }
});

module.exports = router;
