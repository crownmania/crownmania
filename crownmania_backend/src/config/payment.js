import Stripe from 'stripe';
import axios from 'axios';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize ShipStation API client
const shipstationApi = axios.create({
  baseURL: 'https://ssapi.shipstation.com',
  auth: {
    username: process.env.SHIPSTATION_API_KEY,
    password: process.env.SHIPSTATION_API_SECRET
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

export { stripe, shipstationApi };
