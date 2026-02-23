'use client';

import { useState } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/services/firebase';

export default function DatabaseCleanupPage() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);

    const addStatus = (message: string) => {
        setStatus(prev => [...prev, message]);
        console.log(message);
    };

    const deleteCollection = async (db: any, collectionPath: string, batchSize: number = 100) => {
        const collectionRef = collection(db, collectionPath);
        const snapshot = await getDocs(collectionRef);

        if (snapshot.empty) {
            return 0;
        }

        const batches = [];
        let batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((document, index) => {
            batch.delete(document.ref);
            count++;

            if ((index + 1) % batchSize === 0) {
                batches.push(batch.commit());
                batch = writeBatch(db);
            }
        });

        if (count % batchSize !== 0) {
            batches.push(batch.commit());
        }

        await Promise.all(batches);
        return snapshot.size;
    };

    const clearDatabase = async () => {
        setIsDeleting(true);
        setStatus([]);
        setCompleted(false);

        try {
            const db = getFirestore(app);

            addStatus('🗑️  Starting database cleanup...');
            addStatus('');

            // Step 1: Get all users and delete their subcollections
            addStatus('Step 1: Deleting user subcollections...');
            const usersSnapshot = await getDocs(collection(db, 'users'));

            for (const userDoc of usersSnapshot.docs) {
                addStatus(`  Processing user: ${userDoc.id}`);

                // Delete callHistory subcollection
                const callHistoryPath = `users/${userDoc.id}/callHistory`;
                const callHistorySnapshot = await getDocs(collection(db, 'users', userDoc.id, 'callHistory'));

                for (const callDoc of callHistorySnapshot.docs) {
                    await deleteDoc(callDoc.ref);
                }

                addStatus(`    ✓ Deleted ${callHistorySnapshot.size} call history entries`);
            }
            addStatus('✓ All user subcollections deleted');
            addStatus('');

            // Step 2: Delete all users
            addStatus('Step 2: Deleting users collection...');
            const usersDeleted = await deleteCollection(db, 'users');
            addStatus(`✓ Deleted ${usersDeleted} users`);
            addStatus('');

            // Step 3: Delete all metrics
            addStatus('Step 3: Deleting metrics collection...');
            const metricsDeleted = await deleteCollection(db, 'metrics');
            addStatus(`✓ Deleted ${metricsDeleted} metrics`);
            addStatus('');

            addStatus('✅ Database cleanup completed successfully!');
            addStatus('All historical users and data have been removed.');
            setCompleted(true);
        } catch (error) {
            addStatus('');
            addStatus(`❌ Error during database cleanup: ${error}`);
            console.error('Error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Database Cleanup</h1>
                    </div>

                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Warning: Irreversible Action</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>This will permanently delete:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>All user profiles</li>
                                        <li>All metrics data</li>
                                        <li>All call history records</li>
                                    </ul>
                                    <p className="mt-2 font-semibold">This action cannot be undone!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={clearDatabase}
                        disabled={isDeleting || completed}
                        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${completed
                                ? 'bg-green-500 cursor-not-allowed'
                                : isDeleting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 hover:shadow-lg active:scale-95'
                            }`}
                    >
                        {completed ? '✅ Cleanup Completed' : isDeleting ? '🔄 Deleting...' : '🗑️ Delete All Data'}
                    </button>

                    {status.length > 0 && (
                        <div className="mt-6 bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-auto max-h-96">
                            {status.map((line, index) => (
                                <div
                                    key={index}
                                    className={`${line.includes('✅') || line.includes('✓')
                                            ? 'text-green-400'
                                            : line.includes('❌')
                                                ? 'text-red-400'
                                                : line.includes('🗑️')
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                        }`}
                                >
                                    {line || '\u00A0'}
                                </div>
                            ))}
                        </div>
                    )}

                    {completed && (
                        <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-800">
                                        Database has been successfully cleared. You can now close this page.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
