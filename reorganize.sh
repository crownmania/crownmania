#!/bin/bash

echo "Starting project reorganization..."

# Create main project directories
mkdir -p crownmania_backend/src/{controllers,models,routes,middleware,utils,config}
mkdir -p crownmania_frontend/src/{components,assets,pages,utils,styles}
mkdir -p crownmania_frontend/public

# Move existing backend files
mv src/routes/* crownmania_backend/src/routes/ 2>/dev/null || true
mv src/config/* crownmania_backend/src/config/ 2>/dev/null || true
mv src/utils/* crownmania_backend/src/utils/ 2>/dev/null || true

# Move existing frontend files
mv src/components/* crownmania_frontend/src/components/ 2>/dev/null || true
mv src/assets/* crownmania_frontend/src/assets/ 2>/dev/null || true
mv src/pages/* crownmania_frontend/src/pages/ 2>/dev/null || true
mv src/utils/* crownmania_frontend/src/utils/ 2>/dev/null || true

# Create base styles with media queries
mkdir -p crownmania_frontend/src/styles
cat > crownmania_frontend/src/styles/GlobalStyles.js << EOL
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle\`
  :root {
    --primary-color: #1a1a1a;
    --secondary-color: #333;
    --accent-color: #007bff;
    --text-color: #ffffff;
    --background-color: #121212;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    
    @media (max-width: 768px) {
      font-size: 14px;
    }
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
  }

  /* Mobile-first responsive design */
  .container {
    width: 100%;
    padding: 0 1rem;
    margin: 0 auto;

    @media (min-width: 640px) {
      max-width: 640px;
    }

    @media (min-width: 768px) {
      max-width: 768px;
    }

    @media (min-width: 1024px) {
      max-width: 1024px;
    }

    @media (min-width: 1280px) {
      max-width: 1280px;
    }
  }
\`;

export default GlobalStyles;
EOL

# Create root package.json
cat > package.json << EOL
{
  "name": "crownmania",
  "version": "1.0.0",
  "description": "Crownmania E-commerce Platform",
  "scripts": {
    "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\"",
    "start:backend": "cd crownmania_backend && npm run dev",
    "start:frontend": "cd crownmania_frontend && npm run dev",
    "install:all": "npm install && cd crownmania_backend && npm install && cd ../crownmania_frontend && npm install",
    "build": "cd crownmania_frontend && npm run build && cd ../crownmania_backend && npm run build",
    "deploy": "firebase deploy"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
EOL

# Create backend package.json
cat > crownmania_backend/package.json << EOL
{
  "name": "crownmania_backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "build": "echo 'No build step needed for backend'"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "firebase-admin": "^11.10.1",
    "stripe": "^12.17.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.9.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOL

# Create frontend package.json
cat > crownmania_frontend/package.json << EOL
{
  "name": "crownmania_frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "styled-components": "^6.0.7",
    "framer-motion": "^10.15.1",
    "react-query": "^3.39.3",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.4",
    "vite": "^4.4.9"
  }
}
EOL

# Create backend server.js with improved middleware
cat > crownmania_backend/src/server.js << EOL
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { stripeRouter } from './routes/stripe.js';
import { firebaseRouter } from './routes/firebase.js';

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
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/stripe', stripeRouter);
app.use('/api/firebase', firebaseRouter);

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
    console.log(\`Server running on port \${port}\`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(\`Port \${port} is in use, trying port \${port + 1}\`);
      await startServer(port + 1);
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  }
};

startServer();
EOL

# Create frontend vite.config.js with optimizations
cat > crownmania_frontend/vite.config.js << EOL
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
});
EOL

# Create Firebase configuration files
cat > firebase.json << EOL
{
  "hosting": {
    "public": "crownmania_frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "crownmania-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
EOL

cat > .firebaserc << EOL
{
  "projects": {
    "default": "sonorous-crane-440603-s6"
  }
}
EOL

# Create comprehensive README.md
cat > README.md << EOL
# Crownmania E-commerce Platform

A modern e-commerce platform built with React, Firebase, and Node.js.

## Project Structure
\`\`\`
crownmania_main/
├── crownmania_backend/
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── utils/          # Helper functions
│   └── .env                # Backend environment variables
├── crownmania_frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── assets/         # Static assets
│   │   ├── pages/          # Page components
│   │   ├── styles/         # Global styles and themes
│   │   └── utils/          # Helper functions
│   └── .env                # Frontend environment variables
├── package.json            # Root package.json for concurrent running
├── firebase.json           # Firebase configuration
└── .firebaserc            # Firebase project settings
\`\`\`

## Prerequisites
- Node.js >= 14
- npm >= 6
- Firebase CLI

## Setup Instructions

1. Install dependencies:
   \`\`\`bash
   npm run install:all
   \`\`\`

2. Configure environment variables:
   Create \`.env\` files in both frontend and backend directories with the required variables.

3. Start development servers:
   \`\`\`bash
   npm start
   \`\`\`
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5001

## Development

### Backend
- REST API with Express
- Firebase Admin SDK for authentication and storage
- Stripe integration for payments
- Security features:
  - Helmet for HTTP headers
  - Rate limiting
  - CORS configuration
  - Compression

### Frontend
- React with Vite
- Styled Components with mobile-first responsive design
- Firebase SDK for client-side features
- Optimized build configuration

## Deployment

1. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy to Firebase:
   \`\`\`bash
   npm run deploy
   \`\`\`

## Environment Variables

### Backend (.env)
\`\`\`
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_CLIENT_CERT_URL=
FIREBASE_STORAGE_BUCKET=
STRIPE_SECRET_KEY=
FRONTEND_URL=http://localhost:5173
PORT=5001
\`\`\`

### Frontend (.env)
\`\`\`
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:5001
\`\`\`

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
EOL

# Make the script executable
chmod +x reorganize.sh

echo "Project structure reorganized successfully!"
echo "Next steps:"
echo "1. Run 'npm run install:all' to install dependencies"
echo "2. Configure your environment variables"
echo "3. Run 'npm start' to start both frontend and backend servers"
