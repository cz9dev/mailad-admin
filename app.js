require("dotenv").config();
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const path = require("path");

// Importar configuración
const configMiddleware = require("./config/middleware");

// Importar rutas
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const aliasRoutes = require("./routes/aliases");
const blacklistRoutes = require("./routes/blacklist");
const listRoutes = require("./routes/lists");
const ldapRoutes = require("./routes/ldap");
const transportRoutes = require("./routes/transport");
const relayRoutes = require("./routes/relay");
const hostRoutes = require("./routes/host");
const securityRoutes = require("./routes/security");
const logRoutes = require("./routes/logs");

const app = express();

// Configuración de vistas
app.set("view engine", "ejs");
app.set("layout", "layouts/main");
app.set("views", path.join(__dirname, "views"));

// Middleware
configMiddleware(app);
app.use(expressLayouts);
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));

// Rutas
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/aliases", aliasRoutes);
app.use("/blacklist", blacklistRoutes);
app.use("/lists", listRoutes);
app.use("/ldap", ldapRoutes);
app.use("/transport", transportRoutes);
app.use("/relay", relayRoutes);
app.use("/host", hostRoutes);
app.use("/security", securityRoutes);
app.use("/logs", logRoutes);

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).render("error", {
    title: "Página no encontrada",
    message: "La página que buscas no existe.",
    error: {},
  });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "Error del servidor",
    message: "Ocurrió un error inesperado.",
    NODE_ENV: process.env.NODE_ENV,
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor MailAD Admin ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;