// routes/lists.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Group = require("../models/Group");
const Log = require("../models/Log");

// Listar listas de correo
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const lists = await Group.findAll();
    
    res.render("lists/list", {
      title: "Listas de Correo",
      lists: lists,
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar listas: " + error.message);
    res.redirect("/");
  }
});

// Formulario crear lista
router.get("/new", ensureAuthenticated, (req, res) => {
  res.render("lists/form", {
    title: "Crear Lista de Correo",
    list: {},
  });
});

// Crear lista
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { name, email, displayName } = req.body;

    if (!name || !email) {
      throw new Error("Nombre y email son obligatorios.");
    }

    const newGroup = await Group.create({
      name: name.trim(),
      email: email.trim(),
      displayName: displayName?.trim() || name.trim(),
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${name} creada`,
      userId: req.user.id,
      username: req.user.username,
      action: "maillist_create",
      details: { name, email },
    });

    req.flash("success_msg", "Lista de correo creada correctamente");
    res.redirect("/lists");
  } catch (error) {
    console.error("Error al crear lista de correo:", error);
    req.flash("error_msg", "Error al crear lista de correo: " + error.message);

    res.render("lists/form", {
      title: "Crear Lista de Correo",
      list: req.body,
      errors: [error.message],
    });
  }
});

// Formulario editar lista
router.get("/:name/edit", ensureAuthenticated, async (req, res) => {
  try {
    const list = await Group.findByName(req.params.name);

    if (!list) {
      req.flash("error_msg", "Lista no encontrada");
      return res.redirect("/lists");
    }

    console.log("Datos de lista para edición:", {
      name: list.name,
      displayName: list.displayName,
      mail: list.mail,
      memberCount: list.memberCount,
    });

    res.render("lists/form", {
      title: "Editar Lista de Correo",
      list: list, // Asegúrate de que esto se llama 'list'
    });
  } catch (error) {
    console.error("Error en edición:", error);
    req.flash("error_msg", "Error al cargar lista: " + error.message);
    res.redirect("/lists");
  }
});

// Actualizar lista - Agregar/eliminar miembros
router.put("/:name", ensureAuthenticated, async (req, res) => {
  try {
    const { addMembers, removeMembers } = req.body;

    const addMembersList = addMembers
      ? addMembers
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m)
      : [];
    const removeMembersList = removeMembers
      ? removeMembers
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m)
      : [];

    let results = {};

    if (addMembersList.length > 0) {
      results.addResult = await Group.addMembers(
        req.params.name,
        addMembersList
      );
    }

    if (removeMembersList.length > 0) {
      results.removeResult = await Group.removeMembers(
        req.params.name,
        removeMembersList
      );
    }

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${req.params.name} actualizada`,
      userId: req.user.id,
      username: req.user.username,
      action: "list_update",
      details: {
        name: req.params.name,
        addMembers: addMembersList,
        removeMembers: removeMembersList,
      },
    });

    req.flash("success_msg", "Lista de correo actualizada correctamente");
    res.redirect("/lists");
  } catch (error) {
    req.flash("error_msg", "Error al actualizar lista: " + error.message);

    try {
      const list = await Group.findByName(req.params.name);
      res.render("lists/form", {
        title: "Editar Lista de Correo",
        list: list,
        errors: [error.message],
      });
    } catch (findError) {
      res.redirect("/lists");
    }
  }
});

// Eliminar lista
router.post("/:name/delete", ensureAuthenticated, async (req, res) => {
  try {
    await Group.delete(req.params.name);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${req.params.name} eliminada`,
      userId: req.user.id,
      username: req.user.username,
      action: "list_delete",
      details: { name: req.params.name },
    });

    req.flash("success_msg", "Lista de correo eliminada correctamente");
    res.redirect("/lists");
  } catch (error) {
    req.flash("error_msg", "Error al eliminar lista: " + error.message);
    res.redirect("/lists");
  }
});

module.exports = router;
