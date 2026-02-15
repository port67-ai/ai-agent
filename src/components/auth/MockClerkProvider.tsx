"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type MockUser = {
    id: string;
    fullName: string;
    primaryEmailAddress: { emailAddress: string };
    imageUrl: string;
};

type MockAuthContextType = {
    isLoaded: boolean;
    isSignedIn: boolean;
    user: MockUser | null;
    signIn: () => void;
    signOut: () => void;
};

const MockAuthContext = createContext<MockAuthContextType | null>(null);

export function MockClerkProvider({ children }: { children: React.ReactNode }) {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check local storage for persistence
        const stored = localStorage.getItem("mock_auth_signed_in");
        if (stored === "true") setIsSignedIn(true);
    }, []);

    const signIn = () => {
        setIsSignedIn(true);
        localStorage.setItem("mock_auth_signed_in", "true");
        router.push("/dashboard");
    };

    const signOut = () => {
        setIsSignedIn(false);
        localStorage.removeItem("mock_auth_signed_in");
        router.push("/");
    };

    const user = isSignedIn
        ? {
            id: "mock_user_123",
            fullName: "Mock User",
            primaryEmailAddress: { emailAddress: "mock@example.com" },
            imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mock",
        }
        : null;

    return (
        <MockAuthContext.Provider
            value={{ isLoaded: true, isSignedIn, user, signIn, signOut }}
        >
            {children}
        </MockAuthContext.Provider>
    );
}

export function useUser() {
    const context = useContext(MockAuthContext);
    if (!context) {
        throw new Error("useUser (Mock) must be used within MockClerkProvider");
    }
    return {
        isLoaded: context.isLoaded,
        isSignedIn: context.isSignedIn,
        user: context.user,
    };
}

export function useMockAuth() {
    const context = useContext(MockAuthContext);
    if (!context) {
        throw new Error("useMockAuth must be used within MockClerkProvider");
    }
    return context;
}
