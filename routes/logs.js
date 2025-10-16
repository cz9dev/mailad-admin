// routes/logs.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const logsController = require("../controllers/logsController");

// Ver logs de la aplicación
router.get("/", ensureAuthenticated, logsController.getLogs);

// Ver estadísticas del sistema
router.get("/statistics", ensureAuthenticated, logsController.getStatistics);

// Obtener estadísticas de correo via AJAX
router.get(
  "/mail-statistics",
  ensureAuthenticated,
  logsController.getMailStatistics
);

// Ver cola de correo detallada
router.get("/queue", ensureAuthenticated, logsController.getQueue);

// Limpiar cola de correo
router.post("/flush-queue", ensureAuthenticated, logsController.flushQueue);

// Reintentar envío de cola
router.post("/retry-queue", ensureAuthenticated, logsController.retryQueue);

// Limpiar correos diferidos
router.post(
  "/flush-deferred",
  ensureAuthenticated,
  logsController.flushDeferred
);

module.exports = router;
