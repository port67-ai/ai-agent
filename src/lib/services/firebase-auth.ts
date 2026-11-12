import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode,
    type User
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import { firebaseDb } from "./firebase-db";

export const firebaseAuth = {
    async signUp(email: string, password: string, firstName: string, lastName: string, packageName: "Starter" | "Growth" | "Teamer") {
        console.log('Creating Firebase Auth user...');
        const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        const user = userCredential.user;
        console.log('Firebase Auth user created:', user.uid);

        // Create the user profile in Firestore
        console.log('Creating Firestore user profile...');
        await firebaseDb.createUserProfile({
            id: user.uid,
            email: user.email!,
            firstName,
            lastName,
            package: packageName,
        });
        console.log('Firestore user profile created successfully');

        return user;
    },

    async signIn(email: string, password: string) {
        const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        const user = userCredential.user;

        // Update last sign in time
        await firebaseDb.updateLastSignIn(user.uid);

        return user;
    },

    async signOut() {
        await firebaseSignOut(getFirebaseAuth());
    },

    async sendPasswordReset(email: string) {
        await sendPasswordResetEmail(getFirebaseAuth(), email, {
            url: `${window.location.origin}/sign-in`,
            handleCodeInApp: false,
        });
    },

    async verifyPasswordResetCode(code: string) {
        return await verifyPasswordResetCode(getFirebaseAuth(), code);
    },

    async confirmPasswordReset(code: string, newPassword: string) {
        await confirmPasswordReset(getFirebaseAuth(), code, newPassword);
    },

    onAuthStatusChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(getFirebaseAuth(), callback);
    }
};
