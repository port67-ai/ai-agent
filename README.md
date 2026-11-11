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
