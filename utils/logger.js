const winston = require("winston");
const path = require("path");

const logLevel = process.env.LOG_LEVEL || "info";
const logFile = process.env.LOG_FILE || path.join(__dirname, "../logs/app.log");

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "mailad-admin" },
  transports: [
    new winston.transports.File({ filename: logFile, level: "error" }),
    new winston.transports.File({ filename: logFile }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
