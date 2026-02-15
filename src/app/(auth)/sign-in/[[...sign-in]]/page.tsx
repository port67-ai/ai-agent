import { SignIn } from "@clerk/nextjs";
import { MockSignIn } from "@/components/auth/AuthForms";

export default function SignInPage() {
    const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (isClerkConfigured) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <SignIn />
            </div>
        );
    }

    return <MockSignIn />;
}
