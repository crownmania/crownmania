import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { stripeRouter } from './routes/stripe.js';
import { firebaseRouter } from './routes/firebase.js';
import { verificationRouter } from './routes/verification.js';
// Password protection removed

dotenv.config();

const app = express();
const defaultPort = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Performance middleware
app.use(compression({
  level: 6, // Balance between compression ratio and CPU usage
  threshold: 0, // Compress all responses
  filter: (req, res) => {
    // Don't compress responses with this header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

// Add Cache-Control headers for static assets
app.use((req, res, next) => {
  // Only set for GET requests
  if (req.method === 'GET') {
    // For API responses, use a shorter max-age
    if (req.path.startsWith('/api/')) {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
    // For static files like images, use a longer max-age
    else if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      res.set('Cache-Control', 'public, max-age=86400, immutable'); // 24 hours
    }
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Password protection removed

// Routes
app.use('/api/stripe', stripeRouter);
app.use('/api/firebase', firebaseRouter);
app.use('/api/verification', verificationRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server with port fallback
const startServer = async (port = defaultPort) => {
  try {
    await app.listen(port);
    console.log(`Server running on port ${port}`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}`);
      await startServer(port + 1);
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  }
};

startServer();
