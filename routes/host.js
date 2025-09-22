const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const fs = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");
const postfix = require("../utils/postfix");
const Log = require("../models/Log");

const execPromise = util.promisify(exec);

// Obtener configuración de host
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const hostname = await fs.readFile("/etc/hostname", "utf8");
    const hosts = await fs.readFile("/etc/hosts", "utf8");
    const mainCf = await postfix.getMainCf();

    const mydomainMatch = mainCf.match(/mydomain\s*=\s*(.*)/);
    const myhostnameMatch = mainCf.match(/myhostname\s*=\s*(.*)/);

    res.render("host/config", {
      title: "Configuración de Host y Dominio",
      hostname: hostname.trim(),
      hosts: hosts,
      mydomain: mydomainMatch ? mydomainMatch[1] : "",
      myhostname: myhostnameMatch ? myhostnameMatch[1] : "",
    });
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al cargar configuración de host: " + error.message
    );
    res.redirect("/");
  }
});

// Actualizar configuración de host
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const { hostname, mydomain, myhostname, hosts } = req.body;

    // Actualizar /etc/hostname
    await fs.writeFile("/etc/hostname", hostname + "\n");

    // Actualizar /etc/hosts
    await fs.writeFile("/etc/hosts", hosts);

    // Actualizar main.cf de Postfix
    let mainCf = await postfix.getMainCf();

    if (mainCf.includes("mydomain")) {
      mainCf = mainCf.replace(/mydomain\s*=\s*.*/, `mydomain = ${mydomain}`);
    } else {
      mainCf += `\nmydomain = ${mydomain}\n`;
    }

    if (mainCf.includes("myhostname")) {
      mainCf = mainCf.replace(
        /myhostname\s*=\s*.*/,
        `myhostname = ${myhostname}`
      );
    } else {
      mainCf += `\nmyhostname = ${myhostname}\n`;
    }

    await postfix.updateMainCf(mainCf);

    // Establecer nuevo hostname
    await execPromise(`hostnamectl set-hostname ${hostname}`);

    // Registrar log
    await Log.create({
      level: "info",
      message: "Configuración de host y dominio actualizada",
      userId: req.user.id,
      action: "host_update",
      details: { hostname, mydomain, myhostname },
    });

    req.flash(
      "success_msg",
      "Configuración de host y dominio actualizada correctamente"
    );
    res.redirect("/host");
  } catch (error) {
    req.flash(
      "error_msg",
      "Error al actualizar configuración de host: " + error.message
    );

    // Intentar cargar la configuración actual
    let currentConfig = req.body;
    try {
      const hostname = await fs.readFile("/etc/hostname", "utf8");
      const hosts = await fs.readFile("/etc/hosts", "utf8");
      const mainCf = await postfix.getMainCf();

      const mydomainMatch = mainCf.match(/mydomain\s*=\s*(.*)/);
      const myhostnameMatch = mainCf.match(/myhostname\s*=\s*(.*)/);

      currentConfig = {
        hostname: hostname.trim(),
        hosts: hosts,
        mydomain: mydomainMatch ? mydomainMatch[1] : "",
        myhostname: myhostnameMatch ? myhostnameMatch[1] : "",
      };
    } catch (e) {
      // Si no se puede cargar, usar los valores del formulario
    }

    res.render("host/config", {
      title: "Configuración de Host y Dominio",
      ...currentConfig,
      errors: [error.message],
    });
  }
});

module.exports = router;
