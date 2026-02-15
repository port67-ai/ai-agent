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

        const stats = await airtableService.getStats(userId);

        if (!stats) {
            return NextResponse.json({ error: 'Stats not found' }, { status: 404 });
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error in GET /api/stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
