# MailAD-admin FAQ

Si deceas contribuir con algunas preguntas y respuestas, puede en este apartado aportar a la documentación de Mailad-admin

**Tabla de contenido:**
1. [🔑 Permisos Necesarios para Crear Usuarios en Active Directory](#permisos-necesarios-para-crear-usuarios-en-active-directory)
2. [🛠️ Cómo Configurar los Permisos Mediante Delegación en Active Directory](#cómo-configurar-los-permisos-mediante-delegación-en-active-directory)
3. [💡 Consideraciones Adicionales de Seguridad en Active Directory](#consideraciones-adicionales-de-seguridad-en-active-directory)
4. [🛠️ Permisos Necesarios para gestionar Alias](#permisos-necesarios-para-gestionar-alias)
5. [💡 No se encuentra el archivo trasport en postfix](#no-se-encuentra-el-archivo-trasport-en-postfix)
6. [💡 No muestra los Logs del Sistema y en parte de las estaditicas](#no-muestra-los-logs-del-sistema-y-en-parte-de-las-estaditicas)
7. [⚠️ Error de certificado autofirmado con NODEJS](#error-de-certificado-autofirmado-con-nodejs)

## Permisos Necesarios para Crear Usuarios en Active Directory

Para crear y administrar usuarios de forma efectiva, tu cuenta de servicio (LDAP_BIND_DN) debe tener los siguientes permisos en la Unidad Organizativa (OU) donde residirán los nuevos usuarios

| Permiso                                     | Propósito / Acción Permitida                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Crear objetos de usuario                    | Permite agregar nuevas cuentas de usuario en la OU designada                                                                    |
| Eliminar objetos de usuario                 | Permite eliminar cuentas de usuario (si es un requisito de tu aplicación)                                                       |
| Escribir (Write) en propiedades generales   | Permite establecer o modificar atributos como displayName, cn (nombre completo), givenName (nombre), sn (apellido), entre otros |
| Cambiar contraseña y Restablecer contraseña | Permite establecer la contraseña inicial del usuario y restablecerla posteriormente                                             |
| Escribir descripción                        | Permite modificar el atributo "description" del usuario                                                                         |

## Cómo Configurar los Permisos Mediante Delegación en Active Directory

La forma más segura y recomendada de conceder estos permisos es utilizando el **Asistente para delegación de control** en las **Herramientas de administración remota del servidor (RSAT)**.

1. **Abrir el Asistente**: En "Usuarios y equipos de Active Directory", haz clic con el botón derecho en la **OU destino** y selecciona "**Delegar control...**"
2. **Seleccionar la Cuenta de Servicio**: Agrega tu cuenta de servicio (`LDAP_BIND_DN`) o un grupo al que pertenezca como el principal al que se delegarán los permisos
3. **Definir la Tarea Personalizada**: En la página "Tareas que se delegarán", elige la opción **"Crear una tarea personalizada para delegar"** para tener un control granular
4. **Especificar el Tipo de Objeto**: Selecciona **"Solo los siguientes objetos en la carpeta"** y luego marca la casilla **"Objetos de usuario"**. También debes marcar **"Crear los objetos seleccionados en esta carpeta"** para permitir la creación
5. **Seleccionar Permisos**: En la lista de permisos, debes otorgar, como mínimo, los permisos que se muestran en la tabla anterior

## Consideraciones Adicionales de Seguridad en Active Directory

- **Principio de Mínimo Privilegio**: Concede permisos solo en la OU específica donde se crearán los usuarios, nunca a nivel de dominio completo
- **Evita Permisos Excesivos**: Otorgar "Control total" permite establecer opciones que debilitan la seguridad, como "La contraseña nunca caduca"
- **Utiliza Cuentas de Servicio Dedicadas**: Es una buena práctica usar una cuenta creada específicamente para esta aplicación, en lugar de una cuenta de administrador personal

## Permisos Necesarios para gestionar Alias

Asegúrate de que la aplicación tenga permisos para leer y escribir en ```/etc/postfix/aliases/```

## No se encuentra el archivo trasport en postfix
Es ocurre por que por defecto mailad no esta creandolo, para el caso en que necesitemos trsporte debemos agregar en el archivo ```/etc/postfix/main.cf``` al final lo siguiente
```bash
sudo nano /etc/postfix/main.cf
 # Al final del archivo agregar 
 
 # Agregar transport para el reenvio de correos sin
transport_maps = hash:/etc/postfix/transport
```
Guardas los cambios en el archivo y creas un archivo transport en la misma dirección
```bash
sudo edit /etc/postfix/transport
#Archivo para transporte de correo
```
Este archivo puede ser utilizado para reenviar una copia de todo a mailpiler o cosas similares

## No muestra los Logs del Sistema y en parte de las estaditicas
En muchos casos sucede esto por que durante o antes de la instalacion de MailAD no se instaló rsyslog en el sistema, para revizar si es el caso 
```bash
sudo systemctl status rsyslog
```

Si no rsyslog no esta instalado entonces debes instalarlo
```bash
# Instalar rsyslog
sudo apt install rsyslog
# Verificar estado de servicios
systemctl status postfix
systemctl status rsyslog
# Reiniciar servicios
systemctl restart postfix
systemctl restart rsyslog
```

## Error de certificado autofirmado con NODEJS
Al intentar conectar mailad-admin con servicios LDAPS, se presenta el error:


### Entorno
- **Sistema Operativo:** Ubuntu/Debian
- **Aplicación:** mailad-admin
- **Servicio:** LDAPS con certificado autofirmado
- **Contexto:** Servidor interno con infraestructura propia

### Causa Raíz
Node.js no confía en certificados autofirmados por defecto, y cuando se intenta conectar a servicios LDAPS con certificados no firmados por una CA reconocida, falla la verificación TLS.

### Solución Aplicada

#### 1. **Configurar Node.js para aceptar certificados autofirmados** (Entorno de desarrollo)

```bash
# Variable de entorno temporal
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Para hacerlo permanente en la aplicación
echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> .env

# 2. Exportar el certificado del servidor
openssl s_client -connect servidor-ldap:636 -showcerts </dev/null 2>/dev/null | openssl x509 -outform PEM > certificado.pem

# 3. Agregar a los certificados del sistema
sudo cp certificado.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates

# 4. Configurar Node.js para usar certificados del sistema
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```