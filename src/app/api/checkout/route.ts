import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripeService } from '@/lib/services/stripe';
import { airtableService } from '@/lib/services/airtable';
import { CheckoutData } from '@/types/checkout';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CheckoutData = await request.json();

        // Ensure the userId matches
        if (body.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Save business details to Airtable
        await airtableService.createUser(userId, body.email, body.businessDetails);

        // Create Stripe checkout session
        const result = await stripeService.createCheckoutSession(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ sessionId: result.sessionId });
    } catch (error) {
        console.error('Error in POST /api/checkout:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
