# Contributing to Grand Fina

Thank you for considering a contribution to Grand Fina Property Management.
Contributions should strengthen the product while preserving its security,
privacy, financial-integrity, and property-scoping guarantees.

## Code of Conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). By contributing, you agree to follow it.

## Before contributing

1. Search existing issues and pull requests to avoid duplicate work.
2. Open an issue before starting a substantial feature, architecture change, or
   business-rule change.
3. Read the following project guidance:
   - [Technical blueprint](technical-blueprint.md)
   - [Architecture](docs/architecture.md)
   - [Security](docs/security.md)
   - [Database documentation](docs/database.md)
   - [Agent guidance](AGENTS.md), when using a coding agent
4. Do not silently decide unresolved business policy. Describe the decision and
   its operational impact before implementation.

## Development setup

Install dependencies and configure the local environment:

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Windows PowerShell users can replace `cp` with `Copy-Item`.

Never commit `.env.local`, credentials, tokens, local database artifacts, or
generated Supabase runtime files. Local authentication fixtures must remain
fictional and isolated from hosted environments.

## Branches and commits

- Create a focused branch from the current default branch.
- Keep one coherent concern per pull request.
- Use concise, imperative commit messages. Conventional Commit prefixes such as
  `feat:`, `fix:`, `docs:`, `test:`, and `refactor:` are encouraged.
- Do not include unrelated formatting or generated-file changes.
- Never rewrite shared history or force-push another contributor's branch.

## Engineering expectations

- Keep TypeScript strict and avoid `any`.
- Prefer Server Components and server-first data access.
- Keep pages and actions thin; place rules in the owning module.
- Enforce authorization on the server and through RLS. Hidden UI is not an
  authorization boundary.
- Store IDR money as integers and avoid floating-point financial calculations.
- Preserve room, tenant, lease, invoice, and payment invariants.
- Validate untrusted input at the server boundary.
- Do not log secrets, cookies, tokens, tenant records, or unnecessary PII.
- Use only fictional data in development, tests, screenshots, and examples.
- Add a forward migration for database changes; do not rewrite an applied
  migration.
- Add or update documentation when behavior, architecture, operations, security,
  or accounting semantics change.

## Testing

Run the relevant checks before submitting a pull request:

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

For database or security changes, also run the relevant validations under
`supabase/tests/` against a disposable local environment. Test denied access as
well as successful access. Remove temporary test records and identities when the
validation finishes.

Every defect fix should include a regression test when practical. Financial and
date-related work should cover partial/full states, boundary conditions, and the
`Asia/Jayapura` display timezone where applicable.

## Pull requests

Complete the pull request template and include:

- the problem and the chosen solution;
- the affected routes, modules, migrations, or policies;
- security, privacy, data, and financial-integrity implications;
- the exact validation commands and results;
- screenshots for visible UI changes at relevant responsive widths;
- follow-up work or known limitations.

Reviewers may request smaller scope, additional denied-access tests, or a formal
architecture decision before accepting consequential changes.

## Reporting security concerns

Do not disclose suspected vulnerabilities, credentials, personal information, or
authorization bypass details in a public issue. Contact the maintainer privately
through the [GitHub profile](https://github.com/sigitsyambudi) with a minimal,
redacted description.

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
