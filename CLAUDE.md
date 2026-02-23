# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Port67 Business Assistant - A Next.js application providing automated appointment booking services for trade professionals (plumbers, electricians, gardeners, carpenters). Features 24/7 voice, WhatsApp, and Facebook support with AI-powered business assistants.

## Common Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4, Framer Motion for animations
- **Auth**: Firebase Authentication (client + admin SDK)
- **Database**: Cloud Firestore
- **Payments**: Stripe (with mock mode when env vars not set)
- **Customer Data**: Airtable (with mock mode when env vars not set)
- **Icons**: Lucide React

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Route group for auth pages (sign-in, sign-up)
│   ├── api/               # API routes
│   │   ├── checkout/      # Stripe checkout endpoints
│   │   ├── stats/         # Dashboard statistics
│   │   └── users/         # User CRUD operations
│   ├── dashboard/         # Protected dashboard pages
│   ├── checkout/          # Checkout flow
│   ├── pricing/           # Pricing page
│   └── layout.tsx         # Root layout with AuthProvider
├── components/
│   ├── auth/              # Authentication components
│   ├── checkout/          # Checkout flow components
│   ├── dashboard/         # Dashboard UI components
│   └── landing/           # Landing page components
├── hooks/                 # Custom React hooks (useUser)
├── lib/
│   ├── services/          # External service integrations
│   │   ├── firebase.ts         # Firebase app initialization
│   │   ├── firebase-auth.ts    # Client-side auth helpers
│   │   ├── firebase-db.ts      # Firestore operations
│   │   ├── airtable.ts         # Airtable customer data
│   │   └── stripe.ts           # Stripe integration
│   ├── actions.ts         # Server actions
│   ├── db.ts              # Database abstraction (Airtable)
│   ├── payments.ts        # Payment utilities
│   └── utils.ts           # General utilities
└── types/                 # TypeScript type definitions
```

### Authentication Flow

1. **Client-side**: Firebase Auth via [AuthProvider.tsx](src/components/auth/AuthProvider.tsx)
   - Wraps entire app in root layout
   - Provides `useAuth()` hook with `user`, `profile`, `loading`, `signOut`
   - Listens to auth state changes via `onAuthStateChanged`
   - Automatically fetches user profile from Firestore when authenticated

2. **Server-side**: Firebase Admin SDK in API routes
   - Initialize Firebase Admin in [src/app/api/users/route.ts](src/app/api/users/route.ts)
   - Verify JWT tokens via `Authorization: Bearer <token>` header
   - Uses `verifyIdToken()` to validate requests

3. **Auth Service**: [firebase-auth.ts](src/lib/services/firebase-auth.ts)
   - `signUp()`: Creates Firebase user + Firestore profile
   - `signIn()`: Authenticates and updates lastSignIn timestamp
   - `signOut()`: Signs out user
   - `onAuthStatusChanged()`: Auth state listener

### Database Structure

**Firestore Collections**:
- `users/{userId}`: User profiles with business details
  - Fields: email, firstName, lastName, package, createdAt, lastSignIn, businessDetails
  - Subcollection: `callHistory/{callId}`: Individual call records
- `metrics/{userId}`: User metrics (numberOfCalls, callsCaught, meetingsBooked)

**Service Layer**: [firebase-db.ts](src/lib/services/firebase-db.ts)
- All Firestore operations centralized in `firebaseDb` object
- User management: `getUser()`, `createUserProfile()`, `updateUser()`
- Business details: `updateBusinessDetails()`
- Metrics: `getMetrics()`, `incrementMetric()`
- Call history: `addCallEntry()`, `getCallHistory()`

### External Services

**Firebase**: Client and server SDKs
- Client: Initialized in [src/lib/services/firebase.ts](src/lib/services/firebase.ts)
- Admin: Initialized per API route (requires private key env vars)
- Config via `NEXT_PUBLIC_FIREBASE_*` environment variables

**Stripe**: Payment processing
- Initialized in [src/lib/payments.ts](src/lib/payments.ts)
- Falls back to mock mode if `STRIPE_SECRET_KEY` not set
- Creates checkout sessions for subscription payments

**Airtable**: Customer data storage
- Initialized in [src/lib/db.ts](src/lib/db.ts)
- Falls back to mock mode if API key not set
- Used as secondary customer database

### Environment Variables

Required for Firebase (client):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Required for Firebase Admin (server):
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Optional (services degrade to mock mode without them):
```
STRIPE_SECRET_KEY
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
AIRTABLE_TABLE_NAME
NEXT_PUBLIC_APP_URL
```

### Key Patterns

1. **Service Initialization**: Services check for environment variables and provide mock implementations when not configured (see [src/lib/db.ts](src/lib/db.ts), [src/lib/payments.ts](src/lib/payments.ts))

2. **API Route Auth**: All protected API routes follow this pattern:
   - Verify auth token with `verifyAuthToken()`
   - Check user owns the resource (userId matches)
   - Return 401 (unauthorized) or 403 (forbidden) as appropriate

3. **Type Safety**: Shared types in `src/types/` (checkout.ts, user.ts)

4. **Firestore Security**: Rules in [firestore.rules](firestore.rules) require authentication for all reads/writes

5. **No Test Framework**: Currently no test setup in the project

### Important Notes

- Route groups like `(auth)` don't affect URL paths but organize related routes
- Middleware in [middleware.ts](middleware.ts) is currently a pass-through (auth handled by AuthProvider)
- Firebase Admin SDK private key uses `\\n` which must be converted to actual newlines
- All dates in Firestore use `Timestamp` type, not JavaScript Date
- Business details are stored as a nested object in the user document
