# Port67 — shared project memory

Start with [AGENTS.md](AGENTS.md), [PRD.md](PRD.md), [governance](docs/GOVERNANCE.md) and [handover](docs/HANDOVER.md).

- [Central change log](docs/CHANGELOG.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Decisions and open questions](docs/DECISIONS.md)
- [Observed architecture](docs/ARCHITECTURE.md)
- [Original references and hashes](docs/reference/PROVENANCE.md)
- [Verification](docs/TESTING.md)

This repository contains the public Port67 studio, a legacy appointment-booking app and the bounded managed creative MVP described below. The full Factory PRD remains a target; implementation status and evidence distinguish working subsets from future capabilities.

Local application commands: `npm ci`, `npm run dev`, `npm run lint`, `npm run build`. See preserved [existing app guidance](docs/EXISTING_APP_GUIDE.md) for environment variable names; verify claims against source. Never commit credentials.

Documentation check: `python3 scripts/check_docs_governance.py --base origin/main` after fetching the remote.

## Port67 studio website

The main landing page and public studio routes live in `src/app/(studio)` with shared components in `src/components/studio`. The supplied brand logo and licensed fonts are self-hosted in `public/brand` and `public/fonts`.

Run `npm test` for enquiry validation, safe delivery failures and server-rendered checks of the nine studio pages. Run `npm run build` before pushing. Legacy Firebase operations still require their existing configuration; module imports are lazy so the standalone Factory demo can build without those credentials; preserve those environment settings on Render.

The contact form is unavailable until privacy/legal details and a real delivery processor are configured. See `docs/enquiry-delivery.md` for the activation contract. No tracker or analytics vendor has been enabled.

Render should continue using its existing linked `main` branch with `npm ci && npm run build` as the build command and `npm start -- --port $PORT` as the start command. This remodel does not create or modify a Render service.

## Managed creative MVP

Open `/portal` to explore **Research-led marketing content and creative production**. The isolated fictional-brand demo supports research -> insights -> direction/customer approval -> production drafts -> asset approval/download. See [MVP guide](docs/FACTORY_MVP.md) for a walkthrough, live configuration and explicit limits. Firebase/AI credentials are not required for the synthetic demo or manual workflow; cloud adapters are not yet live-verified.

Run `npm test`, `npm run check:factory`, `npx tsc --noEmit` and `npm run build`. For browser acceptance, start the app, install Chromium with `npx playwright install chromium` if needed, then run `npm run test:browser`. A GitHub workflow runs these checks automatically. Test screenshots remain under ignored `work/screenshots` or GitHub Actions artifacts.

Live-foundation setup for the existing Render service: [Render activation](docs/RENDER_ACTIVATION.md). Producer Workspace setup shows safe readiness checks; optional AI drafts require reviewed evidence and explicit public-data authorisation. [Verification and remaining limits](docs/FOUNDATION_VERIFICATION.md).
