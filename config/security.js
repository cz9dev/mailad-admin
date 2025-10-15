// config/security.js
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

// Configuración de Rate Limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: `${Math.ceil(windowMs / 60000)} minutos`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Límites específicos por ruta
const securityLimits = {
  // Límite estricto para login
  login: createRateLimit(
    15 * 60 * 1000, // 15 minutos
    5, // 5 intentos máximos
    "Demasiados intentos de login. Por favor, espere 15 minutos antes de intentar nuevamente."
  ),

  // Límite para APIs generales
  api: createRateLimit(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests máximo
    "Demasiadas solicitudes. Por favor, reduzca la frecuencia de sus peticiones."
  ),

  // Límite para creación/eliminación de recursos
  critical: createRateLimit(
    60 * 60 * 1000, // 1 hora
    10, // 10 operaciones críticas máximas por hora
    "Límite de operaciones críticas excedido. Por favor, espere una hora."
  ),
};

// Configuración de Helmet para seguridad de headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

// Configuración CORS
const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middleware de headers de seguridad personalizados
const securityHeaders = (req, res, next) => {
  // Prevenir clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevenir MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // XSS Protection (para navegadores antiguos)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
};

// Middleware para prevenir parámetros contaminados
const preventParameterPollution = (req, res, next) => {
  // Para query parameters arrays, tomar solo el primer valor
  const queryKeys = Object.keys(req.query);
  queryKeys.forEach((key) => {
    if (Array.isArray(req.query[key]) && req.query[key].length > 0) {
      req.query[key] = req.query[key][0];
    }
  });

  next();
};

// Validación de contenido JSON
const validateJson = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "JSON malformado en el cuerpo de la solicitud",
    });
  }
  next();
};

// Logging de intentos de seguridad
const securityLogger = (req, res, next) => {
  // Registrar intentos de acceso a rutas protegidas
  const securityRelevantPaths = [
    "/auth/login",
    "/users",
    "/aliases",
    "/blacklist",
  ];

  if (securityRelevantPaths.some((path) => req.path.startsWith(path))) {
    console.log(
      `[SECURITY] Acceso a ${req.method} ${req.path} desde ${req.ip} - User: ${
        req.user ? req.user.username : "No autenticado"
      }`
    );
  }

  next();
};

// Exportar configuración completa
module.exports = {
  securityLimits,
  helmetConfig,
  corsConfig,
  securityHeaders,
  preventParameterPollution,
  validateJson,
  securityLogger,

  // Función para aplicar toda la seguridad
  applySecurity: (app) => {
    // Helmet primero
    app.use(helmet(helmetConfig));

    // Headers de seguridad personalizados
    app.use(securityHeaders);

    // CORS
    app.use(cors(corsConfig));

    // Prevenir parameter pollution
    app.use(preventParameterPollution);

    // Validación JSON
    app.use(validateJson);

    // Logger de seguridad
    if (process.env.NODE_ENV === "production") {
      app.use(securityLogger);
    }

    console.log("✅ Configuración de seguridad aplicada correctamente");
  },
};
