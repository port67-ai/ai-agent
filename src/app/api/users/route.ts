import { NextRequest, NextResponse } from 'next/server';
import { firebaseDb } from '@/lib/services/firebase-db';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
    try {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

async function verifyAuthToken(request: NextRequest): Promise<string | null> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuthToken(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const requestedUserId = searchParams.get('userId');

        // Ensure users can only access their own data
        if (requestedUserId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const user = await firebaseDb.getUser(userId);

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
        const userId = await verifyAuthToken(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId: requestedUserId, businessDetails } = body;

        // Ensure users can only update their own data
        if (requestedUserId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Transform the business details to match Firestore schema
        const firestoreBusinessDetails = {
            businessName: businessDetails.businessName || '',
            businessType: businessDetails.businessType || '',
            currentPhoneNumber: businessDetails.phoneNumber || '',
            assistantPhoneNumber: '', // Will be assigned later
            bookingDays: businessDetails.workingDays?.reduce((acc: any, day: string) => {
                acc[day] = true;
                return acc;
            }, {
                Monday: false,
                Tuesday: false,
                Wednesday: false,
                Thursday: false,
                Friday: false,
                Saturday: false,
                Sunday: false,
            }) || {},
            startTime: businessDetails.workingHours?.start || '09:00',
            stopTime: businessDetails.workingHours?.end || '17:00',
            assistantVoice: businessDetails.assistantVoice || 'rachel',
            businessLink: businessDetails.businessLink || '',
            aiBusinessSummary: businessDetails.additionalNotes || '',
        };

        await firebaseDb.updateBusinessDetails(userId, firestoreBusinessDetails);

        const updatedUser = await firebaseDb.getUser(userId);

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error in PUT /api/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
