// controllers/ldapController.js
const fs = require("fs").promises;
const path = require("path");
const ini = require("ini");

const LDAP_CONFIG_PATH = "/etc/mailad/ldap.conf";

exports.getLdapConfig = async (req, res) => {
  try {
    const data = await fs.readFile(LDAP_CONFIG_PATH, "utf8");
    const config = ini.parse(data);

    res.render("ldap/config", {
      config: config,
      title: "Configuración LDAP/AD",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al leer configuración LDAP",
    });
  }
};

exports.updateLdapConfig = async (req, res) => {
  try {
    const config = ini.stringify(req.body);
    await fs.writeFile(LDAP_CONFIG_PATH, config);

    // Reiniciar servicios dependientes
    const { exec } = require("child_process");
    exec("systemctl restart mailad-related-services");

    req.flash("success", "Configuración LDAP/AD actualizada correctamente");
    res.redirect("/ldap");
  } catch (error) {
    res.status(500).render("ldap/config", {
      config: req.body,
      errors: ["Error al actualizar configuración: " + error.message],
      title: "Configuración LDAP/AD",
    });
  }
};
