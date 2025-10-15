const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { checkAdminCredentials } = require("../utils/helpers");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Usar ÚNICAMENTE la autenticación LDAP de helpers.js
      const isAuthenticated = await checkAdminCredentials(username, password);

      if (isAuthenticated) {
        return done(null, {
          id: username, // Usar el username como ID
          username: username,
          role: "admin", // Todos los usuarios autenticados son admin
        });
      } else {
        return done(null, false, { message: "Credenciales incorrectas" });
      }
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, {
    id: user.username,
    username: user.username,
    role: user.role,
  });
});

passport.deserializeUser(async (userData, done) => {
  // Como solo tenemos usuarios admin, devolvemos los datos serializados
  done(null, userData);
});

module.exports = passport;
