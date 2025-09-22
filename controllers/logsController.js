// controllers/logsController.js
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

exports.getLogs = async (req, res) => {
  try {
    const { service, lines } = req.query;
    const logFile = service ? `/var/log/${service}.log` : "/var/log/mail.log";
    const lineCount = lines || 100;

    const { stdout } = await execPromise(`tail -n ${lineCount} ${logFile}`);

    res.render("logs/view", {
      logs: stdout,
      service: service || "mail",
      lines: lineCount,
      title: "Visualización de Logs",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer logs",
    });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    // Obtener estadísticas del sistema
    const mailQueuePromise = execPromise('mailq | grep -c "^[A-F0-9]"');
    const diskUsagePromise = execPromise("df -h /var/mail");
    const serviceStatusPromise = execPromise(
      "systemctl is-active postfix dovecot antivirus"
    );

    const [mailQueue, diskUsage, serviceStatus] = await Promise.allSettled([
      mailQueuePromise,
      diskUsagePromise,
      serviceStatusPromise,
    ]);

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
    };

    res.render("logs/statistics", {
      statistics: statistics,
      title: "Estadísticas del Sistema",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al obtener estadísticas",
    });
  }
};
