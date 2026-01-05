// Firebase Cloud Functions entry point
// This wraps the Express app for Cloud Functions deployment

import * as functions from 'firebase-functions';
import './env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { stripeRouter } from './routes/stripe.js';
import { firebaseRouter } from './routes/firebase.js';
import { verificationRouter } from './routes/verification.js';
import contentRouter from './routes/content.js';
import { getNonceHandler } from './middleware/auth.js';

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: false, // Cloud Functions handles this
}));

// CORS for Firebase Hosting
app.use(cors({
    origin: [
        'https://sonorous-crane-440603-s6.web.app',
        'https://crownmania.com',
        'https://www.crownmania.com',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/stripe', stripeRouter);
app.use('/api/firebase', firebaseRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/content', contentRouter);
app.get('/api/auth/nonce', getNonceHandler);

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
