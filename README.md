![Social-Repo](/docs/images/socialrepo.png)

# MailAD Admin Panel

![GitHub License](https://img.shields.io/github/license/cz9dev/mailad-admin)

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

## Screenshot

**Login**<br />![Login](/docs/images/01_login.png "Login")

**Panel de control**<br />![Login](/docs/images/02_panel_control.png "Panel de control")

## Instalación

1. Clona el repositorio dentro de la carpeta en la deceas instalar ej: ```/opt:

   ```bash
   cd /opt
   git clone https://github.com/cz9dev/mailad-admin.git
   cd /mailad-admin
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

2.1. Si mailad-admin se conectará a su servidor _Active Directory_ a traves de LDAPS y desplegaras en un entorno de trabajo de desarrollo, debes generar sertificados auto firmados, de lo contrarío no es necesario. Para ello ejecuta el siguiente comando:

```bash
# Variable de entorno
export NODE_TLS_REJECT_UNAUTHORIZED=0

# 1. Exportar el certificado del servidor
openssl s_client -connect servidor-ldap:636 -showcerts </dev/null 2>/dev/null | openssl x509 -outform PEM > certificado.pem

# 2. Agregar a los certificados del sistema
sudo cp certificado.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

3. Configura las variables de entorno:

   Crea un archivo `.env` basado en `.env.example` para un entorno de desarrrollo o prueba y configura los valores necesarios. Si es para un entorno de producción entonces, cree el archivo `.env` basado en `.env.production`, complete con sus datos.

   ```bash
   cp .env.production .env
   ```

4. Inicia el servidor si desplegará con npm, si deplegará con pm2 seguir la [guía](https://cz9dev.github.io/16-06-2025-desplegar-aplicacion-nodejs-en-produccion/):

   ```bash
   npm start
   ```

## Actualización

Suponiendo que tienes el servidor mondato en pm2

1. Detener el servidor
   ```bash
   pm2 stop 0 # Si el id del la aplicacion node es 0, para ver el id de la aplicación debe anteriormente hacer un pm2 status
   ```
2. Acceder al directorio del mailad-admin:
   ```bash
   cd /opt/mailad-admin
   ```
3. Actualizar desde github:
   ```bash
   git pull --rebase
   ```
4. Actualizar dependencias:
   ```bash
   npm update
   ```
5. Inicia el servidor:
   ```bash
   pm2 start 0 #id de la aplicacion node
   ```

## Estructura del proyecto

```
mailad-admin/
├── config/
├── controllers/          # Controladores de la aplicación
├── docs/                 # Documentación
├── middleware/           # Middleware de la aplicación
├── models/               # Modelos de la aplicación
├── public/               # Recursos estáticos (CSS, JS, imágenes)
├── routes/               # Rutas de la aplicación
├── scripts/              # Scripts de utilidad
├── tests/                # Pruebas unitarias e integración
├── utils/                # Utilidades y helpers
├── views/                # Plantillas EJS
├── .env.example          # Ejemplo de variable de entorno para entorno de desarrollo
├── .env.production       # Ejemplo de variable de entorno para entorno de producción
├── .gitignore            # Archivos ignorados por Git
├── app.js                # Punto de entrada de la aplicación
├── FAQ.md                # Archivo contribuido con preguntas y respuestas de la comunidad
├── LICENSE               # Licencia de la aplicación
├── package.json          # Dependencias y scripts del proyecto
└── README.md             # Este archivo
```

## Credenciales para entorno de desarrollo

En un entorno de desarrollo las credenciales por defecto son las siguientes:

- usuario: admin
- password: admin123

Si usted decea pasar a un entorno en producción cambie en su archivo `.env` lo siguiente o copie el archivo `.env.production` por `.env`:

```
# NODE_ENV=development
NODE_ENV=production
```

Una ves cambiado a un entorno de producción solo podrá autenticar contra AD, con los usuarios que tenga dentro del grupo `LDAP_ADMIN_GROUP` que esta declarado en el archivo `.env`

## Sistema de logs

```
├── logger.js (winston) → logs/app.log
│ ├── Errores técnicos
│ ├── Debug de aplicación
│ └── Info del servidor
│
└── Log.js (SQLite) → database.sqlite
├── Acciones de usuarios
├── Auditoría de cambios
└── Logs de negocio (interfaz web)
```

## Licencia

Este proyecto está licenciado bajo MIT License - ver el archivo [LICENSE](LICENSE) para más detalles.
