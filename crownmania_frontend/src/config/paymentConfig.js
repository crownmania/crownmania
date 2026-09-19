import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe - check if key exists to prevent crash
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
if (!stripePublishableKey) {
  console.warn('Stripe: VITE_STRIPE_PUBLISHABLE_KEY is missing. Payment features will be disabled.');
}

export { stripePromise };
