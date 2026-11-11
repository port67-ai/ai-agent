# Port67 — shared project memory

Start with [AGENTS.md](AGENTS.md), [PRD.md](PRD.md), [governance](docs/GOVERNANCE.md) and [handover](docs/HANDOVER.md).

- [Central change log](docs/CHANGELOG.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Decisions and open questions](docs/DECISIONS.md)
- [Observed architecture](docs/ARCHITECTURE.md)
- [Original references and hashes](docs/reference/PROVENANCE.md)
- [Verification](docs/TESTING.md)

The current code is an existing Next.js appointment-booking application. The Factory PRD is a proposed target, not a description of deployed features. Confirm the relationship before changing product code.

Local application commands: `npm ci`, `npm run dev`, `npm run lint`, `npm run build`. See preserved [existing app guidance](docs/EXISTING_APP_GUIDE.md) for environment variable names; verify claims against source. Never commit credentials.

Documentation check: `python3 scripts/check_docs_governance.py --base origin/main` after fetching the remote.

## Port67 studio website

The main landing page and public studio routes live in `src/app/(studio)` with shared components in `src/components/studio`. The supplied brand logo and licensed fonts are self-hosted in `public/brand` and `public/fonts`.

Run `npm test` for enquiry validation, safe delivery failures and server-rendered checks of the nine studio pages. Run `npm run build` before pushing. The legacy application still requires its existing Firebase configuration for a full build and operation; preserve those environment settings on Render.

The contact form is unavailable until privacy/legal details and a real delivery processor are configured. See `docs/enquiry-delivery.md` for the activation contract. No tracker or analytics vendor has been enabled.

Render should continue using its existing linked `main` branch with `npm ci && npm run build` as the build command and `npm start -- --port $PORT` as the start command. This remodel does not create or modify a Render service.
