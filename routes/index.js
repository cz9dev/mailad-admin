const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

// Página principal
router.get("/", ensureAuthenticated, dashboardController.showDashboard);

module.exports = router;