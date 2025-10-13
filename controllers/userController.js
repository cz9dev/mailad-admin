// controllers/userController.js

const User = require("../models/User");

exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.render("users/list", {
      users: users,
      title: "Gestión de Usuarios",
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).render("error", {
      error: error,
      message: "Error al listar usuarios",
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.update(req.params.username, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {    
    await User.delete(req.params.username);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
