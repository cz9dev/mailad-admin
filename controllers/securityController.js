// controllers/securityController.js
const fs = require('fs').promises;
const path = require('path');
const ini = require('ini');

const ANTIVIRUS_CONFIG_PATH = '/etc/mailad/antivirus.conf';
const SSL_CONFIG_PATH = '/etc/mailad/ssl.conf';

exports.getSecurityConfig = async (req, res) => {
  try {
    const antivirusConfig = await fs.readFile(ANTIVIRUS_CONFIG_PATH, 'utf8')
      .catch(() => '# Configuración de antivirus (archivo no encontrado)');
    
    const sslConfig = await fs.readFile(SSL_CONFIG_PATH, 'utf8')
      .catch(() => '# Configuración SSL (archivo no encontrado)');
    
    res.render('security/config', {
      antivirusConfig: antivirusConfig,
      sslConfig: sslConfig,
      title: 'Configuración de Seguridad'
    });
  } catch (error) {
    res.status(500).render('error', {
      error: error,
      message: 'Error al leer configuración de seguridad'
    });
  }
};

exports.updateSecurityConfig = async (req, res) => {
  try {
    const { antivirusConfig, sslConfig } = req.body;
    
    // Actualizar configuración de antivirus
    await fs.writeFile(ANTIVIRUS_CONFIG_PATH, antivirusConfig);
    
    // Actualizar configuración SSL
    await fs.writeFile(SSL_CONFIG_PATH, sslConfig);
    
    // Recargar servicios afectados
    const { exec } = require('child_process');
    exec('systemctl restart antivirus-service'); // Ajustar según implementación
    exec('systemctl restart ssl-related-services'); // Ajustar según implementación
    
    req.flash('success', 'Configuración de seguridad actualizada correctamente');
    res.redirect('/security');
  } catch (error) {
    res.status(500).render('security/config', {
      antivirusConfig: req.body.antivirusConfig,
      sslConfig: req.body.sslConfig,
      errors: ['Error al actualizar configuración: ' + error.message],
      title: 'Configuración de Seguridad'
    });
  }
};

exports.uploadSSLCertificate = async (req, res) => {
  try {
    if (!req.files || !req.files.certificate || !req.files.privateKey) {
      throw new Error('Debe subir ambos archivos: certificado y clave privada');
    }
    
    const { certificate, privateKey } = req.files;
    
    // Guardar certificado
    await fs.writeFile('/etc/ssl/certs/mailad.crt', certificate.data);
    
    // Guardar clave privada
    await fs.writeFile('/etc/ssl/private/mailad.key', privateKey.data);
    
    // Establecer permisos adecuados
    await fs.chmod('/etc/ssl/private/mailad.key', 0o600);
    
    // Recargar servicios que usan SSL
    const { exec } = require('child_process');
    exec('systemctl restart postfix'); // Postfix para SMTPS
    exec('systemctl restart dovecot'); // Dovecot para IMAPS/POP3S
    exec('systemctl restart apache2 || systemctl restart nginx'); // Servidor web
    
    req.flash('success', 'Certificado SSL actualizado correctamente');
    res.redirect('/security');
  } catch (error) {
    res.status(500).render('security/config', {
      antivirusConfig: req.body.antivirusConfig,
      sslConfig: req.body.sslConfig,
      errors: ['Error al subir certificado: ' + error.message],
      title: 'Configuración de Seguridad'
    });
  }
};