import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { airtableService } from '@/lib/services/airtable';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const requestedUserId = searchParams.get('userId');

        // Ensure users can only access their own data
        if (requestedUserId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const user = await airtableService.getUser(userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId: requestedUserId, businessDetails } = body;

        // Ensure users can only update their own data
        if (requestedUserId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if user exists
        let user = await airtableService.getUser(userId);

        if (!user) {
            // Create new user if doesn't exist
            const email = body.email || 'user@example.com'; // Should come from Clerk
            user = await airtableService.createUser(userId, email, businessDetails);
        } else {
            // Update existing user
            user = await airtableService.updateUser(userId, { businessDetails });
        }

        if (!user) {
            return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in PUT /api/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
