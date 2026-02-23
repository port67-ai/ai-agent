import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        projectId: 'ai-agent-b488f',
    });
}

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

async function clearDatabase(): Promise<void> {
    console.log('🗑️  Starting database cleanup...\n');

    try {
        // Step 1: Get all users and delete their subcollections
        console.log('Step 1: Deleting user subcollections...');
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            await deleteAllUserSubcollections(userDoc.id);
        }
        console.log('✓ All user subcollections deleted\n');

        // Step 2: Delete all users
        console.log('Step 2: Deleting users collection...');
        await deleteCollection('users');
        console.log('✓ Users collection deleted\n');

        // Step 3: Delete all metrics
        console.log('Step 3: Deleting metrics collection...');
        await deleteCollection('metrics');
        console.log('✓ Metrics collection deleted\n');

        console.log('✅ Database cleanup completed successfully!');
        console.log('All historical users and data have been removed.\n');
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        throw error;
    }
}

// Run the cleanup
clearDatabase()
    .then(() => {
        console.log('Script finished.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
