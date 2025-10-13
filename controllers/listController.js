// controllers/listController.js

const Group = require("../models/Group");

exports.listMailLists = async (req, res) => {
  try {
    const lists = await Group.findAll();
    res.render("users/list", {
      lists: lists,
      title: "Listas de Correo",
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).render("error", {
      error: error,
      message: "Error al obtener listas de correo",
    });
  }
};

exports.createMailList = async (req, res) => {
  try {
    const newList = await Group.create(req.body);
    res.status(201).json(newList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMailList = async (req, res) => {
  try {
    const updatedList = await Group.update(req.params.group, req.body);
    res.status(200).json(updatedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMailList = async (req, res) => {
  try {
    await Group.delete(req.params.username);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};