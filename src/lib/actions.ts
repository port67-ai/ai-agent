"use server";

import { db } from "./db";
import { currentUser } from "@clerk/nextjs/server";
import { payments } from "./payments";
import { redirect } from "next/navigation";

export async function getUserData(mockUserId?: string) {
    // 1. Try to get Clerk User
    let clerkUser = null;
    try {
        // This only works if keys are present, otherwise might throw or return null
        if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
            // @ts-ignore - Clerk types might be strict
            clerkUser = await currentUser();
        }
    } catch (e) {
        console.warn("Clerk currentUser() failed or not configured", e);
    }

    // 2. Determine effective User ID
    const userId = clerkUser?.id || mockUserId;

    if (!userId) {
        return { error: "Not authenticated" };
    }

    // 3. Fetch from DB
    let customer: any = await db.getCustomer(userId);

    // 4. If not found, create (Onboarding)
    if (!customer) {
        const email = clerkUser?.emailAddresses[0]?.emailAddress || "mock@example.com";
        const name = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName}` : "Mock User";

        customer = await db.createCustomer({
            id: userId,
            email,
            name,
            plan: 'free'
        });
    }

    return { customer };
}

export async function createCheckout(priceId: string, userId: string, email: string) {
    const session = await payments.createCheckoutSession({
        priceId,
        userId,
        email
    });

    if (session?.url) {
        redirect(session.url);
    }
}
