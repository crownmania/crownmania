# Crownmania E-commerce Platform

A modern e-commerce platform built with React, Firebase, and Node.js.

## Project Structure
```
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
```

## Prerequisites
- Node.js >= 14
- npm >= 6
- Firebase CLI

## Setup Instructions

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Configure environment variables:
   Create `.env` files in both frontend and backend directories with the required variables.

3. Start development servers:
   ```bash
   npm start
   ```
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
   ```bash
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   npm run deploy
   ```

## Environment Variables

### Backend (.env)
```
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_CLIENT_CERT_URL=
FIREBASE_STORAGE_BUCKET=
STRIPE_SECRET_KEY=
FRONTEND_URL=http://localhost:5173
PORT=5001
```

### Frontend (.env)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:5001
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
