# Current Firebase data model

Observed from src/lib/services/firebase-db.ts and src/types/checkout.ts at baseline 26ab3be on 2026-11-11. This describes source writes, not a queried production database. No migrations or deployment were performed.

## users/{uid}

Document key is Firebase Auth UID. createUserProfile writes email, firstName, lastName (strings), package (Starter | Growth | Teamer), createdAt and lastSignIn (Firestore Timestamp), businessDetails (initially null). id is derived from the document key on reads, not initially persisted. updateLastSignIn uses merge and can create a partial document.

updateBusinessDetails replaces businessDetails and sets updatedAt (Timestamp). The nested object contains businessName, businessType, currentPhoneNumber, assistantPhoneNumber, startTime, stopTime, assistantVoice, businessLink, aiBusinessSummary (strings); bookingDays (map of day to boolean); optional appointment1Name/appointment2Name (strings) and appointment1Duration/appointment2Duration (numbers).

updateAiReviewData writes aiReviewData and aiReviewCompletedAt (Timestamp). AiReviewData fields are strings: business_name, business_type, business_address, areas_covered, service_1 through service_6, open_monday through open_sunday, out_of_hours, booking_whatsapp, booking_sms, booking_either, accreditation, experience.

## users/{uid}/callHistory/{generatedId}

addCallEntry writes name, mobileNumber, action, date, time (strings), timestamp (Firestore Timestamp). getCallHistory sorts timestamp descending, default limit 20. Adding an entry then incrementing metrics is not atomic.

## metrics/{uid}

numberOfCalls, callsCaught, meetingsBooked are numeric counters. getMetrics creates zero counters if absent. incrementMetric updates one allowed counter. addCallEntry increments numberOfCalls and assumes the metrics document exists. These counters are not a cost ledger or audit trail.

## Drift and security gaps

src/types/user.ts describes a different UI shape: createdAt as string, phoneNumber/workingDays/workingHours rather than persisted currentPhoneNumber/bookingDays/startTime/stopTime. The service UserProfile uses any for timestamps/business details. Consumers must not treat either type as schema validation.

firestore.rules grants read/write for every document to any authenticated user. There is no owner restriction, field validation, immutable ownership, tenant membership or privileged-field protection. firestore.indexes.json declares no indexes (with commented examples). No emulator rule tests exist yet. This is a production isolation risk; GOV-006 remains unverified.

Firebase Auth identities are distinct from Firestore profiles. Airtable stores customer/business information separately through adapters; it is not the canonical Firebase schema. No approved organization tenancy, audit event schema, retention policy or provider cost schema is available. Define those through approved PRD requirements before implementing them.
