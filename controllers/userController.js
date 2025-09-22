// controllers/userController.js
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

exports.listUsers = async (req, res) => {
  try {
    const { stdout } = await execPromise("mailad user list");
    const users = JSON.parse(stdout);
    res.render("users/list", {
      users: users,
      title: "Gestión de Usuarios",
    });
  } catch (error) {
    res.status(500).render("error", {
      error: error,
      message: "Error al listar usuarios",
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, password, email, displayName } = req.body;
    const command = `mailad user create ${username} ${password} ${email} "${displayName}"`;

    await execPromise(command);
    req.flash("success", "Usuario creado correctamente");
    res.redirect("/users");
  } catch (error) {
    res.status(500).render("users/form", {
      user: req.body,
      errors: ["Error al crear usuario: " + error.stderr],
      title: "Crear Usuario",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, displayName, password } = req.body;

    let command = `mailad user update ${id} `;
    if (email) command += `--email ${email} `;
    if (displayName) command += `--displayName "${displayName}" `;
    if (password) command += `--password ${password}`;

    await execPromise(command);
    req.flash("success", "Usuario actualizado correctamente");
    res.redirect("/users");
  } catch (error) {
    res.status(500).render("users/form", {
      user: { ...req.body, id: req.params.id },
      errors: ["Error al actualizar usuario: " + error.stderr],
      title: "Editar Usuario",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await execPromise(`mailad user delete ${id}`);
    req.flash("success", "Usuario eliminado correctamente");
    res.redirect("/users");
  } catch (error) {
    req.flash("error", "Error al eliminar usuario: " + error.stderr);
    res.redirect("/users");
  }
};
