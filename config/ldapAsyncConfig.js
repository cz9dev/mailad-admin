const Ldap = require("ldap-async").default;
const ldapBindDN = process.env.LDAP_BIND_DN || "cn=admin,dc=example,dc=com";
const ldapBindPassword = process.env.LDAP_BIND_PASSWORD || "password";

const ldap = new Ldap({
  url: process.env.LDAP_URL || "ldap://your-ad-server:389", // Dirección del servidor AD
  bindDN: ldapBindDN,
  bindCredentials: ldapBindPassword,
  // Optional: Specify a pool size (default is 5)
  poolSize: 5,
});

module.exports = { ldap }; 