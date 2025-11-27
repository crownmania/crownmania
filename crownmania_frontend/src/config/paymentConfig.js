import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Initialize ShipStation API client
const shipstationApi = axios.create({
  baseURL: 'https://ssapi.shipstation.com',
  auth: {
    username: import.meta.env.VITE_SHIPSTATION_API_KEY,
    password: import.meta.env.VITE_SHIPSTATION_API_SECRET
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

export { stripePromise, shipstationApi };
