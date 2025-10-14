# MailAD Admin Panel

Panel de administración web para MailAD, escrito en Node.js, Express y EJS.

## Descripción

Este proyecto proporciona una interfaz web para administrar configuraciones y usuarios de MailAD, un sistema de correo conectado a Active Directory mediante Postfix. Está construido utilizando tecnologías modernas de JavaScript:

- **Node.js**: Entorno de ejecución del servidor
- **Express**: Framework web para Node.js
- **EJS**: Motor de plantillas para renderizar vistas
- **Express EJS Layouts**: Soporte para layouts y templates

## Características principales

- Interfaz web intuitiva para gestión de usuarios y grupos
- Configuración de Postfix mediante interfaz gráfica
- Integración con LDAP/Active Directory
- Panel de administración seguro con autenticación
- Logs detallados y sistema de notificaciones

## Requisitos del sistema

- Node.js 18 o superior
- npm 9 o superior
- MailAD instalado y configurado

## Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/cz9dev/mailad-admin.git
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Configura las variables de entorno:

   Crea un archivo `.env` basado en `.env.example` y configura los valores necesarios.

4. Inicia el servidor:

   ```bash
   npm start
   ```

## Estructura del proyecto

```
mailad-admin/
├── controllers/          # Controladores de la aplicación
├── postfix/              # Configuraciones relacionadas con Postfix
├── utils/                # Utilidades y helpers
├── views/                # Plantillas EJS
├── .env                  # Variables de entorno
├── .gitignore            # Archivos ignorados por Git
├── app.js                # Punto de entrada de la aplicación
├── package.json          # Dependencias y scripts del proyecto
└── README.md             # Este archivo
```
## Credenciales por defecto
Como el proyecto esta en desarrollo las gestion de usuario aun no se ha implementado correctamente, no debe implementarce aun este proyecto en un entorno de produccionde main-ad
usuario: admin
password: admin123

## Licencia

Este proyecto está licenciado bajo MIT License - ver el archivo [LICENSE](LICENSE) para más detalles.
