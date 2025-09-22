// Funciones JavaScript para la interfaz

// Confirmación para acciones destructivas
document.addEventListener("DOMContentLoaded", function () {
  // Confirmar eliminaciones
  const deleteForms = document.querySelectorAll("form[data-confirm]");
  deleteForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      const message = this.getAttribute("data-confirm") || "¿Estás seguro?";
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // Tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Auto-ocultar alerts después de 5 segundos
  const alerts = document.querySelectorAll(".alert:not(.alert-permanent)");
  alerts.forEach((alert) => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
});

// Funciones para gestión de formularios dinámicos
function addFormRow(containerId, templateId) {
  const container = document.getElementById(containerId);
  const template = document.getElementById(templateId);
  const newRow = template.content.cloneNode(true);
  container.appendChild(newRow);
}

function removeFormRow(button) {
  const row = button.closest(".form-row");
  row.remove();
}
