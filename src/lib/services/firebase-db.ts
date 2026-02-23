import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    increment
} from "firebase/firestore";
import { app } from "./firebase";
import { AiReviewData } from "@/types/checkout";

const db = getFirestore(app);

export type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    package: "Starter" | "Growth" | "Teamer";
    createdAt: any;
    lastSignIn: any;
    businessDetails: any;
};

export const firebaseDb = {
    // User Management
    getUser: async (uid: string) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as UserProfile;
        }
        return null;
    },

    createUserProfile: async (userData: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        package: "Starter" | "Growth" | "Teamer";
    }) => {
        console.log('Firestore: Creating user document for UID:', userData.id);
        const docRef = doc(db, "users", userData.id);

        const userDoc = {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            package: userData.package,
            createdAt: Timestamp.now(),
            lastSignIn: Timestamp.now(),
            businessDetails: null,
        };

        console.log('Firestore: Writing document:', userDoc);

        try {
            await setDoc(docRef, userDoc);
            console.log('Firestore: User document created successfully');
        } catch (error) {
            console.error('Firestore: Error creating user document:', error);
            throw error;
        }
    },

    updateUser: async (uid: string, data: any) => {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, data);
    },

    updateLastSignIn: async (uid: string) => {
        const docRef = doc(db, "users", uid);

        // Use setDoc with merge to handle case where document doesn't exist
        await setDoc(docRef, {
            lastSignIn: Timestamp.now()
        }, { merge: true });
    },

    // Business Details (updates high-level user document)
    updateBusinessDetails: async (uid: string, details: {
        businessName: string;
        businessType: string;
        currentPhoneNumber: string;
        assistantPhoneNumber: string;
        bookingDays: { [key: string]: boolean };
        startTime: string;
        stopTime: string;
        assistantVoice: string;
        businessLink: string;
        aiBusinessSummary: string;
        appointment1Name?: string;
        appointment1Duration?: number;
        appointment2Name?: string;
        appointment2Duration?: number;
    }) => {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            businessDetails: details,
            updatedAt: Timestamp.now()
        });
    },

    // AI Review Data (enriched data from Make.com webhook)
    updateAiReviewData: async (uid: string, data: AiReviewData) => {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            aiReviewData: data,
            aiReviewCompletedAt: Timestamp.now(),
        });
    },

    // Dashboard Metrics
    getMetrics: async (uid: string) => {
        const docRef = doc(db, "metrics", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data();

        // Initialize if doesn't exist
        const initialMetrics = {
            numberOfCalls: 0,
            callsCaught: 0,
            meetingsBooked: 0
        };
        await setDoc(docRef, initialMetrics);
        return initialMetrics;
    },

    incrementMetric: async (uid: string, metric: "numberOfCalls" | "callsCaught" | "meetingsBooked") => {
        const docRef = doc(db, "metrics", uid);
        await updateDoc(docRef, {
            [metric]: increment(1)
        });
    },

    // Call History
    addCallEntry: async (uid: string, call: {
        name: string;
        mobileNumber: string;
        action: string;
        date: string;
        time: string;
    }) => {
        const callRef = collection(db, "users", uid, "callHistory");
        await addDoc(callRef, {
            ...call,
            timestamp: Timestamp.now()
        });

        // Also increment total calls
        await updateDoc(doc(db, "metrics", uid), {
            numberOfCalls: increment(1)
        });
    },

    getCallHistory: async (uid: string, limitCount: number = 20) => {
        const callRef = collection(db, "users", uid, "callHistory");
        const q = query(callRef, orderBy("timestamp", "desc"), limit(limitCount));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
};
