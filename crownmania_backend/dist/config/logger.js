import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import fs from 'fs';
import path from 'path';

// Sensitive fields to be redacted from logs
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization', 'walletPrivateKey', 'creditCard', 'ssn', 'email', 'phone'];

// Function to redact sensitive information
const redactSensitiveInfo = info => {
  const redacted = {
    ...info
  };
  const redactObject = obj => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = redactObject(obj[key]);
      } else if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      }
    }
    return obj;
  };
  return redactObject(redacted);
};

// Custom format for development logs
const devFormat = winston.format.printf(({
  level,
  message,
  timestamp,
  ...metadata
}) => {
  const redactedMetadata = redactSensitiveInfo(metadata);
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(redactedMetadata).length > 0) {
    msg += `\n${JSON.stringify(redactedMetadata, null, 2)}`;
  }
  return msg;
});

// Retention policy configuration
const retentionConfig = {
  maxSize: '10m',
  // Maximum file size
  maxFiles: '14d',
  // Keep logs for 14 days
  tailable: true,
  compress: true
};

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create the Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({
    stack: true
  }), winston.format.metadata(), winston.format(info => redactSensitiveInfo(info))(), process.env.NODE_ENV === 'production' ? winston.format.json() : devFormat),
  transports: [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.padLevels())
  }),
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    ...retentionConfig
  }),
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    ...retentionConfig
  })],
  // Exit on error: false to handle exceptions gracefully
  exitOnError: false
});

// Add Firebase Cloud Logging in production
if (process.env.NODE_ENV === 'production') {
  const loggingWinston = new LoggingWinston({
    projectId: process.env.FIREBASE_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    logName: 'crownmania_backend',
    resource: {
      type: 'cloud_function',
      labels: {
        function_name: process.env.FUNCTION_NAME || 'crownmania-api',
        region: process.env.FUNCTION_REGION || 'us-central1'
      }
    },
    // Retention settings for Cloud Logging
    serviceContext: {
      service: 'crownmania-backend',
      version: process.env.npm_package_version
    }
  });
  logger.add(loggingWinston);
}

// Log cleanup job
const cleanupOldLogs = () => {
  const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

  fs.readdir(logsDir, (err, files) => {
    if (err) {
      logger.error('Error reading logs directory:', err);
      return;
    }
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          logger.error(`Error getting stats for file ${file}:`, err);
          return;
        }
        const age = Date.now() - stats.mtime.getTime();
        if (age > maxAge) {
          fs.unlink(filePath, err => {
            if (err) {
              logger.error(`Error deleting old log file ${file}:`, err);
            } else {
              logger.info(`Deleted old log file: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Run cleanup job daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Add request context middleware
export const addRequestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  req.requestContext = {
    requestId,
    startTime: new Date(),
    userId: req.user?.uid,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };
  next();
};

// HTTP request logger with sensitive data filtering
export const httpLogger = (req, res, next) => {
  const {
    method,
    url,
    requestContext
  } = req;
  const startTime = requestContext.startTime;

  // Log request (with sensitive data filtered)
  const requestData = {
    requestId: requestContext.requestId,
    userId: requestContext.userId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    body: req.body
  };
  logger.http(`Incoming ${method} ${url}`, redactSensitiveInfo(requestData));

  // Log response
  res.on('finish', () => {
    const duration = new Date() - startTime;
    logger.http(`${method} ${url} completed`, {
      requestId: requestContext.requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
};
export default logger;