const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const mailad = require("../utils/mailad");
const Log = require("../models/Log");

// Listar listas de correo
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const lists = await mailad.listGroups();
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
    const { name, members } = req.body;
    const memberList = members ? members.split(",").map((m) => m.trim()) : [];

    await mailad.createGroup(name, {
      mailingList: true,
      members: memberList,
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${name} creada`,
      userId: req.user.id,
      action: "list_create",
      details: { name, members: memberList },
    });

    req.flash("success_msg", "Lista de correo creada correctamente");
    res.redirect("/lists");
  } catch (error) {
    req.flash("error_msg", "Error al crear lista: " + error.message);
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
    const lists = await mailad.listGroups();
    const list = lists.find((l) => l.name === req.params.name);

    if (!list) {
      req.flash("error_msg", "Lista no encontrada");
      return res.redirect("/lists");
    }

    res.render("lists/form", {
      title: "Editar Lista de Correo",
      list: list,
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar lista: " + error.message);
    res.redirect("/lists");
  }
});

// Actualizar lista
router.put("/:name", ensureAuthenticated, async (req, res) => {
  try {
    const { addMembers, removeMembers } = req.body;

    const addMembersList = addMembers
      ? addMembers.split(",").map((m) => m.trim())
      : [];
    const removeMembersList = removeMembers
      ? removeMembers.split(",").map((m) => m.trim())
      : [];

    await mailad.updateGroup(req.params.name, {
      addMembers: addMembersList,
      removeMembers: removeMembersList,
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${req.params.name} actualizada`,
      userId: req.user.id,
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

    const lists = await mailad.listGroups();
    const list = lists.find((l) => l.name === req.params.name) || {
      name: req.params.name,
    };

    res.render("lists/form", {
      title: "Editar Lista de Correo",
      list: list,
      errors: [error.message],
    });
  }
});

// Eliminar lista
router.delete("/:name", ensureAuthenticated, async (req, res) => {
  try {
    await mailad.deleteGroup(req.params.name);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Lista de correo ${req.params.name} eliminada`,
      userId: req.user.id,
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
