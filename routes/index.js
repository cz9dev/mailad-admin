const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");

// Página principal
router.get("/", ensureAuthenticated, (req, res) => {
  res.render("dashboard", {
    title: "Panel de Control",
    user: req.user,
  });
});

module.exports = router;
