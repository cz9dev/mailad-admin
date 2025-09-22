const ldap = require("ldapjs");
const logger = require("./logger");

class LDAPClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = ldap.createClient({
        url: process.env.LDAP_URL,
      });

      this.client.bind(
        process.env.LDAP_BIND_DN,
        process.env.LDAP_BIND_PASSWORD,
        (err) => {
          if (err) {
            logger.error("Error conectando a LDAP:", err);
            reject(err);
          } else {
            this.connected = true;
            logger.info("Conectado exitosamente a LDAP");
            resolve();
          }
        }
      );
    });
  }

  async search(base, options) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error("LDAP client not connected"));
      }

      const results = [];
      this.client.search(base, options, (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        res.on("searchEntry", (entry) => {
          results.push(entry.object);
        });

        res.on("error", (err) => {
          reject(err);
        });

        res.on("end", (result) => {
          resolve(results);
        });
      });
    });
  }

  async add(dn, entry) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error("LDAP client not connected"));
      }

      this.client.add(dn, entry, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async modify(dn, change) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error("LDAP client not connected"));
      }

      this.client.modify(dn, change, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async delete(dn) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error("LDAP client not connected"));
      }

      this.client.del(dn, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  disconnect() {
    if (this.client) {
      this.client.unbind();
      this.connected = false;
    }
  }
}

module.exports = new LDAPClient();
