const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const Log = require("../models/Log");
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs").promises;

const execPromise = util.promisify(exec);

// Ver logs de la aplicación
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const { service, lines } = req.query;
    const logFile = service ? `/var/log/${service}.log` : "/var/log/mail.log";
    const lineCount = lines || 100;

    const { stdout } = await execPromise(`tail -n ${lineCount} ${logFile}`);

    res.render("logs/view", {
      title: "Visualización de Logs",
      logs: stdout,
      service: service || "mail",
      lines: lineCount,
    });
  } catch (error) {
    req.flash("error_msg", "Error al leer logs: " + error.message);
    res.redirect("/");
  }
});

// Ver estadísticas
router.get("/statistics", ensureAuthenticated, async (req, res) => {
  try {
    // Obtener estadísticas del sistema
    const mailQueuePromise = execPromise('mailq | grep -c "^[A-F0-9]"');
    const diskUsagePromise = execPromise("df -h /var/mail");
    const serviceStatusPromise = execPromise(
      "systemctl is-active postfix dovecot"
    );

    const [mailQueue, diskUsage, serviceStatus] = await Promise.allSettled([
      mailQueuePromise,
      diskUsagePromise,
      serviceStatusPromise,
    ]);

    // Obtener logs de la aplicación
    const appLogs = await Log.findAll(50);

    // Procesar resultados
    const statistics = {
      mailQueue:
        mailQueue.status === "fulfilled"
          ? mailQueue.value.stdout.trim()
          : "Error",
      diskUsage:
        diskUsage.status === "fulfilled"
          ? diskUsage.value.stdout.trim()
          : "Error",
      serviceStatus:
        serviceStatus.status === "fulfilled"
          ? serviceStatus.value.stdout.trim()
          : "Error",
      appLogs: appLogs,
    };

    res.render("logs/statistics", {
      title: "Estadísticas del Sistema",
      statistics: statistics,
    });
  } catch (error) {
    req.flash("error_msg", "Error al obtener estadísticas: " + error.message);
    res.redirect("/");
  }
});

module.exports = router;
