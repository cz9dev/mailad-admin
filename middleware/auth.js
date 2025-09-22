// Middleware para asegurar que el usuario está autenticado
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  req.flash("error_msg", "Por favor inicia sesión para acceder a esta página");
  res.redirect("/auth/login");
}

// Middleware para asegurar que el usuario NO está autenticado (para login/register)
function ensureGuest(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }

  res.redirect("/");
}

// Middleware para verificar roles de usuario
function ensureRole(role) {
  return function (req, res, next) {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    }

    req.flash("error_msg", "No tienes permisos para acceder a esta página");
    res.redirect("/");
  };
}

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  ensureRole,
};
