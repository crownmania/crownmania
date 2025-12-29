// Load environment variables FIRST before any other imports
import './env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { stripeRouter } from './routes/stripe.js';
import { firebaseRouter } from './routes/firebase.js';
import { verificationRouter } from './routes/verification.js';
import { getNonceHandler } from './middleware/auth.js';
import logger from './config/logger.js';

const app = express();
const defaultPort = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// Security Middleware - Helmet with CSP
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // Enable Content Security Policy in production
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://www.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://api.web3auth.io",
        "https://*.firebaseio.com",
        "https://*.googleapis.com",
        "https://api.moralis.io",
        "wss://*.firebaseio.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false, // Disable CSP in development for easier debugging
  // Additional security headers
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
}));

// ============================================
// CORS Configuration - Strict Origin Checking
// ============================================
const getAllowedOrigins = () => {
  const origins = [];
  
  // Always allow the configured frontend URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // In development, allow specific localhost ports
  if (!isProduction) {
    origins.push(
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000'
    );
  }
  
  // In production, add your production domains
  if (isProduction) {
    // Add your production frontend domain(s)
    origins.push(
      'https://crownmania.com',
      'https://www.crownmania.com',
      'https://api.crownmania.com'
    );
  }
  
  return origins.filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin ONLY in development (mobile apps, curl, etc.)
    if (!origin) {
      if (isProduction) {
        logger.warn('Request with no origin blocked in production');
        return callback(new Error('Origin required'), false);
      }
      return callback(null, true);
    }
    
    // Check against whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development only, allow any localhost origin
    if (!isProduction && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Block all other origins
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours - browsers cache preflight requests
}));

// ============================================
// Rate Limiting
// ============================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
});
app.use(limiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Performance Middleware
// ============================================
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Cache-Control headers for static assets
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.startsWith('/api/')) {
      // API responses - short cache or no cache
      res.set('Cache-Control', 'private, no-cache');
    } else if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      res.set('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
  next();
});

// ============================================
// Body Parsing
// ============================================
// Raw body for Stripe webhooks (must be before json parser for webhook route)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Routes
// ============================================
app.use('/api/stripe', stripeRouter);
app.use('/api/firebase', firebaseRouter);
app.use('/api/verification', verificationRouter);

// Nonce endpoint for wallet authentication
app.get('/api/auth/nonce', getNonceHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development'
  });
});

// ============================================
// Error Handling
// ============================================
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details (but not to client in production)
  logger.error('Server error:', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method
  });
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  // Generic error response (don't leak details in production)
  res.status(500).json({ 
    error: isProduction ? 'Internal server error' : err.message 
  });
});

// ============================================
// Server Startup
// ============================================
const startServer = async (port = defaultPort) => {
  try {
    await app.listen(port);
    logger.info(`Server running on port ${port} (${isProduction ? 'production' : 'development'})`);
    logger.info(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use, trying port ${port + 1}`);
      await startServer(port + 1);
    } else {
      logger.error('Server startup error:', error);
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();