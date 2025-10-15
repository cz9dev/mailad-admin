const { exec } = require("child_process");
const util = require("util");

const execPromise = util.promisify(exec);

async function checkSecurity() {
  console.log("🔍 Verificando configuración de seguridad...\n");

  const checks = [
    {
      name: "Variables de entorno seguras",
      check: () => {
        const required = ["SESSION_SECRET", "LDAP_BIND_PASSWORD"];
        const missing = required.filter((env) => !process.env[env]);
        return missing.length === 0;
      },
    },
    {
      name: "Entorno de producción",
      check: () => process.env.NODE_ENV === "production",
    },
    {
      name: "Session secret length",
      check: () =>
        process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    const passed = check.check();
    allPassed = allPassed && passed;
    console.log(`${passed ? "✅" : "❌"} ${check.name}`);
  }

  console.log(
    `\n${
      allPassed
        ? "🎉 Todas las verificaciones pasaron"
        : "⚠️  Algunas verificaciones fallaron"
    }`
  );
  return allPassed;
}

if (require.main === module) {
  checkSecurity();
}

module.exports = checkSecurity;
