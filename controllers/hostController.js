// controllers/hostController.js
const fs = require("fs").promises;
const os = require("os");
const ini = require("ini");

const HOSTNAME_PATH = "/etc/hostname";
const HOSTS_PATH = "/etc/hosts";
const MAIN_CF_PATH = "/etc/postfix/main.cf";

exports.getHostConfig = async (req, res) => {
  try {
    const hostname = await fs.readFile(HOSTNAME_PATH, "utf8");
    const hosts = await fs.readFile(HOSTS_PATH, "utf8");
    const mainCf = await fs.readFile(MAIN_CF_PATH, "utf8");

    // Extraer mydomain y myhostname de main.cf
    const mydomainMatch = mainCf.match(/mydomain\s*=\s*(.*)/);
    const myhostnameMatch = mainCf.match(/myhostname\s*=\s*(.*)/);

    res.render("host/config", {
      hostname: hostname.trim(),
      hosts: hosts,
      mydomain: mydomainMatch ? mydomainMatch[1] : "",
      myhostname: myhostnameMatch ? myhostnameMatch[1] : "",
      title: "Configuración de Host y Dominio",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer configuración de host",
    });
  }
};

exports.updateHostConfig = async (req, res) => {
  try {
    const { hostname, mydomain, myhostname, hosts } = req.body;

    // Actualizar /etc/hostname
    await fs.writeFile(HOSTNAME_PATH, hostname + "\n");

    // Actualizar /etc/hosts
    await fs.writeFile(HOSTS_PATH, hosts);

    // Actualizar main.cf de Postfix
    let mainCf = await fs.readFile(MAIN_CF_PATH, "utf8");

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

    await fs.writeFile(MAIN_CF_PATH, mainCf);

    // Establecer nuevo hostname
    const { exec } = require("child_process");
    exec(`hostnamectl set-hostname ${hostname}`);

    // Recargar servicios
    exec("systemctl restart postfix");
    exec("systemctl restart mailad-related-services");

    req.flash(
      "success",
      "Configuración de host y dominio actualizada correctamente"
    );
    res.redirect("/host");
  } catch (error) {
    res.status(500).render("host/config", {
      ...req.body,
      errors: ["Error al actualizar configuración: " + error.message],
      title: "Configuración de Host y Dominio",
    });
  }
};
