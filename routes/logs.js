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

module.exports = router;
