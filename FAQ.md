# 🔑 Permisos Necesarios para Crear Usuarios en Active Directory

Para crear y administrar usuarios de forma efectiva, tu cuenta de servicio (LDAP_BIND_DN) debe tener los siguientes permisos en la Unidad Organizativa (OU) donde residirán los nuevos usuarios

| Permiso                                     | Propósito / Acción Permitida                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Crear objetos de usuario                    | Permite agregar nuevas cuentas de usuario en la OU designada                                                                    |
| Eliminar objetos de usuario                 | Permite eliminar cuentas de usuario (si es un requisito de tu aplicación)                                                       |
| Escribir (Write) en propiedades generales   | Permite establecer o modificar atributos como displayName, cn (nombre completo), givenName (nombre), sn (apellido), entre otros |
| Cambiar contraseña y Restablecer contraseña | Permite establecer la contraseña inicial del usuario y restablecerla posteriormente                                             |
| Escribir descripción                        | Permite modificar el atributo "description" del usuario                                                                         |

# 🛠️ Cómo Configurar los Permisos Mediante Delegación en Active Directory

La forma más segura y recomendada de conceder estos permisos es utilizando el **Asistente para delegación de control** en las **Herramientas de administración remota del servidor (RSAT)**.

1. **Abrir el Asistente**: En "Usuarios y equipos de Active Directory", haz clic con el botón derecho en la **OU destino** y selecciona "**Delegar control...**"
2. **Seleccionar la Cuenta de Servicio**: Agrega tu cuenta de servicio (`LDAP_BIND_DN`) o un grupo al que pertenezca como el principal al que se delegarán los permisos
3. **Definir la Tarea Personalizada**: En la página "Tareas que se delegarán", elige la opción **"Crear una tarea personalizada para delegar"** para tener un control granular
4. **Especificar el Tipo de Objeto**: Selecciona **"Solo los siguientes objetos en la carpeta"** y luego marca la casilla **"Objetos de usuario"**. También debes marcar **"Crear los objetos seleccionados en esta carpeta"** para permitir la creación
5. **Seleccionar Permisos**: En la lista de permisos, debes otorgar, como mínimo, los permisos que se muestran en la tabla anterior

# 💡 Consideraciones Adicionales de Seguridad en Active Directory

- **Principio de Mínimo Privilegio**: Concede permisos solo en la OU específica donde se crearán los usuarios, nunca a nivel de dominio completo
- **Evita Permisos Excesivos**: Otorgar "Control total" permite establecer opciones que debilitan la seguridad, como "La contraseña nunca caduca"
- **Utiliza Cuentas de Servicio Dedicadas**: Es una buena práctica usar una cuenta creada específicamente para esta aplicación, en lugar de una cuenta de administrador personal

# Permisos Necesarios para gestionar Alias

Asegúrate de que la aplicación tenga permisos para leer y escribir en ```/etc/postfix/aliases/```