# Security

Status: NOT_VERIFIED — 2026-11-11.

No security audit completed. Prioritise tenancy, server authorisation, storage isolation, secrets and prompt-injection controls from the PRD. Existing rules must not be assumed sufficient for Factory. No credentials or client data belong in project memory.

## CHG-0004 controls and remaining limits
Signed HttpOnly eight-hour sessions; SameSite Strict; Secure on HTTPS/canonical public origin; same-origin mutation checks; JSON and 64KB request limits; server role/project checks; customer projections; expiring/revocable hashed invitation links; per-visitor authentication throttles; private atomic file storage. Deployment may enable trusted-proxy IP throttling only when the proxy overwrites X-Forwarded-For; edge rate limiting is still required for broad public exposure. Demo role switching is confined to isolated synthetic workspaces and never reaches real records or paid providers. Source URLs are public HTTPS references; the server does not fetch arbitrary customer URLs. Uploaded logos are bounded PNGs, original generated SVG/XML is escaped, previews use sandboxed iframes and downloads are attachments. Provider findings stay unreviewed until human review; a client assertion cannot be promoted to independently supported evidence.

Not a full security certification: shared producer password lacks per-person RBAC/MFA; invite links are bearer credentials and must be sent privately; demo retention needs an operational cleanup policy; local storage requires one process and durable private disk; distributed rate limiting/backups/retention are not supplied. Existing legacy Firestore rules remain permissive and are not appropriate for new Factory data. Firebase activation requires a separate project with client access denied and least-privilege server IAM; no such project or rules deployment has been performed. Never use synthetic fixture review as real evidence or claim real-provider isolation tests passed.
