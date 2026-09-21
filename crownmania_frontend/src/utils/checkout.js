import { stripePromise } from '../config/paymentConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Starts a Stripe Checkout session for a single product and redirects.
 *
 * Prices are resolved server-side from the catalog in routes/stripe.js, so no
 * amount is ever sent from the browser. Throws on failure; callers are
 * responsible for surfacing the message and resetting their loading state.
 */
export async function startCheckout(productId, quantity = 1) {
  if (!stripePromise) {
    throw new Error('Stripe is not configured. Payment features are disabled.');
  }

  const stripe = await stripePromise;
  if (!stripe) throw new Error('Stripe is not configured.');

  const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ productId, quantity }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Checkout session failed');
  }

  const session = await response.json();
  const result = await stripe.redirectToCheckout({ sessionId: session.id });

  if (result.error) {
    throw result.error;
  }
}
