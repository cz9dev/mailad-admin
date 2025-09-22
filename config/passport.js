const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { checkAdminCredentials } = require("../utils/helpers");
const { readDb } = require("./database");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Verificar si es el administrador principal
      if (username === "admin") {
        const isAuthenticated = await checkAdminCredentials(username, password);
        if (isAuthenticated) {
          return done(null, {
            id: 1,
            username: "admin",
            role: "superadmin",
          });
        }
      }

      // Verificar usuarios en la base de datos
      const db = await readDb();
      const user = db.users.find((u) => u.username === username && u.isActive);

      if (!user) {
        return done(null, false, { message: "Usuario no encontrado" });
      }

      // Verificar contraseña (en un caso real, usaríamos bcrypt)
      const passwordMatch = await checkAdminCredentials(username, password);
      if (!passwordMatch) {
        return done(null, false, { message: "Contraseña incorrecta" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = await readDb();
    const user = db.users.find((u) => u.id === id) || {
      id: 1,
      username: "admin",
      role: "superadmin",
    };
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
