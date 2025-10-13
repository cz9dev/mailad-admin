//routes/users.js

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
      users: users,
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

    console.log("Solicitud de creación de usuario:", {
      username,
      email,
      displayName,
      password: password ? "***" : "no",
    });

    // Validaciones mejoradas
    if (!username || !email || !displayName || !password) {
      throw new Error("Todos los campos son obligatorios.");
    }

    if (username.length < 3) {
      throw new Error("El nombre de usuario debe tener al menos 3 caracteres");
    }

    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("El formato del email no es válido");
    }

    const newUser = await User.create({
      username: username.trim(),
      email: email.trim(),
      displayName: displayName.trim(),
      password: password,
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
    console.error("Error al crear usuario:", error);
    req.flash("error_msg", "Error al crear usuario: " + error.message);

    res.render("users/form", {
      title: "Crear Usuario",
      user: req.body,
      errors: [error.message],
    });
  }
});

// Ruta API para obtener usuarios activos
router.get("/active-users", ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.findAll();
    
    // Filtrar solo usuarios activos y mapear a formato necesario
    const activeUsers = users
      .filter(user => user.isActive && user.mail) // Solo usuarios activos con email
      .map(user => ({
        name: user.displayName || user.cn || user.username,
        email: user.mail,
        username: user.username,
        dn: user.distinguishedName,
      }));
    
    res.json(activeUsers);
  } catch (error) {
    console.error("Error obteniendo usuarios activos:", error);
    res.status(500).json({ error: "Error al cargar usuarios activos" });
  }
});

// Formulario editar usuario
router.get("/:username/edit", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.username);

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
router.put("/:username", ensureAuthenticated, async (req, res) => {
  try {
    const originalUsername = req.params.username;
    const { username, email, displayName, password } = req.body;

    console.log(`Solicitud de actualización para: ${originalUsername}`);
    console.log("Nuevos datos:", {
      username,
      email,
      displayName,
      password: password ? "***" : "no proporcionada",
    });

    // Validaciones mejoradas
    if (!username || !email || !displayName) {
      throw new Error("Usuario, email y nombre para mostrar son obligatorios.");
    }

    if (password && password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    const updateData = {
      username: username.trim(),
      email: email.trim(),
      displayName: displayName.trim(),
    };

    // Incluir contraseña solo si se proporciona
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    const updatedUser = await User.update(originalUsername, updateData);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Usuario ${originalUsername} actualizado${
        password ? " (incluyendo contraseña)" : ""
      }`,
      username: req.user.username,
      action: "user_update",
      details: {
        originalUsername,
        newUsername: username,
        email,
        passwordChanged: !!password,
      },
    });

    req.flash(
      "success_msg",
      "Usuario actualizado correctamente" +
        (password ? " (contraseña cambiada)" : "")
    );
    res.redirect("/users");
  } catch (error) {
    console.error("Error completo en actualización:", error);
    req.flash("error_msg", "Error al actualizar usuario: " + error.message);

    // Recargar datos para el formulario
    try {
      const user = await User.findById(req.params.username);
      res.render("users/form", {
        title: "Editar Usuario",
        user: { ...user, ...req.body },
        errors: [error.message],
      });
    } catch (findError) {
      res.render("users/form", {
        title: "Editar Usuario",
        user: req.body,
        errors: [error.message],
      });
    }
  }
});

// Eliminar usuario
router.post("/:username/delete", ensureAuthenticated, async (req, res) => {
  try {
    const username = req.params.username; // ✅ Definir la variable
    const user = await User.findById(username);

    if (!user) {
      req.flash("error_msg", "Usuario no encontrado");
      return res.redirect("/users");
    }

    await User.delete(username);

    // Registrar log
    await Log.create({
      level: "info",
      message: `Usuario ${user.username} eliminado`,
      username: req.user.username,
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
