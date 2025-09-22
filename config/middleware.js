const express = require("express");
const session = require("express-session");
const passport = require("./passport");
const flash = require("connect-flash");
const path = require("path");
const logger = require("../utils/logger");

const configureMiddleware = (app) => {
  // Configuración de sesión
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      },
    })
  );

  // Inicializar Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Flash messages
  app.use(flash());

  // Variables globales para las vistas
  app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.user = req.user || null;
    next();
  });

  // Servir archivos estáticos
  app.use(express.static(path.join(__dirname, "../public")));

  // Parsear application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));

  // Parsear application/json
  app.use(express.json());

  // Logger de solicitudes
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      user: req.user ? req.user.username : "anonymous",
    });
    next();
  });
};

module.exports = configureMiddleware;
