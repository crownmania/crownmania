import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables if not present
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || 6379;
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    settings: jest.fn()
  })),
  auth: jest.fn()
}));

// Mock Moralis
jest.mock('moralis', () => ({
  start: jest.fn(),
  EvmApi: {
    nft: {
      mint: jest.fn()
    }
  }
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn()
    },
    customers: {
      create: jest.fn(),
      update: jest.fn()
    },
    charges: {
      create: jest.fn()
    }
  }));
});

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

// Mock Redis
jest.mock('ioredis', () => {
  return import('ioredis-mock').then(m => m.default);
});

// Global test timeout
jest.setTimeout(30000);

// Console error/warning mocks
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
