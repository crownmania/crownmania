import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

// Initialize Stripe - check if key exists to prevent crash
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
if (!stripePublishableKey) {
  console.warn('Stripe: VITE_STRIPE_PUBLISHABLE_KEY is missing. Payment features will be disabled.');
}

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
