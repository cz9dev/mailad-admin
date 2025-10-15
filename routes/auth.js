const express = require("express");
const passport = require("passport");
const router = express.Router();
const { ensureAuthenticated, ensureGuest } = require("../middleware/auth");
const { getCacheStats, clearUserAuthCache } = require("../utils/helpers");

// Endpoint para estadísticas de caché (solo admin)
router.get('/cache/stats', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  const stats = getCacheStats();
  res.json(stats);
});

// Endpoint para limpiar caché de un usuario
router.post('/cache/clear-user', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username requerido' });
  }
  
  const cleared = clearUserAuthCache(username);
  res.json({ 
    message: `Cache limpiado para usuario: ${username}`,
    itemsCleared: cleared 
  });
});

// Página de login
router.get("/login", ensureGuest, (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("auth/login", {
    title: "Iniciar Sesión",
    message: req.flash("error"),
    layout: false,
  });
});

// Procesar login
router.post("/login", ensureGuest, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/auth/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      // Registrar log de inicio de sesión
      const Log = require("../models/Log");
      Log.create({
        level: "info",
        message: `Inicio de sesión de ${user.username}`,
        userId: user.id,
        action: "login",
      });

      return res.redirect("/");
    });
  })(req, res, next);
});

// Cerrar sesión
router.get("/logout", ensureAuthenticated, (req, res) => {
  // Registrar log de cierre de sesión
  const Log = require("../models/Log");
  Log.create({
    level: "info",
    message: `Cierre de sesión de ${req.user.username}`,
    userId: req.user.id,
    action: "logout",
  });

  req.logout((err) => {
    // Agrega la función callback
    if (err) {
      console.error("Error al cerrar sesión:", err); // Maneja el error
      return res.redirect("/auth/login"); // Redirige en caso de error
    }
    req.flash("success_msg", "Has cerrado sesión correctamente");
    res.redirect("/auth/login"); // Redirige tras cerrar sesión
  });
});

module.exports = router;
