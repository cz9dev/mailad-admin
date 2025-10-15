const User = require("../models/User");
const Alias = require("../models/Alias");
const Group = require("../models/Group");
const Log = require("../models/Log");

async function getDashboardData() {
  try {
    const [totalUsers, totalAliases, totalLists, recentLogs] =
      await Promise.all([
        User.count(), // Contar usuarios
        Alias.count(), // Contar alias
        Group.count(), // Contar listas
        Log.findRecent(5), // Obtener los últimos 10 logs
      ]);

    return {
      totalUsers,
      totalAliases,
      totalLists,
      recentLogs,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas del sistema:", error);
    throw error;
  }
}

exports.showDashboard = async (req, res) => {
  try {
    const stats = await getDashboardData();
    res.render("dashboard", {
      title: "Panel de Control",
      user: req.user,
      logs: stats.recentLogs,
      totalUsers: stats.totalUsers,
      totalAliases: stats.totalAliases,
      totalLists: stats.totalLists,
    });
  } catch (error) {
    res.status(500).render("error", {
      title: "Error",
      message: "No se pudieron cargar las estadísticas del sistema.",
    });
  }
};
