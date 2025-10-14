// routes/security.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const {
  getSecurityConfig,
  updateAntivirusConfig,
  testAntivirus,
  reloadAntivirus,
} = require("../controllers/securityController");

// Obtener configuración de seguridad
router.get("/", ensureAuthenticated, getSecurityConfig);

// Actualizar configuración de antivirus
router.post("/antivirus", ensureAuthenticated, updateAntivirusConfig);

// Probar configuración de antivirus
router.post("/antivirus/test", ensureAuthenticated, testAntivirus);

// Recargar servicios de antivirus
router.post("/antivirus/reload", ensureAuthenticated, reloadAntivirus);

module.exports = router;
