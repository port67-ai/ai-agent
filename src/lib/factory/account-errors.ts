export type AccountPhase = 'signup' | 'signin' | 'verification' | 'session';
// Only allowlisted messages are shown; raw SDK errors can contain request details.
export function accountErrorMessage(error: unknown, phase: AccountPhase): string {
 const code=error && typeof error==='object' && 'code' in error ? String(error.code) : '';
 if(code==='factory/auth-config-missing') return 'Account access is not configured for Port67 yet. Contact Port67 to finish Firebase sign-in setup.';
 if(code==='factory/auth-config-unavailable') return 'Account sign-in setup could not be loaded. Please try again shortly.';
 if(code==='auth/operation-not-allowed' || code==='auth/admin-restricted-operation') return 'Email/Password authentication is not enabled in Firebase. Contact Port67 to enable account access.';
 if(['auth/invalid-api-key','auth/api-key-not-valid.-please-pass-a-valid-api-key.','auth/app-not-authorized','auth/unauthorized-domain','auth/configuration-not-found'].includes(code)) return 'The Firebase sign-in configuration needs attention. Contact Port67 to finish account setup.';
 if(['auth/weak-password','auth/password-does-not-meet-requirements'].includes(code)) return 'Choose a stronger password of at least eight characters that meets the account password policy.';
 if(code==='auth/invalid-email') return 'Enter a valid email address.';
 if(code==='auth/network-request-failed') return 'We could not reach the account service. Check your connection and try again.';
 if(code==='auth/too-many-requests') return 'Too many attempts. Please wait before trying again.';
 if(code==='factory/session-unavailable' || phase==='session') return 'Your email is verified, but the private workspace could not be opened. Check the portal error above or contact Port67 to finish live workspace setup.';
 if(phase==='verification') return 'Your email still needs verification. Use Resend email, or try again shortly.';
 if(phase==='signup') return 'We could not create the account. If you already have an account, sign in; otherwise try again or contact Port67.';
 return 'Sign-in was unsuccessful. Check your email and password, then try again.';
}
