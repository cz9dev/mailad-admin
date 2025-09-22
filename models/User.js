const { readDb, writeDb } = require("../config/database");
const { generatePassword } = require("../utils/helpers");

class User {
  static async findAll() {
    const db = await readDb();
    return db.users;
  }

  static async findById(id) {
    const db = await readDb();
    return db.users.find((user) => user.id === parseInt(id));
  }

  static async findByUsername(username) {
    const db = await readDb();
    return db.users.find((user) => user.username === username);
  }

  static async create(userData) {
    const db = await readDb();

    // Generar ID único
    const newId =
      db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;

    const newUser = {
      id: newId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || userData.username,
      password: userData.password || generatePassword(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    await writeDb(db);

    return newUser;
  }

  static async update(id, updates) {
    const db = await readDb();
    const userIndex = db.users.findIndex((user) => user.id === parseInt(id));

    if (userIndex === -1) {
      throw new Error("Usuario no encontrado");
    }

    db.users[userIndex] = {
      ...db.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await writeDb(db);
    return db.users[userIndex];
  }

  static async delete(id) {
    const db = await readDb();
    const userIndex = db.users.findIndex((user) => user.id === parseInt(id));

    if (userIndex === -1) {
      throw new Error("Usuario no encontrado");
    }

    // Eliminación suave
    db.users[userIndex].isActive = false;
    db.users[userIndex].updatedAt = new Date().toISOString();

    await writeDb(db);
    return true;
  }
}

module.exports = User;
