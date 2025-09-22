// controllers/listController.js
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

exports.listMailLists = async (req, res) => {
  try {
    const { stdout } = await execPromise("mailad group list --mailing-lists");
    const lists = JSON.parse(stdout);

    res.render("lists/list", {
      lists: lists,
      title: "Listas de Correo",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al obtener listas de correo",
    });
  }
};

exports.createMailList = async (req, res) => {
  try {
    const { name, members } = req.body;
    const memberList = Array.isArray(members) ? members.join(",") : members;

    await execPromise(
      `mailad group create ${name} --mailing-list --members ${memberList}`
    );
    req.flash("success", "Lista de correo creada correctamente");
    res.redirect("/lists");
  } catch (error) {
    res.status(500).render("lists/form", {
      list: req.body,
      errors: ["Error al crear lista: " + error.stderr],
      title: "Crear Lista de Correo",
    });
  }
};

exports.updateMailList = async (req, res) => {
  try {
    const { id } = req.params;
    const { members, addMembers, removeMembers } = req.body;

    let command = `mailad group update ${id}`;

    if (members) {
      command += ` --members ${
        Array.isArray(members) ? members.join(",") : members
      }`;
    }

    if (addMembers) {
      command += ` --add-members ${
        Array.isArray(addMembers) ? addMembers.join(",") : addMembers
      }`;
    }

    if (removeMembers) {
      command += ` --remove-members ${
        Array.isArray(removeMembers) ? removeMembers.join(",") : removeMembers
      }`;
    }

    await execPromise(command);
    req.flash("success", "Lista de correo actualizada correctamente");
    res.redirect("/lists");
  } catch (error) {
    res.status(500).render("lists/form", {
      list: { ...req.body, id: req.params.id },
      errors: ["Error al actualizar lista: " + error.stderr],
      title: "Editar Lista de Correo",
    });
  }
};
