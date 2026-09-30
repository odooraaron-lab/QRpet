import Stripe from 'stripe';

let s: Stripe | null = null;
export function stripe() {
  if (!s) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    s = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return s;
}
