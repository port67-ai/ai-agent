import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.error('❌ Missing Firebase Admin credentials in .env.local');
        console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        process.exit(1);
    }

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const auth = getAuth();
const db = getFirestore();

async function deleteCollection(collectionPath: string, batchSize: number = 100): Promise<void> {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(
    query: FirebaseFirestore.Query,
    resolve: () => void,
    reject: (error: Error) => void
): Promise<void> {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteAllUserSubcollections(userId: string): Promise<void> {
    console.log(`  Deleting subcollections for user: ${userId}`);

    // Delete callHistory subcollection
    const callHistoryPath = `users/${userId}/callHistory`;
    await deleteCollection(callHistoryPath);
    console.log(`    ✓ Deleted callHistory`);
}

async function deleteAllAuthUsers(): Promise<void> {
    console.log('Step 1: Deleting Firebase Authentication users...');

    let nextPageToken: string | undefined;
    let totalDeleted = 0;

    do {
        // List users in batches
        const listUsersResult = await auth.listUsers(1000, nextPageToken);

        // Delete users in batches of 100 (Firebase limit)
        const uids = listUsersResult.users.map(user => user.uid);

        if (uids.length > 0) {
            const deletePromises = uids.map(uid =>
                auth.deleteUser(uid)
                    .then(() => {
                        console.log(`  ✓ Deleted auth user: ${uid}`);
                    })
                    .catch(error => {
                        console.error(`  ✗ Failed to delete auth user ${uid}:`, error.message);
                    })
            );

            await Promise.all(deletePromises);
            totalDeleted += uids.length;
        }

        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`✓ Deleted ${totalDeleted} Firebase Auth users\n`);
}

async function clearAllUsers(): Promise<void> {
    console.log('🗑️  Starting complete user cleanup (Auth + Firestore)...\n');

    try {
        // Step 1: Delete Firebase Authentication users
        await deleteAllAuthUsers();

        // Step 2: Delete Firestore user subcollections
        console.log('Step 2: Deleting Firestore user subcollections...');
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            await deleteAllUserSubcollections(userDoc.id);
        }
        console.log('✓ All user subcollections deleted\n');

        // Step 3: Delete users collection
        console.log('Step 3: Deleting Firestore users collection...');
        await deleteCollection('users');
        console.log('✓ Users collection deleted\n');

        // Step 4: Delete metrics collection
        console.log('Step 4: Deleting metrics collection...');
        await deleteCollection('metrics');
        console.log('✓ Metrics collection deleted\n');

        console.log('✅ Complete cleanup finished successfully!');
        console.log('All Firebase Auth users and Firestore data have been removed.\n');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Run the cleanup
clearAllUsers()
    .then(() => {
        console.log('Script finished.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
