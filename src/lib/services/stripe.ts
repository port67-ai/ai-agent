import Stripe from 'stripe';
import { CheckoutData, PaymentResult } from '@/types/checkout';

// Check if Stripe is configured
const isConfigured = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

// Initialize Stripe client if configured
let stripe: Stripe | null = null;
if (isConfigured && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-01-28.clover',
    });
}

/**
 * Stripe Service
 * Provides payment processing functionality
 * Falls back to mock mode when Stripe is not configured
 */
export const stripeService = {
    /**
     * Check if Stripe is configured
     */
    isConfigured: () => isConfigured,

    /**
     * Create a checkout session
     */
    async createCheckoutSession(checkoutData: CheckoutData): Promise<PaymentResult> {
        if (!isConfigured) {
            // Mock mode - simulate successful checkout
            console.log('Mock checkout session created for:', checkoutData.email);
            return {
                success: true,
                sessionId: `mock_session_${Date.now()}`,
            };
        }

        try {
            // Real Stripe implementation
            const session = await stripe!.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'gbp',
                            product_data: {
                                name: 'Business Assistant - Annual Plan',
                                description: 'Complete business assistant service with voice, WhatsApp, and Facebook integration',
                            },
                            unit_amount: checkoutData.amount * 100, // Convert to pence
                        },
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
                customer_email: checkoutData.email,
                metadata: {
                    userId: checkoutData.userId,
                    businessName: checkoutData.businessDetails.businessName,
                },
            });

            return {
                success: true,
                sessionId: session.id,
            };
        } catch (error) {
            console.error('Error creating Stripe checkout session:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },

    /**
     * Verify a payment session
     */
    async verifySession(sessionId: string): Promise<boolean> {
        if (!isConfigured) {
            // Mock mode - always return true for mock sessions
            return sessionId.startsWith('mock_session_');
        }

        try {
            const session = await stripe!.checkout.sessions.retrieve(sessionId);
            return session.payment_status === 'paid';
        } catch (error) {
            console.error('Error verifying Stripe session:', error);
            return false;
        }
    },

    /**
     * Get publishable key for client-side
     */
    getPublishableKey(): string | null {
        return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
    },
};
