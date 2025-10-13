const LdapAuth = require('ldapauth-fork');
const iconv = require('iconv-lite'); // Para codificar la contraseña
const ldapBindDN = process.env.LDAP_BIND_DN || "cn=admin,dc=example,dc=com";
const ldapBindPassword = process.env.LDAP_BIND_PASSWORD || "password";
const ldapSearchBase =
  process.env.LDAP_BASE_DN || "ou=users,dc=tu-dominio,dc=com";

// Configuración básica del servidor LDAP/Active Directory
const ldap = {
  url: process.env.LDAP_URL || "ldap://your-ad-server:389", // Dirección del servidor AD
  bindDN: ldapBindDN, // Usuario con permisos de escritura
  bindCredentials: ldapBindPassword,
  searchBase: ldapSearchBase,
  searchFilter: "(sAMAccountName={{username}})",
  // Añade opciones de TLS si es necesario
};

module.exports = ldap;
