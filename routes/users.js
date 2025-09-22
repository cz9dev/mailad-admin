const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Log = require("../models/Log");

// Listar usuarios
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.findAll();
    res.render("users/list", {
      title: "Gestión de Usuarios",
      users: users.filter((u) => u.isActive),
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar usuarios: " + error.message);
    res.redirect("/");
  }
});

// Formulario crear usuario
router.get("/new", ensureAuthenticated, (req, res) => {
  res.render("users/form", {
    title: "Crear Usuario",
    user: {},
  });
});

// Crear usuario
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { username, email, displayName, password } = req.body;

    const newUser = await User.create({
      username,
      email,
      displayName,
      password,
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Usuario ${username} creado`,
      userId: req.user.id,
      action: "user_create",
      details: { username, email },
    });

    req.flash("success_msg", "Usuario creado correctamente");
    res.redirect("/users");
  } catch (error) {
    req.flash("error_msg", "Error al crear usuario: " + error.message);
    res.render("users/form", {
      title: "Crear Usuario",
      user: req.body,
      errors: [error.message],
    });
  }
});

// Formulario editar usuario
router.get("/:id/edit", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error_msg", "Usuario no encontrado");
      return res.redirect("/users");
    }

    res.render("users/form", {
      title: "Editar Usuario",
      user: user,
    });
  } catch (error) {
    req.flash("error_msg", "Error al cargar usuario: " + error.message);
    res.redirect("/users");
  }
});

// Actualizar usuario
router.put("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const { username, email, displayName, password } = req.body;

    const updatedUser = await User.update(req.params.id, {
      username,
      email,
      displayName,
      ...(password && { password }),
    });

    // Registrar log
    await Log.create({
      level: "info",
      message: `Usuario ${username} actualizado`,
      userId: req.user.id,
      action: "user_update",
      details: { username, email },
    });

    req.flash("success_msg", "Usuario actualizado correctamente");
    res.redirect("/users");
  } catch (error) {
    req.flash("error_msg", "Error al actualizar usuario: " + error.message);

    const user = await User.findById(req.params.id).catch(() => req.body);
    res.render("users/form", {
      title: "Editar Usuario",
      user: { ...user, ...req.body },
      errors: [error.message],
    });
  }
});

// Eliminar usuario
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error_msg", "Usuario no encontrado");
      return res.redirect("/users");
    }

    await User.delete(req.params.id);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Usuario ${user.username} eliminado`,
      userId: req.user.id,
      action: "user_delete",
      details: { username: user.username },
    });

    req.flash("success_msg", "Usuario eliminado correctamente");
    res.redirect("/users");
  } catch (error) {
    req.flash("error_msg", "Error al eliminar usuario: " + error.message);
    res.redirect("/users");
  }
});

module.exports = router;
