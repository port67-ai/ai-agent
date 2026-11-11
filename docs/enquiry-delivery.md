# Enquiry delivery activation

The public form is intentionally unavailable until a controller-specific privacy notice and delivery service are ready. No analytics vendor is installed.

Before enabling:
1. Replace the privacy and terms placeholders with reviewed, accurate business information.
2. Configure `ENQUIRY_DELIVERY_URL` (HTTPS) and `ENQUIRY_DELIVERY_TOKEN` as server secrets in Render.
3. The endpoint must enforce shared rate limits and durable idempotency on `Idempotency-Key`, validate the payload, persist securely, arrange retryable monitored notification, and return **201** with `{ "lead_id": "opaque_identifier" }` only after durable acceptance. Use 429 for abuse limits, other failure statuses for failed delivery. Never send form contents to general analytics.
4. Establish processor agreements, access controls, retention/deletion and human review ownership.
5. Set `ENQUIRY_PRIVACY_APPROVED=true` only after the above and an end-to-end delivery test. The contact page evaluates configuration at request time.

Without these settings, POST returns 503 for a valid enquiry and the browser disables collection. No mock success, logging of request contents, automatic quotes, or marketing consent is included.

Existing authenticated dashboard/checkout routes are kept separately from the public studio design.

## Logo
The robot/PORT67 reference is recreated as a clean background-free SVG. `StudioLogo` inherits CSS `color`; its `iconColor` and `wordmarkColor` props can be set independently. `public/brand/port67.svg` is the monochrome base. Dark, white, mist and copper SVG variants are supplied for external use. The wordmark is outlined so it does not depend on installed fonts. It is a vector recreation based on the supplied raster, rather than a pixel-exact trace.
