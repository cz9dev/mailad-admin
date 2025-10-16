// controllers/logsController.js
const { exec } = require("child_process");
const util = require("util");
const Log = require("../models/Log");

const execPromise = util.promisify(exec);

// Función para obtener estadísticas de correo de las últimas 24 horas
const getMailStats = async () => {
  const logFile = "/var/log/mail.log";

  try {
    // Construir filtro de fecha para últimas 24 horas
    const sinceDate = await execPromise(
      "date --date='24 hours ago' '+%b %e %H:%M:%S'"
    );
    const dateFilter = sinceDate.stdout.trim();

    // Contar diferentes tipos de correos
    const commands = [
      `grep -a "${dateFilter}" ${logFile} | grep -c "status=sent" || echo 0`,
      `grep -a "${dateFilter}" ${logFile} | grep -c "to=<" || echo 0`,
      `grep -a "${dateFilter}" ${logFile} | grep -c "status=bounced" || echo 0`,
      `grep -a "${dateFilter}" ${logFile} | grep -ci "spam" || echo 0`,
    ];

    const [sent, received, bounced, spam] = await Promise.all(
      commands.map((cmd) => execPromise(cmd))
    );

    return {
      sent: parseInt(sent.stdout.trim()) || 0,
      received: parseInt(received.stdout.trim()) || 0,
      bounced: parseInt(bounced.stdout.trim()) || 0,
      spam: parseInt(spam.stdout.trim()) || 0,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas de correo:", error);
    return { sent: 0, received: 0, bounced: 0, spam: 0 };
  }
};

// Función para analizar los logs de la aplicación
const analyzeAppLogs = (appLogs) => {
  if (!appLogs || !Array.isArray(appLogs)) {
    return {
      eventsByType: {},
      eventsByLevel: {},
      topEvents: [],
      totalEvents: 0,
      errorCount: 0,
      warningCount: 0,
    };
  }

  const eventsByType = {};
  const eventsByLevel = {
    error: 0,
    warning: 0,
    info: 0,
    debug: 0,
  };

  const errorKeywords = ["error", "failed", "failure", "exception"];
  const warningKeywords = ["warning", "warn", "deprecated", "notice"];

  appLogs.forEach((log) => {
    const message = log.message ? log.message.toLowerCase() : "";

    // Contar por tipo de evento
    if (message.includes("login") || message.includes("authentication")) {
      eventsByType.auth = (eventsByType.auth || 0) + 1;
    } else if (message.includes("email") || message.includes("mail")) {
      eventsByType.email = (eventsByType.email || 0) + 1;
    } else if (message.includes("database") || message.includes("query")) {
      eventsByType.database = (eventsByType.database || 0) + 1;
    } else if (message.includes("user") || message.includes("account")) {
      eventsByType.user = (eventsByType.user || 0) + 1;
    } else if (message.includes("system") || message.includes("server")) {
      eventsByType.system = (eventsByType.system || 0) + 1;
    } else {
      eventsByType.other = (eventsByType.other || 0) + 1;
    }

    // Contar por nivel de severidad
    if (errorKeywords.some((keyword) => message.includes(keyword))) {
      eventsByLevel.error++;
    } else if (warningKeywords.some((keyword) => message.includes(keyword))) {
      eventsByLevel.warning++;
    } else if (message.includes("info")) {
      eventsByLevel.info++;
    } else {
      eventsByLevel.debug++;
    }
  });

  // Obtener top eventos
  const topEvents = Object.entries(eventsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    eventsByType,
    eventsByLevel,
    topEvents,
    totalEvents: appLogs.length,
    errorCount: eventsByLevel.error,
    warningCount: eventsByLevel.warning,
  };
};

// Helper para procesar resultados de Promises
const getResult = (promiseResult, defaultValue = "Error") => {
  return promiseResult.status === "fulfilled"
    ? promiseResult.value.stdout
      ? promiseResult.value.stdout.trim()
      : promiseResult.value
    : defaultValue;
};

// Ver logs de la aplicación
exports.getLogs = async (req, res) => {
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
};

// Ver estadísticas del sistema
exports.getStatistics = async (req, res) => {
  try {
    // Obtener estadísticas del sistema
    const mailQueuePromise = execPromise('mailq | grep -c "^[A-F0-9]"');
    const diskUsagePromise = execPromise("df -h /var/mail");

    // Verificar estado de cada servicio individualmente
    const postfixStatusPromise = execPromise("systemctl is-active postfix");
    const dovecotStatusPromise = execPromise("systemctl is-active dovecot");
    const clamavStatusPromise = execPromise(
      "systemctl is-active clamav-freshclam"
    );

    const mailStatsPromise = getMailStats();

    const [
      mailQueue,
      diskUsage,
      postfixStatus,
      dovecotStatus,
      clamavStatus,
      mailStats,
    ] = await Promise.allSettled([
      mailQueuePromise,
      diskUsagePromise,
      postfixStatusPromise,
      dovecotStatusPromise,
      clamavStatusPromise,
      mailStatsPromise,
    ]);

    // Obtener logs de la aplicación
    const appLogs = await Log.findAll(50);

    // Analizar los logs de la aplicación
    const logAnalysis = analyzeAppLogs(appLogs);

    // Procesar resultados de servicios
    const serviceStatus = {
      postfix: getResult(postfixStatus, "inactive"),
      dovecot: getResult(dovecotStatus, "inactive"),
      clamav: getResult(clamavStatus, "inactive"),
    };

    // Procesar resultados generales
    const statistics = {
      mailQueue: getResult(mailQueue, "0"),
      diskUsage: getResult(diskUsage),
      serviceStatus: serviceStatus,
      mailStats: getResult(mailStats, {
        sent: 0,
        received: 0,
        bounced: 0,
        spam: 0,
      }),
      appLogs: appLogs,
      logAnalysis: logAnalysis, // <- Nuevo: análisis de logs
    };

    res.render("logs/statistics", {
      title: "Estadísticas del Sistema",
      statistics: statistics,
    });
  } catch (error) {
    console.error("Error en getStatistics:", error);
    req.flash("error_msg", "Error al obtener estadísticas: " + error.message);
    res.redirect("/");
  }
};

// Obtener estadísticas de correo via AJAX
exports.getMailStatistics = async (req, res) => {
  try {
    const mailStats = await getMailStats();
    res.json(mailStats);
  } catch (error) {
    console.error("Error en getMailStatistics:", error);
    res.status(500).json({
      sent: 0,
      received: 0,
      bounced: 0,
      spam: 0,
    });
  }
};

// =============================================================================
// NUEVAS FUNCIONES PARA LA COLA DE CORREO
// =============================================================================

// Obtener detalles completos de la cola de correo
const getMailQueueDetails = async () => {
  try {
    // Obtener cantidad de emails en cola
    const queueCountPromise = execPromise('mailq | grep -c "^[A-F0-9]"');

    // Obtener detalles completos de la cola
    const queueDetailsPromise = execPromise("mailq");

    // Obtener resumen por dominios
    const queueByDomainPromise = execPromise(
      "mailq | grep \"^[A-F0-9]\" | awk '{print $7}' | cut -d@ -f2 | sort | uniq -c | sort -rn"
    );

    const [queueCount, queueDetails, queueByDomain] = await Promise.all([
      queueCountPromise,
      queueDetailsPromise,
      queueByDomainPromise,
    ]);

    return {
      count: parseInt(queueCount.stdout.trim()) || 0,
      details: queueDetails.stdout.trim(),
      byDomain: queueByDomain.stdout.trim(),
      timestamp: new Date().toLocaleString(),
    };
  } catch (error) {
    console.error("Error obteniendo detalles de cola:", error);
    return {
      count: 0,
      details: "Error al obtener detalles de la cola",
      byDomain: "",
      timestamp: new Date().toLocaleString(),
    };
  }
};

// Ver cola de correo detallada
exports.getQueue = async (req, res) => {
  try {
    const queueData = await getMailQueueDetails();

    res.render("logs/queue", {
      title: "Cola de Correo",
      queue: queueData,
    });
  } catch (error) {
    console.error("Error en getQueue:", error);
    req.flash("error_msg", "Error al obtener cola de correo: " + error.message);
    res.redirect("/logs/statistics");
  }
};

// Limpiar cola de correo
exports.flushQueue = async (req, res) => {
  try {
    await execPromise("postsuper -d ALL");
    req.flash("success_msg", "Cola de correo limpiada exitosamente");
  } catch (error) {
    console.error("Error en flushQueue:", error);
    req.flash("error_msg", "Error al limpiar cola: " + error.message);
  }
  res.redirect("/logs/queue");
};

// Reintentar envío de cola
exports.retryQueue = async (req, res) => {
  try {
    await execPromise("postfix flush");
    req.flash("success_msg", "Reintentando envío de cola de correo");
  } catch (error) {
    console.error("Error en retryQueue:", error);
    req.flash("error_msg", "Error al reintentar cola: " + error.message);
  }
  res.redirect("/logs/queue");
};

// Limpiar correos diferidos específicos
exports.flushDeferred = async (req, res) => {
  try {
    await execPromise("postsuper -d ALL deferred");
    req.flash("success_msg", "Correos diferidos limpiados exitosamente");
  } catch (error) {
    console.error("Error en flushDeferred:", error);
    req.flash(
      "error_msg",
      "Error al limpiar correos diferidos: " + error.message
    );
  }
  res.redirect("/logs/queue");
};
