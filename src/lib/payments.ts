import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe only if key is present
const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
    : null;

export const payments = {
    createCheckoutSession: async ({ priceId, userId, email }: { priceId: string, userId: string, email: string }) => {
        if (!stripe) {
            console.log('💳 [MOCK PAYMENT] Creating checkout session for:', { priceId, userId });
            // Return a dummy link that just redirects back to success
            return { url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment_status=success` };
        }

        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?canceled=true`,
                customer_email: email,
                metadata: {
                    userId: userId
                }
            });

            return { url: session.url };
        } catch (error) {
            console.error('❌ Error creating Stripe session:', error);
            throw error;
        }
    }
};
