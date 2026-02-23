"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/services/firebase-auth";
import { firebaseDb, type UserProfile } from "@/lib/services/firebase-db";

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firebaseAuth.onAuthStatusChanged(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const userProfile = await firebaseDb.getUser(firebaseUser.uid);
                setProfile(userProfile);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseAuth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
