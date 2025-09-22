// Simulación de base de datos para almacenar configuraciones
const fs = require("fs").promises;
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "config.json");

const ensureDbExists = async () => {
  try {
    await fs.access(path.dirname(dbPath));
  } catch (error) {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  }

  try {
    await fs.access(dbPath);
  } catch (error) {
    await fs.writeFile(
      dbPath,
      JSON.stringify(
        {
          users: [],
          settings: {},
          logs: [],
        },
        null,
        2
      )
    );
  }
};

const readDb = async () => {
  await ensureDbExists();
  const data = await fs.readFile(dbPath, "utf8");
  return JSON.parse(data);
};

const writeDb = async (data) => {
  await ensureDbExists();
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
};

module.exports = {
  readDb,
  writeDb,
};
